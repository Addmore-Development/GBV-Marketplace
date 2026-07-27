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

    // Route through SellerAuthService so the shared session state updates
    // on the marketplace/centre pages and any other role's stale session
    // (e.g. an old buyer login) gets cleared on sign-in.
    this.sellerAuth.login(this.email.trim().toLowerCase(), this.pin).subscribe({
      next: () => {
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