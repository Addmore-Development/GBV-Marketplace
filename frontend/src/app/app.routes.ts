import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'register/centre',
    loadComponent: () =>
      import('./features/centre-register/centre-register.component')
        .then(m => m.CentreRegisterComponent),
  },
  {
    path: '',
    redirectTo: 'register/centre',
    pathMatch: 'full',
  },
];