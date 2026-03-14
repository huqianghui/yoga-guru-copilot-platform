export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: "guru" | "admin";
  avatar_url?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
