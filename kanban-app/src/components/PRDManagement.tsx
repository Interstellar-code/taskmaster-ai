import { useState, useEffect, useRef } from 'react';
import { prdService, type PRD, type PRDFilters } from '../api/prdService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PRDTableView } from './PRDTableView';
import { PRDUploadModal } from './PRDUploadModal';
import { PRDDetailsModal } from './PRDDetailsModal';

import { Search, Filter, Plus, FileText, Calendar, BarChart3, RefreshCw, Grid, List } from 'lucide-react';
import { useFormToast } from './forms/FormToast';

export function PRDManagement() {
  const [prds, setPrds] = useState<PRD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table'); // Default to table view
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPRD, setSelectedPRD] = useState<PRD | null>(null);
  const [filters, setFilters] = useState<PRDFilters>({
    page: 1,
    limit: 20,
    sortBy: 'created_date',
    sortOrder: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { showSuccess, showError } = useFormToast();

  // Load PRDs from API
  const loadPRDs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if API is available update
      const isHealthy = await prdService.healthCheck();
      if (!isHealthy) {
        throw new Error('TaskMaster API is not available');
      }

      const response = await prdService.getAllPRDs(filters);
      setPrds(response.prds || []);
    } catch (err) {
      console.error('Failed to load PRDs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PRDs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPRDs();
  }, [filters]);

  // Handle search
  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchQuery,
      page: 1
    }));
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof PRDFilters, value: string | string[] | number | 'asc' | 'desc' | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  // Handle status update
  const handleStatusUpdate = async (prdId: number, newStatus: PRD['status']) => {
    try {
      await prdService.updatePRDStatus(prdId, newStatus);
      showSuccess('Status Updated', `PRD status updated to ${newStatus}`);
      loadPRDs(); // Refresh the list
    } catch (err) {
      showError('Update Failed', 'Failed to update PRD status');
    }
  };

  // Handle PRD details view
  const handleViewDetails = (prd: PRD) => {
    setSelectedPRD(prd);
    setDetailsModalOpen(true);
  };

  // Handle PRD update - refresh both list and selected PRD
  const handlePRDUpdate = async () => {
    try {
      // Refresh the PRD list
      await loadPRDs();

      // If a PRD is currently selected, refresh its data
      if (selectedPRD) {
        const updatedPRD = await prdService.getPRDById(selectedPRD.id);
        setSelectedPRD(updatedPRD);
      }
    } catch (error) {
      console.error('Failed to refresh PRD data:', error);
      // If we can't refresh the selected PRD, close the modal
      if (selectedPRD) {
        setDetailsModalOpen(false);
        setSelectedPRD(null);
      }
    }
  };

  // Handle view tasks - open kanban board in new tab with PRD filter
  const handleViewTasks = (prd: PRD) => {
    console.log('PRD object:', prd);
    console.log('Available PRD fields:', Object.keys(prd));
    console.log('file_name:', prd.file_name);
    console.log('filePath:', prd.filePath);
    
    // Use the filename field, with fallbacks
    const filename = prd.file_name || prd.filePath?.split('/').pop() || `prd_${prd.id}`;
    console.log('Using filename:', filename);
    
    const currentUrl = window.location.origin + window.location.pathname;
    const kanbanUrl = `${currentUrl}?view=kanban&prd=${encodeURIComponent(filename)}`;
    console.log('Generated URL:', kanbanUrl);
    
    window.open(kanbanUrl, '_blank');
  };

  // Handle upload success
  const handleUploadSuccess = () => {
    loadPRDs(); // Refresh the list after successful upload
  };

  // Handle direct file upload
  const handleDirectFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const base64Content = btoa(unescape(encodeURIComponent(content)));

        await prdService.uploadPRD({
          fileName: file.name,
          fileContent: base64Content,
          fileType: file.type || 'text/markdown',
          append: false
        });

        showSuccess('Upload Successful', `PRD "${file.name}" uploaded successfully`);
        loadPRDs(); // Refresh the list
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Upload failed:', error);
      showError('Upload Failed', error instanceof Error ? error.message : 'Failed to upload PRD');
    }

    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Trigger file picker
  const handleUploadClick = () => {
    fileInputRef.current?.click();
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

  // Get complexity color selected
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

  // Calculate completion percentage
  const getCompletionPercentage = (prd: PRD) => {
    const total = prd.totalTasks || 0;
    if (total === 0) return 0;
    return Math.round((prd.completedTasks / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading PRDs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-lg text-red-600 mb-4">Error loading PRDs</div>
        <div className="text-sm text-gray-600 mb-4">{error}</div>
        <Button onClick={loadPRDs} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PRD Management</h1>
          <p className="text-muted-foreground">Manage your Product Requirements Documents</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleUploadClick}>
            <Plus className="h-4 w-4 mr-2" />
            Upload PRD
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.markdown"
            onChange={handleDirectFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search PRDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-64"
              />
              <Button onClick={handleSearch} size="sm">Search</Button>
            </div>

            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.complexity || 'all'} onValueChange={(value) => handleFilterChange('complexity', value === 'all' ? undefined : value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Complexity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Complexity</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority || 'all'} onValueChange={(value) => handleFilterChange('priority', value === 'all' ? undefined : value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={loadPRDs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PRD List */}
      {prds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No PRDs Found</h3>
            <p className="text-muted-foreground text-center">
              {filters.search || filters.status || filters.complexity || filters.priority
                ? 'No PRDs match your current filters.'
                : 'Get started by uploading your first PRD.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <PRDTableView prds={prds} onStatusUpdate={handleStatusUpdate} onViewDetails={handleViewDetails} onViewTasks={handleViewTasks} />
      ) : (
        <div className="grid gap-4">{
          prds.map((prd) => (
            <Card key={prd.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {prd.title}
                    </CardTitle>
                    <CardDescription>{prd.description || 'No description available'}</CardDescription>
                    <div className="text-sm text-muted-foreground">
                      File: {prd.file_name}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={getStatusColor(prd.status)}>
                      {prd.status}
                    </Badge>
                    <Select value={prd.status} onValueChange={(value) => handleStatusUpdate(prd.id, value as PRD['status'])}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={getComplexityColor(prd.complexity)}>
                      {prd.complexity} complexity
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(prd.priority)}>
                      {prd.priority} priority
                    </Badge>
                    {prd.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Task Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{prd.totalTasks || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{prd.completedTasks || 0}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{prd.inProgressTasks || 0}</div>
                      <div className="text-sm text-muted-foreground">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{getCompletionPercentage(prd)}%</div>
                      <div className="text-sm text-muted-foreground">Complete</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getCompletionPercentage(prd)}%` }}
                    />
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created: {new Date(prd.created_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Modified: {new Date(prd.last_modified).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      View Tasks
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(prd)}>
                      <FileText className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }</div>
      )}

      {/* Modals */}
      <PRDUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadSuccess={handleUploadSuccess}
      />

      <PRDDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        prd={selectedPRD}
        onPRDUpdate={handlePRDUpdate}
      />
    </div>
  );
}
