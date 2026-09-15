import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register)
  },
  // Temporary routes for manually verifying authGuard/roleGuard (Step 14A Part 7).
  // Remove once a real protected page (e.g. profile, admin dashboard) exists.
  {
    path: 'protected-test',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home)
  },
  {
    path: 'admin-test',
    canActivate: [roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./features/home/home').then((m) => m.Home)
  }
];
