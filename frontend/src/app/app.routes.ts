// ============================================================
// frontend/src/app/app.routes.ts
// ============================================================
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
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
    path: 'marketplace/:id',
    loadComponent: () =>
      import('./features/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
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

  // ── Contribute / Centres page (replaces donate in nav) ───
  {
    path: 'centres',
    loadComponent: () =>
      import('./features/centres/centres.component').then(
        (m) => m.CentresComponent
      ),
  },

  // ── Centre registration & dashboard ──────────────────────
  {
    path: 'register/centre',
    loadComponent: () =>
      import('./features/centre-register/centre-register.component')
        .then(m => m.CentreRegisterComponent),
  },
  {
    path: 'centre-dashboard',
    loadComponent: () =>
      import('./features/centre-dashboard/centre-dashboard.component').then(
        (m) => m.CentreDashboardComponent
      ),
    // canActivate: [CentreAuthGuard],
  },
  {
    path: 'register-centre',
    loadComponent: () =>
      import('./features/centres/register-centre.component').then(
        (m) => m.RegisterCentreComponent
      ),
  },

  // ── Seller routes ─────────────────────────────────────────
  {
    path: 'register/seller',
    loadComponent: () =>
      import('./features/seller-register/seller-register.component')
        .then(m => m.SellerRegisterComponent),
  },
  {
    path: 'seller/dashboard',
    loadComponent: () =>
      import('./features/seller-dashboard/seller-dashboard.component')
        .then(m => m.SellerDashboardComponent),
  },
  {
    path: 'seller/hidden',
    loadComponent: () =>
      import('./features/seller-hidden/seller-hidden.component')
        .then(m => m.SellerHiddenComponent),
  },

  {
    path: '**',
    redirectTo: 'marketplace',
  },
];