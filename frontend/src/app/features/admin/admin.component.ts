import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RealtimeService } from '../../services/realtime.service';

type AdminTab = 'overview' | 'sellers' | 'centres' | 'buyers' | 'messages' | 'donations' | 'safety' | 'activity' | 'sales';

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

interface VolunteerRow {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  skills?: string;
  availability?: string;
  centre_name: string;
  message?: string;
  status: string;
  created_at: string;
}

interface EmergencyAlert {
  id: string;
  seller_id: string;
  seller_alias: string;
  seller_email: string;
  centre_id: string | null;
  centre_name: string | null;
  location_hint: string | null;
  recording_path: string | null;
  recording_uploaded_at: string | null;
  created_at: string;
}

interface EmergencyStats {
  totalAlerts: number;
  alertsWithRecording: number;
  alertsWithLocation: number;
  recordingSuccessRate: number;
  locationSuccessRate: number;
  alertsLast7Days: number;
  alertsLast30Days: number;
  avgUploadSeconds: number | null;
  byCentre: { centreName: string; count: number }[];
}

interface ActivityRow {
  id: string;
  user_type: 'centre' | 'seller';
  user_id: string;
  display_name: string | null;
  email: string | null;
  action: 'login' | 'logout';
  ip_address: string | null;
  created_at: string;
}

interface OrderItemRow {
  product_title: string;
  seller_alias: string;
  centre_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  survivor_amount: number;
  centre_amount: number;
  platform_amount: number;
}

interface SaleRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  subtotal: number;
  platform_fee_total: number;
  delivery_fee: number;
  total: number;
  payment_method: string | null;
  payment_confirmed: boolean;
  status: string;
  created_at: string;
  items: OrderItemRow[];
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly API = `${environment.apiUrl}/api/admin`;

  // ── Auth ──────────────────────────────────────────────────
  isAuthenticated = false;
  mobileNavOpen = false;
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
  volunteers: VolunteerRow[] = [];

  // ── Emergency / SOS alerts ──────────────────────────────────
  emergencyAlerts: EmergencyAlert[] = [];
  emergencyStats: EmergencyStats = {
    totalAlerts: 0, alertsWithRecording: 0, alertsWithLocation: 0,
    recordingSuccessRate: 0, locationSuccessRate: 0,
    alertsLast7Days: 0, alertsLast30Days: 0, avgUploadSeconds: null, byCentre: [],
  };
  loadingEmergency = false;
  private readonly MEDIA_BASE = environment.apiUrl;
  private emergencyPollHandle: any = null;

  // ── Live top banner — a survivor needs help right now ──────
  activeEmergencyBanner: EmergencyAlert | null = null;
  private realtimeSubs: Subscription[] = [];

  // ── Login/Logout Activity ────────────────────────────────
  activity: ActivityRow[] = [];
  activityFilter: 'all' | 'centre' | 'seller' = 'all';
  loadingActivity = false;

  // ── Sales ─────────────────────────────────────────────────
  sales: SaleRow[] = [];
  expandedSaleId: string | null = null;
  loadingSales = false;

  // ── Filters ───────────────────────────────────────────────
  sellerFilter = 'all';
  centreFilter = 'all';
  searchQuery = '';

  // ── Messaging ─────────────────────────────────────────────
  selectedMsg: MessageRow | null = null;
  replyText = '';
  replySending = false;

  // ── Toast ─────────────────────────────────────────────────
  toastMsg = '';
  toastVisible = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private realtime: RealtimeService
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
    if (this.emergencyPollHandle) { clearInterval(this.emergencyPollHandle); this.emergencyPollHandle = null; }
    this.teardownRealtime();
    this.router.navigate(['/marketplace']);
  }

  ngOnDestroy(): void {
    if (this.emergencyPollHandle) clearInterval(this.emergencyPollHandle);
    this.teardownRealtime();
  }

  // ── Real-time: live SOS banner + live seller/buyer signups ─────────
  private setupRealtime(): void {
    if (this.realtimeSubs.length) return; // already listening
    this.realtime.join('admin');

    this.realtimeSubs.push(
      this.realtime.on<EmergencyAlert>('emergency:new').subscribe((alert) => {
        // Show it on the banner immediately, and fold it into the list/stats
        // that the Safety tab already renders, so both stay in sync.
        this.activeEmergencyBanner = alert;
        this.emergencyAlerts = [alert, ...this.emergencyAlerts.filter(a => a.id !== alert.id)];
        this.emergencyStats = { ...this.emergencyStats, totalAlerts: this.emergencyStats.totalAlerts + 1 };
        this.showToast(`🚨 Silent alarm: ${alert.seller_alias || 'a seller'} needs help`);
        this.cdr.detectChanges();
      })
    );

    this.realtimeSubs.push(
      this.realtime.on<SellerRow>('seller:new').subscribe((seller) => {
        this.sellers = [seller, ...this.sellers.filter(s => s.id !== seller.id)];
        this.stats = { ...this.stats, totalSellers: this.stats.totalSellers + 1, pendingSellers: this.stats.pendingSellers + 1 };
        this.showToast(`New seller registered: ${seller.alias || seller.email}`);
        this.cdr.detectChanges();
      })
    );

    this.realtimeSubs.push(
      this.realtime.on<BuyerRow>('buyer:new').subscribe((buyer) => {
        this.buyers = [buyer, ...this.buyers.filter(b => b.email !== buyer.email)];
        this.stats = { ...this.stats, totalBuyers: this.stats.totalBuyers + 1 };
        this.showToast(`New buyer registered: ${buyer.name || buyer.email}`);
        this.cdr.detectChanges();
      })
    );

    this.realtimeSubs.push(
      this.realtime.on<DonationRow>('donation:new').subscribe((donation) => {
        this.donations = [donation, ...this.donations.filter(d => d.id !== donation.id)];
        this.stats = {
          ...this.stats,
          totalDonations: this.stats.totalDonations + 1,
          totalDonationAmount: this.stats.totalDonationAmount + (Number(donation.amount) || 0),
        };
        this.showToast(`New donation from ${donation.donor_name} to ${donation.centre_name}`);
        this.cdr.detectChanges();
      })
    );

    this.realtimeSubs.push(
      this.realtime.on<VolunteerRow>('volunteer:new').subscribe((application) => {
        this.volunteers = [application, ...this.volunteers.filter(v => v.id !== application.id)];
        this.showToast(`New volunteer application from ${application.full_name} for ${application.centre_name}`);
        this.cdr.detectChanges();
      })
    );
  }

  private teardownRealtime(): void {
    this.realtimeSubs.forEach(s => s.unsubscribe());
    this.realtimeSubs = [];
    this.realtime.leave('admin');
  }

  openEmergencyBanner(): void {
    this.activeTab = 'safety';
    this.activeEmergencyBanner = null;
  }

  dismissEmergencyBanner(event: Event): void {
    event.stopPropagation();
    this.activeEmergencyBanner = null;
  }

  private get adminHeaders() {
    return { headers: { 'x-admin-pin': this.ADMIN_PIN } };
  }

  // ── Load data ─────────────────────────────────────────────
  loadAll(): void {
    this.isLoading = true;
    this.http.get<AdminStats>(`${this.API}/stats`, this.adminHeaders).subscribe({
      next: (s) => { this.stats = s; this.cdr.detectChanges(); },
      error: () => this.loadMockStats()
    });
    this.loadSellers();
    this.loadCentres();
    this.loadBuyers();
    this.loadMessages();
    this.loadDonations();
    this.loadVolunteers();
    this.loadEmergencyAlerts();
    this.loadEmergencyStats();
    this.loadActivity();
    this.loadSales();
    // Poll for new SOS alerts — a survivor triggering the panic button
    // needs the admin view to update without a manual refresh.
    if (!this.emergencyPollHandle) {
      this.emergencyPollHandle = setInterval(() => {
        this.loadEmergencyAlerts();
        this.loadEmergencyStats();
      }, 15000);
    }
    // Real-time push (Socket.IO) — the banner and live seller/buyer rows
    // update instantly; the poll above stays as a safety net in case the
    // socket connection drops.
    this.setupRealtime();
    this.isLoading = false;
  }

  loadEmergencyAlerts(): void {
    this.loadingEmergency = this.emergencyAlerts.length === 0;
    this.http.get<EmergencyAlert[]>(`${this.API}/emergency`, this.adminHeaders).subscribe({
      next: (d) => { this.emergencyAlerts = d; this.loadingEmergency = false; this.cdr.detectChanges(); },
      error: () => { this.loadingEmergency = false; }
    });
  }

  loadEmergencyStats(): void {
    this.http.get<EmergencyStats>(`${this.API}/emergency/stats`, this.adminHeaders).subscribe({
      next: (d) => { this.emergencyStats = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  isCoords(hint: string | null): boolean {
    return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test((hint || '').trim());
  }

  mediaUrl(path: string): string {
    return path.startsWith('http') ? path : `${this.MEDIA_BASE}${path}`;
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
    this.http.get<SellerRow[]>(`${this.API}/sellers`, this.adminHeaders).subscribe({
      next: (d) => { this.sellers = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadCentres(): void {
    this.http.get<CentreRow[]>(`${this.API}/centres`, this.adminHeaders).subscribe({
      next: (d) => { this.centres = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadBuyers(): void {
    this.http.get<BuyerRow[]>(`${this.API}/buyers`, this.adminHeaders).subscribe({
      next: (d) => { this.buyers = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadMessages(): void {
    this.http.get<MessageRow[]>(`${this.API}/messages`, this.adminHeaders).subscribe({
      next: (d) => { this.messages = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadDonations(): void {
    this.http.get<DonationRow[]>(`${this.API}/donations`, this.adminHeaders).subscribe({
      next: (d) => { this.donations = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadVolunteers(): void {
    this.http.get<VolunteerRow[]>(`${this.API}/volunteers`, this.adminHeaders).subscribe({
      next: (v) => { this.volunteers = v; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadActivity(): void {
    this.loadingActivity = this.activity.length === 0;
    this.http.get<ActivityRow[]>(`${this.API}/activity`, this.adminHeaders).subscribe({
      next: (d) => { this.activity = d; this.loadingActivity = false; this.cdr.detectChanges(); },
      error: () => { this.loadingActivity = false; }
    });
  }

  loadSales(): void {
    this.loadingSales = this.sales.length === 0;
    this.http.get<SaleRow[]>(`${this.API}/sales`, this.adminHeaders).subscribe({
      next: (d) => { this.sales = d; this.loadingSales = false; this.cdr.detectChanges(); },
      error: () => { this.loadingSales = false; }
    });
  }

  toggleSale(id: string): void {
    this.expandedSaleId = this.expandedSaleId === id ? null : id;
  }

  get filteredActivity(): ActivityRow[] {
    let list = this.activity;
    if (this.activityFilter !== 'all') list = list.filter(a => a.user_type === this.activityFilter);
    return list;
  }

  // ── Seller actions ────────────────────────────────────────
  approveSeller(id: string): void {
    this.http.put(`${this.API}/sellers/${id}/approve`, {}, this.adminHeaders).subscribe({
      next: () => {
        const s = this.sellers.find(x => x.id === id);
        if (s) s.verification_status = 'approved';
        if (this.selectedSeller?.id === id) this.selectedSeller.verification_status = 'approved';
        this.showToast('Seller approved');
        this.loadMockStats();
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  rejectSeller(id: string): void {
    if (!confirm('Reject this seller application?')) return;
    this.http.put(`${this.API}/sellers/${id}/reject`, {}, this.adminHeaders).subscribe({
      next: () => {
        const s = this.sellers.find(x => x.id === id);
        if (s) s.verification_status = 'rejected';
        if (this.selectedSeller?.id === id) this.selectedSeller.verification_status = 'rejected';
        this.showToast('Seller rejected');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  deleteSeller(id: string): void {
    if (!confirm('Permanently delete this seller account? This cannot be undone.')) return;
    this.http.delete(`${this.API}/sellers/${id}`, this.adminHeaders).subscribe({
      next: () => {
        this.sellers = this.sellers.filter(s => s.id !== id);
        if (this.selectedSeller?.id === id) this.closeSellerModal();
        this.showToast('Seller deleted');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  // ── Seller detail / edit modal ──────────────────────────────
  selectedSeller: any = null;
  sellerEditMode = false;
  sellerEditForm: any = {};
  loadingSellerDetail = false;
  savingSeller = false;
  sellerSaveError = '';

  viewSeller(id: string): void {
    this.selectedSeller = null;
    this.sellerEditMode = false;
    this.sellerSaveError = '';
    this.loadingSellerDetail = true;
    this.http.get<any>(`${this.API}/sellers/${id}`, this.adminHeaders).subscribe({
      next: (s) => {
        this.selectedSeller = s;
        this.loadingSellerDetail = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingSellerDetail = false;
        this.showToast('Could not load seller details');
      }
    });
  }

  closeSellerModal(): void {
    this.selectedSeller = null;
    this.sellerEditMode = false;
    this.sellerSaveError = '';
  }

  enableSellerEdit(): void {
    if (!this.selectedSeller) return;
    const bank = this.selectedSeller.bank_details || {};
    this.sellerEditForm = {
      alias: this.selectedSeller.alias,
      real_name: this.selectedSeller.real_name,
      real_surname: this.selectedSeller.real_surname,
      email: this.selectedSeller.email,
      phone: this.selectedSeller.phone,
      public_bio: this.selectedSeller.public_bio,
      skills_experience: this.selectedSeller.skills_experience,
      product_categories_text: (this.selectedSeller.product_categories || []).join(', '),
      payout_method: this.selectedSeller.payout_method,
      cash_pickup_note: this.selectedSeller.cash_pickup_note,
      bank_name: bank.bank_name || '',
      account_holder: bank.account_holder || '',
      account_number: bank.account_number || '',
      branch_code: bank.branch_code || '',
    };
    this.sellerEditMode = true;
    this.sellerSaveError = '';
  }

  cancelSellerEdit(): void {
    this.sellerEditMode = false;
    this.sellerSaveError = '';
  }

  saveSellerEdit(): void {
    if (!this.selectedSeller) return;
    this.savingSeller = true;
    this.sellerSaveError = '';

    const f = this.sellerEditForm;
    const payload: any = {
      alias: f.alias,
      real_name: f.real_name,
      real_surname: f.real_surname,
      email: f.email,
      phone: f.phone,
      public_bio: f.public_bio,
      skills_experience: f.skills_experience,
      product_categories: (f.product_categories_text || '').split(',').map((x: string) => x.trim()).filter(Boolean),
      payout_method: f.payout_method,
      cash_pickup_note: f.cash_pickup_note,
    };
    if (f.payout_method === 'eft') {
      payload.bank_details = {
        bank_name: f.bank_name,
        account_holder: f.account_holder,
        account_number: f.account_number,
        branch_code: f.branch_code,
      };
    }

    this.http.patch<any>(`${this.API}/sellers/${this.selectedSeller.id}`, payload, this.adminHeaders).subscribe({
      next: (updated) => {
        this.savingSeller = false;
        this.sellerEditMode = false;
        this.selectedSeller = { ...this.selectedSeller, ...updated };
        const idx = this.sellers.findIndex(s => s.id === updated.id);
        if (idx > -1) this.sellers[idx] = { ...this.sellers[idx], ...updated };
        this.showToast('Seller updated');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingSeller = false;
        this.sellerSaveError = err.error?.error || 'Could not save changes. Please try again.';
      }
    });
  }

  // ── Centre actions ────────────────────────────────────────
  approveCentre(id: string): void {
    this.http.put(`${this.API}/centres/${id}/approve`, {}, this.adminHeaders).subscribe({
      next: () => {
        const c = this.centres.find(x => x.id === id);
        if (c) c.status = 'approved';
        if (this.selectedCentre?.id === id) this.selectedCentre.status = 'approved';
        this.showToast('Centre approved');
        this.loadMockStats();
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  rejectCentre(id: string): void {
    if (!confirm('Reject this centre application?')) return;
    this.http.put(`${this.API}/centres/${id}/reject`, {}, this.adminHeaders).subscribe({
      next: () => {
        const c = this.centres.find(x => x.id === id);
        if (c) c.status = 'rejected';
        if (this.selectedCentre?.id === id) this.selectedCentre.status = 'rejected';
        this.showToast('Centre rejected');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  deleteCentre(id: string): void {
    if (!confirm('Permanently delete this centre? This will affect all associated sellers.')) return;
    this.http.delete(`${this.API}/centres/${id}`, this.adminHeaders).subscribe({
      next: () => {
        this.centres = this.centres.filter(c => c.id !== id);
        if (this.selectedCentre?.id === id) this.closeCentreModal();
        this.showToast('Centre deleted');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Error — check backend')
    });
  }

  // ── Centre detail / edit modal ──────────────────────────────
  selectedCentre: any = null;
  centreEditMode = false;
  centreEditForm: any = {};
  loadingCentreDetail = false;
  savingCentre = false;
  centreSaveError = '';

  viewCentre(id: string): void {
    this.selectedCentre = null;
    this.centreEditMode = false;
    this.centreSaveError = '';
    this.loadingCentreDetail = true;
    this.http.get<any>(`${this.API}/centres/${id}`, this.adminHeaders).subscribe({
      next: (c) => {
        this.selectedCentre = c;
        this.loadingCentreDetail = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingCentreDetail = false;
        this.showToast('Could not load centre details');
      }
    });
  }

  closeCentreModal(): void {
    this.selectedCentre = null;
    this.centreEditMode = false;
    this.centreSaveError = '';
  }

  enableCentreEdit(): void {
    if (!this.selectedCentre) return;
    this.centreEditForm = {
      centre_name: this.selectedCentre.centre_name,
      contact_person_name: this.selectedCentre.contact_person_name,
      contact_person_role: this.selectedCentre.contact_person_role,
      contact_email: this.selectedCentre.contact_email,
      contact_phone: this.selectedCentre.contact_phone,
      whatsapp_number: this.selectedCentre.whatsapp_number,
      website_url: this.selectedCentre.website_url,
      physical_address: this.selectedCentre.physical_address,
      suburb: this.selectedCentre.suburb,
      city: this.selectedCentre.city,
      province: this.selectedCentre.province,
      postal_code: this.selectedCentre.postal_code,
      npo_number: this.selectedCentre.npo_number,
      description: this.selectedCentre.description,
      mission_statement: this.selectedCentre.mission_statement,
      accepts_goods: this.selectedCentre.accepts_goods,
      section18a: this.selectedCentre.section18a,
      marketplace_active: this.selectedCentre.marketplace_active,
    };
    this.centreEditMode = true;
    this.centreSaveError = '';
  }

  cancelCentreEdit(): void {
    this.centreEditMode = false;
    this.centreSaveError = '';
  }

  saveCentreEdit(): void {
    if (!this.selectedCentre) return;
    this.savingCentre = true;
    this.centreSaveError = '';
    this.http.patch<any>(`${this.API}/centres/${this.selectedCentre.id}`, this.centreEditForm, this.adminHeaders).subscribe({
      next: (updated) => {
        this.savingCentre = false;
        this.centreEditMode = false;
        this.selectedCentre = { ...this.selectedCentre, ...updated };
        // Keep the row in the main table list in sync too
        const idx = this.centres.findIndex(c => c.id === updated.id);
        if (idx > -1) this.centres[idx] = { ...this.centres[idx], ...updated };
        this.showToast('Centre updated');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingCentre = false;
        this.centreSaveError = err.error?.error || 'Could not save changes. Please try again.';
      }
    });
  }

  // ── Buyer actions ──────────────────────────────────────────
  deleteBuyer(email: string): void {
    if (!confirm('Permanently delete this buyer\'s order history? This cannot be undone.')) return;
    this.http.delete(`${this.API}/buyers/${encodeURIComponent(email)}`, this.adminHeaders).subscribe({
      next: () => {
        this.buyers = this.buyers.filter(b => b.email !== email);
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
      this.http.put(`${this.API}/messages/${msg.id}/read`, {}, this.adminHeaders).subscribe({
        next: () => { msg.read = true; this.cdr.detectChanges(); },
        error: () => {}
      });
    }
  }

  sendReply(): void {
    if (!this.selectedMsg || !this.replyText.trim()) return;
    this.replySending = true;
    this.http.post(`${this.API}/messages/${this.selectedMsg.id}/reply`, { reply: this.replyText }, this.adminHeaders).subscribe({
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