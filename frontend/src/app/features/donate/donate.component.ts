// ============================================================
// frontend/src/app/features/donate/donate.component.ts
// ============================================================
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Centre {
  id: string;
  name: string;
  type: 'gbv' | 'orphanage' | 'elderly';
  city: string;
  province: string;
  img: string;
  tagline: string;
  raised: number;
  goal: number;
  donors: number;
  accepts_goods: boolean;
  npo_number: string;
  section18a: boolean;
  needs: string[];
  urgency: 'critical' | 'moderate' | 'stable';
}

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="donate-page">

  <!-- NAV -->
  <nav class="d-nav">
    <a class="brand" routerLink="/marketplace">
      <div class="brand-mark">A</div>
      <span class="brand-name">Amani</span>
    </a>
    <div class="nav-links">
      <a routerLink="/marketplace" class="nl">Marketplace</a>
      <a routerLink="/for-centres" class="nl">For Centres</a>
    </div>
    <a routerLink="/cart" class="nav-cart-link">🛒 Cart</a>
  </nav>

  <!-- HERO -->
  <div class="donate-hero">
    <div class="dh-inner">
      <div class="dh-eyebrow">❤️ Donate with purpose</div>
      <h1>Give directly to verified<br>South African centres</h1>
      <p>Every donation is tracked. Choose money or goods. Receive a Section 18A certificate for tax relief.</p>
      <div class="dh-stats">
        <div class="dhs"><span class="dhs-num">R1.2M</span><span class="dhs-label">Donated total</span></div>
        <div class="dhs-div"></div>
        <div class="dhs"><span class="dhs-num">38</span><span class="dhs-label">Verified centres</span></div>
        <div class="dhs-div"></div>
        <div class="dhs"><span class="dhs-num">4,800+</span><span class="dhs-label">Lives touched</span></div>
      </div>
    </div>
  </div>

  <!-- FILTERS -->
  <div class="filter-bar">
    <div class="filter-bar-inner">
      <div class="filter-chips">
        <button class="chip-btn" [class.active]="activeType === 'all'" (click)="activeType = 'all'">All Centres</button>
        <button class="chip-btn" [class.active]="activeType === 'gbv'" (click)="activeType = 'gbv'">🛡️ GBV Centres</button>
        <button class="chip-btn" [class.active]="activeType === 'orphanage'" (click)="activeType = 'orphanage'">🏠 Orphanages</button>
        <button class="chip-btn" [class.active]="activeType === 'elderly'" (click)="activeType = 'elderly'">🌸 Old Age Homes</button>
      </div>
      <div class="filter-right">
        <button class="urgency-filter" [class.active]="showUrgent" (click)="showUrgent = !showUrgent">
          🔴 Urgent needs only
        </button>
        <select class="province-select" [(ngModel)]="activeProvince">
          <option value="">All provinces</option>
          <option *ngFor="let p of provinces" [value]="p">{{ p }}</option>
        </select>
      </div>
    </div>
  </div>

  <!-- CENTRES GRID -->
  <div class="centres-section">
    <div class="centres-inner">

      <!-- Stats bar -->
      <div class="section-meta">
        <span class="sm-count">{{ filteredCentres.length }} centres</span>
        <span class="sm-sort">Sorted by urgency</span>
      </div>

      <div class="centres-grid">
        <div class="centre-card" *ngFor="let c of filteredCentres">
          <div class="cc-image">
            <img [src]="c.img" [alt]="c.name" loading="lazy" />
            <div class="cc-type-badge" [ngClass]="c.type">
              {{ c.type === 'gbv' ? '🛡️ GBV' : c.type === 'orphanage' ? '🏠 Orphanage' : '🌸 Elderly' }}
            </div>
            <div class="cc-urgency" *ngIf="c.urgency === 'critical'">🔴 Critical need</div>
          </div>
          <div class="cc-body">
            <div class="cc-location">📍 {{ c.city }}, {{ c.province }}</div>
            <h3 class="cc-name">{{ c.name }}</h3>
            <p class="cc-tagline">{{ c.tagline }}</p>

            <!-- Needs chips -->
            <div class="cc-needs">
              <span class="need-chip" *ngFor="let n of c.needs.slice(0, 3)">{{ n }}</span>
            </div>

            <!-- Progress bar -->
            <div class="cc-progress">
              <div class="cpp-header">
                <span class="cpp-raised">R{{ formatK(c.raised) }} raised</span>
                <span class="cpp-goal">of R{{ formatK(c.goal) }} goal</span>
              </div>
              <div class="cpp-bar">
                <div class="cpp-fill" [style.width.%]="Math.min((c.raised / c.goal) * 100, 100)"></div>
              </div>
              <div class="cpp-donors">{{ c.donors }} donors</div>
            </div>

            <!-- Badges -->
            <div class="cc-badges">
              <span class="badge-pill verified">✓ Verified NPO</span>
              <span class="badge-pill s18a" *ngIf="c.section18a">🧾 Section 18A</span>
              <span class="badge-pill goods" *ngIf="c.accepts_goods">📦 Accepts goods</span>
            </div>

            <!-- Actions -->
            <div class="cc-actions">
              <button class="btn-donate-money" (click)="openDonateModal(c)">
                💛 Donate Money
              </button>
              <button class="btn-donate-goods" *ngIf="c.accepts_goods" (click)="openGoodsModal(c)">
                📦 Donate Goods
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div class="no-centres" *ngIf="filteredCentres.length === 0">
        <div class="nc-icon">🔍</div>
        <h3>No centres match your filters</h3>
        <button (click)="activeType = 'all'; activeProvince = ''; showUrgent = false">Clear filters</button>
      </div>

    </div>
  </div>

  <!-- WHY DONATE SECTION -->
  <div class="why-section">
    <div class="why-inner">
      <h2>Why donate through Amani?</h2>
      <div class="why-grid">
        <div class="why-card">
          <div class="wc-icon">🔍</div>
          <h3>Verified centres only</h3>
          <p>Every centre undergoes physical site visits and NPO document checks before being listed.</p>
        </div>
        <div class="why-card">
          <div class="wc-icon">🧾</div>
          <h3>Tax certificates</h3>
          <p>All qualifying donations receive Section 18A certificates, giving you up to 10% tax relief on the donation amount.</p>
        </div>
        <div class="why-card">
          <div class="wc-icon">📊</div>
          <h3>Impact reporting</h3>
          <p>Centres submit quarterly impact reports. You see exactly how your money was spent — to the rand.</p>
        </div>
        <div class="why-card">
          <div class="wc-icon">📦</div>
          <h3>Goods donations tracked</h3>
          <p>Donate blankets, food, clothing and more. Centres confirm receipt. Nothing disappears.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- BOTTOM ANNOUNCE -->
  <div class="bottom-announce">
    <span>🚚 Free delivery on orders over R500</span>
    <span class="ba-dot">·</span>
    <span>98% goes directly to makers &amp; centres</span>
    <span class="ba-dot">·</span>
    <span>🔒 Anonymous shipping via Centre Hub</span>
  </div>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand-col">
        <div class="footer-logo">A</div>
        <p class="footer-tagline">Commerce with <em>conscience.</em></p>
        <p class="footer-sub">Supporting GBV survivors, youth, and the elderly across South Africa.</p>
      </div>
      <div class="footer-links">
        <div class="fl-col">
          <h4>Marketplace</h4>
          <a routerLink="/marketplace">All Products</a>
          <a routerLink="/marketplace">Jewellery</a>
          <a routerLink="/marketplace">Art &amp; Crafts</a>
        </div>
        <div class="fl-col">
          <h4>Give</h4>
          <a routerLink="/donate">Donate Money</a>
          <a routerLink="/donate">Donate Goods</a>
          <a routerLink="/for-centres">Volunteer</a>
        </div>
        <div class="fl-col">
          <h4>Amani</h4>
          <a href="#">About Us</a>
          <a href="#">Impact Report</a>
          <a href="#">POPIA Policy</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Amani Platform (Pty) Ltd</span>
      <span>Made with purpose in South Africa 🇿🇦</span>
    </div>
  </footer>

</div>

<!-- DONATE MONEY MODAL -->
<div class="modal-backdrop" [class.open]="donateModal" (click)="donateModal = false">
  <div class="modal" [class.open]="donateModal" (click)="$event.stopPropagation()" *ngIf="selectedCentre">
    <button class="modal-close" (click)="donateModal = false">✕</button>
    <div class="dm-header">
      <div class="dm-logo">❤️</div>
      <h2>Donate to {{ selectedCentre.name }}</h2>
      <p class="dm-sub">📍 {{ selectedCentre.city }} · ✓ Verified NPO</p>
    </div>

    <div class="amount-grid">
      <button class="amount-btn" *ngFor="let a of presetAmounts"
        [class.selected]="donateAmount === a"
        (click)="donateAmount = a; customAmount = ''">
        R{{ a }}
      </button>
    </div>
    <div class="custom-amount-wrap">
      <label>Or enter custom amount</label>
      <div class="ca-input">
        <span class="ca-prefix">R</span>
        <input type="number" [(ngModel)]="customAmount" placeholder="e.g. 750" (input)="donateAmount = 0" />
      </div>
    </div>

    <div class="donate-type-wrap">
      <label>Donation type</label>
      <div class="dt-options">
        <label class="dt-opt" [class.selected]="donateType === 'once'" (click)="donateType = 'once'">
          <input type="radio" name="dtype" value="once" [(ngModel)]="donateType" /> Once-off
        </label>
        <label class="dt-opt" [class.selected]="donateType === 'monthly'" (click)="donateType = 'monthly'">
          <input type="radio" name="dtype" value="monthly" [(ngModel)]="donateType" /> Monthly
        </label>
      </div>
    </div>

    <div class="s18a-note" *ngIf="selectedCentre.section18a">
      🧾 This centre issues Section 18A certificates. You will receive yours via email.
    </div>

    <div class="dm-total" *ngIf="effectiveAmount > 0">
      You are donating <strong>R{{ effectiveAmount }}</strong>
      <span *ngIf="donateType === 'monthly'"> per month</span>
    </div>

    <button class="btn-confirm-donate" [disabled]="effectiveAmount <= 0" (click)="confirmDonate()">
      Proceed to payment →
    </button>

    <div class="modal-success-state" *ngIf="donated">
      <div class="ms-icon">✓</div>
      <h3>Thank you! Your donation is confirmed.</h3>
      <p>{{ selectedCentre.section18a ? 'Your Section 18A certificate will arrive by email within 48 hours.' : 'Impact receipt sent to your email.' }}</p>
    </div>
  </div>
</div>

<!-- DONATE GOODS MODAL -->
<div class="modal-backdrop" [class.open]="goodsModal" (click)="goodsModal = false">
  <div class="modal" [class.open]="goodsModal" (click)="$event.stopPropagation()" *ngIf="selectedCentre">
    <button class="modal-close" (click)="goodsModal = false">✕</button>
    <div class="dm-header">
      <div class="dm-logo">📦</div>
      <h2>Donate Goods</h2>
      <p class="dm-sub">to {{ selectedCentre.name }}</p>
    </div>
    <p class="goods-intro">Select the items you'd like to donate. We will coordinate collection or drop-off with the centre.</p>
    <div class="goods-list">
      <label class="goods-item" *ngFor="let g of goodsOptions">
        <input type="checkbox" [(ngModel)]="g.selected" />
        <span class="gi-icon">{{ g.icon }}</span>
        <span class="gi-label">{{ g.label }}</span>
      </label>
    </div>
    <div class="cf-group">
      <label>Your contact number</label>
      <input type="tel" [(ngModel)]="goodsPhone" placeholder="0821234567" />
    </div>
    <div class="cf-group">
      <label>Preferred drop-off / collection date</label>
      <input type="date" [(ngModel)]="goodsDate" />
    </div>
    <button class="btn-confirm-donate" (click)="confirmGoods()">Submit goods donation →</button>
    <div class="modal-success-state" *ngIf="goodsDonated">
      <div class="ms-icon">✓</div>
      <h3>Thank you!</h3>
      <p>The centre will contact you within 48 hours to arrange collection or drop-off.</p>
    </div>
  </div>
</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

    :host {
      --gold: #C49A3C; --gold-light: #F5E9C8; --gold-dark: #B8860B;
      --forest: #2D5016; --forest-deep: #1A3009; --forest-mid: #3D6B20;
      --sage: #5A7A3A; --sage-light: #EFF4E8; --sage-mid: #D1DEC4;
      --teal: #1A6B5A; --red: #EF4444; --amber: #D97706; --green: #16A34A;
      --text-dark: #1C2B1A; --text-mid: #4A5C47; --text-light: #7A8C77; --text-muted: #9CA3AF;
      --border: #E5E7EB; --bg: #F7F9F5; --white: #FFFFFF;
      font-family: 'DM Sans', sans-serif; background: var(--bg);
      display: block; min-height: 100vh; color: var(--text-dark);
    }

    /* NAV */
    .d-nav {
      background: var(--forest-deep); padding: 0 28px; height: 60px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      position: sticky; top: 0; z-index: 200;
    }
    .brand { display: flex; align-items: center; gap: 9px; text-decoration: none; }
    .brand-mark {
      width: 34px; height: 34px; border-radius: 8px;
      background: linear-gradient(135deg, var(--gold-light), var(--gold));
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: var(--forest-deep);
    }
    .brand-name { font-family: 'Playfair Display', serif; color: white; font-size: .96rem; font-weight: 700; }
    .nav-links { display: flex; gap: 4px; }
    .nl { color: rgba(255,255,255,.6); text-decoration: none; padding: 6px 12px; border-radius: 7px; font-size: .82rem; font-weight: 500; transition: all .2s; &:hover { color: white; background: rgba(255,255,255,.08); } }
    .nav-cart-link { color: var(--gold-light); text-decoration: none; font-size: .82rem; font-weight: 700; background: rgba(196,154,60,.2); padding: 7px 14px; border-radius: 7px; }

    /* HERO */
    .donate-hero {
      background: linear-gradient(135deg, var(--forest-deep) 0%, #C53030 100%);
      padding: 56px 28px;
      text-align: center;
    }
    .dh-inner { max-width: 680px; margin: 0 auto; }
    .dh-eyebrow { font-size: .78rem; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,.6); margin-bottom: 14px; font-weight: 600; }
    .donate-hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 3rem); color: white; margin: 0 0 14px; font-weight: 400; line-height: 1.15; }
    .donate-hero p  { color: rgba(255,255,255,.7); font-size: .96rem; line-height: 1.65; margin-bottom: 32px; }
    .dh-stats { display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; }
    .dhs { display: flex; flex-direction: column; align-items: center; }
    .dhs-num   { font-family: 'DM Mono', monospace; font-size: 1.5rem; font-weight: 600; color: var(--gold-light); }
    .dhs-label { font-size: .68rem; color: rgba(255,255,255,.42); text-transform: uppercase; letter-spacing: .8px; margin-top: 2px; }
    .dhs-div   { width: 1px; height: 32px; background: rgba(255,255,255,.18); }

    /* FILTERS */
    .filter-bar { background: var(--white); border-bottom: 1px solid var(--border); position: sticky; top: 60px; z-index: 100; }
    .filter-bar-inner { max-width: 1200px; margin: 0 auto; padding: 12px 28px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .filter-chips { display: flex; gap: 7px; flex-wrap: wrap; }
    .chip-btn {
      padding: 7px 16px; border: 1.5px solid var(--border); border-radius: 99px;
      background: white; font-family: 'DM Sans', sans-serif; font-size: .8rem; font-weight: 600;
      color: var(--text-mid); cursor: pointer; transition: all .2s;
      &:hover { border-color: var(--forest); color: var(--forest); }
      &.active { background: var(--forest); color: white; border-color: var(--forest); }
    }
    .filter-right { display: flex; gap: 9px; align-items: center; }
    .urgency-filter {
      padding: 7px 14px; border: 1.5px solid var(--border); border-radius: 99px;
      background: white; font-size: .78rem; font-weight: 600; color: var(--text-mid); cursor: pointer;
      &.active { background: #FEE2E2; border-color: #FECACA; color: #991B1B; }
    }
    .province-select {
      border: 1.5px solid var(--border); border-radius: 8px; padding: 7px 12px;
      font-family: 'DM Sans', sans-serif; font-size: .8rem; color: var(--text-dark); background: white; outline: none;
    }

    /* CENTRES SECTION */
    .centres-section { max-width: 1200px; margin: 0 auto; padding: 28px 28px 56px; }
    .centres-inner {}
    .section-meta { display: flex; justify-content: space-between; margin-bottom: 18px; }
    .sm-count { font-size: .84rem; color: var(--text-muted); }
    .sm-sort  { font-size: .76rem; color: var(--text-muted); }

    .centres-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }

    .centre-card {
      background: var(--white); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
      transition: transform .25s, box-shadow .25s;
      &:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(0,0,0,.1); }
    }
    .cc-image { position: relative; height: 180px; background: var(--sage-light); overflow: hidden; img { width: 100%; height: 100%; object-fit: cover; } }
    .cc-type-badge {
      position: absolute; bottom: 9px; left: 9px; font-size: .7rem; font-weight: 700;
      padding: 3px 10px; border-radius: 99px;
      &.gbv       { background: rgba(197,48,48,.88); color: white; }
      &.orphanage { background: rgba(29,107,90,.88); color: white; }
      &.elderly   { background: rgba(139,92,246,.88); color: white; }
    }
    .cc-urgency {
      position: absolute; top: 9px; right: 9px; background: #FEE2E2; color: #991B1B;
      font-size: .68rem; font-weight: 700; padding: 3px 9px; border-radius: 99px;
    }
    .cc-body { padding: 16px 18px 18px; }
    .cc-location { font-size: .7rem; color: var(--teal); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 5px; }
    .cc-name { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; color: var(--text-dark); margin: 0 0 6px; }
    .cc-tagline { font-size: .82rem; color: var(--text-light); line-height: 1.55; margin-bottom: 11px; }
    .cc-needs { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 13px; }
    .need-chip { font-size: .66rem; font-weight: 600; padding: 3px 9px; border-radius: 99px; background: var(--sage-light); color: var(--forest); }

    .cc-progress { margin-bottom: 12px; }
    .cpp-header { display: flex; justify-content: space-between; font-size: .76rem; margin-bottom: 6px; }
    .cpp-raised { font-weight: 700; color: var(--forest); font-family: 'DM Mono', monospace; }
    .cpp-goal   { color: var(--text-muted); }
    .cpp-bar    { height: 7px; background: var(--border); border-radius: 4px; overflow: hidden; }
    .cpp-fill   { height: 100%; background: linear-gradient(90deg, var(--forest), var(--sage)); border-radius: 4px; transition: width .6s; }
    .cpp-donors { font-size: .72rem; color: var(--text-muted); margin-top: 5px; }

    .cc-badges { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 13px; }
    .badge-pill {
      font-size: .66rem; font-weight: 700; padding: 3px 9px; border-radius: 99px;
      &.verified { background: var(--sage-light); color: var(--forest); }
      &.s18a     { background: #FEF3C7; color: #92400E; }
      &.goods    { background: #E0F2FE; color: #075985; }
    }
    .cc-actions { display: flex; gap: 8px; }
    .btn-donate-money {
      flex: 1; padding: 10px; background: linear-gradient(135deg, var(--forest), var(--forest-mid));
      color: white; border: none; border-radius: 9px; font-family: 'DM Sans', sans-serif;
      font-size: .82rem; font-weight: 700; cursor: pointer; transition: all .2s;
      &:hover { transform: translateY(-1px); }
    }
    .btn-donate-goods {
      padding: 10px 14px; background: white; border: 1.5px solid var(--border);
      color: var(--text-mid); border-radius: 9px; font-family: 'DM Sans', sans-serif;
      font-size: .8rem; font-weight: 600; cursor: pointer; transition: all .2s;
      &:hover { border-color: var(--sage); color: var(--forest); }
    }

    /* NO RESULTS */
    .no-centres { text-align: center; padding: 72px 24px;
      .nc-icon { font-size: 2.5rem; margin-bottom: 14px; }
      h3 { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: var(--text-dark); margin-bottom: 14px; }
      button { background: var(--forest); color: white; border: none; padding: 10px 22px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-weight: 700; cursor: pointer; }
    }

    /* WHY SECTION */
    .why-section { background: var(--forest-deep); padding: 48px 28px; }
    .why-inner { max-width: 1000px; margin: 0 auto; }
    .why-section h2 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: white; text-align: center; margin: 0 0 32px; font-weight: 400; }
    .why-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; }
    .why-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 22px; }
    .wc-icon { font-size: 1.6rem; margin-bottom: 12px; }
    .why-card h3 { font-size: .92rem; color: white; font-weight: 700; margin: 0 0 8px; }
    .why-card p  { font-size: .8rem; color: rgba(255,255,255,.55); line-height: 1.6; margin: 0; }

    /* BOTTOM ANNOUNCE */
    .bottom-announce {
      background: var(--forest-deep); border-top: 1px solid rgba(255,255,255,.08);
      display: flex; align-items: center; justify-content: center; gap: 14px;
      padding: 10px 24px; font-size: .8rem; color: rgba(255,255,255,.65); flex-wrap: wrap;
    }
    .ba-dot { color: rgba(255,255,255,.25); }

    /* FOOTER */
    .footer { background: var(--forest-deep); border-top: 1px solid rgba(255,255,255,.06); }
    .footer-inner { max-width: 1100px; margin: 0 auto; padding: 32px 40px 24px; display: grid; grid-template-columns: 200px 1fr; gap: 48px; align-items: start; }
    .footer-brand-col { display: flex; flex-direction: column; gap: 8px; }
    .footer-logo { width: 38px; height: 38px; border-radius: 9px; background: linear-gradient(135deg, var(--gold-light), var(--gold)); display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: var(--forest-deep); }
    .footer-tagline { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: white; margin: 0; em { color: var(--gold-light); font-style: italic; } }
    .footer-sub { font-size: .76rem; color: rgba(255,255,255,.38); line-height: 1.5; margin: 0; }
    .footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
    .fl-col { display: flex; flex-direction: column; gap: 8px;
      h4 { font-size: .66rem; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,.28); font-weight: 600; margin: 0 0 4px; }
      a  { font-size: .82rem; color: rgba(255,255,255,.52); text-decoration: none; cursor: pointer; transition: color .2s; &:hover { color: white; } }
    }
    .footer-bottom { max-width: 1100px; margin: 0 auto; padding: 14px 40px; border-top: 1px solid rgba(255,255,255,.06); display: flex; justify-content: space-between; font-size: .7rem; color: rgba(255,255,255,.22); flex-wrap: wrap; gap: 6px; }

    /* MODAL */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 500; background: rgba(15,32,9,.6); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; padding: 24px;
      opacity: 0; pointer-events: none; transition: opacity .25s;
      &.open { opacity: 1; pointer-events: auto; }
    }
    .modal {
      background: white; border-radius: 18px; padding: 36px;
      width: 100%; max-width: 440px; position: relative; max-height: 90vh; overflow-y: auto;
      transform: translateY(16px) scale(.97); transition: all .28s cubic-bezier(.34,1.56,.64,1);
      box-shadow: 0 28px 72px rgba(15,32,9,.4);
      &.open { transform: translateY(0) scale(1); }
    }
    .modal-close { position: absolute; top: 14px; right: 14px; width: 28px; height: 28px; border-radius: 50%; border: none; background: #F3F4F6; cursor: pointer; font-size: .8rem; display: flex; align-items: center; justify-content: center; }
    .dm-header { margin-bottom: 24px; text-align: center; }
    .dm-logo { font-size: 2rem; margin-bottom: 10px; }
    .dm-header h2 { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: var(--text-dark); margin: 0 0 4px; }
    .dm-sub { font-size: .8rem; color: var(--text-muted); }

    .amount-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
    .amount-btn {
      padding: 12px; border: 1.5px solid var(--border); border-radius: 9px; background: white;
      font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 600; color: var(--text-dark); cursor: pointer;
      transition: all .2s;
      &:hover { border-color: var(--forest); color: var(--forest); }
      &.selected { background: var(--forest); color: white; border-color: var(--forest); }
    }
    .custom-amount-wrap {
      margin-bottom: 16px;
      label { display: block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-dark); margin-bottom: 6px; }
    }
    .ca-input { display: flex; align-items: center; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; &:focus-within { border-color: var(--forest); } }
    .ca-prefix { padding: 10px 12px; background: var(--sage-light); font-weight: 700; color: var(--forest); font-size: .9rem; border-right: 1.5px solid var(--border); }
    .ca-input input { flex: 1; padding: 10px 12px; border: none; font-family: 'DM Mono', monospace; font-size: .9rem; outline: none; }

    .donate-type-wrap { margin-bottom: 16px; label { display: block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-dark); margin-bottom: 8px; } }
    .dt-options { display: flex; gap: 8px; }
    .dt-opt {
      flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border: 1.5px solid var(--border); border-radius: 8px; cursor: pointer;
      font-size: .86rem; font-weight: 600; color: var(--text-mid);
      &.selected { border-color: var(--forest); background: var(--sage-light); color: var(--forest); }
      input { accent-color: var(--forest); }
    }

    .s18a-note { background: #FEF3C7; border-radius: 8px; padding: 10px 14px; font-size: .78rem; color: #92400E; margin-bottom: 14px; }
    .dm-total { font-size: .9rem; color: var(--text-mid); margin-bottom: 14px; strong { font-family: 'DM Mono', monospace; color: var(--forest); font-size: 1.1rem; } }
    .btn-confirm-donate {
      width: 100%; padding: 13px; background: linear-gradient(135deg, var(--forest), var(--forest-mid));
      color: white; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif;
      font-size: .94rem; font-weight: 700; cursor: pointer; transition: all .2s; margin-bottom: 14px;
      &:disabled { opacity: .4; cursor: not-allowed; }
      &:hover:not(:disabled) { transform: translateY(-1px); }
    }
    .modal-success-state { text-align: center; padding: 16px 0;
      .ms-icon { font-size: 2.4rem; margin-bottom: 10px; }
      h3 { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: var(--text-dark); margin-bottom: 8px; }
      p  { font-size: .84rem; color: var(--text-muted); line-height: 1.6; }
    }

    .goods-intro { font-size: .84rem; color: var(--text-mid); margin-bottom: 16px; line-height: 1.55; }
    .goods-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .goods-item { display: flex; align-items: center; gap: 10px; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 9px; cursor: pointer; transition: border-color .2s; input { accent-color: var(--forest); } &:hover { border-color: var(--sage); } }
    .gi-icon { font-size: 1.1rem; }
    .gi-label { font-size: .86rem; font-weight: 500; color: var(--text-dark); }
    .cf-group { margin-bottom: 13px; label { display: block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-dark); margin-bottom: 5px; } input { width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .86rem; outline: none; box-sizing: border-box; &:focus { border-color: var(--forest); } } }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .d-nav { padding: 0 16px; }
      .nav-links { display: none; }
      .donate-hero { padding: 40px 16px; }
      .filter-bar-inner { padding: 10px 16px; }
      .centres-section { padding: 20px 16px 40px; }
      .footer-inner { grid-template-columns: 1fr; padding: 28px 16px 20px; gap: 24px; }
      .footer-links { grid-template-columns: repeat(2, 1fr); }
      .footer-bottom { padding: 12px 16px; }
    }
    @media (max-width: 600px) {
      .dh-stats { gap: 12px; }
      .dhs-div { display: none; }
      .centres-grid { grid-template-columns: 1fr; }
      .why-grid { grid-template-columns: 1fr 1fr; }
      .modal { padding: 24px 18px; }
      .amount-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .dt-options { flex-direction: column; }
    }
  `]
})
export class DonateComponent {
  activeType = 'all';
  activeProvince = '';
  showUrgent = false;
  donateModal = false;
  goodsModal = false;
  selectedCentre: Centre | null = null;
  donateAmount = 0;
  customAmount = '';
  donateType: 'once' | 'monthly' = 'once';
  donated = false;
  goodsDonated = false;
  goodsPhone = '';
  goodsDate = '';
  Math = Math;

  readonly presetAmounts = [50, 100, 200, 500, 1000, 2000];
  readonly provinces = ['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'];

  readonly goodsOptions = [
    { label: 'Blankets & bedding', icon: '🛏️', selected: false },
    { label: 'Clothing (adult)', icon: '👗', selected: false },
    { label: 'Clothing (children)', icon: '👕', selected: false },
    { label: 'Non-perishable food', icon: '🥫', selected: false },
    { label: 'Toiletries & hygiene', icon: '🧴', selected: false },
    { label: 'Stationery & books', icon: '📚', selected: false },
    { label: 'Baby essentials', icon: '🍼', selected: false },
    { label: 'Medication (sealed)', icon: '💊', selected: false },
  ];

  readonly centres: Centre[] = [
    {
      id: 'c001', name: 'Thistle House', type: 'gbv', city: 'Cape Town', province: 'Western Cape',
      img: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80',
      tagline: 'Emergency shelter and counselling for GBV survivors. 24/7 crisis line.',
      raised: 142000, goal: 200000, donors: 384, accepts_goods: true, npo_number: 'NPO-045678',
      section18a: true, needs: ['Counselling', 'Shelter', 'Legal aid'], urgency: 'critical'
    },
    {
      id: 'c002', name: 'Khayelitsha Hub', type: 'gbv', city: 'Khayelitsha', province: 'Western Cape',
      img: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80',
      tagline: 'Skills training, safe housing and income support for survivors of abuse.',
      raised: 89000, goal: 150000, donors: 201, accepts_goods: true, npo_number: 'NPO-067234',
      section18a: true, needs: ['Skills training', 'Transport', 'Food parcels'], urgency: 'critical'
    },
    {
      id: 'c003', name: 'Empilweni Children\'s Village', type: 'orphanage', city: 'Soweto', province: 'Gauteng',
      img: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80',
      tagline: 'Home to 84 children aged 2–17. Providing education, nutrition and love.',
      raised: 218000, goal: 300000, donors: 612, accepts_goods: true, npo_number: 'NPO-012345',
      section18a: true, needs: ['School fees', 'Food', 'Clothing'], urgency: 'moderate'
    },
    {
      id: 'c004', name: 'Khanya Elderly Home', type: 'elderly', city: 'Durban', province: 'KwaZulu-Natal',
      img: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&q=80',
      tagline: 'Dignity and care for 60 elderly residents, many of whom have no family support.',
      raised: 67000, goal: 120000, donors: 148, accepts_goods: true, npo_number: 'NPO-089012',
      section18a: false, needs: ['Medication', 'Bedding', 'Wheelchairs'], urgency: 'critical'
    },
    {
      id: 'c005', name: 'Ubuntu Women\'s Centre', type: 'gbv', city: 'Johannesburg', province: 'Gauteng',
      img: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=600&q=80',
      tagline: 'Legal advocacy, psychosocial support, and skills development for GBV survivors.',
      raised: 175000, goal: 200000, donors: 493, accepts_goods: false, npo_number: 'NPO-034567',
      section18a: true, needs: ['Legal fees', 'Counselling', 'Computers'], urgency: 'stable'
    },
    {
      id: 'c006', name: 'New Beginnings NPO', type: 'orphanage', city: 'Port Elizabeth', province: 'Eastern Cape',
      img: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&q=80',
      tagline: 'Foster care support and reunification services for 120 children in the Eastern Cape.',
      raised: 44000, goal: 100000, donors: 87, accepts_goods: true, npo_number: 'NPO-023456',
      section18a: false, needs: ['Foster care', 'Transport', 'Food'], urgency: 'moderate'
    },
  ];

  get effectiveAmount(): number {
    return this.donateAmount > 0 ? this.donateAmount : Number(this.customAmount) || 0;
  }

  get filteredCentres(): Centre[] {
    return this.centres.filter(c => {
      const typeMatch = this.activeType === 'all' || c.type === this.activeType;
      const provMatch = !this.activeProvince || c.province === this.activeProvince;
      const urgentMatch = !this.showUrgent || c.urgency === 'critical';
      return typeMatch && provMatch && urgentMatch;
    }).sort((a, b) => {
      const order = { critical: 0, moderate: 1, stable: 2 };
      return order[a.urgency] - order[b.urgency];
    });
  }

  formatK(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
  }

  openDonateModal(c: Centre): void {
    this.selectedCentre = c;
    this.donateAmount = 0;
    this.customAmount = '';
    this.donateType = 'once';
    this.donated = false;
    this.donateModal = true;
  }

  openGoodsModal(c: Centre): void {
    this.selectedCentre = c;
    this.goodsDonated = false;
    this.goodsPhone = '';
    this.goodsDate = '';
    this.goodsOptions.forEach(g => g.selected = false);
    this.goodsModal = true;
  }

  confirmDonate(): void {
    if (this.effectiveAmount <= 0) return;
    this.donated = true;
  }

  confirmGoods(): void {
    this.goodsDonated = true;
  }
}