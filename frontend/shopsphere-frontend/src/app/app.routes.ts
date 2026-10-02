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