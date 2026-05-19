// ============================================================
// seller-register.component.ts
// Amani – Victim/Survivor (Seller) Registration
// ============================================================
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

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
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './seller-register.component.html',
  styleUrls: ['./seller-register.component.scss'],
})
export class SellerRegisterComponent implements OnInit {
  currentStep = 0;
  isSubmitting = false;
  submitError = '';
  submitSuccess = false;

  // Available care centres (fetched from API)
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

  // Make router public for template access
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public router: Router  // Changed from private to public
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadCentres();
  }

  buildForm(): void {
    this.form = this.fb.group({
      // Step 0 – Identity
      alias: ['', [Validators.required, Validators.minLength(3)]],
      public_bio: ['', [Validators.required, Validators.minLength(30)]],
      real_name: ['', Validators.required],
      real_surname: ['', Validators.required],
      id_number: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^(\+27|0)[6-8][0-9]{8}$/)]],

      // Step 1 – Centre & Products
      centre_id: ['', Validators.required],
      product_categories: [[], Validators.required],
      skills_experience: ['', Validators.required],

      // Step 2 – Payout & Security
      payout_method: ['eft', Validators.required],
      // EFT fields
      bank_name: [''],
      account_holder: [''],
      account_number: [''],
      branch_code: [''],
      // Cash fields
      cash_centre_note: [''],
      // Hidden layer PIN
      hidden_pin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
      confirm_pin: ['', Validators.required],

      // Step 3 – Consent
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

  // Dynamic validation for bank fields when payout is EFT
  get payoutMethod(): string { return this.form.get('payout_method')?.value || 'eft'; }

  isBankFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return this.payoutMethod === 'eft' && !!control && control.invalid && control.touched;
  }

  // Helper method to get centre name from ID
  getCentreName(): string {
    const centreId = this.form.get('centre_id')?.value;
    if (!centreId) return 'your centre';
    const centre = this.centres.find(c => c.id === centreId);
    return centre ? centre.name : 'your centre';
  }

  loadCentres(): void {
    // Backend endpoint will return verified centres
    this.http.get<Centre[]>('http://localhost:3000/api/centres/verified')
      .subscribe({
        next: (data) => {
          this.centres = data;
          this.isLoadingCentres = false;
        },
        error: () => {
          // Fallback mock data for demonstration
          this.centres = [
            { id: 'ct001', name: 'Thistle House GBV Centre', city: 'Cape Town' },
            { id: 'ct002', name: 'Women of Worth', city: 'Johannesburg' },
            { id: 'ct003', name: 'Impophoma Orphanage', city: 'Durban' },
          ];
          this.isLoadingCentres = false;
        }
      });
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

  // Step validation with proper type safety (returns boolean, never undefined)
  canProceed(): boolean {
    switch (this.currentStep) {
      case 0:
        return !!(this.form.get('alias')?.valid &&
                  this.form.get('public_bio')?.valid &&
                  this.form.get('real_name')?.valid &&
                  this.form.get('real_surname')?.valid &&
                  this.form.get('id_number')?.valid &&
                  this.form.get('email')?.valid &&
                  this.form.get('phone')?.valid);
      
      case 1:
        return !!(this.form.get('centre_id')?.value &&
                  (this.form.get('product_categories')?.value?.length > 0) &&
                  this.form.get('skills_experience')?.valid);
      
      case 2:
        const pinOk = !!(this.form.get('hidden_pin')?.valid && !this.form.errors?.['pinMismatch']);
        if (this.payoutMethod === 'eft') {
          return pinOk &&
                 !!(this.form.get('bank_name')?.valid &&
                    this.form.get('account_holder')?.valid &&
                    this.form.get('account_number')?.valid &&
                    this.form.get('branch_code')?.valid);
        }
        return pinOk;
      
      case 3:
        return !!(this.form.get('agree_terms')?.value &&
                  this.form.get('agree_popia')?.value &&
                  this.form.get('understand_safety')?.value);
      
      default:
        return false;
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

  onSubmit(): void {
    if (!this.canProceed() || this.isSubmitting) return;
    this.isSubmitting = true;
    this.submitError = '';

    const payload = this.buildPayload();
    this.http.post('http://localhost:3000/api/sellers/register', payload)
      .subscribe({
        next: (res: any) => {
          this.submitSuccess = true;
          this.isSubmitting = false;
          // After success, navigate to dashboard (to be built later)
          setTimeout(() => {
            this.router.navigate(['/seller/dashboard'], { queryParams: { new: true } });
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitError = err.error?.message || 'Registration failed. Please try again.';
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
      hidden_pin: val.hidden_pin, // will be hashed on backend
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

  // Quick exit – double tap logo - fixed HostListener type
  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && target.closest('.logo')) {
      this.quickExit();
    }
  }

  quickExit(): void {
    window.location.href = '/news';  // neutral news page
  }
}