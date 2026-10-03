import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'products/:productId',
    loadComponent: () =>
      import('./features/products/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'profile/addresses',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/addresses/addresses').then((m) => m.Addresses),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/my-orders/my-orders').then((m) => m.MyOrders),
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/order-detail/order-detail').then((m) => m.OrderDetail),
  },
  {
    path: 'order-success/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/order-success/order-success').then((m) => m.OrderSuccess),
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'products',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/admin/products/admin-products/admin-products').then(m => m.AdminProducts),
          },
          {
            path: 'new',
            loadComponent: () => import('./features/admin/products/admin-product-form/admin-product-form').then(m => m.AdminProductForm),
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./features/admin/products/admin-product-form/admin-product-form').then(m => m.AdminProductForm),
          },
        ],
      },
      {
        path: 'categories',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/admin/categories/admin-categories/admin-categories').then(m => m.AdminCategories),
          },
          {
            path: 'new',
            loadComponent: () => import('./features/admin/categories/admin-category-form/admin-category-form').then(m => m.AdminCategoryForm),
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./features/admin/categories/admin-category-form/admin-category-form').then(m => m.AdminCategoryForm),
          },
        ],
      },
      {
        path: 'orders',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/admin/orders/admin-orders/admin-orders').then(m => m.AdminOrders),
          },
          {
            path: ':id',
            loadComponent: () => import('./features/admin/orders/admin-order-detail/admin-order-detail').then(m => m.AdminOrderDetail),
          },
        ],
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/admin/inventory/admin-inventory/admin-inventory').then(m => m.AdminInventory),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users/admin-users').then(m => m.AdminUsers),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },


    ],
  },
  // Temporary routes for manually verifying authGuard/roleGuard (Step 14A Part 7).
  {
    path: 'protected-test',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'admin-test',
    canActivate: [roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
];