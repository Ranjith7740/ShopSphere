export type Role = 'CUSTOMER' | 'ADMIN';

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface UpdateUserRequest {
  name: string;
  phone: string;
}
