import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

interface Centre {
  id: string;
  name: string;
  city: string;
  province: string;
}

const STATIC_CENTRES: Centre[] = [
  { id: 'c1', name: 'Thistle House GBV Centre',   city: 'Cape Town',      province: 'Western Cape' },
  { id: 'c2', name: 'New Beginnings NPO',          city: 'Johannesburg',   province: 'Gauteng' },
  { id: 'c3', name: 'Ubuntu Youth Programme',      city: 'Johannesburg',   province: 'Gauteng' },
  { id: 'c4', name: 'Khanya Elderly Home',         city: 'Pretoria',       province: 'Gauteng' },
  { id: 'c5', name: "Khayelitsha Women's Hub",     city: 'Cape Town',      province: 'Western Cape' },
  { id: 'c6', name: 'Empilweni Care Centre',       city: 'Durban',         province: 'KwaZulu-Natal' },
  { id: 'c7', name: "Sunshine Children's Village", city: 'Bloemfontein',   province: 'Free State' },
  { id: 'c8', name: "Ubuntu Women's Centre",       city: 'Port Elizabeth', province: 'Eastern Cape' },
];

@Component({
  selector: 'app-seller-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './seller-register.component.html',
  styleUrls: ['./seller-register.component.scss'],
})
export class SellerRegisterComponent implements OnInit {
  private readonly API = 'http://localhost:3000/api/sellers';

  idNumber = '';
  fullName = '';
  email = '';
  pin = '';
  selectedCentreId = '';

  readonly centres: Centre[] = STATIC_CENTRES;

  isLoading = false;
  error = '';
  idVerified = false;
  idError = '';

  // ── Computed: all fields valid ──────────────────────────────
  get canSubmit(): boolean {
    return (
      this.idVerified &&
      this.fullName.trim().length > 0 &&
      this.email.trim().length > 0 &&
      /^\d{4,6}$/.test(this.pin) &&
      this.selectedCentreId.length > 0 &&
      !this.isLoading
    );
  }

  constructor(private http: HttpClient, private router: Router) {}
  ngOnInit(): void {}

  // ── BUG FIX: write cleaned digits BACK to the bound field ──
  onIdInput(): void {
    const cleaned = this.idNumber.replace(/\D/g, '');
    this.idNumber = cleaned;          // ← this line was missing, causing the button to stay disabled
    this.idVerified = false;
    this.idError = '';
    if (cleaned.length === 13) {
      this.verifyIdLocally(cleaned);
    }
  }

  private verifyIdLocally(id: string): void {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      let digit = parseInt(id[i], 10);
      if (i % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
      sum += digit;
    }
    if (sum % 10 !== 0) {
      this.idError = 'ID number appears invalid — check the digits.';
      return;
    }
    this.idVerified = true;
  }

  register(): void {
    this.error = '';
    if (!this.canSubmit) { this.error = 'Please complete all fields.'; return; }

    const nameParts = this.fullName.trim().split(/\s+/);
    const real_name = nameParts[0];
    const real_surname = nameParts.slice(1).join(' ') || '';
    let alias = this.email.split('@')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
    if (!alias) alias = `maker_${Date.now()}`;

    this.isLoading = true;

    const payload = {
      id_number: this.idNumber,
      real_name, real_surname,
      email: this.email, pin: this.pin, alias,
      phone: '0000000000',
      centre_id: this.selectedCentreId,
      accepted_terms: true, accepted_popia: true, safety_acknowledged: true,
    };

    this.http.post<any>(`${this.API}/register`, payload).subscribe({
      next: (res) => {
        localStorage.setItem('sellerId', res.seller_id);
        localStorage.setItem('sellerAlias', res.alias);
        localStorage.setItem('sellerEmail', res.email);
        localStorage.setItem('hiddenPin', this.pin);
        localStorage.setItem('hiddenLayerAccess', 'false');
        this.isLoading = false;
        this.router.navigate(['/seller/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.error?.code === 'ALREADY_EXISTS' || err.status === 409) {
          this.error = 'This email is already registered. Please sign in instead.';
        } else {
          this.error = err.error?.error || 'Something went wrong. Please try again.';
        }
      }
    });
  }

  quickExit(): void { window.location.href = '/news'; }
}
