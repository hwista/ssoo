import { NextResponse } from 'next/server';

export type AppResult<T> =
  | { success: true; data: T; status: number }
  | { success: false; error: string; status: number; code?: string };

export function ok<T>(data: T, status = 200): AppResult<T> {
  return { success: true, data, status };
}

export function fail(error: string, status: number, code?: string): AppResult<never> {
  return { success: false, error, status, ...(code ? { code } : {}) };
}

export function toNextResponse<T>(result: AppResult<T>): NextResponse {
  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: result.status });
}
