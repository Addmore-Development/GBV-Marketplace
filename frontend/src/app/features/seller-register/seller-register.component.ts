// ============================================================
// seller-register.component.ts
// Amani – Victim/Survivor (Seller) Registration – VALIDATION ON CLICK + 409 HANDLING
// ============================================================
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

interface Step {
  label: string;
  icon: string;
  description: string;
}

interface Centre {
  id: string;
  name: string;
  city: string;
}

@Component({
  selector: 'app-seller-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './seller-register.component.html',
  styleUrls: ['./seller-register.component.scss'],
})
export class SellerRegisterComponent implements OnInit {
  currentStep = 0;
  isSubmitting = false;
  submitError = '';
  submitSuccess = false;
  // ── Nav auth state ────────────────────────────────────
  currentUser: User | null = null;
  authModal = '';
  loginRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  loginEmail = '';
  loginPassword = '';
  authError = '';
  registerRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  registerName = '';
  registerEmail = '';
  registerPassword = '';

  centres: Centre[] = [];
  isLoadingCentres = true;

  steps: Step[] = [
    { label: 'Your Identity', icon: '🌿', description: 'Public seller profile & private details' },
    { label: 'Centre & Products', icon: '🏠', description: 'Link to your care centre and what you make' },
    { label: 'Payout & Security', icon: '💰', description: 'How you get paid + hidden layer PIN' },
    { label: 'Review & Consent', icon: '✅', description: 'Finalise your seller account' },
  ];

  productCategories = [
    'Beaded jewellery', 'Clothing & textiles', 'Food preserves',
    'Candles & soaps', 'Pottery & ceramics', 'Wire art',
    'Baked goods', 'Hand-dyed scarves', 'Other crafts'
  ];

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadCentres();
    this.authService.user$.subscribe(u => this.currentUser = u);
  }

  buildForm(): void {
    this.form = this.fb.group({
      // Step 0
      alias: ['', [Validators.required, Validators.minLength(3)]],
      public_bio: ['', [Validators.required, Validators.minLength(30)]],
      real_name: ['', Validators.required],
      real_surname: ['', Validators.required],
      id_number: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^(\+27|0)[6-8][0-9]{8}$/)]],

      // Step 1
      centre_id: [{ value: '', disabled: true }, Validators.required],
      product_categories: [[], Validators.required],
      skills_experience: ['', Validators.required],

      // Step 2
      payout_method: ['eft', Validators.required],
      bank_name: [''],
      account_holder: [''],
      account_number: [''],
      branch_code: [''],
      cash_centre_note: [''],
      hidden_pin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
      confirm_pin: ['', Validators.required],

      // Step 3
      agree_terms: [false, Validators.requiredTrue],
      agree_popia: [false, Validators.requiredTrue],
      understand_safety: [false, Validators.requiredTrue],
    }, { validators: this.pinMatchValidator });
  }

  pinMatchValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const pin = group.get('hidden_pin')?.value;
    const confirm = group.get('confirm_pin')?.value;
    return pin === confirm ? null : { pinMismatch: true };
  }

  get payoutMethod(): string {
    return this.form.get('payout_method')?.value || 'eft';
  }

  isBankFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return this.payoutMethod === 'eft' && !!control && control.invalid && control.touched;
  }

  getCentreName(): string {
    const centreId = this.form.get('centre_id')?.value;
    if (!centreId) return 'your centre';
    const centre = this.centres.find(c => c.id === centreId);
    return centre ? centre.name : 'your centre';
  }

  loadCentres(): void {
  this.http.get<Centre[]>('http://localhost:3000/api/sellers/centres/verified')
    .subscribe({
      next: (data) => {
        this.centres = data;
        this.isLoadingCentres = false;
        this.form.get('centre_id')?.enable();
      },
      error: (err) => {
        console.error('Failed to load centres', err);
        this.isLoadingCentres = false;
        this.submitError = 'Could not load care centres. Please refresh the page.';
        // Still enable the field so user can manually select? But no data. Better keep disabled.
        this.form.get('centre_id')?.disable();
      }
    });

  // Timeout fallback: after 5 seconds, enable centre_id if still disabled
  setTimeout(() => {
    if (this.form.get('centre_id')?.disabled) {
      console.warn('Forcing centre_id enable after timeout');
      this.form.get('centre_id')?.enable();
    }
  }, 5000);
}

  toggleArrayValue(controlName: string, value: string): void {
    const control = this.form.get(controlName);
    const current: string[] = control?.value || [];
    const idx = current.indexOf(value);
    if (idx > -1) {
      control?.setValue(current.filter((v) => v !== value));
    } else {
      control?.setValue([...current, value]);
    }
    control?.markAsTouched();
  }

  isSelected(controlName: string, value: string): boolean {
    return (this.form.get(controlName)?.value || []).includes(value);
  }

  // ===================== VALIDATION ON CLICK =====================
  getStepFields(step: number): string[] {
    const stepMap: { [key: number]: string[] } = {
      0: ['alias', 'public_bio', 'real_name', 'real_surname', 'id_number', 'email', 'phone'],
      1: ['centre_id', 'product_categories', 'skills_experience'],
      2: ['hidden_pin', 'confirm_pin'],
      3: ['agree_terms', 'agree_popia', 'understand_safety'],
    };
    return stepMap[step] || [];
  }

  validateCurrentStep(): boolean {
    let isValid = true;
    const stepFields = this.getStepFields(this.currentStep);

    for (const field of stepFields) {
      const control = this.form.get(field);
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    }

    // Special validation for step 2 (PIN + bank fields if EFT)
    if (this.currentStep === 2) {
      if (this.form.errors?.['pinMismatch']) {
        this.form.get('confirm_pin')?.markAsTouched();
        isValid = false;
      }
      if (this.payoutMethod === 'eft') {
        const bankFields = ['bank_name', 'account_holder', 'account_number', 'branch_code'];
        for (const field of bankFields) {
          const control = this.form.get(field);
          if (control && control.invalid) {
            control.markAsTouched();
            isValid = false;
          }
        }
      }
    }

    if (!isValid) {
      this.scrollToFirstError();
    }
    return isValid;
  }

  scrollToFirstError(): void {
    const firstError = document.querySelector('.error, .ng-invalid');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ===================== NAVIGATION =====================
  nextStep(): void {
    if (this.validateCurrentStep()) {
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert('Please fix the errors in the form before continuing.');
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ===================== SUBMIT =====================
  onSubmit(): void {
  if (!this.validateCurrentStep()) {
    alert('Please fix the errors in the form before submitting.');
    return;
  }
  if (this.isSubmitting) return;

  // Ensure centre_id is enabled (in case it was disabled)
  this.form.get('centre_id')?.enable();

  this.isSubmitting = true;
  this.submitError = '';

  const payload = this.buildPayload();

  // Log the payload to the console for debugging
  console.log('📦 Submitting payload:', JSON.stringify(payload, null, 2));

  this.http.post('http://localhost:3000/api/sellers/register', payload)
    .subscribe({
      next: (res: any) => {
        localStorage.setItem('sellerId', res.seller_id);
        localStorage.setItem('sellerAlias', res.alias);
        localStorage.setItem('sellerEmail', res.email);
        localStorage.setItem('hiddenPin', this.form.get('hidden_pin')?.value);
        this.submitSuccess = true;
        this.isSubmitting = false;
        setTimeout(() => {
          this.router.navigate(['/seller/dashboard'], { queryParams: { new: true } });
        }, 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        // Show detailed error from backend
        if (err.error && err.error.error) {
          this.submitError = err.error.error;
        } else if (err.status === 400) {
          this.submitError = 'Bad request. Please check all fields are filled correctly.';
        } else if (err.status === 409) {
          this.submitError = 'An account with this email or alias already exists.';
        } else {
          this.submitError = err.error?.message || 'Registration failed. Please try again.';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
}
  private buildPayload(): any {
    const val = this.form.value;
    const payload: any = {
      alias: val.alias,
      public_bio: val.public_bio,
      real_name: val.real_name,
      real_surname: val.real_surname,
      id_number: val.id_number,
      email: val.email,
      phone: val.phone,
      centre_id: val.centre_id,
      product_categories: val.product_categories,
      skills_experience: val.skills_experience,
      payout_method: val.payout_method,
      hidden_pin: val.hidden_pin,
      accepted_terms: true,
      accepted_popia: true,
      safety_acknowledged: true,
    };

    if (val.payout_method === 'eft') {
      payload.bank_details = {
        bank_name: val.bank_name,
        account_holder: val.account_holder,
        account_number: val.account_number,
        branch_code: val.branch_code,
      };
    } else {
      payload.cash_pickup_note = val.cash_centre_note || 'Will collect at centre';
    }
    return payload;
  }

  // Quick exit
  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && target.closest('.logo')) {
      this.quickExit();
    }
  }

  quickExit(): void {
    window.location.href = '/news';
  }
  // ── Nav auth methods ──────────────────────────────────
  showAuthModal(modal: string): void { this.authModal = modal; this.authError = ''; }
  closeAuthModal(e: MouseEvent): void { this.authModal = ''; }

  doLogin(): void {
    this.authError = '';
    if (!this.loginEmail || !this.loginPassword) { this.authError = 'Please fill in all fields.'; return; }
    const ok = this.authService.login(this.loginEmail, this.loginPassword, this.loginRole);
    if (ok) { this.authModal = ''; }
    else { this.authError = 'Login failed. Please try again.'; }
  }

  doRegisterModal(): void {
    this.authError = '';
    if (this.registerRole === 'centre') { this.authModal = ''; this.router.navigate(['/register/centre']); return; }
    if (this.registerRole === 'seller') { this.authModal = ''; this.router.navigate(['/register/seller']); return; }
    if (!this.registerName || !this.registerEmail || !this.registerPassword) { this.authError = 'Please fill in all fields.'; return; }
    if (this.registerPassword.length < 8) { this.authError = 'Password must be 8+ characters.'; return; }
    const ok = this.authService.register(this.registerName, this.registerEmail, this.registerPassword, this.registerRole);
    if (ok) { this.authModal = ''; }
    else { this.authError = 'Registration failed. Please try again.'; }
  }

  logout(): void { this.authService.logout(); }
}