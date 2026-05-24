// ============================================================
// frontend/src/app/app.routes.ts
// ============================================================
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
<<<<<<< HEAD
=======
    path: 'register/centre',
    loadComponent: () =>
      import('./features/centre-register/centre-register.component')
        .then(m => m.CentreRegisterComponent),
  },
    {
    path: 'register/seller',
    loadComponent: () =>
      import('./features/seller-register/seller-register.component')  
        .then(m => m.SellerRegisterComponent),
  },
  {
    path: 'seller/dashboard',
    loadComponent: () => import('./features/seller-dashboard/seller-dashboard.component')
      .then(m => m.SellerDashboardComponent),   
  },
    {
    path: 'seller/hidden',
    loadComponent: () => import('./features/seller-hidden/seller-hidden.component')
      .then(m => m.SellerHiddenComponent),
  },
  {
>>>>>>> a7e0a5023192993af9fca2f6f0177ef4dc4ba57c
    path: '',
    redirectTo: 'marketplace',
    pathMatch: 'full',
  },
  {
    path: 'marketplace',
    loadComponent: () =>
      import('./features/marketplace/marketplace.component').then(
        (m) => m.MarketplaceComponent
      ),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./features/cart/cart.component').then(
        (m) => m.CartComponent
      ),
  },
  {
    path: 'donate',
    loadComponent: () =>
      import('./features/donate/donate.component').then(
        (m) => m.DonateComponent
      ),
  },
  {
    path: 'for-centres',
    loadComponent: () =>
      import('./features/centres/for-centres.component').then(
        (m) => m.ForCentresComponent
      ),
  },
  {
    path: 'centre-dashboard',
    loadComponent: () =>
      import('./features/centre-dashboard/centre-dashboard.component').then(
        (m) => m.CentreDashboardComponent
      ),
    // Add an auth guard here once you have one:
    // canActivate: [CentreAuthGuard],
  },
  {
    path: 'register-centre',
    loadComponent: () =>
      import('./features/centres/register-centre.component').then(
        (m) => m.RegisterCentreComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'marketplace',
  },
];