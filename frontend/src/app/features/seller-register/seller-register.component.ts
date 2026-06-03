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

@Component({
  selector: 'app-seller-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './seller-register.component.html',
  styleUrls: ['./seller-register.component.scss'],
})
export class SellerRegisterComponent implements OnInit {
  private readonly API = 'http://localhost:3000/api/sellers';

  // Form fields
  idNumber = '';
  fullName = '';
  email = '';
  pin = '';
  selectedCentreId = '';
  selectedCentreName = '';

  // Centres data
  allCentres: Centre[] = [];
  filteredCentres: Centre[] = [];

  // State
  isLoading = false;
  error = '';
  idVerified = false;
  idError = '';
  idCheckTimeout: any;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadCentres();
  }

  loadCentres(): void {
    this.http.get<Centre[]>(`${this.API}/centres/verified`).subscribe({
      next: (centres) => {
        this.allCentres = centres;
        this.filteredCentres = centres;
      },
      error: () => {
        this.error = 'Could not load centres. Please refresh the page.';
      }
    });
  }

  onCentreSearch(): void {
    const search = this.selectedCentreName.toLowerCase();
    this.filteredCentres = this.allCentres.filter(c =>
      c.name.toLowerCase().includes(search) || c.city.toLowerCase().includes(search)
    );
    // If exact match by name, auto-set the ID
    const match = this.allCentres.find(c => c.name === this.selectedCentreName);
    if (match) {
      this.selectedCentreId = match.id;
    } else {
      this.selectedCentreId = '';
    }
  }

  // ── ID verification ──
  onIdInput(): void {
    this.idVerified = false;
    this.idError = '';
    clearTimeout(this.idCheckTimeout);
    if (this.idNumber.length === 13) {
      this.idCheckTimeout = setTimeout(() => this.verifyId(), 400);
    }
  }

  verifyId(): void {
    this.isLoading = true;
    this.http.post<any>(`${this.API}/verify-id`, { id_number: this.idNumber }).subscribe({
      next: () => {
        this.idVerified = true;
        this.idError = '';
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.idVerified = false;
        if (err.error?.code === 'ALREADY_EXISTS') {
          this.idError = 'This ID is already registered. Please sign in instead.';
        } else if (err.error?.code === 'NOT_FEMALE') {
          this.idError = 'This platform is currently available to female-identifying individuals.';
        } else {
          this.idError = err.error?.error || 'Please check your ID number and try again.';
        }
      }
    });
  }

  // ── Registration ──
  register(): void {
    this.error = '';

    if (!this.idVerified) {
      this.error = 'Please enter a valid ID number.';
      return;
    }
    if (!this.fullName.trim()) {
      this.error = 'Please enter your full name.';
      return;
    }
    if (!this.email.trim()) {
      this.error = 'Email address is required.';
      return;
    }
    if (!this.pin || this.pin.length < 4) {
      this.error = 'PIN must be at least 4 digits.';
      return;
    }
    if (!/^\d{4,6}$/.test(this.pin)) {
      this.error = 'PIN must be 4–6 digits only.';
      return;
    }
    if (!this.selectedCentreId) {
      this.error = 'Please select a nearest Amani workshop from the list.';
      return;
    }

    const nameParts = this.fullName.trim().split(/\s+/);
    const real_name = nameParts[0];
    const real_surname = nameParts.slice(1).join(' ') || '';

    let alias = this.email.split('@')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
    if (!alias) alias = `maker_${Date.now()}`;

    this.isLoading = true;

    const payload = {
      id_number: this.idNumber,
      real_name,
      real_surname,
      email: this.email,
      pin: this.pin,
      alias,
      phone: '0000000000',
      centre_id: this.selectedCentreId,
      accepted_terms: true,
      accepted_popia: true,
      safety_acknowledged: true,
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
          this.error = 'This email or maker name is already taken. Please try a different email.';
        } else {
          this.error = err.error?.error || 'Something went wrong. Please try again.';
        }
      }
    });
  }

  quickExit(): void {
    window.location.href = '/news';
  }
}