import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Centre {
  id: string;
  name: string;
  city: string;
  province: string;
}

@Component({
  selector: 'app-seller-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './seller-register.component.html',
  styleUrls: ['./seller-register.component.scss'],
})
export class SellerRegisterComponent implements OnInit {
  private readonly API = `${environment.apiUrl}/api/sellers`;

  idNumber = '';
  fullName = '';
  email = '';
  pin = '';
  selectedCentreId = '';

  centres: Centre[] = [];
  centresLoading = false;
  centresError = '';

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
      /^.{8,}$/.test(this.pin) &&
      this.selectedCentreId.length > 0 &&
      !this.isLoading
    );
  }

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchCentres();
  }

  fetchCentres(): void {
    this.centresLoading = true;
    this.centresError = '';
    this.http.get<any[]>(`${this.API}/centres/verified`).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.centres = data.map((c: any) => ({
            id: c.id,
            name: c.name || c.centre_name,
            city: c.city,
            province: c.province,
          }));
        } else {
          this.centres = [];
          this.centresError = 'No centres have been approved yet. Please check back soon.';
        }
        this.centresLoading = false;
      },
      error: () => {
        this.centres = [];
        this.centresError = "Couldn't load the list of centres — check your connection and try again.";
        this.centresLoading = false;
      }
    });
  }

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
        } else if (err.error?.code === 'CENTRE_NOT_APPROVED') {
          this.error = 'The centre you selected is still awaiting admin approval and cannot accept new sellers yet. Please choose another centre or check back soon.';
        } else {
          this.error = err.error?.error || 'Something went wrong. Please try again.';
        }
      }
    });
  }

  quickExit(): void { window.location.href = '/news'; }
}