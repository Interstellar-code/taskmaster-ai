// PRD-related interfaces
export interface PRD {
  id: number;
  title: string;
  file_name: string;
  file_path: string;
  file_hash?: string;
  file_size?: number;
  status: 'pending' | 'in-progress' | 'done' | 'archived';
  complexity: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  tags: string[];
  created_date: string;
  last_modified: string;
  task_stats: Record<string, any>;
  metadata: Record<string, any>;
  // Additional fields from API response
  analysis_status: string;
  tasks_status: string;
  analysis_data: string | null;
  analyzed_at: string | null;
  estimated_effort: string | null;
  taskCount: number;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  pendingTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  analysisStatus: string;
  tasksStatus: string;
  uploadDate: string;
  filePath: string;
}

export interface PRDListResponse {
  success: boolean;
  message: string;
  data: PRD[];
  meta: {
    timestamp: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PRDFilters {
  status?: string;
  complexity?: string;
  priority?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// PRD Service class
class PRDService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<{ data: T; message?: string }> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // The API returns the data directly, not wrapped in a data property
      return { data: result };
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check for PRD API
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetchApi('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Get all PRDs with optional filtering and pagination
  async getAllPRDs(filters?: PRDFilters): Promise<{ prds: PRD[]; pagination?: any }> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.complexity) params.append('complexity', filters.complexity);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const endpoint = `/api/prds${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.fetchApi<PRDListResponse>(endpoint);

    // The API returns the data in response.data.data, and pagination in response.data.meta.pagination
    return {
      prds: response.data.data || [],
      pagination: response.data.meta?.pagination
    };
  }

  // Get a specific PRD by ID
  async getPRDById(id: number): Promise<PRD> {
    const response = await this.fetchApi<PRD>(`/api/prds/${id}`);
    return response.data;
  }

  // Update PRD status
  async updatePRDStatus(id: number, status: PRD['status']): Promise<PRD> {
    const response = await this.fetchApi<PRD>(`/api/prds/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return response.data;
  }

  // Update PRD metadata
  async updatePRD(id: number, updates: Partial<Pick<PRD, 'title' | 'description' | 'priority' | 'complexity' | 'tags'>>): Promise<PRD> {
    const response = await this.fetchApi<PRD>(`/api/prds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  // Get tasks linked to a PRD
  async getPRDTasks(id: number): Promise<any[]> {
    const response = await this.fetchApi<any[]>(`/api/prds/${id}/tasks`);
    return response.data;
  }

  // Upload a new PRD file
  async uploadPRD(data: {
    fileName: string;
    fileContent: string;
    fileType?: string;
    append?: boolean;
    numTasks?: number;
  }): Promise<PRD> {
    const response = await this.fetchApi<PRD>('/api/prds/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  // Delete/Archive a PRD
  async deletePRD(id: number, force?: boolean): Promise<{ success: boolean; message: string }> {
    const response = await this.fetchApi<{ success: boolean; message: string }>(`/api/prds/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ force }),
    });
    return response.data;
  }

  // Force delete PRD with all linked tasks
  async forceDeletePRD(id: number): Promise<{ success: boolean; message: string; deletedTasks: number }> {
    const response = await this.fetchApi<{ success: boolean; message: string; deletedTasks: number }>(`/api/prds/${id}/force-delete`, {
      method: 'DELETE',
    });
    return response.data;
  }

  // Analyze PRD complexity
  async analyzePRD(id: number, options?: {
    aiModel?: string;
    includeComplexity?: boolean;
    includeEffortEstimate?: boolean;
  }): Promise<any> {
    const response = await this.fetchApi<any>(`/api/prds/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    return response.data;
  }

  // Generate tasks from PRD
  async generateTasks(id: number, options?: {
    append?: boolean;
    aiModel?: string;
    numTasks?: number;
    expandSubtasks?: boolean;
  }): Promise<any> {
    const response = await this.fetchApi<any>(`/api/prds/${id}/generate-tasks`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    return response.data;
  }

  // Download PRD file
  async downloadPRD(id: number): Promise<Blob> {
    const url = `${this.baseUrl}/api/prds/${id}/download`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }
}

// Create singleton instance
export const prdService = new PRDService();
export default prdService;
