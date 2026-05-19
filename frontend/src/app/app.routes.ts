import { Routes } from '@angular/router';

export const routes: Routes = [
  {
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
    path: '',
    redirectTo: 'register/centre',
    pathMatch: 'full',
  },
];