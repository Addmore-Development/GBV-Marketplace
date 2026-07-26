// ============================================================
// frontend/src/app/features/seller-login/seller-login.component.ts
// ============================================================
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SellerAuthService } from '../../services/seller-auth.service';

@Component({
  selector: 'app-seller-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './seller-login.component.html',
  styleUrls: ['./seller-login.component.scss'],
})
export class SellerLoginComponent {
  email = '';
  pin = '';
  error = '';
  isLoading = false;

  constructor(private http: HttpClient, private router: Router, private sellerAuth: SellerAuthService) {}

  login(): void {
    if (!this.email || !this.pin) {
      this.error = 'Email and PIN are required';
      return;
    }
    this.isLoading = true;
    this.error = '';

    this.http.post<any>(`${environment.apiUrl}/api/sellers/login`, {
      email: this.email.trim().toLowerCase(),
      pin: this.pin,
    }).subscribe({
      next: (res) => {
        // Store all session keys needed by dashboard
        localStorage.setItem('sellerId', res.id);
        localStorage.setItem('sellerAlias', res.alias);
        localStorage.setItem('sellerEmail', res.email);
        localStorage.setItem('hiddenPin', this.pin);
        localStorage.setItem('hiddenLayerAccess', 'false');
        // Update auth state so nav reflects logged-in seller on the
        // marketplace/centre pages, which read sellerAuth.user$ rather
        // than localStorage directly.
        const sellerUser = {
          id: res.id,
          alias: res.alias,
          email: res.email,
          verification_status: res.verification_status || 'pending',
          hidden_layer_granted: !!res.hidden_layer_granted,
        };
        localStorage.setItem('sellerUser', JSON.stringify(sellerUser));
        this.sellerAuth['userSubject'].next(sellerUser);
        this.isLoading = false;
        this.router.navigate(['/seller/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Sign in failed. Please check your email and PIN.';
      }
    });
  }

  quickExit(): void {
    window.location.href = '/news';
  }
}