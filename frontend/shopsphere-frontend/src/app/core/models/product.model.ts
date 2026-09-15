export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface ProductResponse {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPageResponse {
  data: ProductResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductQueryParams {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  size?: number;
}
