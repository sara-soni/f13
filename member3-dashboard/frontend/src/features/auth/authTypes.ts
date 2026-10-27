import type { EmployeeProfile } from "../../types/leave";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated" | "error";

export interface AuthState {
  status: AuthStatus;
  user: EmployeeProfile | null;
  error: string | null;
}

export interface SignInCredentials {
  username: string;
  password?: string;
}
