const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1").replace(/\/$/, "");

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  correlationId?: string;
}

export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  details?: Record<string, string>;
}

export class ApiError extends Error {
  statusCode: number;
  details?: Record<string, string>;

  constructor(message: string, statusCode = 500, details?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Enforces sending server-managed HttpOnly cookies
    });

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      let errorDetails: Record<string, string> | undefined;

      try {
        const errorJson = (await response.json()) as {
          message?: string;
          error?: { message?: string; details?: Record<string, string> };
          details?: Record<string, string>;
        };

        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }

        if (errorJson.error?.details) {
          errorDetails = errorJson.error.details;
        } else if (errorJson.details) {
          errorDetails = errorJson.details;
        }
      } catch {
        // Fall back to HTTP status text
        if (response.statusText) errorMessage = response.statusText;
      }

      if (response.status === 401) {
        throw new ApiError("Session has expired or you are unauthenticated. Please sign in.", 401);
      }
      if (response.status === 403) {
        throw new ApiError("You do not have permission to perform this action.", 403);
      }
      if (response.status === 404) {
        throw new ApiError("Requested leave resource was not found.", 404);
      }
      if (response.status === 422) {
        throw new ApiError(errorMessage || "Validation failed on the submitted leave form.", 422, errorDetails);
      }

      throw new ApiError(errorMessage, response.status, errorDetails);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network failure (server down, CORS, DNS)
    throw new ApiError(
      "Network connection error. Server is unreachable.",
      0
    );
  }
}
