import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

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

  constructor(private http: HttpClient, private router: Router) {}

  login(): void {
    if (!this.email || !this.pin) {
      this.error = 'Email and PIN are required';
      return;
    }
    this.isLoading = true;
    this.error = '';

    this.http.post('http://localhost:3000/api/sellers/login', {
      email: this.email,
      pin: this.pin,
    }).subscribe({
      next: (res: any) => {
        localStorage.setItem('sellerId', res.seller_id);
        localStorage.setItem('sellerAlias', res.alias);
        localStorage.setItem('sellerEmail', res.email);
        localStorage.setItem('hiddenPin', this.pin);  // store for hidden layer
        localStorage.setItem('hiddenLayerAccess', 'false');
        this.isLoading = false;
        this.router.navigate(['/seller/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Login failed. Please check your email and PIN.';
      }
    });
  }
}