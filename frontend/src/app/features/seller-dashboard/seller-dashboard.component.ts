// ============================================================
// frontend/src/app/features/seller-dashboard/seller-dashboard.component.ts
// ============================================================
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

type DashTab = 'home' | 'listings' | 'earnings' | 'learn' | 'profile' | 'contacts' | 'sanctuary' | 'centre';

interface SellerProfile {
    id: string;
    alias: string;
    email: string;
    real_name: string;
    phone: string;
    city: string;
    product_categories: string[];
    payout_method: string;
    verification_status: string;
    hidden_layer_granted: boolean;
    profile_complete: boolean;
    total_sales: number;
    total_earned: number;
    craft_story?: string;
    public_bio?: string;
    languages?: string[];
    availability?: string;
    skills_experience?: string;
    social_handle?: string;
    centre_name?: string;
    centre_city?: string;
    centre_id?: string;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    status: string;
    stock?: number;
    total_sold?: number;
    image_url?: string;
    story?: string;
}

interface EarningsSummary {
    total_paid: number;
    pending: number;
    paid_count: number;
}

interface Transaction {
    amount: number;
    status: string;
    payout_date?: string;
    product_title?: string;
    created_at: string;
}

interface TrainingModule {
    id: string;
    title: string;
    category: string;
    description: string;
    duration_mins: number;
    level: string;
    progress: string;
}

interface TrustedContact {
    id: string;
    name: string;
    phone: string;
    relationship?: string;
    whatsapp: boolean;
    is_active: boolean;
}

interface CaseJourney {
    medical_done: boolean; medical_date?: string;
    police_done: boolean; police_date?: string;
    protection_done: boolean; protection_date?: string;
    court_done: boolean; court_date?: string;
    counselling_done: boolean; counselling_date?: string;
    notes?: string;
}

interface EvidenceItem {
    id: string;
    item_type: string;
    filename?: string;
    file_url?: string;      // ADDED
    description?: string;
    date_of_incident?: string;
    is_court_ready: boolean;
    created_at: string;
}

interface CentreInfo {
    id: string;
    centre_name: string;
    city: string;
    province: string;
    status: string;
}

@Component({
    selector: 'app-seller-dashboard',
    standalone: true,
    imports: [CommonModule, HttpClientModule, RouterModule, FormsModule],
    templateUrl: './seller-dashboard.component.html',
    styleUrls: ['./seller-dashboard.component.scss'],
})
export class SellerDashboardComponent implements OnInit {
    private readonly API = 'http://localhost:3000/api/sellers';

    seller: SellerProfile | null = null;
    activeTab: DashTab = 'home';
    isLoading = true;
    dblTapTimer: any = null;
    private loadTimeout: any;

    centreInfo: CentreInfo | null = null;

    products: Product[] = [];
    showProductModal = false;
    isEditing = false;
    productSaveError = '';
    currentProduct: Partial<Product> = {};
    readonly productCategories = [
        'Beaded jewellery','Woven baskets','Clothing & textiles',
        'Food preserves','Art & crafts','Wire art','Candles & soaps',
        'Pottery','Bags & accessories','Other',
    ];

    earningsSummary: EarningsSummary = { total_paid: 0, pending: 0, paid_count: 0 };
    transactions: Transaction[] = [];

    trainingModules: TrainingModule[] = [];
    trainingFilter = 'all';

    profileForm: Partial<SellerProfile> & { bank_name?: string; account_holder?: string; account_number?: string; branch_code?: string } = {};
    profileSaved = false;
    profileSaveError = '';
    readonly languages = ['English','Zulu','Xhosa','Afrikaans','Sotho','Tswana','Tsonga','Venda','Ndebele','Swati'];

    contacts: TrustedContact[] = [];
    showAddContact = false;
    newContact = { name: '', phone: '', relationship: '', whatsapp: true };
    contactSaveError = '';

    showSuppliersPanel = false;
    alertSent = false;
    alertLoading = false;
    fakeSuppliers = [
        { name: 'Zulu Bead & Thread Co.', city: 'Durban', stock: 'Seed beads, wire', price: 'R45/100g' },
        { name: 'Cape Craft Wholesale', city: 'Cape Town', stock: 'Fabric, cotton, dye', price: 'R120/bolt' },
        { name: 'Highveld Makers Market', city: 'Johannesburg', stock: 'Sisal, wicker, cord', price: 'R80/kg' },
        { name: 'Eastern Textiles Direct', city: 'Gqeberha', stock: 'Shweshwe, linen, jersey', price: 'R95/m' },
    ];

    showPinModal = false;
    hiddenPin = '';
    pinError = '';
    sanctuaryOpen = false;
    sanctuaryTab: 'journey' | 'vault' | 'support' = 'journey';
    caseJourney: CaseJourney = {
        medical_done: false, police_done: false,
        protection_done: false, court_done: false, counselling_done: false,
    };
    evidenceItems: EvidenceItem[] = [];
    showAddEvidence = false;
    newEvidence = { item_type: 'photo', filename: '', description: '', date_of_incident: '' };
    journeySaving = false;

    // File upload property
    selectedEvidenceFile: File | null = null;

    constructor(
        private http: HttpClient,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        const id = localStorage.getItem('sellerId');
        console.log('[Dashboard] ngOnInit, sellerId from localStorage:', id);
        if (!id) {
            console.warn('[Dashboard] No sellerId, redirecting to login');
            this.isLoading = false;
            this.cdr.detectChanges();
            this.router.navigate(['/login/maker']);
            return;
        }

        setTimeout(() => {
            if (this.isLoading) {
                console.warn('[Dashboard] Fallback: forcing isLoading = false after 8s');
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        }, 8000);

        this.loadProfile(id);
    }

    handleLogoDblTap(): void { this.quickExit(); }
    quickExit(): void {
        localStorage.removeItem('hiddenLayerAccess');
        window.location.href = '/news';
    }

    loadProfile(id: string): void {
        console.log('[Dashboard] loadProfile called for id:', id);
        this.http.get<SellerProfile>(`${this.API}/profile/${id}`).subscribe({
            next: (s) => {
                console.log('[Dashboard] Profile loaded successfully', s);
                this.seller = s;
                this.profileForm = {
                    alias: s.alias,
                    public_bio: s.public_bio || '',
                    craft_story: s.craft_story || '',
                    phone: s.phone,
                    city: s.city,
                    skills_experience: s.skills_experience || '',
                    availability: s.availability || '',
                    social_handle: s.social_handle || '',
                    languages: s.languages || [],
                };
                this.isLoading = false;
                this.cdr.detectChanges();
                this.loadProducts();
                this.loadEarnings();
                this.loadTraining();
                this.loadContacts();
                this.loadCentreInfo();
            },
            error: (err) => {
                console.error('[Dashboard] Error loading profile:', err);
                this.isLoading = false;
                this.cdr.detectChanges();
                if (err.status === 404 || err.status === 401) {
                    localStorage.removeItem('sellerId');
                    this.router.navigate(['/login/maker']);
                } else {
                    this.seller = null;
                }
            }
        });
    }

    loadCentreInfo(): void {
        if (!this.seller?.centre_id) return;
        console.log('[Dashboard] Loading centre info for ID:', this.seller.centre_id);
        this.http.get<CentreInfo>(`${this.API}/centres/${this.seller.centre_id}`).subscribe({
            next: (c) => {
                this.centreInfo = c;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('[Dashboard] Error loading centre info:', err)
        });
    }

    loadProducts(): void {
        if (!this.seller) return;
        console.log('[Dashboard] Loading products for seller:', this.seller.id);
        this.http.get<Product[]>(`${this.API}/products/${this.seller.id}`).subscribe({
            next: (p) => {
                console.log(`[Dashboard] Loaded ${p.length} products`);
                this.products = p;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('[Dashboard] Error loading products:', err)
        });
    }

    loadEarnings(): void {
        if (!this.seller) return;
        console.log('[Dashboard] Loading earnings for seller:', this.seller.id);
        this.http.get<any>(`${this.API}/earnings/${this.seller.id}`).subscribe({
            next: (data) => {
                console.log('[Dashboard] Earnings loaded', data);
                this.earningsSummary = data.summary;
                this.transactions = data.transactions;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('[Dashboard] Error loading earnings:', err)
        });
    }

    loadTraining(): void {
        if (!this.seller) return;
        console.log('[Dashboard] Loading training modules');
        this.http.get<TrainingModule[]>(`${this.API}/training/${this.seller.id}`).subscribe({
            next: (m) => {
                console.log(`[Dashboard] Loaded ${m.length} training modules`);
                this.trainingModules = m;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('[Dashboard] Error loading training:', err)
        });
    }

    loadContacts(): void {
        if (!this.seller) return;
        console.log('[Dashboard] Loading trusted contacts');
        this.http.get<TrustedContact[]>(`${this.API}/contacts/${this.seller.id}`).subscribe({
            next: (c) => {
                console.log(`[Dashboard] Loaded ${c.length} contacts`);
                this.contacts = c;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('[Dashboard] Error loading contacts:', err)
        });
    }

    loadCaseJourney(): void {
        if (!this.seller) return;
        console.log('[Dashboard] Loading case journey');
        this.http.get<CaseJourney>(`${this.API}/journey/${this.seller.id}`).subscribe({
            next: (j) => {
                console.log('[Dashboard] Case journey loaded', j);
                this.caseJourney = j;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('[Dashboard] Error loading case journey:', err)
        });
    }

    loadEvidence(): void {
        if (!this.seller) return;
        console.log('[Dashboard] Loading evidence items');
        this.http.get<EvidenceItem[]>(`${this.API}/evidence/${this.seller.id}`).subscribe({
            next: (e) => {
                console.log(`[Dashboard] Loaded ${e.length} evidence items`);
                this.evidenceItems = e;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('[Dashboard] Error loading evidence:', err)
        });
    }

    get profileCompletePct(): number {
        if (!this.seller) return 0;
        const fields = ['alias','public_bio','craft_story','phone','city','payout_method','skills_experience'];
        const done = fields.filter(f => !!(this.seller as any)[f]).length;
        return Math.round((done / fields.length) * 100);
    }

    get centreStatusText(): string {
        if (!this.seller?.centre_id) return 'Not assigned';
        if (this.centreInfo?.status === 'approved') return '✓ Approved centre';
        if (this.centreInfo?.status === 'pending') return '⏳ Pending verification';
        return 'Awaiting approval';
    }

    get journeySteps() {
        return [
            { key: 'medical',    label: 'Medical check-up',      icon: '🏥', done: this.caseJourney.medical_done,    date: this.caseJourney.medical_date },
            { key: 'police',     label: 'Statement recorded',     icon: '📋', done: this.caseJourney.police_done,     date: this.caseJourney.police_date },
            { key: 'protection', label: 'Protection order',       icon: '🛡️', done: this.caseJourney.protection_done, date: this.caseJourney.protection_date },
            { key: 'court',      label: 'Court proceedings',      icon: '⚖️', done: this.caseJourney.court_done,      date: this.caseJourney.court_date },
            { key: 'counselling','label': 'Counselling sessions', icon: '💬', done: this.caseJourney.counselling_done, date: this.caseJourney.counselling_date },
        ];
    }

    get filteredModules(): TrainingModule[] {
        if (this.trainingFilter === 'all') return this.trainingModules;
        return this.trainingModules.filter(m =>
            this.trainingFilter === 'progress'
                ? m.progress === 'in_progress'
                : m.category === this.trainingFilter
        );
    }

    get activeListings(): number { return this.products.filter(p => p.status === 'active').length; }
    get totalSold(): number { return this.products.reduce((s, p) => s + (p.total_sold || 0), 0); }

    openAddProduct(): void {
        if (!this.seller?.profile_complete) {
            this.activeTab = 'profile';
            alert('Please complete your profile before adding a listing.');
            return;
        }
        this.isEditing = false;
        this.currentProduct = { status: 'active', stock: 1 };
        this.showProductModal = true;
    }

    editProduct(p: Product): void {
        this.isEditing = true;
        this.currentProduct = { ...p };
        this.showProductModal = true;
    }

    saveProduct(): void {
        if (!this.currentProduct.name || !this.currentProduct.price) {
            this.productSaveError = 'Name and price are required';
            return;
        }
        this.productSaveError = '';
        if (this.isEditing && this.currentProduct.id) {
            this.http.put<any>(`${this.API}/products/${this.currentProduct.id}`, this.currentProduct)
                .subscribe({ 
                    next: () => { this.showProductModal = false; this.loadProducts(); }, 
                    error: (err) => {
                        console.error('[Dashboard] Error updating product:', err);
                        this.productSaveError = err.error?.error || 'Could not save';
                        if (err.error?.code === 'PROFILE_INCOMPLETE') {
                            alert('Your profile is not complete. Please complete it first.');
                            this.activeTab = 'profile';
                        }
                    }
                });
        } else {
            this.http.post<any>(`${this.API}/products`, { ...this.currentProduct, seller_id: this.seller?.id })
                .subscribe({ 
                    next: () => { this.showProductModal = false; this.loadProducts(); }, 
                    error: (err) => {
                        console.error('[Dashboard] Error creating product:', err);
                        this.productSaveError = err.error?.error || 'Could not save';
                        if (err.error?.code === 'PROFILE_INCOMPLETE') {
                            alert('Your profile is not complete. Please complete it first.');
                            this.activeTab = 'profile';
                        }
                    }
                });
        }
    }

    deleteProduct(id: string): void {
        if (!confirm('Remove this listing?')) return;
        this.http.delete(`${this.API}/products/${id}`).subscribe({ next: () => this.loadProducts(), error: () => {} });
    }

    markModuleStarted(mod: TrainingModule): void {
        if (mod.progress !== 'not_started') return;
        this.http.put(`${this.API}/training/${this.seller?.id}/${mod.id}`, { status: 'in_progress' })
            .subscribe({ next: () => mod.progress = 'in_progress', error: () => {} });
    }

    markModuleComplete(mod: TrainingModule): void {
        this.http.put(`${this.API}/training/${this.seller?.id}/${mod.id}`, { status: 'completed' })
            .subscribe({ next: () => mod.progress = 'completed', error: () => {} });
    }

    saveProfile(): void {
        this.profileSaveError = '';
        const updateData = {
            ...this.profileForm,
            payout_method: this.seller?.payout_method
        };
        this.http.put<any>(`${this.API}/profile/${this.seller?.id}`, updateData).subscribe({
            next: (res) => {
                this.profileSaved = true;
                if (this.seller) this.seller.profile_complete = res.profile_complete;
                setTimeout(() => this.profileSaved = false, 3000);
                this.cdr.detectChanges();
                if (res.profile_complete) {
                    alert('Profile complete! You can now add listings.');
                } else {
                    console.warn('Profile still incomplete – check that all fields (including payout method) are filled.');
                }
            },
            error: (e) => this.profileSaveError = e.error?.error || 'Could not save'
        });
    }

    toggleLanguage(lang: string): void {
        const langs = this.profileForm.languages || [];
        const idx = langs.indexOf(lang);
        if (idx > -1) langs.splice(idx, 1);
        else langs.push(lang);
        this.profileForm.languages = [...langs];
    }

    saveContact(): void {
        if (!this.newContact.name || !this.newContact.phone) {
            this.contactSaveError = 'Name and number required';
            return;
        }
        this.http.post<TrustedContact>(`${this.API}/contacts`, {
            ...this.newContact, seller_id: this.seller?.id
        }).subscribe({
            next: (c) => {
                this.contacts.push(c);
                this.showAddContact = false;
                this.newContact = { name: '', phone: '', relationship: '', whatsapp: true };
                this.contactSaveError = '';
                this.cdr.detectChanges();
            },
            error: (e) => this.contactSaveError = e.error?.error || 'Could not save'
        });
    }

    removeContact(id: string): void {
        this.http.delete(`${this.API}/contacts/${id}`).subscribe({
            next: () => {
                this.contacts = this.contacts.filter(c => c.id !== id);
                this.cdr.detectChanges();
            },
            error: () => {}
        });
    }

    openSuppliersPanel(): void {
        this.showSuppliersPanel = true;
        this.alertSent = false;
    }

    sendEmergencyAlert(): void {
        this.alertLoading = true;
        this.http.post<any>(`${this.API}/emergency`, {
            seller_id: this.seller?.id,
            location_hint: this.seller?.city,
        }).subscribe({
            next: () => {
                this.alertSent = true;
                this.alertLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.alertSent = true;
                this.alertLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    requestSanctuary(): void {
        const hasAccess = this.seller?.verification_status === 'approved' || this.seller?.hidden_layer_granted;
        if (!hasAccess) {
            this.http.post(`${this.API}/volunteer`, { sellerId: this.seller?.id }).subscribe({
                next: () => {
                    if (this.seller) this.seller.hidden_layer_granted = true;
                    this.showPinModal = true;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.showPinModal = true;
                    this.cdr.detectChanges();
                }
            });
        } else {
            this.showPinModal = true;
        }
    }

    verifyPin(): void {
        const storedPin = localStorage.getItem('hiddenPin');
        if (this.hiddenPin === storedPin) {
            localStorage.setItem('hiddenLayerAccess', 'true');
            this.sanctuaryOpen = true;
            this.showPinModal = false;
            this.hiddenPin = '';
            this.pinError = '';
            this.loadCaseJourney();
            this.loadEvidence();
            this.cdr.detectChanges();
        } else {
            this.pinError = 'Incorrect PIN. Please try again.';
            this.cdr.detectChanges();
        }
    }

    closePinModal(): void {
        this.showPinModal = false;
        this.hiddenPin = '';
        this.pinError = '';
    }

    exitSanctuary(): void {
        this.sanctuaryOpen = false;
        localStorage.removeItem('hiddenLayerAccess');
        this.activeTab = 'home';
        this.cdr.detectChanges();
    }

    saveJourney(): void {
        this.journeySaving = true;
        this.http.put(`${this.API}/journey/${this.seller?.id}`, this.caseJourney).subscribe({
            next: () => {
                this.journeySaving = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.journeySaving = false;
                this.cdr.detectChanges();
            }
        });
    }

    onEvidenceFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.selectedEvidenceFile = file;
        }
    }

    addEvidence(): void {
        const formData = new FormData();
        formData.append('seller_id', this.seller?.id || '');
        formData.append('item_type', this.newEvidence.item_type);
        if (this.newEvidence.description) formData.append('description', this.newEvidence.description);
        if (this.newEvidence.date_of_incident) formData.append('date_of_incident', this.newEvidence.date_of_incident);
        if (this.selectedEvidenceFile) formData.append('file', this.selectedEvidenceFile);

        this.http.post<EvidenceItem>(`${this.API}/evidence`, formData).subscribe({
            next: (e) => {
                this.evidenceItems.unshift(e);
                this.showAddEvidence = false;
                this.newEvidence = { item_type: 'photo', filename: '', description: '', date_of_incident: '' };
                this.selectedEvidenceFile = null;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Upload error:', err);
                alert('Failed to upload evidence. Please try again.');
            }
        });
    }

    requestSupport(type: string): void {
        this.http.post(`${this.API}/support`, {
            seller_id: this.seller?.id,
            request_type: type,
            message: 'Request from dashboard',
        }).subscribe({
            next: () => alert('Your request has been received. Someone will be in touch soon.'),
            error: () => alert('Request noted. Please also speak to your centre manager.'),
        });
    }

    generateCourtPack(): void {
        alert('Preparing your documents. Your court pack will be ready to download in a moment.');
    }

    logout(): void {
        localStorage.clear();
        this.router.navigate(['/login/maker']);
    }

    formatCurrency(n: number | string): string {
        return `R${Number(n).toFixed(0)}`;
    }

    evidenceIcon(type: string): string {
        const map: Record<string, string> = {
            photo: '📷', voice_note: '🎤', whatsapp: '💬',
            medical: '🏥', document: '📄', other: '📎',
        };
        return map[type] || '📎';
    }

    categoryIcon(cat: string): string {
        const map: Record<string, string> = {
            craft: '🧵', business: '📊', legal: '⚖️',
            financial: '💰', wellness: '🌿',
        };
        return map[cat] || '📚';
    }
}