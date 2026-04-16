export type ApiSuccessResponse<T> = {
  data: T;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
  };
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: { field: string; message: string }[];
  };
};
