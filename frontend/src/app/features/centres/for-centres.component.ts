// ============================================================
// frontend/src/app/features/centres/for-centres.component.ts
// ============================================================
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-for-centres',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="fc-page">

  <!-- NAV -->
  <nav class="fc-nav">
    <a class="brand" routerLink="/marketplace">
      <div class="brand-mark">A</div>
      <span class="brand-name">Amani</span>
    </a>
    <div class="nav-links">
      <a routerLink="/marketplace" class="nl">Marketplace</a>
      <a routerLink="/donate" class="nl">Donate</a>
    </div>
    <button class="btn-register" (click)="router.navigate(['/register-centre'])">Register Your Centre →</button>
  </nav>

  <!-- HERO -->
  <div class="fc-hero">
    <div class="fch-inner">
      <div class="fch-eyebrow">🏠 Amani for GBV Centres, Orphanages &amp; Old Age Homes</div>
      <h1>The free platform built<br>for your centre</h1>
      <p>Get discovered. Receive donations. Recruit volunteers. Sell products. All in one place — at no cost to verified centres.</p>
      <div class="fch-actions">
        <button class="btn-primary-hero" (click)="router.navigate(['/register-centre'])">Register Your Centre Free →</button>
        <span class="fch-note">Verification takes 7–14 days</span>
      </div>
      <div class="fch-compare">
        <div class="fch-col bad">
          <h3>Without Amani</h3>
          <div class="fch-item bad">Invisible to donors</div>
          <div class="fch-item bad">No volunteer pipeline</div>
          <div class="fch-item bad">No e-commerce infrastructure</div>
          <div class="fch-item bad">Survivors leave with no income</div>
          <div class="fch-item bad">No pro bono access</div>
        </div>
        <div class="fch-arrow">→</div>
        <div class="fch-col good">
          <h3>With Amani</h3>
          <div class="fch-item good">Discovered by thousands monthly</div>
          <div class="fch-item good">Screened volunteers matched to needs</div>
          <div class="fch-item good">Ready-made marketplace</div>
          <div class="fch-item good">Survivors earn, build CVs, gain independence</div>
          <div class="fch-item good">Lawyers, counselors, doctors offered directly</div>
        </div>
      </div>
    </div>
  </div>

  <!-- FEATURES GRID -->
  <div class="features-section">
    <div class="features-inner">
      <div class="fs-header">
        <h2>What you get — 100% free for verified centres</h2>
        <p>Everything you need. Nothing you don't.</p>
      </div>
      <div class="features-grid">
        <div class="feature-card" *ngFor="let f of features">
          <div class="fc-icon">{{ f.icon }}</div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
          <div class="fc-detail" *ngIf="f.detail">{{ f.detail }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- MARKETPLACE MODEL -->
  <div class="marketplace-section">
    <div class="ms-inner">
      <div class="ms-header">
        <h2>The marketplace: turn rehabilitation into income</h2>
        <p>Your survivors learn skills. Now they can earn from them.</p>
      </div>
      <div class="ms-split">
        <div class="ms-table-wrap">
          <table class="ms-table">
            <thead>
              <tr><th>Product type</th><th>Example items</th><th>Centre keeps</th><th>Survivor keeps</th></tr>
            </thead>
            <tbody>
              <tr><td>Beaded jewellery</td><td>Necklaces, earrings</td><td class="pct-c">30%</td><td class="pct-s">70%</td></tr>
              <tr><td>Clothing &amp; textiles</td><td>Dresses, bags, scarves</td><td class="pct-c">30%</td><td class="pct-s">70%</td></tr>
              <tr><td>Food preserves</td><td>Jams, chutneys, dried herbs</td><td class="pct-c">30%</td><td class="pct-s">70%</td></tr>
              <tr><td>Art &amp; crafts</td><td>Pottery, wire art, candles</td><td class="pct-c">30%</td><td class="pct-s">70%</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ms-handle">
          <div class="msh-col">
            <div class="msh-label">We handle</div>
            <div class="msh-item">💳 Payments &amp; refunds</div>
            <div class="msh-item">📦 Shipping via centre hubs</div>
            <div class="msh-item">📞 Customer service</div>
            <div class="msh-item">📣 Marketing &amp; SEO</div>
          </div>
          <div class="msh-col">
            <div class="msh-label">You handle</div>
            <div class="msh-item">✅ Quality control</div>
            <div class="msh-item">💛 Paying survivors</div>
            <div class="msh-item">🚛 Shipping to hub</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- GBV HIDDEN LAYER -->
  <div class="hidden-layer-section">
    <div class="hl-inner">
      <div class="hl-badge">🛡️ For GBV Centres Only</div>
      <h2>Hidden Layer — optional, invisible to the public</h2>
      <p class="hl-sub">Accessible only when a survivor clicks "Request Support" — never visible on the main app.</p>
      <div class="hl-grid">
        <div class="hl-card" *ngFor="let h of hiddenFeatures">
          <div class="hlc-icon">{{ h.icon }}</div>
          <h3>{{ h.title }}</h3>
          <p>{{ h.desc }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- CASE STUDIES -->
  <div class="case-studies-section">
    <div class="cs-inner">
      <h2>Real centres already doing this</h2>
      <div class="cs-grid">
        <div class="cs-card" *ngFor="let cs of caseStudies">
          <div class="csc-type" [ngClass]="cs.type">{{ cs.typeLabel }}</div>
          <h3>{{ cs.name }}</h3>
          <div class="csc-location">{{ cs.location }}</div>
          <div class="csc-before">
            <span class="csc-label">Before</span>
            <p>{{ cs.before }}</p>
          </div>
          <div class="csc-after">
            <span class="csc-label after">With Amani</span>
            <p>{{ cs.after }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- HOW TO JOIN -->
  <div class="how-section">
    <div class="how-inner">
      <h2>How to join</h2>
      <div class="how-steps">
        <div class="how-step" *ngFor="let s of steps; let i = index">
          <div class="hs-num">{{ i + 1 }}</div>
          <div class="hs-content">
            <h3>{{ s.title }}</h3>
            <div class="hs-cols">
              <div class="hs-col you"><span class="hs-label">You do</span><p>{{ s.you }}</p></div>
              <div class="hs-col we"><span class="hs-label">We do</span><p>{{ s.we }}</p></div>
            </div>
          </div>
        </div>
      </div>
      <div class="how-note">
        ⏱ Verification takes 7–14 days. Unverified centres can list basic info but cannot accept donations or sell.
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div class="cta-section">
    <div class="cta-inner">
      <h2>Ready to get your centre on Amani?</h2>
      <p>No subscription fees. No hidden costs. A 3% marketplace fee only when you sell.</p>
      <button class="btn-cta-big" (click)="router.navigate(['/register-centre'])">Register Your Centre Free →</button>
      <div class="cta-sub">Questions? Email centres&#64;amani.co.za</div>
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
      </div>
      <div class="footer-links">
        <div class="fl-col"><h4>Platform</h4><a routerLink="/marketplace">Marketplace</a><a routerLink="/donate">Donate</a><a routerLink="/for-centres">For Centres</a></div>
        <div class="fl-col"><h4>Legal</h4><a href="#">Terms of Use</a><a href="#">POPIA Policy</a><a href="#">NPO Verification</a></div>
        <div class="fl-col"><h4>Contact</h4><a href="#">centres&#64;amani.co.za</a><a href="#">support&#64;amani.co.za</a></div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Amani Platform (Pty) Ltd</span>
      <span>Made with purpose in South Africa 🇿🇦</span>
    </div>
  </footer>

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
    .fc-nav { background: var(--forest-deep); padding: 0 28px; height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 16px; position: sticky; top: 0; z-index: 200; }
    .brand { display: flex; align-items: center; gap: 9px; text-decoration: none; }
    .brand-mark { width: 34px; height: 34px; border-radius: 8px; background: linear-gradient(135deg, var(--gold-light), var(--gold)); display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: var(--forest-deep); }
    .brand-name { font-family: 'Playfair Display', serif; color: white; font-size: .96rem; font-weight: 700; }
    .nav-links { display: flex; gap: 4px; }
    .nl { color: rgba(255,255,255,.6); text-decoration: none; padding: 6px 12px; border-radius: 7px; font-size: .82rem; font-weight: 500; transition: all .2s; &:hover { color: white; background: rgba(255,255,255,.08); } }
    .btn-register { background: linear-gradient(135deg, var(--gold), var(--gold-dark)); color: var(--forest-deep); border: none; padding: 9px 18px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 700; cursor: pointer; transition: all .2s; &:hover { transform: translateY(-1px); } }

    /* HERO */
    .fc-hero { background: linear-gradient(135deg, var(--forest-deep) 0%, #1a4a28 100%); padding: 64px 28px 48px; }
    .fch-inner { max-width: 960px; margin: 0 auto; }
    .fch-eyebrow { font-size: .76rem; text-transform: uppercase; letter-spacing: 1.2px; color: var(--gold-light); margin-bottom: 16px; font-weight: 600; }
    .fc-hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(1.9rem, 4vw, 3.2rem); color: white; margin: 0 0 16px; font-weight: 400; line-height: 1.12; }
    .fc-hero > .fch-inner > p { color: rgba(255,255,255,.7); font-size: .96rem; line-height: 1.65; max-width: 560px; margin-bottom: 28px; }
    .fch-actions { display: flex; align-items: center; gap: 18px; margin-bottom: 40px; flex-wrap: wrap; }
    .btn-primary-hero { background: white; color: var(--forest-deep); border: none; padding: 13px 28px; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: .96rem; font-weight: 700; cursor: pointer; transition: all .25s; &:hover { background: var(--gold-light); transform: translateY(-2px); } }
    .fch-note { font-size: .78rem; color: rgba(255,255,255,.45); }
    .fch-compare { display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; align-items: center; }
    .fch-col { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 20px; h3 { font-size: .78rem; text-transform: uppercase; letter-spacing: .8px; color: rgba(255,255,255,.4); font-weight: 600; margin: 0 0 14px; } }
    .fch-item { font-size: .84rem; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.06); &:last-child { border: none; } &.bad { color: rgba(255,255,255,.42); } &.good { color: rgba(255,255,255,.82); font-weight: 500; } &.good::before { content: '✓ '; color: var(--gold-light); } &.bad::before { content: '✗ '; color: rgba(255,255,255,.25); } }
    .fch-arrow { font-size: 1.5rem; color: var(--gold-light); font-weight: 700; }

    /* FEATURES */
    .features-section { padding: 56px 28px; }
    .features-inner { max-width: 1100px; margin: 0 auto; }
    .fs-header { text-align: center; margin-bottom: 36px; h2 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text-dark); margin: 0 0 8px; } p { color: var(--text-muted); } }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .feature-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 22px; transition: transform .2s, box-shadow .2s; &:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,.09); } }
    .fc-icon { font-size: 1.6rem; margin-bottom: 12px; }
    .feature-card h3 { font-size: .92rem; font-weight: 700; color: var(--text-dark); margin: 0 0 7px; }
    .feature-card p  { font-size: .8rem; color: var(--text-light); line-height: 1.6; margin: 0 0 8px; }
    .fc-detail { font-size: .74rem; color: var(--teal); font-weight: 600; }

    /* MARKETPLACE */
    .marketplace-section { background: var(--forest-deep); padding: 56px 28px; }
    .ms-inner { max-width: 960px; margin: 0 auto; }
    .ms-header { margin-bottom: 28px; h2 { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: white; margin: 0 0 8px; } p { color: rgba(255,255,255,.55); } }
    .ms-table-wrap { overflow-x: auto; margin-bottom: 24px; }
    .ms-table { width: 100%; border-collapse: collapse; th, td { padding: 10px 14px; text-align: left; font-size: .84rem; } th { color: rgba(255,255,255,.38); font-size: .68rem; text-transform: uppercase; letter-spacing: .8px; border-bottom: 1px solid rgba(255,255,255,.08); } td { color: rgba(255,255,255,.72); border-bottom: 1px solid rgba(255,255,255,.06); } tr:last-child td { border: none; } .pct-c { color: var(--sage-mid); font-family: 'DM Mono', monospace; font-weight: 700; } .pct-s { color: var(--gold-light); font-family: 'DM Mono', monospace; font-weight: 700; } }
    .ms-handle { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 20px 24px; }
    .msh-col { display: flex; flex-direction: column; gap: 8px; }
    .msh-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .8px; color: rgba(255,255,255,.32); font-weight: 600; margin-bottom: 4px; }
    .msh-item { font-size: .84rem; color: rgba(255,255,255,.7); }

    /* HIDDEN LAYER */
    .hidden-layer-section { background: linear-gradient(135deg, #1C1533 0%, #2D1B4E 100%); padding: 56px 28px; }
    .hl-inner { max-width: 960px; margin: 0 auto; }
    .hl-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); border-radius: 99px; padding: 6px 16px; font-size: .78rem; font-weight: 700; color: rgba(255,255,255,.8); margin-bottom: 16px; }
    .hl-inner h2 { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: white; margin: 0 0 10px; }
    .hl-sub { color: rgba(255,255,255,.52); font-size: .88rem; margin-bottom: 32px; line-height: 1.6; }
    .hl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
    .hl-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 20px; }
    .hlc-icon { font-size: 1.4rem; margin-bottom: 10px; }
    .hl-card h3 { font-size: .88rem; color: white; font-weight: 700; margin: 0 0 7px; }
    .hl-card p  { font-size: .78rem; color: rgba(255,255,255,.52); line-height: 1.6; margin: 0; }

    /* CASE STUDIES */
    .case-studies-section { padding: 56px 28px; background: var(--bg); }
    .cs-inner { max-width: 900px; margin: 0 auto; }
    .cs-inner h2 { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: var(--text-dark); margin: 0 0 28px; text-align: center; }
    .cs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
    .cs-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 22px; }
    .csc-type { display: inline-block; font-size: .68rem; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: 99px; margin-bottom: 10px; &.gbv { background: #FEE2E2; color: #991B1B; } &.orphanage { background: var(--sage-light); color: var(--forest); } &.elderly { background: #EDE9FE; color: #6D28D9; } }
    .csc-type-label {}
    .cs-card h3 { font-family: 'Playfair Display', serif; font-size: 1rem; color: var(--text-dark); margin: 0 0 4px; }
    .csc-location { font-size: .72rem; color: var(--text-muted); margin-bottom: 14px; }
    .csc-before, .csc-after { margin-bottom: 10px; p { font-size: .82rem; color: var(--text-mid); line-height: 1.55; margin: 4px 0 0; } }
    .csc-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); &.after { color: var(--green); } }

    /* HOW TO JOIN */
    .how-section { background: var(--white); padding: 56px 28px; }
    .how-inner { max-width: 800px; margin: 0 auto; }
    .how-inner h2 { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: var(--text-dark); margin: 0 0 32px; text-align: center; }
    .how-steps { display: flex; flex-direction: column; gap: 0; }
    .how-step { display: grid; grid-template-columns: 44px 1fr; gap: 20px; padding: 22px 0; border-bottom: 1px solid var(--border); &:last-child { border: none; } }
    .hs-num { width: 40px; height: 40px; border-radius: 50%; background: var(--forest); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0; margin-top: 2px; }
    .hs-content h3 { font-size: .96rem; font-weight: 700; color: var(--text-dark); margin: 0 0 12px; }
    .hs-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .hs-col { padding: 12px 16px; border-radius: 9px; &.you { background: var(--sage-light); } &.we { background: #EFF6FF; } }
    .hs-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); display: block; margin-bottom: 5px; }
    .hs-col p { font-size: .8rem; color: var(--text-mid); line-height: 1.55; margin: 0; }
    .how-note { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 9px; padding: 12px 16px; font-size: .8rem; color: #92400E; margin-top: 24px; }

    /* CTA */
    .cta-section { background: linear-gradient(135deg, var(--forest-deep), #C53030); padding: 56px 28px; text-align: center; }
    .cta-inner { max-width: 560px; margin: 0 auto; }
    .cta-section h2 { font-family: 'Playfair Display', serif; font-size: 2rem; color: white; margin: 0 0 12px; font-weight: 400; }
    .cta-section p  { color: rgba(255,255,255,.65); font-size: .92rem; margin-bottom: 28px; }
    .btn-cta-big { background: white; color: var(--forest-deep); border: none; padding: 15px 36px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all .25s; display: inline-block; margin-bottom: 14px; &:hover { background: var(--gold-light); transform: translateY(-2px); } }
    .cta-sub { font-size: .78rem; color: rgba(255,255,255,.42); }

    /* BOTTOM ANNOUNCE */
    .bottom-announce { background: var(--forest-deep); border-top: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; gap: 14px; padding: 10px 24px; font-size: .8rem; color: rgba(255,255,255,.65); flex-wrap: wrap; }
    .ba-dot { color: rgba(255,255,255,.25); }

    /* FOOTER */
    .footer { background: var(--forest-deep); border-top: 1px solid rgba(255,255,255,.06); }
    .footer-inner { max-width: 1100px; margin: 0 auto; padding: 32px 40px 24px; display: grid; grid-template-columns: 200px 1fr; gap: 48px; align-items: start; }
    .footer-brand-col { display: flex; flex-direction: column; gap: 8px; }
    .footer-logo { width: 38px; height: 38px; border-radius: 9px; background: linear-gradient(135deg, var(--gold-light), var(--gold)); display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: var(--forest-deep); }
    .footer-tagline { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: white; margin: 0; em { color: var(--gold-light); font-style: italic; } }
    .footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
    .fl-col { display: flex; flex-direction: column; gap: 8px; h4 { font-size: .66rem; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,.28); font-weight: 600; margin: 0 0 4px; } a { font-size: .82rem; color: rgba(255,255,255,.52); text-decoration: none; cursor: pointer; transition: color .2s; &:hover { color: white; } } }
    .footer-bottom { max-width: 1100px; margin: 0 auto; padding: 14px 40px; border-top: 1px solid rgba(255,255,255,.06); display: flex; justify-content: space-between; font-size: .7rem; color: rgba(255,255,255,.22); flex-wrap: wrap; gap: 6px; }

    @media (max-width: 700px) {
      .fc-nav { padding: 0 16px; }
      .nav-links { display: none; }
      .fch-compare { grid-template-columns: 1fr; }
      .fch-arrow { display: none; }
      .ms-handle, .hs-cols { grid-template-columns: 1fr; }
      .footer-inner { grid-template-columns: 1fr; padding: 24px 24px 18px; }
      .footer-links { grid-template-columns: repeat(2, 1fr); }
      .footer-bottom { padding: 12px 24px; }
    }
  `]
})
export class ForCentresComponent {
  constructor(public router: Router) {}

  readonly features = [
    { icon: '🗺️', title: 'Profile page', desc: 'Your centre listed on map with photos, services, and contact info.', detail: 'Visible to 10,000+ monthly Amani users' },
    { icon: '💰', title: 'Donation engine', desc: 'Accept money and goods. Issue Section 18A tax certificates automatically.', detail: 'EFT, card, and SnapScan supported' },
    { icon: '🤝', title: 'Volunteer matching', desc: 'Post needs → get screened volunteers → track hours and impact.', detail: 'Background checks included' },
    { icon: '📋', title: 'Job board', desc: 'Post paid roles and internships. Free for all NPO-verified positions.', detail: 'Reach qualified SA candidates' },
    { icon: '📸', title: 'Social feed', desc: 'Share updates, photos, and impact stories with your community.', detail: 'Syndicated to Amani homepage' },
    { icon: '🛒', title: 'Marketplace', desc: 'Sell products made by your survivors, residents, or youth. 3% fee only when you sell.', detail: 'Survivors keep 70% of every sale' },
    { icon: '⚖️', title: 'Pro bono portal', desc: 'Lawyers, counselors, and doctors offer free services directly to your centre.', detail: 'Fully screened professionals' },
    { icon: '📊', title: 'Impact dashboard', desc: 'Track donations, volunteer hours, sales, and outcomes in one place.', detail: 'Exportable reports for funders' },
  ];

  readonly hiddenFeatures = [
    { icon: '🗂️', title: 'Case journey tracker', desc: 'Step-by-step: medical → police → court → counseling. All in one place.' },
    { icon: '📁', title: 'Unified case file', desc: 'Share across professionals with survivor consent. No repeating the story.' },
    { icon: '🔐', title: 'Evidence vault', desc: 'Encrypted storage, court-ready exports, WhatsApp forwarding.' },
    { icon: '🌐', title: 'Support network', desc: 'Connect survivors to pro bono lawyers, counselors, and peer supporters.' },
  ];

  readonly caseStudies = [
    {
      name: 'Thistle House', location: 'Cape Town', type: 'gbv', typeLabel: '🛡️ GBV Centre',
      before: 'Relied on grants. Unknown to community beyond their local area.',
      after: 'Profile on map, sold R4,200 of beaded jewellery in month 1, recruited 12 volunteers.'
    },
    {
      name: 'Khayelitsha Cookie Company', location: 'Empilweni Centre, Cape Town', type: 'orphanage', typeLabel: '🏠 Orphanage',
      before: 'Baked goods sold only at the local weekend market.',
      after: 'Listed on marketplace → corporate bulk order for 500 units received in month 2.'
    },
    {
      name: 'Khanya Elderly Home', location: 'Durban', type: 'elderly', typeLabel: '🌸 Old Age Home',
      before: 'No online presence. Relied on word-of-mouth donations.',
      after: '68 new donors in 3 months. R42,000 raised. 8 screened volunteers matched.'
    },
  ];

  readonly steps = [
    { title: 'Register', you: 'Register at amani.co.za/register-centre', we: 'Send verification checklist within 24 hours' },
    { title: 'Submit documents', you: 'Upload NPO certificate and centre photos', we: 'Physical site visit (if in pilot area)' },
    { title: 'Onboarding', you: 'Complete 1-hour onboarding training online', we: 'Assign dedicated account manager' },
    { title: 'Go live', you: 'Post needs, list products, share your story', we: 'Promote your profile to Amani users' },
  ];
}