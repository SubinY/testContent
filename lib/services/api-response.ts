import type { ApiError, ApiResponse } from "@/types";

export function ok<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

export function fail(code: ApiError["code"], message: string): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message
    }
  };
}
