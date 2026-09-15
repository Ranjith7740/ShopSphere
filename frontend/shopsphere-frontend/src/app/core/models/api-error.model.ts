export interface ApiError {
  timestamp: string;
  status: number;
  message: string;
  path: string;
  fieldErrors: Record<string, string> | null;
}
