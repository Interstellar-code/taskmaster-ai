import { type PRD } from '../api/prdService';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { FileText, BarChart3, Calendar } from 'lucide-react';

interface PRDTableViewProps {
  prds: PRD[];
  onStatusUpdate: (prdId: number, newStatus: PRD['status']) => void;
  onViewDetails: (prd: PRD) => void;
  onViewTasks: (prd: PRD) => void;
}

export function PRDTableView({ prds, onStatusUpdate, onViewDetails, onViewTasks }: PRDTableViewProps) {

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

  // Calculate completion percentage
  const getCompletionPercentage = (prd: PRD) => {
    const total = prd.totalTasks || 0;
    if (total === 0) return 0;
    return Math.round((prd.completedTasks / total) * 100);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Complexity</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Completion</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prds.map((prd) => (
            <TableRow key={prd.id} className="cursor-pointer" onClick={() => onViewDetails(prd)}>
              <TableCell className="font-medium">{prd.id}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">{prd.title}</div>
                  <div className="text-sm text-muted-foreground">{prd.file_name}</div>
                </div>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Select
                  value={prd.status}
                  onValueChange={(value) => onStatusUpdate(prd.id, value as PRD['status'])}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getPriorityColor(prd.priority)}>
                  {prd.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getComplexityColor(prd.complexity)}>
                  {prd.complexity}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-center">
                  <div className="font-medium">{prd.totalTasks || 0}</div>
                  <div className="text-xs text-muted-foreground">
                    {prd.completedTasks || 0} done
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${getCompletionPercentage(prd)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{getCompletionPercentage(prd)}%</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(prd.last_modified).toLocaleDateString()}
                </div>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onViewTasks(prd)} title="View Tasks">
                    <BarChart3 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onViewDetails(prd)} title="View Details">
                    <FileText className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
