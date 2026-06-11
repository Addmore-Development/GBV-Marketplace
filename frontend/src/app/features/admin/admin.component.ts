import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

type AdminTab = 'overview' | 'sellers' | 'centres' | 'buyers' | 'messages' | 'donations';

interface AdminStats {
  totalSellers: number;
  pendingSellers: number;
  approvedSellers: number;
  totalCentres: number;
  pendingCentres: number;
  approvedCentres: number;
  totalBuyers: number;
  totalDonations: number;
  totalDonationAmount: number;
  totalSalesAmount: number;
  totalOrders: number;
}

interface SellerRow {
  id: string;
  alias: string;
  real_name: string;
  real_surname: string;
  email: string;
  city: string;
  centre_name: string;
  verification_status: string;
  profile_complete: boolean;
  total_earned: number;
  total_sales: number;
  created_at: string;
}

interface CentreRow {
  id: string;
  centre_name: string;
  city: string;
  province: string;
  contact_name: string;
  contact_email: string;
  status: string;
  npo_number: string;
  seller_count: number;
  created_at: string;
}

interface BuyerRow {
  id: string;
  name: string;
  email: string;
  total_spent: number;
  order_count: number;
  created_at: string;
}

interface MessageRow {
  id: string;
  sender_type: 'seller' | 'centre';
  sender_name: string;
  sender_email: string;
  subject: string;
  body: string;
  read: boolean;
  reply?: string;
  created_at: string;
}

interface DonationRow {
  id: string;
  donor_name: string;
  donor_email: string;
  amount: number;
  centre_name: string;
  message?: string;
  created_at: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  private readonly API = 'http://localhost:3000/api/admin';

  // ── Auth ──────────────────────────────────────────────────
  isAuthenticated = false;
  adminPin = '';
  authError = '';
  readonly ADMIN_PIN = 'amani2024'; // In production: server-side session

  // ── Tabs ──────────────────────────────────────────────────
  activeTab: AdminTab = 'overview';

  // ── Data ──────────────────────────────────────────────────
  isLoading = true;
  stats: AdminStats = {
    totalSellers: 0, pendingSellers: 0, approvedSellers: 0,
    totalCentres: 0, pendingCentres: 0, approvedCentres: 0,
    totalBuyers: 0, totalDonations: 0, totalDonationAmount: 0,
    totalSalesAmount: 0, totalOrders: 0,
  };

  sellers: SellerRow[] = [];
  centres: CentreRow[] = [];
  buyers: BuyerRow[] = [];
  messages: MessageRow[] = [];
  donations: DonationRow[] = [];

  // ── Filters ───────────────────────────────────────────────
  sellerFilter = 'all';
  centreFilter = 'all';
  searchQuery = '';

  // ── Messaging ─────────────────────────────────────────────
  selectedMsg: MessageRow | null = null;
  replyText = '';
  replySending = false;

  // ── Add buyer ─────────────────────────────────────────────
  showAddBuyer = false;
  newBuyer = { name: '', email: '', password: '' };
  buyerSaveError = '';

  // ── Toast ─────────────────────────────────────────────────
  toastMsg = '';
  toastVisible = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('adminAuth');
    if (saved === 'true') {
      this.isAuthenticated = true;
      this.loadAll();
    } else {
      this.isLoading = false;
    }
  }

  // ── Auth ──────────────────────────────────────────────────
  login(): void {
    if (this.adminPin === this.ADMIN_PIN) {
      localStorage.setItem('adminAuth', 'true');
      this.isAuthenticated = true;
      this.authError = '';
      this.loadAll();
    } else {
      this.authError = 'Incorrect PIN.';
    }
  }

  logout(): void {
    localStorage.removeItem('adminAuth');
    this.isAuthenticated = false;
    this.router.navigate(['/marketplace']);
  }

  // ── Load data ─────────────────────────────────────────────
  loadAll(): void {
    this.isLoading = true;
    // Load stats
    this.http.get<AdminStats>(`${this.API}/stats`).subscribe({
      next: (s) => { this.stats = s; this.cdr.detectChanges(); },
      error: () => this.loadMockStats()
    });
    this.loadSellers();
    this.loadCentres();
    this.loadBuyers();
    this.loadMessages();
    this.loadDonations();
    this.isLoading = false;
  }

  loadMockStats(): void {
    this.stats = {
      totalSellers: this.sellers.length,
      pendingSellers: this.sellers.filter(s => s.verification_status === 'pending').length,
      approvedSellers: this.sellers.filter(s => s.verification_status === 'approved').length,
      totalCentres: this.centres.length,
      pendingCentres: this.centres.filter(c => c.status === 'pending').length,
      approvedCentres: this.centres.filter(c => c.status === 'approved').length,
      totalBuyers: this.buyers.length,
      totalDonations: this.donations.length,
      totalDonationAmount: this.donations.reduce((s, d) => s + d.amount, 0),
      totalSalesAmount: this.sellers.reduce((s, sl) => s + sl.total_earned, 0),
      totalOrders: 0,
    };
    this.cdr.detectChanges();
  }

  loadSellers(): void {
    this.http.get<SellerRow[]>(`${this.API}/sellers`).subscribe({
      next: (d) => { this.sellers = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadCentres(): void {
    this.http.get<CentreRow[]>(`${this.API}/centres`).subscribe({
      next: (d) => { this.centres = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadBuyers(): void {
    this.http.get<BuyerRow[]>(`${this.API}/buyers`).subscribe({
      next: (d) => { this.buyers = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadMessages(): void {
    this.http.get<MessageRow[]>(`${this.API}/messages`).subscribe({
      next: (d) => { this.messages = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadDonations(): void {
    this.http.get<DonationRow[]>(`${this.API}/donations`).subscribe({
      next: (d) => { this.donations = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  // ── Seller actions ────────────────────────────────────────
  approveSeller(id: string): void {
    this.http.put(`${this.API}/sellers/${id}/approve`, {}).subscribe({
      next: () => {
        const s = this.sellers.find(x => x.id === id);
        if (s) s.verification_status = 'approved';
        this.showToast('Seller approved');
        this.loadMockStats();
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  rejectSeller(id: string): void {
    if (!confirm('Reject this seller application?')) return;
    this.http.put(`${this.API}/sellers/${id}/reject`, {}).subscribe({
      next: () => {
        const s = this.sellers.find(x => x.id === id);
        if (s) s.verification_status = 'rejected';
        this.showToast('Seller rejected');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  deleteSeller(id: string): void {
    if (!confirm('Permanently delete this seller account? This cannot be undone.')) return;
    this.http.delete(`${this.API}/sellers/${id}`).subscribe({
      next: () => {
        this.sellers = this.sellers.filter(s => s.id !== id);
        this.showToast('Seller deleted');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  // ── Centre actions ────────────────────────────────────────
  approveCentre(id: string): void {
    this.http.put(`${this.API}/centres/${id}/approve`, {}).subscribe({
      next: () => {
        const c = this.centres.find(x => x.id === id);
        if (c) c.status = 'approved';
        this.showToast('Centre approved');
        this.loadMockStats();
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  rejectCentre(id: string): void {
    if (!confirm('Reject this centre application?')) return;
    this.http.put(`${this.API}/centres/${id}/reject`, {}).subscribe({
      next: () => {
        const c = this.centres.find(x => x.id === id);
        if (c) c.status = 'rejected';
        this.showToast('Centre rejected');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  deleteCentre(id: string): void {
    if (!confirm('Permanently delete this centre? This will affect all associated sellers.')) return;
    this.http.delete(`${this.API}/centres/${id}`).subscribe({
      next: () => {
        this.centres = this.centres.filter(c => c.id !== id);
        this.showToast('Centre deleted');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  // ── Buyer actions ─────────────────────────────────────────
  addBuyer(): void {
    this.buyerSaveError = '';
    if (!this.newBuyer.name || !this.newBuyer.email || !this.newBuyer.password) {
      this.buyerSaveError = 'All fields required.'; return;
    }
    this.http.post<BuyerRow>(`${this.API}/buyers`, this.newBuyer).subscribe({
      next: (b) => {
        this.buyers.unshift(b);
        this.showAddBuyer = false;
        this.newBuyer = { name: '', email: '', password: '' };
        this.showToast('Buyer added');
        this.cdr.detectChanges();
      },
      error: () => { this.buyerSaveError = 'Could not add buyer.'; }
    });
  }

  deleteBuyer(id: string): void {
    if (!confirm('Delete this buyer account?')) return;
    this.http.delete(`${this.API}/buyers/${id}`).subscribe({
      next: () => {
        this.buyers = this.buyers.filter(b => b.id !== id);
        this.showToast('Buyer deleted');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  // ── Messaging ─────────────────────────────────────────────
  openMessage(msg: MessageRow): void {
    this.selectedMsg = msg;
    this.replyText = '';
    if (!msg.read) {
      this.http.put(`${this.API}/messages/${msg.id}/read`, {}).subscribe({
        next: () => { msg.read = true; this.cdr.detectChanges(); },
        error: () => {}
      });
    }
  }

  sendReply(): void {
    if (!this.selectedMsg || !this.replyText.trim()) return;
    this.replySending = true;
    this.http.post(`${this.API}/messages/${this.selectedMsg.id}/reply`, { reply: this.replyText }).subscribe({
      next: () => {
        if (this.selectedMsg) this.selectedMsg.reply = this.replyText;
        this.replyText = '';
        this.replySending = false;
        this.showToast('Reply sent');
        this.cdr.detectChanges();
      },
      error: () => {
        this.replySending = false;
        this.showToast('Error sending reply');
      }
    });
  }

  // ── Filters ───────────────────────────────────────────────
  get filteredSellers(): SellerRow[] {
    let list = this.sellers;
    if (this.sellerFilter !== 'all') list = list.filter(s => s.verification_status === this.sellerFilter);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s => s.alias.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    return list;
  }

  get filteredCentres(): CentreRow[] {
    let list = this.centres;
    if (this.centreFilter !== 'all') list = list.filter(c => c.status === this.centreFilter);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(c => c.centre_name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q));
    }
    return list;
  }

  get unreadCount(): number { return this.messages.filter(m => !m.read).length; }

  // ── Helpers ───────────────────────────────────────────────
  showToast(msg: string): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; this.cdr.detectChanges(); }, 3000);
  }

  formatCurrency(n: number): string { return `R${Number(n || 0).toFixed(0)}`; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('en-ZA') : '—'; }

  statusClass(s: string): string {
    if (s === 'approved') return 'badge-green';
    if (s === 'rejected') return 'badge-red';
    return 'badge-amber';
  }
}
