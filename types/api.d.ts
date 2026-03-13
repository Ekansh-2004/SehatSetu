// API related types

// API response types
interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error response types
interface IApiError {
  error: string;
  message?: string;
  statusCode: number;
  details?: unknown;
}
