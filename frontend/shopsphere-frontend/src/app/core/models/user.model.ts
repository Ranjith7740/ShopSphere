export type Role = 'CUSTOMER' | 'ADMIN';

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status?: string;
  createdAt?: string;
}

export interface UpdateUserRequest {
  name: string;
  phone: string;
}

export interface UserPageResponse {
  content: UserResponse[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}
