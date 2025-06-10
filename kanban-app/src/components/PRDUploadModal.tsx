import { useState } from 'react';
import { prdService } from '../api/prdService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useFormToast } from './forms/FormToast';

interface PRDUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

export function PRDUploadModal({ open, onOpenChange, onUploadSuccess }: PRDUploadModalProps) {
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('text/markdown');
  const [append, setAppend] = useState(false);
  const [numTasks, setNumTasks] = useState<number | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const { showSuccess, showError } = useFormToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileType(file.type || 'text/markdown');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileName || !fileContent) {
      showError('Validation Error', 'Please provide both file name and content');
      return;
    }

    setUploading(true);
    
    try {
      // Convert content to base64
      const base64Content = btoa(unescape(encodeURIComponent(fileContent)));
      
      await prdService.uploadPRD({
        fileName,
        fileContent: base64Content,
        fileType,
        append,
        numTasks
      });

      showSuccess('Upload Successful', `PRD "${fileName}" uploaded successfully`);
      
      // Reset form
      setFileName('');
      setFileContent('');
      setFileType('text/markdown');
      setAppend(false);
      setNumTasks(undefined);
      
      // Close modal and refresh parent
      onOpenChange(false);
      onUploadSuccess();
      
    } catch (error) {
      console.error('Upload failed:', error);
      showError('Upload Failed', error instanceof Error ? error.message : 'Failed to upload PRD');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFileName('');
    setFileContent('');
    setFileType('text/markdown');
    setAppend(false);
    setNumTasks(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload PRD
          </DialogTitle>
          <DialogDescription>
            Upload a Product Requirements Document to generate tasks automatically
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".md,.txt,.markdown"
                onChange={handleFileUpload}
                className="flex-1"
              />
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., my-project-requirements.md"
              required
            />
          </div>

          {/* File Content */}
          <div className="space-y-2">
            <Label htmlFor="fileContent">Content</Label>
            <Textarea
              id="fileContent"
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder="Paste your PRD content here or upload a file above..."
              className="min-h-[200px] font-mono text-sm"
              required
            />
          </div>

          {/* File Type */}
          <div className="space-y-2">
            <Label htmlFor="fileType">File Type</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text/markdown">Markdown</SelectItem>
                <SelectItem value="text/plain">Plain Text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="append"
                checked={append}
                onCheckedChange={(checked) => setAppend(checked as boolean)}
              />
              <Label htmlFor="append" className="text-sm">
                Append to existing tasks (don't replace)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numTasks">Expected Number of Tasks (optional)</Label>
              <Input
                id="numTasks"
                type="number"
                value={numTasks || ''}
                onChange={(e) => setNumTasks(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 10"
                min="1"
                max="100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !fileName || !fileContent}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload PRD
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
