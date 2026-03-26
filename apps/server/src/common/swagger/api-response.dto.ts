export class ApiError {
  success = false as const;
  error!: {
    code: string;
    message: string;
    path?: string;
  };
  timestamp?: string;

  // ¿¹½Ã (Swagger example)
  static example: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      path: '/api/example',
    },
    timestamp: new Date().toISOString(),
  };
}

export class ApiSuccess<T> {
  success = true as const;
  data!: T;
  message?: string;
}
