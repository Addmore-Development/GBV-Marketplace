// ============================================================
// frontend/src/app/features/centres/register-centre.component.ts
// ============================================================
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

type Step = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-register-centre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="rc-page">

  <!-- NAV -->
  <nav class="rc-nav">
    <a class="brand" routerLink="/marketplace">
      <div class="brand-mark">A</div>
      <span class="brand-name">Amani</span>
    </a>
    <span class="rc-nav-label">Centre Registration</span>
  </nav>

  <!-- PROGRESS BAR -->
  <div class="progress-bar-wrap">
    <div class="pb-inner">
      <div class="pb-step" *ngFor="let s of steps; let i = index"
        [class.active]="currentStep === s.num"
        [class.done]="currentStep > s.num">
        <div class="pbs-circle">
          <span *ngIf="currentStep <= s.num">{{ s.num }}</span>
          <span *ngIf="currentStep > s.num">✓</span>
        </div>
        <span class="pbs-label">{{ s.label }}</span>
      </div>
      <div class="pb-line"></div>
    </div>
  </div>

  <!-- FORM CARD -->
  <div class="rc-content">
    <div class="rc-card">

      <!-- STEP 1: Centre basics -->
      <div *ngIf="currentStep === 1">
        <h2>Tell us about your centre</h2>
        <p class="step-sub">Basic information for your public Amani profile.</p>

        <div class="rf-group">
          <label>Centre name <span class="req">*</span></label>
          <input type="text" [(ngModel)]="form.name" placeholder="e.g. Thistle House GBV Centre" />
        </div>

        <div class="rf-row">
          <div class="rf-group">
            <label>Centre type <span class="req">*</span></label>
            <select [(ngModel)]="form.type">
              <option value="">Select type…</option>
              <option value="gbv">GBV / Abuse Centre</option>
              <option value="orphanage">Orphanage / Children's Home</option>
              <option value="elderly">Old Age / Elderly Home</option>
              <option value="youth">Youth Development</option>
              <option value="other">Other NPO</option>
            </select>
          </div>
          <div class="rf-group">
            <label>NPO registration number <span class="req">*</span></label>
            <input type="text" [(ngModel)]="form.npo_number" placeholder="e.g. NPO-045678" />
          </div>
        </div>

        <div class="rf-row">
          <div class="rf-group">
            <label>City <span class="req">*</span></label>
            <input type="text" [(ngModel)]="form.city" placeholder="e.g. Cape Town" />
          </div>
          <div class="rf-group">
            <label>Province <span class="req">*</span></label>
            <select [(ngModel)]="form.province">
              <option value="">Select province…</option>
              <option *ngFor="let p of provinces" [value]="p">{{ p }}</option>
            </select>
          </div>
        </div>

        <div class="rf-group">
          <label>One-line description <span class="req">*</span></label>
          <input type="text" [(ngModel)]="form.tagline" placeholder="e.g. Emergency shelter and counselling for GBV survivors" />
        </div>

        <div class="rf-group">
          <label>Full description</label>
          <textarea rows="3" [(ngModel)]="form.description" placeholder="Tell donors and volunteers who you are and what you do…"></textarea>
        </div>
      </div>

      <!-- STEP 2: Contact & Docs -->
      <div *ngIf="currentStep === 2">
        <h2>Contact &amp; documentation</h2>
        <p class="step-sub">We will use these to verify your centre and stay in touch.</p>

        <div class="rf-row">
          <div class="rf-group">
            <label>Manager / contact name <span class="req">*</span></label>
            <input type="text" [(ngModel)]="form.manager_name" placeholder="Full name" />
          </div>
          <div class="rf-group">
            <label>Your role <span class="req">*</span></label>
            <input type="text" [(ngModel)]="form.manager_role" placeholder="e.g. Director, Social Worker" />
          </div>
        </div>

        <div class="rf-row">
          <div class="rf-group">
            <label>Email address <span class="req">*</span></label>
            <input type="email" [(ngModel)]="form.email" placeholder="centre@example.co.za" />
          </div>
          <div class="rf-group">
            <label>Phone number <span class="req">*</span></label>
            <input type="tel" [(ngModel)]="form.phone" placeholder="021 555 0123" />
          </div>
        </div>

        <div class="rf-group">
          <label>Physical address <span class="req">*</span></label>
          <input type="text" [(ngModel)]="form.address" placeholder="Street address (used only for site visit, never shared publicly)" />
        </div>

        <div class="rf-group">
          <label>Website (optional)</label>
          <input type="url" [(ngModel)]="form.website" placeholder="https://yourcentre.co.za" />
        </div>

        <div class="doc-upload-section">
          <h4>Required documents</h4>
          <p class="doc-note">Upload PDFs or images. These are used only for verification and never shared publicly.</p>
          <div class="doc-items">
            <div class="doc-item" *ngFor="let d of docRequirements">
              <div class="di-info">
                <span class="di-icon">{{ d.icon }}</span>
                <div>
                  <div class="di-label">{{ d.label }} <span class="req" *ngIf="d.required">*</span></div>
                  <div class="di-desc">{{ d.desc }}</div>
                </div>
              </div>
              <div class="di-upload">
                <label class="upload-btn">
                  {{ d.uploaded ? '✓ Uploaded' : '⬆ Upload' }}
                  <input type="file" hidden (change)="d.uploaded = true" accept=".pdf,.jpg,.png" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 3: Services & features -->
      <div *ngIf="currentStep === 3">
        <h2>What does your centre offer?</h2>
        <p class="step-sub">Select everything that applies. This populates your public profile.</p>

        <div class="rf-group">
          <label>Services provided</label>
          <div class="checkbox-grid">
            <label class="cb-item" *ngFor="let s of serviceOptions">
              <input type="checkbox" [(ngModel)]="s.checked" />
              <span class="cb-icon">{{ s.icon }}</span>
              <span>{{ s.label }}</span>
            </label>
          </div>
        </div>

        <div class="rf-group">
          <label>Platform features you want to activate</label>
          <div class="feature-toggle-list">
            <div class="ftl-item" *ngFor="let f of featureToggles">
              <div class="ftl-info">
                <span class="ftl-icon">{{ f.icon }}</span>
                <div>
                  <div class="ftl-label">{{ f.label }}</div>
                  <div class="ftl-desc">{{ f.desc }}</div>
                </div>
              </div>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="f.enabled" />
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="rf-group">
          <label>How many people do you currently serve?</label>
          <select [(ngModel)]="form.residents_count">
            <option value="">Select range</option>
            <option value="1-20">1–20</option>
            <option value="21-50">21–50</option>
            <option value="51-100">51–100</option>
            <option value="100+">100+</option>
          </select>
        </div>
      </div>

      <!-- STEP 4: Review & submit -->
      <div *ngIf="currentStep === 4 && !submitted">
        <h2>Review &amp; submit</h2>
        <p class="step-sub">Check your details before submitting. Verification takes 7–14 days.</p>

        <div class="review-section">
          <h4>Centre details</h4>
          <div class="rv-row"><span>Name</span><strong>{{ form.name || '—' }}</strong></div>
          <div class="rv-row"><span>Type</span><strong>{{ form.type || '—' }}</strong></div>
          <div class="rv-row"><span>NPO number</span><strong>{{ form.npo_number || '—' }}</strong></div>
          <div class="rv-row"><span>Location</span><strong>{{ form.city }}, {{ form.province }}</strong></div>
        </div>

        <div class="review-section">
          <h4>Contact</h4>
          <div class="rv-row"><span>Manager</span><strong>{{ form.manager_name }}, {{ form.manager_role }}</strong></div>
          <div class="rv-row"><span>Email</span><strong>{{ form.email || '—' }}</strong></div>
          <div class="rv-row"><span>Phone</span><strong>{{ form.phone || '—' }}</strong></div>
        </div>

        <div class="review-section">
          <h4>Features activated</h4>
          <div class="rv-row" *ngFor="let f of featureToggles">
            <span>{{ f.label }}</span>
            <strong [class.green]="f.enabled" [class.grey]="!f.enabled">{{ f.enabled ? 'Yes' : 'No' }}</strong>
          </div>
        </div>

        <div class="terms-agree">
          <label class="cb-item">
            <input type="checkbox" [(ngModel)]="agreedToTerms" />
            <span>I confirm that all information is accurate and I am authorised to register this centre on Amani.</span>
          </label>
        </div>

        <div class="error-msg" *ngIf="submitError">⚠️ {{ submitError }}</div>
      </div>

      <!-- SUCCESS -->
      <div class="submit-success" *ngIf="submitted">
        <div class="ss-icon">🎉</div>
        <h2>Application submitted!</h2>
        <p>Thank you for registering <strong>{{ form.name }}</strong> on Amani.</p>
        <div class="ss-what-next">
          <h4>What happens next</h4>
          <div class="sswn-step">
            <span class="sswn-num">1</span>
            <span>We'll email <strong>{{ form.email }}</strong> a verification checklist within 24 hours.</span>
          </div>
          <div class="sswn-step">
            <span class="sswn-num">2</span>
            <span>Our team reviews your NPO documentation (2–3 business days).</span>
          </div>
          <div class="sswn-step">
            <span class="sswn-num">3</span>
            <span>A physical site visit is arranged if you are in a pilot area.</span>
          </div>
          <div class="sswn-step">
            <span class="sswn-num">4</span>
            <span>Once approved, you receive login credentials for your Centre Dashboard.</span>
          </div>
        </div>
        <div class="ss-timeline">⏱ Estimated time: 7–14 business days</div>
        <a routerLink="/marketplace" class="btn-home">← Back to Marketplace</a>
      </div>

      <!-- NAVIGATION BUTTONS -->
      <div class="rc-actions" *ngIf="!submitted">
        <button class="btn-back" (click)="prevStep()" *ngIf="currentStep > 1">← Back</button>
        <div style="flex:1"></div>
        <button class="btn-next" (click)="nextStep()" *ngIf="currentStep < 4">
          Continue →
        </button>
        <button class="btn-submit" (click)="submit()" *ngIf="currentStep === 4"
          [disabled]="!agreedToTerms">
          Submit application →
        </button>
      </div>

    </div>

    <!-- SIDEBAR INFO -->
    <div class="rc-sidebar">
      <div class="rcs-card">
        <h4>100% free for verified centres</h4>
        <p>No subscription. No setup fee. Only a 3% marketplace fee when you make a sale — and only then.</p>
      </div>
      <div class="rcs-card">
        <h4>What we verify</h4>
        <ul>
          <li>Valid NPO registration</li>
          <li>Active centre (site visit or references)</li>
          <li>Authorised representative</li>
          <li>Compliance with POPIA</li>
        </ul>
      </div>
      <div class="rcs-card">
        <h4>Questions?</h4>
        <p>Email <strong>centres&#64;amani.co.za</strong> or call <strong>021 555 0100</strong> weekdays 8am–5pm.</p>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    :host {
      --gold: #C49A3C; --gold-light: #F5E9C8;
      --forest: #2D5016; --forest-deep: #1A3009; --forest-mid: #3D6B20;
      --sage: #5A7A3A; --sage-light: #EFF4E8;
      --green: #16A34A; --red: #EF4444;
      --text-dark: #1C2B1A; --text-mid: #4A5C47; --text-muted: #9CA3AF;
      --border: #E5E7EB; --bg: #F7F9F5; --white: #FFFFFF;
      font-family: 'DM Sans', sans-serif; background: var(--bg);
      display: block; min-height: 100vh; color: var(--text-dark);
    }

    /* NAV */
    .rc-nav { background: var(--forest-deep); padding: 0 28px; height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 9px; text-decoration: none; }
    .brand-mark { width: 34px; height: 34px; border-radius: 8px; background: linear-gradient(135deg, var(--gold-light), var(--gold)); display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: var(--forest-deep); }
    .brand-name { font-family: 'Playfair Display', serif; color: white; font-size: .96rem; font-weight: 700; }
    .rc-nav-label { font-size: .78rem; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: 1px; }

    /* PROGRESS BAR */
    .progress-bar-wrap { background: var(--white); border-bottom: 1px solid var(--border); padding: 20px 28px; }
    .pb-inner { max-width: 680px; margin: 0 auto; display: flex; align-items: center; position: relative; justify-content: space-between; }
    .pb-step { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; z-index: 2; }
    .pbs-circle {
      width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border);
      background: var(--white); display: flex; align-items: center; justify-content: center;
      font-size: .8rem; font-weight: 700; color: var(--text-muted); transition: all .25s;
      .pb-step.active & { border-color: var(--forest); background: var(--forest); color: white; }
      .pb-step.done &   { border-color: var(--green); background: var(--green); color: white; }
    }
    .pbs-label { font-size: .7rem; font-weight: 600; color: var(--text-muted); white-space: nowrap; .pb-step.active & { color: var(--forest); } .pb-step.done & { color: var(--green); } }
    .pb-line { position: absolute; top: 16px; left: 40px; right: 40px; height: 2px; background: var(--border); z-index: 1; }

    /* CONTENT */
    .rc-content { max-width: 960px; margin: 32px auto; padding: 0 24px 64px; display: grid; grid-template-columns: 1fr 260px; gap: 24px; align-items: start; }

    /* CARD */
    .rc-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 32px; }
    .rc-card h2 { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: var(--text-dark); margin: 0 0 6px; }
    .step-sub { font-size: .86rem; color: var(--text-muted); margin: 0 0 24px; }

    /* FORM FIELDS */
    .rf-group { margin-bottom: 16px;
      label { display: block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-dark); margin-bottom: 5px; }
      input, select, textarea { width: 100%; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .88rem; color: var(--text-dark); background: white; outline: none; box-sizing: border-box; transition: border-color .2s; &:focus { border-color: var(--forest); } }
      textarea { resize: vertical; }
    }
    .rf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .req { color: var(--red); }

    /* DOCS */
    .doc-upload-section { margin-top: 20px; h4 { font-size: .88rem; font-weight: 700; color: var(--text-dark); margin: 0 0 6px; } }
    .doc-note { font-size: .78rem; color: var(--text-muted); margin-bottom: 14px; }
    .doc-items { display: flex; flex-direction: column; gap: 10px; }
    .doc-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1.5px solid var(--border); border-radius: 10px; gap: 12px; }
    .di-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .di-icon { font-size: 1.1rem; flex-shrink: 0; }
    .di-label { font-size: .84rem; font-weight: 600; color: var(--text-dark); }
    .di-desc  { font-size: .72rem; color: var(--text-muted); }
    .di-upload {}
    .upload-btn { display: inline-block; padding: 6px 14px; background: var(--sage-light); color: var(--forest); border-radius: 7px; font-size: .76rem; font-weight: 700; cursor: pointer; transition: all .2s; white-space: nowrap; &:hover { background: var(--forest); color: white; } }

    /* CHECKBOXES */
    .checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
    .cb-item { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px; cursor: pointer; font-size: .84rem; color: var(--text-mid); transition: all .2s; &:has(input:checked) { border-color: var(--forest); background: var(--sage-light); color: var(--forest); font-weight: 600; } input { accent-color: var(--forest); flex-shrink: 0; } }
    .cb-icon { font-size: 1rem; }

    /* FEATURE TOGGLES */
    .feature-toggle-list { display: flex; flex-direction: column; gap: 10px; }
    .ftl-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border: 1.5px solid var(--border); border-radius: 10px; }
    .ftl-info { display: flex; align-items: center; gap: 12px; flex: 1; }
    .ftl-icon  { font-size: 1.1rem; flex-shrink: 0; }
    .ftl-label { font-size: .86rem; font-weight: 600; color: var(--text-dark); }
    .ftl-desc  { font-size: .74rem; color: var(--text-muted); }
    .toggle { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; input { opacity: 0; width: 0; height: 0; } }
    .toggle-track { position: absolute; cursor: pointer; inset: 0; background: var(--border); border-radius: 99px; transition: background .2s; &::before { content: ''; position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: transform .2s; } }
    input:checked + .toggle-track { background: var(--green); }
    input:checked + .toggle-track::before { transform: translateX(16px); }

    /* REVIEW */
    .review-section { margin-bottom: 20px; h4 { font-size: .8rem; text-transform: uppercase; letter-spacing: .8px; color: var(--text-muted); font-weight: 600; margin: 0 0 10px; } }
    .rv-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: .86rem; &:last-child { border: none; } span { color: var(--text-mid); } strong { color: var(--text-dark); } .green { color: var(--green); } .grey { color: var(--text-muted); font-weight: 400; } }
    .terms-agree { margin: 20px 0; .cb-item { border: none; padding: 0; font-size: .84rem; color: var(--text-mid); } }
    .error-msg { background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 14px; color: #DC2626; font-size: .82rem; margin-bottom: 14px; }

    /* ACTIONS */
    .rc-actions { display: flex; align-items: center; gap: 10px; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); }
    .btn-back { background: none; border: 1.5px solid var(--border); color: var(--text-mid); padding: 11px 22px; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: .88rem; font-weight: 600; cursor: pointer; &:hover { border-color: var(--forest); color: var(--forest); } }
    .btn-next { background: var(--forest); color: white; border: none; padding: 11px 28px; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: .9rem; font-weight: 700; cursor: pointer; transition: all .2s; &:hover { background: var(--forest-mid); transform: translateY(-1px); } }
    .btn-submit { background: linear-gradient(135deg, var(--gold), var(--gold-dark)); color: var(--forest-deep); border: none; padding: 11px 28px; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: .9rem; font-weight: 700; cursor: pointer; transition: all .2s; &:disabled { opacity: .45; cursor: not-allowed; } &:hover:not(:disabled) { transform: translateY(-1px); } }

    /* SUCCESS */
    .submit-success { text-align: center; padding: 16px 0; }
    .ss-icon { font-size: 3rem; margin-bottom: 16px; }
    .submit-success h2 { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: var(--text-dark); margin: 0 0 10px; }
    .submit-success > p { color: var(--text-muted); margin-bottom: 28px; }
    .ss-what-next { background: var(--sage-light); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: left; h4 { font-size: .84rem; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--forest); margin: 0 0 14px; } }
    .sswn-step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; font-size: .86rem; color: var(--text-mid); &:last-child { margin: 0; } }
    .sswn-num { width: 22px; height: 22px; border-radius: 50%; background: var(--forest); color: white; display: flex; align-items: center; justify-content: center; font-size: .72rem; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .ss-timeline { font-size: .8rem; color: var(--text-muted); margin-bottom: 22px; }
    .btn-home { display: inline-block; background: var(--forest); color: white; text-decoration: none; padding: 12px 26px; border-radius: 9px; font-weight: 700; font-size: .9rem; }

    /* SIDEBAR */
    .rc-sidebar { display: flex; flex-direction: column; gap: 14px; }
    .rcs-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px; h4 { font-size: .88rem; font-weight: 700; color: var(--text-dark); margin: 0 0 8px; } p { font-size: .8rem; color: var(--text-muted); line-height: 1.6; margin: 0; } ul { margin: 0; padding-left: 18px; li { font-size: .8rem; color: var(--text-mid); margin-bottom: 5px; } } }

    @media (max-width: 720px) {
      .rc-content { grid-template-columns: 1fr; }
      .rc-sidebar { display: none; }
      .rf-row { grid-template-columns: 1fr; }
    }
  `]
})
export class RegisterCentreComponent {
  currentStep: Step = 1;
  submitted = false;
  submitError = '';
  agreedToTerms = false;

  constructor(private router: Router) {}

  form = {
    name: '', type: '', npo_number: '', city: '', province: '',
    tagline: '', description: '', manager_name: '', manager_role: '',
    email: '', phone: '', address: '', website: '',
    residents_count: '',
  };

  readonly provinces = [
    'Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape',
    'Limpopo','Mpumalanga','North West','Free State','Northern Cape'
  ];

  readonly steps = [
    { num: 1, label: 'Basics'   },
    { num: 2, label: 'Docs'     },
    { num: 3, label: 'Services' },
    { num: 4, label: 'Review'   },
  ];

  docRequirements = [
    { icon: '📄', label: 'NPO registration certificate', desc: 'Issued by the Department of Social Development', required: true, uploaded: false },
    { icon: '🏛️', label: 'Proof of physical address', desc: 'Municipal rates account or lease agreement', required: true, uploaded: false },
    { icon: '🪪', label: 'ID of authorised representative', desc: 'Director or manager who is registering', required: true, uploaded: false },
    { icon: '📸', label: 'Centre photos', desc: 'At least 2 photos of your facilities (JPG/PNG)', required: false, uploaded: false },
    { icon: '🧾', label: 'Section 18A approval letter', desc: 'Only if you wish to issue tax certificates', required: false, uploaded: false },
  ];

  serviceOptions = [
    { icon: '🏠', label: 'Emergency shelter',    checked: false },
    { icon: '💬', label: 'Counselling',           checked: false },
    { icon: '⚖️', label: 'Legal advocacy',        checked: false },
    { icon: '🏥', label: 'Medical support',       checked: false },
    { icon: '📚', label: 'Education / tutoring',  checked: false },
    { icon: '💼', label: 'Skills training',        checked: false },
    { icon: '🧒', label: 'Child care',             checked: false },
    { icon: '🍽️', label: 'Meals / food parcels',  checked: false },
    { icon: '🚗', label: 'Transport assistance',  checked: false },
    { icon: '🌐', label: 'Job placement',          checked: false },
  ];

  featureToggles = [
    { icon: '💰', label: 'Donation engine',   desc: 'Accept money and goods donations from the public', enabled: true },
    { icon: '🤝', label: 'Volunteer matching', desc: 'Receive and manage volunteer applications',       enabled: true },
    { icon: '🛒', label: 'Marketplace',        desc: 'Sell products made by your residents / survivors', enabled: false },
    { icon: '📋', label: 'Job board',          desc: 'Post paid roles and internship opportunities',   enabled: false },
    { icon: '📸', label: 'Social feed',        desc: 'Share updates and impact stories publicly',       enabled: true },
    { icon: '⚖️', label: 'Pro bono portal',    desc: 'Connect with lawyers, doctors, and counsellors', enabled: false },
  ];

  nextStep(): void {
    if (this.currentStep < 4) this.currentStep = (this.currentStep + 1) as Step;
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep = (this.currentStep - 1) as Step;
  }

  submit(): void {
    if (!this.agreedToTerms) {
      this.submitError = 'Please agree to the declaration before submitting.';
      return;
    }
    this.submitError = '';
    this.submitted = true;
  }
}