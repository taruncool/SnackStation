import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/products/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./pages/categories/categories.page').then((m) => m.CategoriesPage),
  },
  {
    path: 'billing',
    loadComponent: () => import('./pages/billing/billing.page').then((m) => m.BillingPage),
  },
  {
    path: 'sales-count',
    loadComponent: () =>
      import('./pages/sales-count/sales-count.page').then((m) => m.SalesCountPage),
  },
  {
    path: 'customers',
    loadComponent: () => import('./pages/customers/customers.page').then((m) => m.CustomersPage),
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports.page').then((m) => m.ReportsPage),
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('./pages/inventory/inventory.page').then((m) => m.InventoryPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: 'login' },
];
