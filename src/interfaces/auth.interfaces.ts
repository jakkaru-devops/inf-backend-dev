export interface JwtPayload {
  id: string;
  expires: number;
}

export interface LoginResponse {
  expires?: number;
  token: string;
}
