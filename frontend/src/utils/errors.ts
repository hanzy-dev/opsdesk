import { ApiError } from "../api/client";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function getErrorReferenceId(error: unknown) {
  if (error instanceof ApiError) {
    return error.requestId;
  }

  return undefined;
}
