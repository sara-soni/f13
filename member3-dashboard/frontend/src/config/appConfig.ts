export interface AppConfig {
  useMockData: boolean;
  apiBaseUrl: string;
  cognitoRegion: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  storagePrefix: string;
}

export const appConfig: AppConfig = {
  // Configured to true until backend APIs are deployed
  useMockData: true,
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, ""),
  cognitoRegion: import.meta.env.VITE_AWS_COGNITO_REGION || "",
  cognitoUserPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || "",
  cognitoClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || "",
  storagePrefix: "leaveflow_v2",
};
