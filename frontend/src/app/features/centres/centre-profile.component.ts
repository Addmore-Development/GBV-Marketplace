// ============================================================
// frontend/src/app/features/centres/centre-profile.component.ts
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';
import { SellerAuthService } from '../../services/seller-auth.service';
import { Centre, NoticePost } from './centres.component';

// Re-use the same static data from centres.component
const ALL_CENTRES: Centre[] = [
  {
    id: 'c1', name: 'Thistle House GBV Centre',
    type: 'gbv_centre', city: 'Cape Town', province: 'Western Cape', suburb: 'Observatory',
    description: 'Thistle House has been a sanctuary for survivors of gender-based violence in Cape Town since 2012. We provide emergency shelter, trauma counselling, legal support, and long-term reintegration programmes for women and children.',
    mission: 'To restore dignity, safety, and hope to every survivor who walks through our doors.',
    services: ['Emergency Shelter', 'Counselling', 'Legal Aid', 'Court Support', 'Skills Training'],
    languages: ['English', 'Afrikaans', 'Xhosa'],
    is_24_hour: true, has_shelter: true, provides_counselling: true, provides_legal_support: true,
    capacity: 45, img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
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
    capacity: 30, img: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
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
    capacity: 60, img: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&q=80',
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
    capacity: 80, img: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&q=80',
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
    capacity: 25, img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80',
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
    capacity: 35, img: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80',
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
    capacity: 120, img: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
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
    capacity: 40, img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    contact_email: 'ubuntu@womencentre.co.za', contact_phone: '041 453 9011',
    verified: true, year_established: 2007, beneficiaries_per_year: 290,
  },
];

@Component({
  selector: 'app-centre-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
<nav class="pp-nav">
  <div class="pp-nav-inner">
    <a routerLink="/centres" class="pp-back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      All Centres
    </a>
    <a routerLink="/marketplace" class="pp-brand">
      <div class="pp-brand-mark">A</div>
      <span>Amani</span>
    </a>
    <div class="pp-nav-actions">
      <ng-container *ngIf="!currentUser">
        <button class="pp-btn-ghost" (click)="activeModal = 'auth'; authTab = 'login'">Sign In</button>
        <button class="pp-btn-solid" (click)="activeModal = 'auth'; authTab = 'register'">Register</button>
      </ng-container>
      <ng-container *ngIf="currentUser">
        <div class="pp-chip">
          <div class="pp-avatar">{{ currentUser.initials }}</div>
          <span>{{ currentUser.name.split(' ')[0] }}</span>
        </div>
        <button class="pp-btn-ghost" (click)="logout()">Sign out</button>
      </ng-container>
    </div>
  </div>
</nav>

<div class="pp-not-found" *ngIf="!centre">
  <h2>Centre not found</h2>
  <p>This centre may have moved or been removed.</p>
  <a routerLink="/centres" class="pp-btn-solid">Back to Centres</a>
</div>

<div class="pp-page" *ngIf="centre">

  <!-- Hero -->
  <div class="pp-hero" [style.background-image]="'url(' + centre.img + ')'">
    <div class="pp-hero-overlay">
      <div class="pp-hero-content">
        <div class="pp-type-badge">{{ getTypeLabel(centre.type) }}</div>
        <h1 class="pp-name">{{ centre.name }}</h1>
        <div class="pp-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {{ centre.suburb }}, {{ centre.city }}, {{ centre.province }}
        </div>
        <div class="pp-verified" *ngIf="centre.verified">✓ Verified Centre</div>
      </div>
    </div>
  </div>

  <!-- Body -->
  <div class="pp-body">
    <div class="pp-main">

      <!-- Stats bar -->
      <div class="pp-stats">
        <div class="pp-stat">
          <span class="pp-stat-val">{{ centre.year_established }}</span>
          <span class="pp-stat-label">Established</span>
        </div>
        <div class="pp-stat">
          <span class="pp-stat-val">{{ centre.capacity }}</span>
          <span class="pp-stat-label">Capacity</span>
        </div>
        <div class="pp-stat">
          <span class="pp-stat-val">{{ centre.beneficiaries_per_year }}+</span>
          <span class="pp-stat-label">Served / year</span>
        </div>
        <div class="pp-stat" *ngIf="centre.is_24_hour">
          <span class="pp-stat-val">24/7</span>
          <span class="pp-stat-label">Service</span>
        </div>
      </div>

      <!-- About -->
      <section class="pp-section">
        <h2 class="pp-section-title">About</h2>
        <p class="pp-description">{{ centre.description }}</p>
      </section>

      <!-- Mission -->
      <section class="pp-section pp-mission-block">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <blockquote>"{{ centre.mission }}"</blockquote>
      </section>

      <!-- Services -->
      <section class="pp-section">
        <h2 class="pp-section-title">Services Offered</h2>
        <div class="pp-services">
          <span class="pp-svc" *ngFor="let s of centre.services">{{ s }}</span>
        </div>
      </section>

      <!-- Indicators -->
      <section class="pp-section">
        <h2 class="pp-section-title">Key Features</h2>
        <div class="pp-indicators">
          <div class="pp-ind" [class.active]="centre.is_24_hour">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            24/7 Service
          </div>
          <div class="pp-ind" [class.active]="centre.has_shelter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Safe Shelter
          </div>
          <div class="pp-ind" [class.active]="centre.provides_counselling">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Counselling
          </div>
          <div class="pp-ind" [class.active]="centre.provides_legal_support">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Legal Support
          </div>
        </div>
      </section>

      <!-- Languages -->
      <section class="pp-section">
        <h2 class="pp-section-title">Languages Spoken</h2>
        <div class="pp-langs">
          <span class="pp-lang" *ngFor="let l of centre.languages">{{ l }}</span>
        </div>
      </section>

    </div>

    <!-- Sidebar -->
    <aside class="pp-sidebar">

      <!-- CTA card -->
      <div class="pp-cta-card">
        <h3>Support {{ centre.name }}</h3>
        <button class="pp-cta-btn pp-donate-btn" (click)="showDonate()">💛 Donate</button>
        <button class="pp-cta-btn pp-volunteer-btn" (click)="showVolunteer()">🤝 Volunteer</button>
      </div>

      <!-- Contact card (login required) -->
      <div class="pp-contact-card">
        <h3>Contact Details</h3>
        <div class="pp-locked" *ngIf="!currentUser">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Sign in to view contact details
          <button class="pp-btn-solid mt8" (click)="activeModal = 'auth'; authTab = 'login'">Sign In</button>
        </div>
        <div class="pp-contacts" *ngIf="currentUser">
          <a *ngIf="centre.contact_phone" [href]="'tel:' + centre.contact_phone" class="pp-contact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.92 6.92l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            {{ centre.contact_phone }}
          </a>
          <a *ngIf="centre.contact_email" [href]="'mailto:' + centre.contact_email" class="pp-contact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            {{ centre.contact_email }}
          </a>
          <a *ngIf="centre.whatsapp" [href]="'https://wa.me/27' + centre.whatsapp.slice(1)" target="_blank" class="pp-contact pp-whatsapp">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            WhatsApp
          </a>
          <a *ngIf="centre.website" [href]="centre.website" target="_blank" class="pp-contact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            Website
          </a>
        </div>
      </div>

    </aside>
  </div>
</div>

<!-- ── MODAL BACKDROP ── -->
<div class="pp-modal-backdrop" [class.open]="activeModal" (click)="closeModal()">

  <!-- Auth Modal -->
  <div class="pp-modal" (click)="$event.stopPropagation()" *ngIf="activeModal === 'auth'">
    <button class="pp-modal-close" (click)="closeModal()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="pp-modal-logo">A</div>
    <div class="pp-tabs">
      <button [class.active]="authTab === 'login'"    (click)="authTab = 'login'">Sign In</button>
      <button [class.active]="authTab === 'register'" (click)="authTab = 'register'">Register</button>
    </div>
    <div *ngIf="authTab === 'login'">
      <h2 class="pp-modal-title">Welcome back</h2>
      <div class="pp-mf"><label>Email</label><input [(ngModel)]="loginEmail" type="email" placeholder="you@example.com" /></div>
      <div class="pp-mf"><label>Password</label><input [(ngModel)]="loginPassword" type="password" placeholder="Your password" /></div>
      <div class="pp-error" *ngIf="authError">{{ authError }}</div>
      <button class="pp-modal-cta" (click)="doLogin()">Sign In</button>
    </div>
    <div *ngIf="authTab === 'register'">
      <h2 class="pp-modal-title">Create an account</h2>
      <div class="pp-role-grid">
        <div class="pp-role" [class.selected]="registerRole === 'buyer'"  (click)="registerRole = 'buyer'"><div class="pp-role-label">Buyer</div><div class="pp-role-desc">Shop & donate</div></div>
        <div class="pp-role" [class.selected]="registerRole === 'seller'" (click)="registerRole = 'seller'"><div class="pp-role-label">Seller</div><div class="pp-role-desc">Sell creations</div></div>
        <div class="pp-role" [class.selected]="registerRole === 'centre'" (click)="registerRole = 'centre'"><div class="pp-role-label">Centre</div><div class="pp-role-desc">Register centre</div></div>
      </div>
      <ng-container *ngIf="registerRole === 'buyer'">
        <div class="pp-mf"><label>Full Name</label><input [(ngModel)]="registerName" placeholder="Your full name" /></div>
        <div class="pp-mf"><label>Email</label><input [(ngModel)]="registerEmail" type="email" placeholder="you@example.com" /></div>
        <div class="pp-mf"><label>Password</label><input [(ngModel)]="registerPassword" type="password" placeholder="Min. 8 characters" /></div>
      </ng-container>
      <ng-container *ngIf="registerRole === 'centre' || registerRole === 'seller'">
        <div class="pp-register-preview">
          <p *ngIf="registerRole === 'centre'">Centre registration requires a full 9-step application. Click below to begin.</p>
          <p *ngIf="registerRole === 'seller'">Seller registration requires NRSO vetting and a centre referral.</p>
        </div>
      </ng-container>
      <div class="pp-error" *ngIf="authError">{{ authError }}</div>
      <button class="pp-modal-cta" (click)="doRegister()">
        {{ registerRole === 'centre' ? 'Start Centre Registration' : registerRole === 'seller' ? 'Start Seller Application' : 'Create Account' }}
      </button>
    </div>
  </div>

  <!-- Donate Modal -->
  <div class="pp-modal pp-modal-lg" (click)="$event.stopPropagation()" *ngIf="activeModal === 'donate' && centre">
    <button class="pp-modal-close" (click)="closeModal()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <h2 class="pp-modal-title">Donate to {{ centre.name }}</h2>
    <p class="pp-modal-sub">Support this centre with money, goods, or your time</p>
    <form [formGroup]="donateForm" (ngSubmit)="submitDonate()">
      <div class="pp-mf"><label>Your Full Name</label><input type="text" formControlName="donor_name" placeholder="e.g. Nomsa Dlamini" /></div>
      <div class="pp-mf"><label>Your Email</label><input type="email" formControlName="donor_email" placeholder="you@example.com" /></div>
      <div class="amount-grid">
        <button type="button" class="amount-btn" *ngFor="let a of [50, 100, 250, 500]"
          [class.selected]="donateForm.get('amount')?.value === a"
          (click)="donateForm.patchValue({amount: a})">R{{ a }}</button>
      </div>
      <div class="pp-mf"><label>Or enter amount (R)</label><input type="number" formControlName="amount" placeholder="e.g. 150" min="10" /></div>
      <div class="pp-mf"><label>Payment Method</label>
        <select formControlName="payment_method">
          <option value="">Select…</option>
          <option value="eft">EFT / Bank Transfer</option>
          <option value="card">Credit / Debit Card</option>
          <option value="snapscan">SnapScan</option>
        </select>
      </div>
      <div class="pp-mf"><label>Message (optional)</label><textarea formControlName="message" rows="2" placeholder="A message to the centre…"></textarea></div>
      <button type="submit" class="pp-modal-cta">Submit Donation</button>
    </form>
  </div>

  <!-- Volunteer Modal -->
  <div class="pp-modal pp-modal-lg" (click)="$event.stopPropagation()" *ngIf="activeModal === 'volunteer' && centre">
    <button class="pp-modal-close" (click)="closeModal()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <h2 class="pp-modal-title">Volunteer at {{ centre.name }}</h2>
    <p class="pp-modal-sub">All volunteers require NRSO clearance — arranged by Amani, free of charge.</p>
    <form [formGroup]="volunteerForm" (ngSubmit)="submitVolunteer()">
      <div class="pp-mf"><label>Full Name</label><input type="text" formControlName="full_name" placeholder="Your full name" /></div>
      <div class="pp-mf"><label>Email</label><input type="email" formControlName="email" placeholder="you@example.com" /></div>
      <div class="pp-mf"><label>Phone Number</label><input type="tel" formControlName="phone" placeholder="e.g. 0821234567" /></div>
      <div class="pp-mf"><label>Your Skills</label><input type="text" formControlName="skills" placeholder="e.g. Counselling, Legal Aid, IT, Teaching" /></div>
      <div class="pp-mf"><label>Availability</label>
        <select formControlName="availability">
          <option value="">Select…</option>
          <option value="weekends">Weekends only</option>
          <option value="weekdays">Weekdays</option>
          <option value="flexible">Flexible</option>
          <option value="once-off">Once-off</option>
          <option value="remote">Remote / Online only</option>
        </select>
      </div>
      <div class="pp-mf"><label>Additional Information (optional)</label><textarea formControlName="message" rows="3" placeholder="Tell us about yourself and what you'd like to contribute…"></textarea></div>
      <button type="submit" class="pp-modal-cta">Submit Application</button>
    </form>
  </div>

</div>

<!-- Toast -->
<div class="pp-toast" [class.show]="toastVisible">{{ toastMsg }}</div>
  `,
  styles: [`
:host { display: block; background: #FAF7F4; min-height: 100vh; }

/* Nav */
.pp-nav { position: sticky; top: 0; z-index: 100; background: white; border-bottom: 1px solid #EDE8E3; padding: 0 24px; height: 58px; display: flex; align-items: center; }
.pp-nav-inner { width: 100%; max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.pp-back { display: flex; align-items: center; gap: 6px; text-decoration: none; color: #7A6A5A; font-size: .85rem; font-family: 'DM Sans', sans-serif; transition: color .2s; &:hover { color: #3B2A20; } }
.pp-brand { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #3B2A20; font-family: 'DM Sans', sans-serif; font-weight: 700; }
.pp-brand-mark { width: 28px; height: 28px; background: #8B2635; border-radius: 7px; color: white; display: flex; align-items: center; justify-content: center; font-size: .9rem; font-weight: 800; }
.pp-nav-actions { display: flex; align-items: center; gap: 8px; }
.pp-btn-ghost { background: none; border: 1.5px solid #D4C9C0; color: #5A4A3A; padding: 6px 14px; border-radius: 7px; font-size: .82rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .2s; &:hover { border-color: #8B2635; color: #8B2635; } }
.pp-btn-solid { background: #8B2635; color: white; border: none; padding: 6px 14px; border-radius: 7px; font-size: .82rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background .2s; &:hover { background: #6D1D29; } }
.pp-chip { display: flex; align-items: center; gap: 7px; }
.pp-avatar { width: 30px; height: 30px; background: #8B2635; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; }

/* Not found */
.pp-not-found { text-align: center; padding: 100px 24px; }

/* Hero */
.pp-hero { width: 100%; height: 380px; background-size: cover; background-position: center; }
.pp-hero-overlay { width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,.3) 0%, rgba(0,0,0,.65) 100%); display: flex; align-items: flex-end; padding: 40px; }
.pp-hero-content { max-width: 700px; }
.pp-type-badge { display: inline-block; background: rgba(255,255,255,.2); backdrop-filter: blur(8px); color: white; border: 1px solid rgba(255,255,255,.3); padding: 4px 12px; border-radius: 20px; font-size: .75rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 10px; }
.pp-name { font-family: 'Playfair Display', serif; font-size: 2rem; color: white; margin: 0 0 8px; line-height: 1.2; }
.pp-location { display: flex; align-items: center; gap: 5px; color: rgba(255,255,255,.85); font-size: .9rem; font-family: 'DM Sans', sans-serif; margin-bottom: 8px; }
.pp-verified { display: inline-flex; align-items: center; gap: 5px; color: #A8E6A0; font-size: .8rem; font-weight: 700; font-family: 'DM Sans', sans-serif; }

/* Body layout */
.pp-body { max-width: 1100px; margin: 0 auto; padding: 40px 24px; display: grid; grid-template-columns: 1fr 300px; gap: 40px; }
@media (max-width: 800px) { .pp-body { grid-template-columns: 1fr; } .pp-hero { height: 260px; } .pp-hero-overlay { padding: 24px; } .pp-name { font-size: 1.5rem; } }

/* Stats */
.pp-stats { display: flex; gap: 0; border: 1px solid #EDE8E3; border-radius: 12px; overflow: hidden; margin-bottom: 32px; background: white; }
.pp-stat { flex: 1; padding: 18px 12px; text-align: center; border-right: 1px solid #EDE8E3; &:last-child { border-right: none; } }
.pp-stat-val { display: block; font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #3B2A20; font-weight: 700; }
.pp-stat-label { display: block; font-size: .72rem; color: #9A8A7A; font-family: 'DM Sans', sans-serif; margin-top: 2px; text-transform: uppercase; letter-spacing: .04em; }

/* Sections */
.pp-section { margin-bottom: 32px; }
.pp-section-title { font-family: 'DM Sans', sans-serif; font-size: .78rem; font-weight: 700; color: #9A8A7A; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px; }
.pp-description { font-family: 'DM Sans', sans-serif; font-size: .95rem; color: #5A4A3A; line-height: 1.7; }

/* Mission */
.pp-mission-block { background: #FFF8F0; border-left: 4px solid #B8860B; padding: 20px 24px; border-radius: 0 10px 10px 0; display: flex; gap: 14px; align-items: flex-start; color: #6B4F12; svg { flex-shrink: 0; margin-top: 3px; } }
.pp-mission-block blockquote { font-family: 'Playfair Display', serif; font-size: 1.05rem; line-height: 1.6; color: #5A3A10; margin: 0; font-style: italic; }

/* Services */
.pp-services { display: flex; flex-wrap: wrap; gap: 8px; }
.pp-svc { background: white; border: 1px solid #EDE8E3; color: #5A4A3A; padding: 6px 14px; border-radius: 20px; font-size: .8rem; font-weight: 600; font-family: 'DM Sans', sans-serif; }

/* Indicators */
.pp-indicators { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pp-ind { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border: 1.5px solid #EDE8E3; border-radius: 9px; font-size: .85rem; font-family: 'DM Sans', sans-serif; color: #B0A09A; background: white; &.active { border-color: #5A7A3A; color: #5A7A3A; background: #F4FAF0; svg { stroke: #5A7A3A; } } }

/* Languages */
.pp-langs { display: flex; flex-wrap: wrap; gap: 8px; }
.pp-lang { background: #F4F0EC; color: #5A4A3A; padding: 5px 12px; border-radius: 20px; font-size: .8rem; font-family: 'DM Sans', sans-serif; }

/* Sidebar */
.pp-sidebar { display: flex; flex-direction: column; gap: 20px; }
.pp-cta-card, .pp-contact-card { background: white; border: 1px solid #EDE8E3; border-radius: 14px; padding: 24px; h3 { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: #3B2A20; margin: 0 0 16px; } }
.pp-cta-btn { width: 100%; padding: 12px; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: .88rem; font-weight: 700; cursor: pointer; margin-bottom: 10px; transition: all .2s; &:last-child { margin-bottom: 0; } }
.pp-donate-btn { background: #8B2635; color: white; border: none; &:hover { background: #6D1D29; } }
.pp-volunteer-btn { background: transparent; color: #5A7A3A; border: 1.5px solid #5A7A3A; &:hover { background: #5A7A3A; color: white; } }
.pp-locked { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: #9A8A7A; font-size: .85rem; font-family: 'DM Sans', sans-serif; svg { stroke: #B0A09A; } }
.mt8 { margin-top: 8px; }
.pp-contacts { display: flex; flex-direction: column; gap: 10px; }
.pp-contact { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #5A4A3A; font-size: .85rem; font-family: 'DM Sans', sans-serif; transition: color .2s; &:hover { color: #8B2635; } }
.pp-whatsapp:hover { color: #25D366; }

/* Modal */
.pp-modal-backdrop { position: fixed; inset: 0; z-index: 500; background: rgba(26,18,16,.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; pointer-events: none; transition: opacity .25s; &.open { opacity: 1; pointer-events: all; } }
.pp-modal { background: white; border-radius: 18px; padding: 32px; width: 100%; max-width: 460px; position: relative; max-height: 90vh; overflow-y: auto; }
.pp-modal-lg { max-width: 560px; }
.pp-modal-close { position: absolute; top: 16px; right: 16px; background: #F4F0EC; border: none; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #5A4A3A; &:hover { background: #EDE8E3; } }
.pp-modal-logo { width: 44px; height: 44px; background: #8B2635; border-radius: 11px; color: white; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.pp-modal-title { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #3B2A20; text-align: center; margin: 0 0 6px; }
.pp-modal-sub { text-align: center; color: #9A8A7A; font-size: .85rem; margin: 0 0 20px; font-family: 'DM Sans', sans-serif; }
.pp-modal-cta { width: 100%; padding: 13px; background: #8B2635; color: white; border: none; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: .92rem; font-weight: 700; cursor: pointer; margin-top: 10px; transition: background .2s; &:hover { background: #6D1D29; } }
.pp-tabs { display: flex; gap: 4px; background: #F4F0EC; border-radius: 10px; padding: 4px; margin-bottom: 20px; button { flex: 1; padding: 8px; background: none; border: none; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .85rem; font-weight: 600; cursor: pointer; color: #9A8A7A; &.active { background: white; color: #3B2A20; box-shadow: 0 1px 4px rgba(0,0,0,.08); } } }
.pp-role-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.pp-role { border: 1.5px solid #EDE8E3; border-radius: 9px; padding: 10px 8px; text-align: center; cursor: pointer; transition: all .2s; &.selected { border-color: #8B2635; background: #FDF5F6; } }
.pp-role-label { font-weight: 700; font-size: .85rem; color: #3B2A20; font-family: 'DM Sans', sans-serif; }
.pp-role-desc { font-size: .72rem; color: #9A8A7A; font-family: 'DM Sans', sans-serif; margin-top: 2px; }
.pp-register-preview { background: #FDF5F6; border: 1px solid #EDE8E3; border-radius: 9px; padding: 14px 16px; margin-bottom: 12px; p { font-size: .85rem; color: #5A4A3A; font-family: 'DM Sans', sans-serif; margin: 0; } }
.pp-mf { margin-bottom: 14px; label { display: block; font-size: .78rem; font-weight: 700; color: #5A4A3A; margin-bottom: 5px; font-family: 'DM Sans', sans-serif; text-transform: uppercase; letter-spacing: .04em; } input, select, textarea { width: 100%; padding: 10px 12px; border: 1.5px solid #EDE8E3; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .88rem; box-sizing: border-box; &:focus { outline: none; border-color: #8B2635; } } textarea { resize: vertical; } }
.pp-error { color: #8B2635; font-size: .82rem; margin-bottom: 10px; font-family: 'DM Sans', sans-serif; }
.amount-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.amount-btn { padding: 10px; border: 1.5px solid #EDE8E3; background: white; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .85rem; font-weight: 700; cursor: pointer; &.selected { border-color: #8B2635; background: #FDF5F6; color: #8B2635; } }

/* Toast */
.pp-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(8px); background: #3B2A20; color: white; padding: 12px 24px; border-radius: 30px; font-family: 'DM Sans', sans-serif; font-size: .88rem; opacity: 0; transition: all .3s; pointer-events: none; &.show { opacity: 1; transform: translateX(-50%) translateY(0); } }
  `]
})
export class CentreProfileComponent implements OnInit, OnDestroy {
  centre: Centre | null = null;
  currentUser: User | null = null;
  activeModal = '';
  authTab: 'login' | 'register' = 'login';
  authError = '';
  loginEmail = '';
  loginPassword = '';
  registerRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  registerName = '';
  registerEmail = '';
  registerPassword = '';
  toastMsg = '';
  toastVisible = false;

  donateForm!: FormGroup;
  volunteerForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private sellerAuth: SellerAuthService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.centre = ALL_CENTRES.find(c => c.id === id) || null;

    // Check seller/centre localStorage session first (survives page reload)
    const sellerId = localStorage.getItem('sellerId');
    const centreId = localStorage.getItem('centreId');
    if (sellerId) {
      const stored = localStorage.getItem('sellerUser');
      if (stored) {
        const s = JSON.parse(stored);
        this.currentUser = { name: s.alias, email: s.email, role: 'seller', initials: s.alias.slice(0,2).toUpperCase() };
      }
    } else if (centreId) {
      const name = localStorage.getItem('centreName') || 'Centre';
      const email = localStorage.getItem('centreEmail') || '';
      this.currentUser = { name, email, role: 'centre', initials: name.slice(0,2).toUpperCase() };
    }
    this.authService.user$.pipe(takeUntil(this.destroy$))
      .subscribe(u => { if (u) this.currentUser = u; });
    this.sellerAuth.user$.pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        if (u) this.currentUser = { name: u.alias, email: u.email, role: 'seller', initials: u.alias.slice(0,2).toUpperCase() };
        else if (!this.authService.currentUser && !localStorage.getItem('centreId')) this.currentUser = null;
      });

    this.donateForm = this.fb.group({
      donor_name:  ['', Validators.required],
      donor_email: ['', [Validators.required, Validators.email]],
      amount:      [''],
      payment_method: [''],
      message:     [''],
    });

    this.volunteerForm = this.fb.group({
      full_name:    ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
      phone:        ['', Validators.required],
      skills:       ['', Validators.required],
      availability: ['', Validators.required],
      message:      [''],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = { gbv_centre: 'GBV Centre', orphanage: 'Orphanage', old_age_home: 'Old Age Home' };
    return map[type] || type;
  }

  showDonate(): void {
    if (!this.currentUser) { this.activeModal = 'auth'; this.authTab = 'login'; return; }
    this.activeModal = 'donate';
  }

  showVolunteer(): void {
    if (!this.currentUser) { this.activeModal = 'auth'; this.authTab = 'login'; return; }
    this.activeModal = 'volunteer';
  }

  closeModal(): void { this.activeModal = ''; }

  doLogin(): void {
    this.authError = '';
    if (!this.loginEmail || !this.loginPassword) { this.authError = 'Please fill in all fields.'; return; }
    const ok = this.authService.login(this.loginEmail, this.loginPassword, 'buyer');
    if (!ok) { this.authError = 'Invalid credentials.'; return; }
    this.closeModal();
    this.showToast('Welcome back!');
  }

  doRegister(): void {
    this.authError = '';
    if (this.registerRole === 'centre') { this.closeModal(); this.router.navigate(['/register/centre']); return; }
    if (this.registerRole === 'seller') { this.closeModal(); this.router.navigate(['/register/seller']); return; }
    if (!this.registerName || !this.registerEmail || !this.registerPassword) { this.authError = 'Please fill in all fields.'; return; }
    if (this.registerPassword.length < 8) { this.authError = 'Password must be 8+ characters.'; return; }
    const ok = this.authService.register(this.registerName, this.registerEmail, this.registerPassword, 'buyer');
    if (ok) { this.closeModal(); this.showToast(`Welcome, ${this.registerName}!`); }
    else { this.authError = 'Registration failed.'; }
  }

  logout(): void { this.authService.logout(); this.showToast('Signed out successfully'); }

  submitDonate(): void {
    if (this.donateForm.invalid) { this.donateForm.markAllAsTouched(); return; }
    this.closeModal();
    this.showToast('Thank you! Your contribution has been recorded.');
  }

  submitVolunteer(): void {
    if (this.volunteerForm.invalid) { this.volunteerForm.markAllAsTouched(); return; }
    this.closeModal();
    this.showToast('Application sent! The centre will review and contact you.');
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 3000);
  }
}