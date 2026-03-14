export interface ServiceConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionTestResult {
  service: string;
  status: "connected" | "error" | "not_configured";
  message: string;
}
