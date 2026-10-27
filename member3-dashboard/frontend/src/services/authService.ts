import type { EmployeeProfile } from "../types/leave";
import { request, ApiError, type ApiResponseEnvelope } from "./apiClient";

export async function checkServerSession(): Promise<EmployeeProfile | null> {
  try {
    const res = await request<ApiResponseEnvelope<EmployeeProfile>>("/auth/session");
    return res.data;
  } catch (err: unknown) {
    if (err instanceof ApiError && err.statusCode === 401) {
      return null;
    }
    // Rethrow network or 500 errors so UI can render a retryable error state instead of redirecting
    throw err;
  }
}

export async function signInWithServer(
  username: string,
  password?: string
): Promise<EmployeeProfile> {
  if (!username.trim()) {
    throw new Error("Please enter your corporate email or employee ID.");
  }

  const res = await request<ApiResponseEnvelope<{ user: EmployeeProfile }>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username: username.trim(),
      password,
    }),
  });

  return res.data.user;
}

export async function signOutServer(): Promise<void> {
  await request<ApiResponseEnvelope<null>>("/auth/logout", {
    method: "POST",
  });
}
