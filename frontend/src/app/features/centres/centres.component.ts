// ============================================================
// frontend/src/app/features/centres/centres.component.ts
// ============================================================
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';
import { SellerAuthService } from '../../services/seller-auth.service';
import { environment } from '../../../environments/environment';

export interface Centre {
  id: string;
  name: string;
  type: 'gbv_centre' | 'orphanage' | 'old_age_home';
  city: string;
  province: string;
  suburb: string;
  description: string;
  mission: string;
  services: string[];
  languages: string[];
  is_24_hour: boolean;
  has_shelter: boolean;
  provides_counselling: boolean;
  provides_legal_support: boolean;
  capacity: number;
  img: string;
  profilePicture?: string | null;
  contact_email?: string;
  contact_phone?: string;
  whatsapp?: string;
  website?: string;
  verified: boolean;
  year_established: number;
  beneficiaries_per_year: number;
}

export interface NoticePost {
  id: string;
  centre_id: string;
  centre_name: string;
  type: 'achievement' | 'job' | 'update' | 'appeal' | 'image';
  title: string;
  body: string;
  img?: string;
  date: string;
  badge_color: string;
}

// ── Centre image helper ───────────────────────────────────────
// Multi-person, community-focused images for each centre type
const GBV_IMAGES = [
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&q=80',  // women support group circle
  'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=600&q=80',  // community women together
  'https://images.unsplash.com/photo-1531983412531-1f49a365ffed?w=600&q=80',  // group of women
  'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=600&q=80',  // women community meeting
];
const ORPHANAGE_IMAGES = [
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80',  // children group playing
  'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=600&q=80',     // kids raising hands class
  'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=600&q=80',     // children with teachers
];
const ELDERLY_IMAGES = [
  'https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=600&q=80',  // elderly group activity
  'https://images.unsplash.com/photo-1581579438747-104c53d7fbc4?w=600&q=80',  // seniors together
  'https://images.unsplash.com/photo-1516307365426-bea591f05011?w=600&q=80',  // senior group smiling
];
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',  // diverse community group
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80',  // volunteer group outdoors
  'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80',     // community gathering
];

export function getCentreImage(type: string, id: string): string {
  // Use last char of id as deterministic index so same centre always gets same image
  const idx = id ? id.charCodeAt(id.length - 1) % 4 : 0;
  if (type === 'gbv_centre')   return GBV_IMAGES[idx % GBV_IMAGES.length];
  if (type === 'orphanage')    return ORPHANAGE_IMAGES[idx % ORPHANAGE_IMAGES.length];
  if (type === 'old_age_home') return ELDERLY_IMAGES[idx % ELDERLY_IMAGES.length];
  return DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length];
}

@Component({
  selector: 'app-centres',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './centres.component.html',
  styleUrls: ['./centres.component.scss'],
})
export class CentresComponent implements OnInit, OnDestroy {

  currentUser: User | null = null;
  searchQuery = '';
  selectedProvince = '';
  selectedType = '';
  selectedCentre: Centre | null = null;
  activeModal = ''; // 'auth' | 'donate' | 'volunteer' | 'centre-detail'
  pendingModal = ''; // modal to open after auth
  authTab: 'login' | 'register' = 'login';
  toastMsg = '';
  toastVisible = false;

  // Slideshow
  currentSlide = 0;
  private slideInterval: any;

  // Auth form state
  loginRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  loginEmail = '';
  loginPassword = '';
  authError = '';
  registerRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  registerName = '';
  registerEmail = '';
  registerPassword = '';

  // Inline seller registration (matches marketplace)
  sellerIdNumber = '';
  sellerFullName = '';
  sellerEmail = '';
  sellerPin = '';
  sellerCentreId = '';
  sellerIdVerified = false;
  sellerIdError = '';
  sellerIsLoading = false;
  sellerError = '';
  sellerCentres: { id: string; name: string; city: string; province: string }[] = [];
  sellerCentresLoading = false;
  donateForm!: FormGroup;
  donateType: 'money' | 'goods' | 'time' = 'money';

  // Volunteer form
  volunteerForm!: FormGroup;

  private destroy$ = new Subject<void>();

  readonly provinces = [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
    'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape',
  ];

  readonly centreTypes = [
    { value: 'gbv_centre',   label: 'GBV Centres' },
    { value: 'orphanage',    label: 'Orphanages' },
    { value: 'old_age_home', label: 'Old Age Homes' },
  ];

  readonly noticePosts: NoticePost[] = [
    {
      id: 'n1', centre_id: 'c1', centre_name: 'Thistle House GBV Centre',
      type: 'achievement', title: '500 survivors supported this year',
      body: 'We are proud to announce that Thistle House has supported over 500 survivors in 2025 — our highest number since opening in 2012. Thank you to every donor, volunteer, and partner who made this possible.',
      date: '2025-05-20', badge_color: '#2D6A4F',
    },
    {
      id: 'n2', centre_id: 'c3', centre_name: 'Ubuntu Youth Programme',
      type: 'job', title: 'Hiring: Social Worker (Johannesburg)',
      body: 'We are looking for a registered social worker with experience in child and youth development. SACSSP registration required. Position is full-time with competitive salary. Send CV to jobs@ubuntuyouth.org.za',
      img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',  // diverse group meeting
      date: '2025-05-18', badge_color: '#1A3A6B',
    },
    {
      id: 'n3', centre_id: 'c5', centre_name: 'Khayelitsha Women\'s Hub',
      type: 'appeal', title: 'Urgent: Winter blankets needed',
      body: 'We have 42 women and children in our shelter this winter. We urgently need warm blankets, toiletries, and non-perishable food. Drop-off at 14 Mew Way, Khayelitsha, or donate via our page.',
      img: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&q=80',  // women support group
      date: '2025-05-15', badge_color: '#8B2635',
    },
    {
      id: 'n4', centre_id: 'c4', centre_name: 'Khanya Elderly Home',
      type: 'update', title: 'New activities programme launched',
      body: 'Our residents now enjoy weekly gardening, art therapy, and a new digital literacy class teaching smartphones and video calling so they can stay connected with family. Huge thanks to our volunteer facilitators.',
      img: 'https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=1200&q=80',  // elderly group activity
      date: '2025-05-10', badge_color: '#B8860B',
    },
    {
      id: 'n5', centre_id: 'c2', centre_name: 'New Beginnings NPO',
      type: 'achievement', title: 'DSD Accreditation received',
      body: 'New Beginnings has officially received DSD accreditation after 18 months of audits and improvements. This means we can now accommodate more survivors and access government funding.',
      img: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&q=80',  // volunteer group outdoors
      date: '2025-05-05', badge_color: '#2D6A4F',
    },
    {
      id: 'n6', centre_id: 'c6', centre_name: 'Empilweni Care Centre',
      type: 'job', title: 'Volunteer drivers needed',
      body: 'We need volunteer drivers on weekday mornings to transport children to school and elderly residents to medical appointments. Must have valid licence and own vehicle. Contact us to sign up.',
      img: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80',  // children group
      date: '2025-04-28', badge_color: '#1A3A6B',
    },
  ];

  allCentres: Centre[] = [];
  centresLoading = true;

  // Static fallback used when DB is unavailable
  private readonly staticCentres: Centre[] = [
    {
      id: 'c1', name: 'Thistle House GBV Centre',
      type: 'gbv_centre', city: 'Cape Town', province: 'Western Cape', suburb: 'Observatory',
      description: 'Thistle House has been a sanctuary for survivors of gender-based violence in Cape Town since 2012. We provide emergency shelter, trauma counselling, legal support, and long-term reintegration programmes for women and children.',
      mission: 'To restore dignity, safety, and hope to every survivor who walks through our doors.',
      services: ['Emergency Shelter', 'Counselling', 'Legal Aid', 'Court Support', 'Skills Training'],
      languages: ['English', 'Afrikaans', 'Xhosa'],
      is_24_hour: true, has_shelter: true, provides_counselling: true, provides_legal_support: true,
      capacity: 45, img: GBV_IMAGES[0],
      contact_email: 'info@thistlehouse.org.za', contact_phone: '021 448 1720',
      whatsapp: '0821234567', website: 'https://www.thistlehouse.org.za',
      verified: true, year_established: 2012, beneficiaries_per_year: 520,
    },
    {
      id: 'c2', name: 'New Beginnings NPO',
      type: 'gbv_centre', city: 'Johannesburg', province: 'Gauteng', suburb: 'Soweto',
      description: 'New Beginnings supports survivors of domestic violence and human trafficking across Soweto. We operate a safe house, a dedicated survivor skills programme, and a 24-hour crisis line.',
      mission: 'Every woman deserves a second chance at a safe, dignified life.',
      services: ['Safe House', 'Crisis Hotline', 'Trauma Debriefing', 'Job Placement', 'Support Groups'],
      languages: ['Zulu', 'Sesotho', 'English', 'Xhosa'],
      is_24_hour: true, has_shelter: true, provides_counselling: true, provides_legal_support: false,
      capacity: 30, img: GBV_IMAGES[1],
      contact_email: 'help@newbeginnings.org.za', contact_phone: '011 982 0034',
      whatsapp: '0734567890',
      verified: true, year_established: 2016, beneficiaries_per_year: 310,
    },
    {
      id: 'c3', name: 'Ubuntu Youth Programme',
      type: 'orphanage', city: 'Johannesburg', province: 'Gauteng', suburb: 'Alexandra',
      description: 'Ubuntu Youth Programme provides residential care, education, and vocational training for orphaned and vulnerable youth aged 10–21 in Alexandra township. We operate a craft studio and digital skills lab.',
      mission: 'Ubuntu — I am because we are. Every child deserves community and opportunity.',
      services: ['Residential Care', 'Education & Skills Training', 'Child Protection', 'Case Management'],
      languages: ['Zulu', 'Sepedi', 'English', 'Xhosa'],
      is_24_hour: false, has_shelter: true, provides_counselling: true, provides_legal_support: false,
      capacity: 60, img: ORPHANAGE_IMAGES[0],
      contact_email: 'info@ubuntuyouth.org.za', contact_phone: '011 440 2281',
      verified: true, year_established: 2009, beneficiaries_per_year: 180,
    },
    {
      id: 'c4', name: 'Khanya Elderly Home',
      type: 'old_age_home', city: 'Pretoria', province: 'Gauteng', suburb: 'Atteridgeville',
      description: 'Khanya Elderly Home provides compassionate full-time residential care for elderly South Africans who have no family support. We offer assisted living, nursing care, and craft workshops that connect our residents to the Amani marketplace.',
      mission: 'Ageing with dignity. Living with purpose.',
      services: ['Residential Care', 'Nursing Care', 'Education & Skills Training', 'Support Groups'],
      languages: ['Tswana', 'Sepedi', 'English', 'Afrikaans'],
      is_24_hour: true, has_shelter: false, provides_counselling: true, provides_legal_support: false,
      capacity: 80, img: ELDERLY_IMAGES[0],
      contact_email: 'admin@khanya.co.za', contact_phone: '012 374 5581',
      verified: true, year_established: 2003, beneficiaries_per_year: 95,
    },
    {
      id: 'c5', name: 'Khayelitsha Women\'s Hub',
      type: 'gbv_centre', city: 'Cape Town', province: 'Western Cape', suburb: 'Khayelitsha',
      description: 'Khayelitsha Women\'s Hub is a grassroots GBV centre run by and for women in Khayelitsha. We focus on community-based trauma support, economic empowerment, and advocacy.',
      mission: 'Healing together. Building power from within.',
      services: ['Counselling', 'Support Groups', 'Skills Training', 'Crisis Hotline', 'Relocation Assistance'],
      languages: ['Xhosa', 'English'],
      is_24_hour: false, has_shelter: true, provides_counselling: true, provides_legal_support: false,
      capacity: 25, img: GBV_IMAGES[2],
      contact_email: 'khayelitsha.hub@gmail.com', contact_phone: '021 361 4422',
      verified: true, year_established: 2018, beneficiaries_per_year: 240,
    },
    {
      id: 'c6', name: 'Empilweni Care Centre',
      type: 'gbv_centre', city: 'Durban', province: 'KwaZulu-Natal', suburb: 'Umlazi',
      description: 'Empilweni (meaning "place of health" in Zulu) provides holistic care for survivors of gender-based violence in Umlazi. Our team of social workers and psychologists supports survivors from crisis through to long-term recovery.',
      mission: 'Empilweni: a place where healing begins.',
      services: ['Counselling', 'Medical Support', 'Legal Aid', 'Court Support', 'Case Management'],
      languages: ['Zulu', 'English'],
      is_24_hour: true, has_shelter: false, provides_counselling: true, provides_legal_support: true,
      capacity: 35, img: GBV_IMAGES[3],
      contact_email: 'empilweni@care.org.za', contact_phone: '031 906 2241',
      whatsapp: '0829876543',
      verified: true, year_established: 2014, beneficiaries_per_year: 380,
    },
    {
      id: 'c7', name: 'Sunshine Children\'s Village',
      type: 'orphanage', city: 'Bloemfontein', province: 'Free State', suburb: 'Mangaung',
      description: 'Sunshine Children\'s Village provides a loving home for orphaned and abandoned children from infancy to 18. We have 8 cottage homes, a school, and a vocational training centre on our 4-hectare property.',
      mission: 'Every child deserves a home, a family, and a future.',
      services: ['Residential Care', 'Education & Skills Training', 'Medical Support', 'Child Protection'],
      languages: ['Sesotho', 'Afrikaans', 'English'],
      is_24_hour: true, has_shelter: true, provides_counselling: true, provides_legal_support: false,
      capacity: 120, img: ORPHANAGE_IMAGES[1],
      contact_email: 'admin@sunshinevillage.co.za', contact_phone: '051 444 0023',
      website: 'https://www.sunshinechildrensvillage.co.za',
      verified: true, year_established: 1996, beneficiaries_per_year: 135,
    },
    {
      id: 'c8', name: 'Ubuntu Women\'s Centre',
      type: 'gbv_centre', city: 'Port Elizabeth', province: 'Eastern Cape', suburb: 'New Brighton',
      description: 'Ubuntu Women\'s Centre provides crisis intervention and long-term support to GBV survivors in the Eastern Cape. We have a shelter, a legal clinic, and a partnership with the NMU Law Clinic.',
      mission: 'No woman should face violence alone.',
      services: ['Emergency Shelter', 'Legal Aid', 'Counselling', 'Police Support', 'Support Groups'],
      languages: ['Xhosa', 'English', 'Afrikaans'],
      is_24_hour: true, has_shelter: true, provides_counselling: true, provides_legal_support: true,
      capacity: 40, img: GBV_IMAGES[1],
      contact_email: 'ubuntu@womencentre.co.za', contact_phone: '041 453 9011',
      verified: true, year_established: 2007, beneficiaries_per_year: 290,
    },
  ];

  constructor(
    private authService: AuthService,
    private sellerAuth: SellerAuthService,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const sellerId = localStorage.getItem('sellerId');
    const centreId = localStorage.getItem('centreId');
    if (sellerId) {
      const stored = localStorage.getItem('sellerUser');
      if (stored) { const s = JSON.parse(stored); this.currentUser = { name: s.alias, email: s.email, role: 'seller', initials: s.alias.slice(0,2).toUpperCase() }; }
    } else if (centreId) {
      const name = localStorage.getItem('centreName') || 'Centre';
      const email = localStorage.getItem('centreEmail') || '';
      this.currentUser = { name, email, role: 'centre', initials: name.slice(0,2).toUpperCase() };
    }
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe(u => { if (u) { this.currentUser = u; this.cdr.detectChanges(); } });
    this.sellerAuth.user$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      if (u) this.currentUser = { name: u.alias, email: u.email, role: 'seller', initials: u.alias.slice(0,2).toUpperCase() };
      else if (!this.authService.currentUser && !localStorage.getItem('centreId')) this.currentUser = null;
      this.cdr.detectChanges();
    });

    this.startSlideshow();

    this.donateForm = this.fb.group({
      centre_id:  ['', Validators.required],
      donor_name: ['', Validators.required],
      donor_email:['', [Validators.required, Validators.email]],
      amount:     [''],
      goods_desc: [''],
      payment_method: [''],
      message:    [''],
    });

    this.volunteerForm = this.fb.group({
      centre_id:    ['', Validators.required],
      full_name:    ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
      phone:        ['', Validators.required],
      skills:       ['', Validators.required],
      availability: ['', Validators.required],
      message:      [''],
    });

    this.fetchCentres();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearInterval(this.slideInterval);
  }

  // ── Resolve relative /uploads/... paths returned by the backend ──
  mediaUrl(path: string): string {
    if (!path) return '';
    return path.startsWith('http') ? path : `${environment.apiUrl}${path}`;
  }

  fetchCentres(): void {
    this.centresLoading = true;

    // Safety timeout — if API doesn't respond in 5s, fall back to static
    const timeout = setTimeout(() => {
      if (this.centresLoading) {
        this.allCentres = this.staticCentres;
        this.centresLoading = false;
        this.cdr.detectChanges();
      }
    }, 5000);

    this.http.get<any[]>(`${environment.apiUrl}/api/centres/all`).subscribe({
      next: (data) => {
        clearTimeout(timeout);
        if (data && data.length > 0) {
          this.allCentres = data.map((c: any) => ({
            id: c.id,
            name: c.name || '',
            type: c.type || '',
            city: c.city || '',
            province: c.province || '',
            suburb: c.suburb || c.city || '',
            description: c.description || '',
            mission: c.mission || '',
            services: Array.isArray(c.services) ? c.services : [],
            languages: Array.isArray(c.languages) ? c.languages : [],
            is_24_hour: !!c.is_24_hour,
            has_shelter: !!c.has_shelter,
            provides_counselling: !!c.provides_counselling,
            provides_legal_support: !!c.provides_legal_support,
            capacity: c.capacity || 0,
            img: c.profile_picture ? this.mediaUrl(c.profile_picture) : getCentreImage(c.type, c.id),
            profilePicture: c.profile_picture || null,
            contact_email: c.contact_email || '',
            contact_phone: c.contact_phone || '',
            whatsapp: c.whatsapp || '',
            website: c.website || '',
            verified: !!c.verified,
            year_established: c.year_established || 0,
            beneficiaries_per_year: c.beneficiaries_per_year || 0,
          }));
        } else {
          this.allCentres = this.staticCentres;
        }
        this.centresLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        clearTimeout(timeout);
        this.allCentres = this.staticCentres;
        this.centresLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Slideshow ─────────────────────────────────────────────
  startSlideshow(): void {
    this.slideInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.noticePosts.length;
      this.cdr.detectChanges();
    }, 4500);
  }

  goToSlide(i: number): void {
    this.currentSlide = i;
    clearInterval(this.slideInterval);
    this.startSlideshow();
  }

  prevSlide(): void { this.goToSlide((this.currentSlide - 1 + this.noticePosts.length) % this.noticePosts.length); }
  nextSlide(): void { this.goToSlide((this.currentSlide + 1) % this.noticePosts.length); }

  get currentNotice(): NoticePost { return this.noticePosts[this.currentSlide]; }
  get currentNoticeImg(): string { return this.currentNotice.img || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80'; }

  // ── Filtering ─────────────────────────────────────────────
  get filteredCentres(): Centre[] {
    return this.allCentres.filter(c => {
      const q = (this.searchQuery || '').toLowerCase();
      const searchMatch = !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.suburb || '').toLowerCase().includes(q) ||
        (c.services || []).some((s: string) => s.toLowerCase().includes(q));
      const provinceMatch = !this.selectedProvince || c.province === this.selectedProvince;
      const typeMatch = !this.selectedType || c.type === this.selectedType;
      return searchMatch && provinceMatch && typeMatch;
    });
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = { gbv_centre: 'GBV Centre', orphanage: 'Orphanage', old_age_home: 'Old Age Home' };
    return map[type] || type;
  }

  // ── Centre click ──────────────────────────────────────────
  openCentre(centre: Centre): void {
    if (!this.currentUser) { this.activeModal = 'auth'; this.authTab = 'login'; return; }
    this.router.navigate(['/centres', centre.id]);
  }

  // ── Modals ────────────────────────────────────────────────
  showDonate(centre?: Centre): void {
    if (!this.currentUser) {
      if (centre) { this.donateForm.patchValue({ centre_id: centre.id }); this.selectedCentre = centre; }
      this.pendingModal = 'donate';
      this.activeModal = 'auth'; this.authTab = 'login'; return;
    }
    if (centre) { this.donateForm.patchValue({ centre_id: centre.id }); this.selectedCentre = centre; }
    this.activeModal = 'donate';
  }

  showVolunteer(centre?: Centre): void {
    if (!this.currentUser) { this.activeModal = 'auth'; this.authTab = 'login'; return; }
    if (centre) { this.volunteerForm.patchValue({ centre_id: centre.id }); this.selectedCentre = centre; }
    this.activeModal = 'volunteer';
  }

  closeModal(e: MouseEvent): void { this.activeModal = ''; }
  closeModalDirect(): void { this.activeModal = ''; }

  // ── Auth ──────────────────────────────────────────────────
  loadSellerCentres(): void {
    this.sellerCentresLoading = true;
    this.http.get<any[]>(`${environment.apiUrl}/api/sellers/centres/verified`).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.sellerCentres = data.map((c: any) => ({ id: c.id, name: c.name || c.centre_name, city: c.city, province: c.province }));
        }
        this.sellerCentresLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.sellerCentresLoading = false; this.cdr.detectChanges(); }
    });
  }

  onSellerIdInput(): void {
    const cleaned = this.sellerIdNumber.replace(/\D/g, '');
    this.sellerIdNumber = cleaned;
    this.sellerIdVerified = false;
    this.sellerIdError = '';
    if (cleaned.length === 13) {
      this.sellerIdVerified = true;
    } else if (cleaned.length > 0) {
      this.sellerIdError = `${cleaned.length}/13 digits entered.`;
    }
  }

  get sellerCanSubmit(): boolean {
    return this.sellerIdVerified &&
      this.sellerFullName.trim().length > 0 &&
      this.sellerEmail.trim().length > 0 &&
      /^.{8,}$/.test(this.sellerPin) &&
      this.sellerCentreId.length > 0 &&
      !this.sellerIsLoading;
  }

  doSellerRegister(): void {
    this.sellerError = '';
    if (!this.sellerCanSubmit) { this.sellerError = 'Please complete all fields.'; return; }
    const nameParts = this.sellerFullName.trim().split(/\s+/);
    const real_name = nameParts[0];
    const real_surname = nameParts.slice(1).join(' ') || nameParts[0];
    let alias = this.sellerEmail.split('@')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
    if (!alias) alias = `maker_${Date.now()}`;
    this.sellerIsLoading = true;
    const payload = {
      id_number: this.sellerIdNumber,
      real_name, real_surname,
      email: this.sellerEmail,
      pin: this.sellerPin,
      alias,
      phone: '0000000000',
      centre_id: this.sellerCentreId,
      accepted_terms: true, accepted_popia: true, safety_acknowledged: true,
    };
    this.http.post<any>(`${environment.apiUrl}/api/sellers/register`, payload).subscribe({
      next: (res) => {
        localStorage.setItem('sellerId', res.seller_id);
        localStorage.setItem('sellerAlias', res.alias);
        localStorage.setItem('sellerEmail', res.email);
        localStorage.setItem('hiddenPin', this.sellerPin);
        localStorage.setItem('hiddenLayerAccess', 'false');
        const sellerUser = { id: res.seller_id, alias: res.alias, email: res.email, verification_status: res.verification_status || 'pending', hidden_layer_granted: false };
        localStorage.setItem('sellerUser', JSON.stringify(sellerUser));
        this.sellerIsLoading = false;
        this.closeModalDirect();
        this.router.navigate(['/seller/dashboard']);
      },
      error: (err) => {
        this.sellerIsLoading = false;
        if (err.error?.code === 'ALREADY_EXISTS' || err.status === 409) {
          this.sellerError = 'This email is already registered. Please sign in instead.';
        } else {
          this.sellerError = err.error?.error || err.message || 'Something went wrong. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  doLogin(): void {
    this.authError = '';
    if (!this.loginEmail || !this.loginPassword) { this.authError = 'Please fill in all fields.'; return; }

    if (this.loginRole === 'seller') {
      this.http.post<any>(`${environment.apiUrl}/api/sellers/login`, {
        email: this.loginEmail, pin: this.loginPassword
      }).subscribe({
        next: (res) => {
          localStorage.setItem('sellerId', res.id);
          localStorage.setItem('sellerAlias', res.alias);
          localStorage.setItem('sellerEmail', res.email);
          localStorage.setItem('hiddenPin', this.loginPassword);
          localStorage.setItem('hiddenLayerAccess', 'false');
          this.closeModalDirect();
          this.router.navigate(['/seller/dashboard']);
        },
        error: (err) => { this.authError = err.error?.error || 'Invalid email or password.'; this.cdr.detectChanges(); }
      });
      return;
    }

    if (this.loginRole === 'centre') {
      this.http.post<any>(`${environment.apiUrl}/api/centres/login`, {
        email: this.loginEmail, password: this.loginPassword
      }).subscribe({
        next: (res) => {
          localStorage.setItem('centreId', res.centre_id);
          localStorage.setItem('centreName', res.centre_name);
          localStorage.setItem('centreEmail', res.contact_email);
          this.closeModalDirect();
          this.router.navigate(['/centre-dashboard']);
        },
        error: (err) => { this.authError = err.error?.error || 'Invalid email or password.'; this.cdr.detectChanges(); }
      });
      return;
    }

    // Buyer
    const ok = this.authService.login(this.loginEmail, this.loginPassword, 'buyer');
    if (!ok) { this.authError = 'Invalid credentials.'; return; }
    const pending = this.pendingModal;
    this.pendingModal = '';
    this.closeModalDirect();
    this.showToast('Welcome back!');
    if (pending) setTimeout(() => { this.activeModal = pending; }, 100);
    else if (this.selectedCentre) setTimeout(() => { this.activeModal = 'centre-detail'; }, 100);
  }

  doRegister(): void {
    this.authError = '';
    if (this.registerRole === 'centre') { this.closeModalDirect(); this.router.navigate(['/register/centre']); return; }
    if (!this.registerName || !this.registerEmail || !this.registerPassword) { this.authError = 'Please fill in all fields.'; return; }
    if (this.registerPassword.length < 8) { this.authError = 'Password must be 8+ characters.'; return; }
    const ok = this.authService.register(this.registerName, this.registerEmail, this.registerPassword, this.registerRole);
    if (ok) { this.closeModalDirect(); this.showToast(`Welcome, ${this.registerName}!`); }
    else { this.authError = 'Registration failed.'; }
  }

  logout(): void { this.authService.logout(); this.showToast('Signed out successfully'); }

  // ── Donate submit ─────────────────────────────────────────
  submitDonate(): void {
    if (this.donateForm.invalid) { this.donateForm.markAllAsTouched(); return; }
    this.closeModalDirect();
    this.showToast('Thank you! Your contribution has been recorded.');
  }

  // ── Volunteer submit ──────────────────────────────────────
  submitVolunteer(): void {
    if (this.volunteerForm.invalid) { this.volunteerForm.markAllAsTouched(); return; }
    this.closeModalDirect();
    this.showToast('Application sent! The centre will review and contact you.');
  }

  // ── Toast ─────────────────────────────────────────────────
  showToast(msg: string): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 3000);
  }
}