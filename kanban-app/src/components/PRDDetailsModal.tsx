import { useState, useEffect } from 'react';
import { type PRD, prdService } from '../api/prdService';
import { type TaskMasterTask } from '../api/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useFormToast } from './forms/FormToast';
import { PRDEditModal } from './PRDEditModal';
import {
  FileText,
  Calendar,
  BarChart3,
  Tag,
  Clock,
  CheckCircle,
  Circle,
  Download,
  Search,
  Plus,
  Loader2,
  Trash2,
  Edit
} from 'lucide-react';

interface PRDDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prd: PRD | null;
  onPRDUpdate?: () => void; // Callback to refresh PRD data
}

export function PRDDetailsModal({ open, onOpenChange, prd, onPRDUpdate }: PRDDetailsModalProps) {
  const [linkedTasks, setLinkedTasks] = useState<TaskMasterTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { showSuccess, showError } = useFormToast();

  useEffect(() => {
    if (prd && open) {
      loadLinkedTasks();
    }
  }, [prd, open]);

  const loadLinkedTasks = async () => {
    if (!prd) return;

    setLoadingTasks(true);
    try {
      const tasks = await prdService.getPRDTasks(prd.id);
      setLinkedTasks(tasks);
    } catch (error) {
      console.error('Failed to load linked tasks:', error);
      setLinkedTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Handle PRD analysis
  const handleAnalyzePRD = async () => {
    if (!prd) return;

    setAnalyzing(true);
    try {
      await prdService.analyzePRD(prd.id, {
        includeComplexity: true,
        includeEffortEstimate: true
      });

      // Refresh PRD data
      if (onPRDUpdate) {
        onPRDUpdate();
      }

      showSuccess('Analysis Complete', 'PRD analysis completed successfully!');
    } catch (error) {
      console.error('Failed to analyze PRD:', error);
      showError('Analysis Failed', 'Failed to analyze PRD. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle task generation
  const handleGenerateTasks = async () => {
    if (!prd) return;

    setGeneratingTasks(true);
    try {
      const result = await prdService.generateTasks(prd.id, {
        append: false,
        numTasks: 12,
        expandSubtasks: false
      });

      // Refresh linked tasks and PRD data
      loadLinkedTasks();
      if (onPRDUpdate) {
        onPRDUpdate();
      }

      showSuccess('Tasks Generated', `Successfully generated ${result.tasksGenerated} tasks from PRD!`);
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      showError('Task Generation Failed', 'Failed to generate tasks. Please try again.');
    } finally {
      setGeneratingTasks(false);
    }
  };

  // Handle PRD download
  const handleDownloadPRD = async () => {
    if (!prd) return;

    setDownloading(true);
    try {
      // Debug: Log PRD data for download
      console.log('Downloading PRD:', {
        id: prd.id,
        file_name: prd.file_name,
        file_path: prd.file_path,
        filePath: prd.filePath
      });

      const blob = await prdService.downloadPRD(prd.id);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = prd.file_name || `prd_${prd.id}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Download Complete', `PRD "${prd.file_name}" downloaded successfully!`);
    } catch (error) {
      console.error('Failed to download PRD:', error);

      // More specific error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        showError('File Not Found', 'The PRD file could not be found on the server. It may have been moved or deleted.');
      } else {
        showError('Download Failed', `Failed to download PRD: ${errorMessage}`);
      }
    } finally {
      setDownloading(false);
    }
  };

  // Handle view tasks (open kanban board filtered by PRD)
  const handleViewTasks = () => {
    if (!prd) return;

    // Debug: Log PRD data to understand what fields are available
    console.log('PRD Data for View Tasks:', {
      id: prd.id,
      file_name: prd.file_name,
      title: prd.title,
      filePath: prd.filePath,
      file_path: prd.file_path
    });

    // Use file_name for filtering (this is what the kanban board expects)
    const filterValue = prd.file_name || prd.title;
    const kanbanUrl = `/?prd=${encodeURIComponent(filterValue)}`;

    console.log('Opening kanban with URL:', kanbanUrl);
    window.open(kanbanUrl, '_blank');
  };

  // Handle PRD deletion
  const handleDeletePRD = async () => {
    if (!prd) return;

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete PRD "${prd.title}"? This will also delete all linked tasks. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const result = await prdService.forceDeletePRD(prd.id);

      showSuccess('PRD Deleted', `PRD and ${result.deletedTasks} linked tasks have been deleted successfully.`);

      // Close modal and refresh parent
      onOpenChange(false);
      if (onPRDUpdate) {
        onPRDUpdate();
      }
    } catch (error) {
      console.error('Failed to delete PRD:', error);
      showError('Delete Failed', 'Failed to delete PRD. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Check if analysis is completed
  const isAnalyzed = prd?.analysis_status === 'analyzed';

  // Check if tasks have been generated
  const hasGeneratedTasks = prd?.tasks_status === 'generated' || (prd?.totalTasks && prd.totalTasks > 0);

  // Check if analysis is in progress
  const isAnalyzing = prd?.analysis_status === 'analyzing' || analyzing;

  // Check if task generation is in progress
  const isGeneratingTasks = prd?.tasks_status === 'generating' || generatingTasks;

  if (!prd) return null;

  // Safe date formatting function
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get status color
  const getStatusColor = (status: PRD['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in-progress': return 'bg-blue-500';
      case 'done': return 'bg-green-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  // Get complexity color
  const getComplexityColor = (complexity: PRD['complexity']) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: PRD['priority']) => {
    switch (priority) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PRD Details - {prd.title}
          </DialogTitle>
          <DialogDescription>
            Detailed information about this Product Requirements Document
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">ID:</span>
                    <span>{prd.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">File:</span>
                    <span className="text-muted-foreground">{prd.file_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">Created:</span>
                    <span>{formatDate(prd.created_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">Modified:</span>
                    <span>{formatDate(prd.last_modified)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Status & Metadata</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Status:</span>
                    <Badge className={getStatusColor(prd.status)}>
                      {prd.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Analysis:</span>
                    <Badge variant="outline" className={
                      isAnalyzed ? 'bg-green-100 text-green-800' :
                      isAnalyzing ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {isAnalyzing ? 'Analyzing...' : isAnalyzed ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Tasks:</span>
                    <Badge variant="outline" className={
                      hasGeneratedTasks ? 'bg-green-100 text-green-800' :
                      isGeneratingTasks ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {isGeneratingTasks ? 'Generating...' : hasGeneratedTasks ? 'Generated' : 'Not Generated'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Priority:</span>
                    <Badge variant="outline" className={getPriorityColor(prd.priority)}>
                      {prd.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Complexity:</span>
                    <Badge variant="outline" className={getComplexityColor(prd.complexity)}>
                      {prd.complexity}
                    </Badge>
                  </div>
                  {prd.estimated_effort && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Estimated Effort:</span>
                      <span className="text-sm">{prd.estimated_effort}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            {prd.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {prd.description}
                </p>
              </div>
            )}

            <Separator />



            <Separator />

            {/* Tags */}
            {prd.tags && prd.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {prd.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Tasks Section */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Linked Tasks
              </h3>
              {loadingTasks ? (
                <div className="text-sm text-muted-foreground">Loading tasks...</div>
              ) : linkedTasks.length > 0 ? (
                <div className="space-y-2">
                  {linkedTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                      {task.status === 'done' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">{task.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No linked tasks found. Tasks will appear here after PRD processing.
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyzePRD}
              disabled={isAnalyzing || isAnalyzed}
            >
              {isAnalyzing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Search className="h-3 w-3 mr-1" />
              )}
              {isAnalyzing ? 'Analyzing...' : isAnalyzed ? 'Analyzed' : 'Analyze'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTasks}
              disabled={Boolean(!isAnalyzed || isGeneratingTasks || hasGeneratedTasks)}
              title={
                !isAnalyzed
                  ? 'Please analyze the PRD first'
                  : hasGeneratedTasks
                    ? 'Tasks have already been generated'
                    : ''
              }
            >
              {isGeneratingTasks ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              {isGeneratingTasks ? 'Creating...' : hasGeneratedTasks ? 'Tasks Created' : 'Create Tasks'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewTasks}
              disabled={!hasGeneratedTasks}
              title={!hasGeneratedTasks ? 'No tasks available to view' : ''}
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              View Tasks
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPRD}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              {downloading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeletePRD}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1" />
              )}
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Edit Modal */}
      <PRDEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        prd={prd}
        onPRDUpdate={onPRDUpdate}
      />
    </Dialog>
  );
}
