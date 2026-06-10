// ============================================================
// frontend/src/app/features/centre-register/centre-register.component.ts
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm  = control.get('confirm_password');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-centre-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, KeyValuePipe, TitleCasePipe],
  templateUrl: './centre-register.component.html',
  styleUrls: ['./centre-register.component.scss']
})
export class CentreRegisterComponent implements OnInit, OnDestroy {

  // ── UI state ──────────────────────────────────────────────
  currentStep    = 0;
  isSubmitting   = false;
  submitSuccess  = false;
  submitError    = '';
  uploadProgress = 0;
  centreId       = '';

  // ── Auth modal state ──────────────────────────────────────
  currentUser:    User | null = null;
  authModal       = '';
  authError       = '';
  loginRole:      'buyer' | 'seller' | 'centre' = 'centre';
  loginEmail      = '';
  loginPassword   = '';
  registerRole:   'buyer' | 'seller' | 'centre' = 'buyer';
  registerName    = '';
  registerEmail   = '';
  registerPassword = '';

  // ── File upload state ─────────────────────────────────────
  uploadedFiles: Record<string, File> = {};
  sitePhotos:    File[] = [];

  private destroy$ = new Subject<void>();

  // ── Static data ───────────────────────────────────────────
  readonly steps = [
    { icon: '🏥', label: 'Centre Type',           description: 'What kind of centre are you registering?' },
    { icon: '📋', label: 'Basic Info',             description: 'Name, NPO number, and official details' },
    { icon: '👤', label: 'Contact Person',         description: 'Primary contact and manager information' },
    { icon: '📍', label: 'Location',               description: 'Physical address and how to find you' },
    { icon: '📖', label: 'About the Centre',       description: 'Your mission, description, and services' },
    { icon: '🤝', label: 'Services Offered',       description: 'What services do you provide to beneficiaries?' },
    { icon: '🛡️', label: 'Safety & Safeguarding', description: 'Child protection and safeguarding protocols' },
    { icon: '📦', label: 'Documents',              description: 'Upload your verification documents' },
    { icon: '✅', label: 'Review & Submit',        description: 'Check your details and submit your application' },
  ];

  // Template uses "provinceOptions" — keep this name
  readonly provinceOptions = [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
    'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape',
  ];

  readonly serviceOptions = [
    'Emergency shelter', 'Legal support', 'Counselling / therapy', 'Medical care',
    "Children's programmes", 'Job skills training', 'Marketplace / income generation',
    'Court accompaniment', 'Police liaison', 'Safe house', 'Food & nutrition',
    'Substance abuse support', 'Elderly care', 'Youth development',
  ];

  // Template uses "targetOptions" — keep this name
  readonly targetOptions = [
    'GBV survivors', 'Women & girls', 'Children (0–12)', 'Youth (13–24)',
    'Elderly (60+)', 'LGBTQ+ individuals', 'People with disabilities',
    'Homeless individuals', 'Refugees / asylum seekers',
  ];

  readonly languageOptions = [
    'Zulu', 'Xhosa', 'Afrikaans', 'English', 'Sotho', 'Tswana',
    'Venda', 'Tsonga', 'Swati', 'Ndebele', 'Pedi',
  ];

  // ── Centre-type computed getters (used by *ngIf in template) ──
  get isGBV():       boolean { return this.form.get('centre_type')?.value === 'gbv_centre';    }
  get isOrphanage(): boolean { return this.form.get('centre_type')?.value === 'orphanage';     }
  get isOldAge():    boolean { return this.form.get('centre_type')?.value === 'old_age_home';  }

  form: FormGroup;

  constructor(
    private fb:          FormBuilder,
    private router:      Router,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      // Step 0
      centre_type: ['', Validators.required],

      // Step 1
      centre_name:          ['', [Validators.required, Validators.minLength(3)]],
      npo_number:           ['', Validators.required],
      dsd_number:           [''],
      registration_number:  [''],
      tax_exemption_number: [''],
      registration_date:    [''],
      year_established:     [''],

      // Step 2
      contact_person_name: ['', Validators.required],
      contact_person_role: ['', Validators.required],
      contact_email:       ['', [Validators.required, Validators.email]],
      contact_phone:       ['', [Validators.required, Validators.pattern(/^0[0-9]{9}$/)]],
      whatsapp_number:     [''],
      website_url:         [''],

      // Step 3
      physical_address:  ['', Validators.required],
      suburb:            ['', Validators.required],
      city:              ['', Validators.required],
      province:          ['', Validators.required],
      postal_code:       ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      gps_lat:           [''],
      gps_lng:           [''],
      is_address_public: [true],

      // Step 4
      description:          ['', [Validators.required, Validators.minLength(100)]],
      mission_statement:    ['', [Validators.required, Validators.minLength(50)]],
      vision_statement:     [''],
      core_values:          [''],
      annual_beneficiaries: [''],
      key_partnerships:     [''],
      awards_recognition:   [''],

      // Step 5
      services_offered:  [[], Validators.required],
      target_population: [[], Validators.required],
      languages_spoken:  [[], Validators.required],
      capacity_total:    [''],
      is_24_hour:        [false],
      referral_process:  [''],
      intake_process:    [''],
      // GBV-specific
      has_shelter:                 [false],
      shelter_capacity:            [''],
      provides_legal_support:      [false],
      provides_medical_support:    [false],
      provides_counselling:        [false],
      provides_court_support:      [false],
      law_enforcement_partnership: [''],
      // Orphanage-specific
      age_range_min:      [''],
      age_range_max:      [''],
      education_programs: [''],
      // Old-age-specific
      care_level:         [''],
      medical_facilities: [''],

      // Step 6
      has_trained_staff:         [false],
      staff_training_description:[''],
      has_security_measures:     [false],
      security_description:      [''],
      emergency_protocol:        ['', Validators.required],
      confidentiality_policy:    ['', Validators.required],

      // Step 7 — (documents handled outside form via uploadedFiles / sitePhotos)

      // Step 8
      password:         ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
      agree_terms:      [false, Validators.requiredTrue],
      agree_popia:      [false],
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => this.currentUser = u);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Navigation ────────────────────────────────────────────

  canProceed(): boolean {
    const f = this.form;
    switch (this.currentStep) {
      case 0: return !!f.get('centre_type')?.value;
      case 1: return !!(f.get('centre_name')?.valid && f.get('npo_number')?.value);
      case 2: return !!(
        f.get('contact_person_name')?.valid &&
        f.get('contact_person_role')?.valid &&
        f.get('contact_email')?.valid &&
        f.get('contact_phone')?.valid
      );
      case 3: return !!(
        f.get('physical_address')?.valid &&
        f.get('suburb')?.valid &&
        f.get('city')?.valid &&
        f.get('province')?.valid &&
        f.get('postal_code')?.valid
      );
      case 4: return !!(f.get('description')?.valid && f.get('mission_statement')?.valid);
      case 5: return !!(
        f.get('services_offered')?.value?.length  > 0 &&
        f.get('target_population')?.value?.length > 0 &&
        f.get('languages_spoken')?.value?.length  > 0
      );
      case 6: return !!(
        f.get('emergency_protocol')?.valid &&
        f.get('confidentiality_policy')?.valid
      );
      case 7: return true;   // documents optional
      case 8: return !!(
        f.get('password')?.valid &&
        f.get('confirm_password')?.value &&
        !f.errors?.['passwordMismatch'] &&
        f.get('agree_terms')?.value
      );
      default: return false;
    }
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1 && this.canProceed()) {
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Multi-select helpers ──────────────────────────────────

  toggleArrayValue(field: string, value: string): void {
    const control = this.form.get(field);
    if (!control) return;
    const arr: string[] = [...(control.value || [])];
    const idx = arr.indexOf(value);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(value);
    control.setValue(arr);
    control.markAsTouched();
  }

  isSelected(field: string, value: string): boolean {
    return (this.form.get(field)?.value || []).includes(value);
  }

  // ── File upload helpers ───────────────────────────────────

  onFileSelect(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadedFiles = { ...this.uploadedFiles, [key]: input.files[0] };
      input.value = '';
    }
  }

  removeFile(key: string): void {
    const { [key]: _removed, ...rest } = this.uploadedFiles;
    this.uploadedFiles = rest;
  }

  onSitePhotosSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const combined = [...this.sitePhotos, ...Array.from(input.files)];
    this.sitePhotos = combined.slice(0, 5);
    input.value = '';
  }

  removeSitePhoto(index: number): void {
    this.sitePhotos = this.sitePhotos.filter((_, i) => i !== index);
  }

  getFileSize(file: File): string {
    const kb = file.size / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }

  // ── Form submission ───────────────────────────────────────

  /** Called by (ngSubmit) on the <form> tag */
  onSubmit(): void {
    this.submitForm();
  }

  async submitForm(): Promise<void> {
    if (!this.canProceed() || this.isSubmitting) return;

    this.isSubmitting   = true;
    this.submitError    = '';
    this.uploadProgress = 0;

    try {
      const v = this.form.value;

      localStorage.setItem('centreName',        v.centre_name);
      localStorage.setItem('centreType',        v.centre_type);
      localStorage.setItem('centreCity',        v.city);
      localStorage.setItem('centreProvince',    v.province);
      localStorage.setItem('centreEmail',       v.contact_email);
      localStorage.setItem('centreManagerName', v.contact_person_name);
      localStorage.setItem('centrePhone',       v.contact_phone);
      localStorage.setItem('centreNpoNumber',   v.npo_number);
      localStorage.setItem('centrePassword',    v.password);
      if (v.description)       localStorage.setItem('centreDescription',    v.description);
      if (v.mission_statement) localStorage.setItem('centreMission',        v.mission_statement);
      if (v.website_url)       localStorage.setItem('centreWebsite',        v.website_url);
      if (v.whatsapp_number)   localStorage.setItem('centreWhatsapp',       v.whatsapp_number);

      // Simulate upload progress
      for (let i = 10; i <= 90; i += 10) {
        this.uploadProgress = i;
        await new Promise(r => setTimeout(r, 160));
      }
      await new Promise(r => setTimeout(r, 400));

      this.centreId = 'AMN-' + Date.now().toString(36).toUpperCase().slice(-6);
      localStorage.setItem('centreId', this.centreId);

      this.authService.register(v.centre_name, v.contact_email, v.password, 'centre');
      this.authService.login(v.contact_email, v.password, 'centre');

      this.uploadProgress = 100;
      this.submitSuccess  = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => this.router.navigate(['/centre-dashboard']), 2500);

    } catch (err) {
      this.submitError = 'Something went wrong. Please try again.';
      console.error('Centre registration error:', err);
    } finally {
      this.isSubmitting = false;
    }
  }

  // ── Auth modal helpers ────────────────────────────────────

  showAuthModal(m: string): void { this.authModal = m; this.authError = ''; }

  closeAuthModal(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.authModal = '';
    }
  }

  doLogin(): void {
    this.authError = '';
    if (!this.loginEmail || !this.loginPassword) {
      this.authError = 'Please fill in all fields.'; return;
    }
    const ok = this.authService.login(this.loginEmail, this.loginPassword, this.loginRole);
    if (!ok) this.authError = 'Invalid credentials.';
    else this.authModal = '';
  }

  /** Used by both the modal CTA (doRegisterModal in HTML → renamed here) and inline */
  doRegister(): void {
    this.authError = '';
    if (this.registerRole === 'centre') { this.authModal = ''; return; }
    if (this.registerRole === 'seller') {
      this.authModal = '';
      this.router.navigate(['/register/seller']);
      return;
    }
    if (!this.registerName || !this.registerEmail || !this.registerPassword) {
      this.authError = 'Please fill in all fields.'; return;
    }
    const ok = this.authService.register(
      this.registerName, this.registerEmail, this.registerPassword, this.registerRole
    );
    if (ok) this.authModal = '';
    else this.authError = 'Registration failed.';
  }

  /** Alias so the HTML's (click)="doRegisterModal()" keeps working without touching the template */
  doRegisterModal(): void { this.doRegister(); }

  logout(): void { this.authService.logout(); }
}