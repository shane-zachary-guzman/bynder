import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  // Public splash / gallery — no auth required
  { path: '', loadComponent: () => import('./splash/splash').then(m => m.Splash) },
  {
    path: 'auth',
    children: [
      { path: 'login',    loadComponent: () => import('./auth/login/login').then(m => m.Login) },
      { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'collections',
    canActivate: [authGuard],
    children: [
      { path: '',    loadComponent: () => import('./collections/collection-list/collection-list').then(m => m.CollectionList) },
      { path: ':id', loadComponent: () => import('./cards/card-list/card-list').then(m => m.CardList) }
    ]
  },
  {
    path: 'billing',
    canActivate: [authGuard],
    loadComponent: () => import('./billing/pricing/pricing').then(m => m.Pricing)
  },
  { path: '**', redirectTo: '' }
];
