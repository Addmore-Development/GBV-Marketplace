import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-centre-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  template: `
<div class="login-page">
  <div class="login-card">
    <a routerLink="/marketplace" class="back-link">← Back to Marketplace</a>
    <div class="logo">
      <div class="logo-mark">A</div>
      <div class="logo-text">
        <span class="logo-name">Amani</span>
        <span class="logo-sub">Centre Portal</span>
      </div>
    </div>
    <h2>Centre Login</h2>
    <p class="subtitle">Access your centre management dashboard</p>
    <div class="form-group">
      <label>Contact Email</label>
      <input type="email" [(ngModel)]="email" placeholder="centre@email.co.za" autocomplete="email">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" [(ngModel)]="password" placeholder="Enter your password" autocomplete="current-password">
    </div>
    <div class="error-msg" *ngIf="error">{{ error }}</div>
    <button class="btn-login" (click)="login()" [disabled]="isLoading">
      {{ isLoading ? 'Signing in...' : 'Sign in to Dashboard' }}
    </button>
    <p class="register-link">
      Not registered yet? <a routerLink="/register/centre">Register your centre</a>
    </p>
  </div>
</div>
  `,
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #F3F4F6; font-family: 'DM Sans', sans-serif; }
    .login-page { width: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .login-card { background: white; border-radius: 16px; padding: 40px; max-width: 420px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .back-link { font-size: .82rem; color: #5A7A3A; text-decoration: none; display: inline-block; margin-bottom: 24px; }
    .back-link:hover { text-decoration: underline; }
    .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
    .logo-mark { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #F5E9C8, #C49A3C); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; color: #1A3009; }
    .logo-name { display: block; font-size: 1.1rem; font-weight: 700; color: #1A3009; }
    .logo-sub { display: block; font-size: .72rem; color: #9CA3AF; }
    h2 { font-size: 1.5rem; font-weight: 700; color: #1C2B1A; margin: 0 0 6px; }
    .subtitle { font-size: .86rem; color: #6B7280; margin-bottom: 28px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: .76rem; font-weight: 700; color: #1C2B1A; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .4px; }
    .form-group input { width: 100%; padding: 11px 14px; border: 1.5px solid #E5E7EB; border-radius: 9px; font-size: .9rem; font-family: 'DM Sans', sans-serif; outline: none; box-sizing: border-box; }
    .form-group input:focus { border-color: #2D5016; }
    .error-msg { background: #FEE2E2; color: #991B1B; padding: 10px 14px; border-radius: 8px; font-size: .82rem; margin-bottom: 14px; }
    .btn-login { width: 100%; padding: 13px; background: #2D5016; color: white; border: none; border-radius: 10px; font-size: .96rem; font-weight: 700; font-family: 'DM Sans', sans-serif; cursor: pointer; margin-top: 4px; }
    .btn-login:hover { background: #3D6B20; }
    .btn-login:disabled { opacity: .6; cursor: not-allowed; }
    .register-link { text-align: center; font-size: .82rem; color: #6B7280; margin-top: 18px; }
    .register-link a { color: #2D5016; font-weight: 700; text-decoration: none; }
    .register-link a:hover { text-decoration: underline; }
  `]
})
export class CentreLoginComponent {
  email = '';
  password = '';
  error = '';
  isLoading = false;

  constructor(private http: HttpClient, private router: Router) {}

  login(): void {
    if (!this.email || !this.password) { this.error = 'Email and password are required'; return; }
    this.isLoading = true;
    this.error = '';
    this.http.post<any>(`${environment.apiUrl}/api/centres/login`, { email: this.email, password: this.password })
      .subscribe({
        next: (res) => {
          localStorage.setItem('centreId', res.centre_id || '');
          localStorage.setItem('centreName', res.centre_name || '');
          localStorage.setItem('centreType', res.centre_type || '');
          localStorage.setItem('centreEmail', res.contact_email || '');
          localStorage.setItem('centreManagerName', res.contact_person_name || '');
          localStorage.setItem('centreCity', res.city || '');
          localStorage.setItem('centreProvince', res.province || '');
          localStorage.setItem('centrePhone', res.contact_phone || '');
          localStorage.setItem('centreNpoNumber', res.npo_number || '');
          this.isLoading = false;
          this.router.navigate(['/centre-dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.error = err.error?.error || 'Login failed. Please check your credentials.';
        }
      });
  }
}