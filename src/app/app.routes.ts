import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './services/auth.service';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/products/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/categories/categories.page').then((m) => m.CategoriesPage),
  },
  {
    path: 'billing',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/billing/billing.page').then((m) => m.BillingPage),
  },
  {
    path: 'sales-count',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/sales-count/sales-count.page').then((m) => m.SalesCountPage),
  },
  {
    path: 'customers',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/customers/customers.page').then((m) => m.CustomersPage),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/reports/reports.page').then((m) => m.ReportsPage),
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/inventory/inventory.page').then((m) => m.InventoryPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: 'login' },
];
