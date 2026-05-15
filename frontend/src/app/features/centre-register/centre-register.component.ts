// ============================================================
// frontend/src/app/features/centre-register/centre-register.component.ts
// ============================================================
import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';


interface Step {
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-centre-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, KeyValuePipe],
  templateUrl: './centre-register.component.html',
  styleUrls: ['./centre-register.component.scss'],
})
export class CentreRegisterComponent implements OnInit {
  currentStep = 0;
  isSubmitting = false;
  uploadProgress = 0;
  submitSuccess = false;
  submitError = '';
  centreId = '';

  steps: Step[] = [
    { label: 'Centre Type',    icon: '🏛️',  description: 'What type of centre are you?' },
    { label: 'Identity',       icon: '📋',  description: 'Legal registration details' },
    { label: 'Contact',        icon: '📞',  description: 'How to reach you' },
    { label: 'Location',       icon: '📍',  description: 'Where you are' },
    { label: 'About',          icon: '💬',  description: 'Your mission and goals' },
    { label: 'Services',       icon: '🤝',  description: 'What support you offer' },
    { label: 'Safety',         icon: '🛡️',  description: 'Safety measures and protocols' },
    { label: 'Documents',      icon: '📄',  description: 'Upload verification documents' },
    { label: 'Account',        icon: '🔐',  description: 'Create your login' },
  ];

  // Uploaded files map
  uploadedFiles: { [key: string]: File | null } = {
    npo_certificate: null,
    dsd_registration: null,
    id_document: null,
    proof_of_address: null,
    bank_statement: null,
    reference_letter: null,
    annual_report: null,
    constitution: null,
    tax_exemption: null,
  };
  sitePhotos: File[] = [];

  serviceOptions = [
    'Emergency Shelter', 'Counselling / Therapy', 'Legal Aid',
    'Medical Support', 'Court Support / Accompaniment', 'Police Support',
    'Child Protection', 'Education & Skills Training', 'Job Placement',
    'Trauma Debriefing', 'Support Groups', 'Crisis Hotline',
    'Case Management', 'Safe House', 'Relocation Assistance',
  ];

  targetOptions = [
    'Women', 'Men', 'Children (0–12)', 'Teenagers (13–17)',
    'Elderly', 'LGBTQIA+', 'People with Disabilities',
    'Foreign Nationals', 'All Survivors',
  ];

  languageOptions = [
    'Zulu', 'Xhosa', 'Afrikaans', 'English', 'Sepedi', 'Tswana',
    'Sesotho', 'Tsonga', 'Swati', 'Venda', 'Ndebele', 'Sign Language',
  ];

  provinceOptions = [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
    'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape',
  ];

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    this.form = this.fb.group({
      // Step 0
      centre_type: ['gbv_centre', Validators.required],

      // Step 1
      centre_name: ['', [Validators.required, Validators.minLength(3)]],
      registration_number: [''],
      npo_number: [''],
      dsd_number: [''],
      tax_exemption_number: [''],
      year_established: ['', [Validators.min(1900), Validators.max(new Date().getFullYear())]],

      // Step 2
      contact_person_name: ['', Validators.required],
      contact_person_role: ['', Validators.required],
      contact_email: ['', [Validators.required, Validators.email]],
      contact_phone: ['', [Validators.required, Validators.pattern(/^(\+27|0)[6-8][0-9]{8}$/)]],
      whatsapp_number: [''],
      website_url: [''],

      // Step 3
      physical_address: ['', Validators.required],
      suburb: ['', Validators.required],
      city: ['', Validators.required],
      province: ['', Validators.required],
      postal_code: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      is_address_public: [true],

      // Step 4
      description: ['', [Validators.required, Validators.minLength(100)]],
      mission_statement: ['', [Validators.required, Validators.minLength(50)]],
      vision_statement: [''],
      core_values: [''],
      annual_beneficiaries: [''],
      key_partnerships: [''],
      awards_recognition: [''],

      // Step 5
      services_offered: [[], Validators.required],
      target_population: [[], Validators.required],
      languages_spoken: [[], Validators.required],
      capacity_total: [''],
      is_24_hour: [false],
      referral_process: [''],
      intake_process: [''],

      // GBV specific
      has_shelter: [false],
      shelter_capacity: [''],
      provides_legal_support: [false],
      provides_medical_support: [false],
      provides_counselling: [false],
      provides_court_support: [false],
      law_enforcement_partnership: [''],

      // Orphanage specific
      age_range_min: [''],
      age_range_max: [''],
      education_programs: [''],

      // Old age specific
      care_level: [''],
      medical_facilities: [''],

      // Step 6
      has_trained_staff: [false],
      staff_training_description: [''],
      has_security_measures: [false],
      security_description: [''],
      emergency_protocol: ['', Validators.required],
      confidentiality_policy: ['', Validators.required],

      // Step 8 (account)
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
      agree_terms: [false, Validators.requiredTrue],
      agree_popia: [false, Validators.requiredTrue],
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: AbstractControl) {
    const pw = group.get('password')?.value;
    const cpw = group.get('confirm_password')?.value;
    return pw === cpw ? null : { passwordMismatch: true };
  }

  get centreType() { return this.form.get('centre_type')?.value; }
  get isGBV() { return this.centreType === 'gbv_centre'; }
  get isOrphanage() { return this.centreType === 'orphanage'; }
  get isOldAge() { return this.centreType === 'old_age_home'; }

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

  onFileSelect(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadedFiles[fieldName] = input.files[0];
    }
  }

  onSitePhotosSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.sitePhotos = Array.from(input.files).slice(0, 5);
    }
  }

  removeFile(fieldName: string): void {
    this.uploadedFiles[fieldName] = null;
  }

  canProceed(): boolean {
    const stepControls: { [key: number]: string[] } = {
      0: ['centre_type'],
      1: ['centre_name'],
      2: ['contact_person_name', 'contact_person_role', 'contact_email', 'contact_phone'],
      3: ['physical_address', 'suburb', 'city', 'province', 'postal_code'],
      4: ['description', 'mission_statement'],
      5: ['services_offered', 'target_population', 'languages_spoken'],
      6: ['emergency_protocol', 'confidentiality_policy'],
      7: [], // documents — check required ones
      8: ['password', 'confirm_password', 'agree_terms', 'agree_popia'],
    };

    const fields = stepControls[this.currentStep] || [];
    const allValid = fields.every((f) => this.form.get(f)?.valid);

    if (this.currentStep === 7) {
      return !!(this.uploadedFiles['npo_certificate'] &&
                this.uploadedFiles['id_document'] &&
                this.uploadedFiles['proof_of_address']);
    }

    if (this.currentStep === 8) {
      return allValid && !this.form.errors?.['passwordMismatch'];
    }

    return allValid;
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

    const formData = new FormData();

    // Append all scalar form values
    const val = this.form.value;
    const skipFields = ['confirm_password', 'agree_terms', 'agree_popia'];
    for (const key of Object.keys(val)) {
      if (skipFields.includes(key)) continue;
      const v = val[key];
      if (Array.isArray(v)) {
        formData.append(key, JSON.stringify(v));
      } else if (v !== null && v !== undefined && v !== '') {
        formData.append(key, String(v));
      }
    }

    // Append documents
    for (const [fieldName, file] of Object.entries(this.uploadedFiles)) {
      if (file) formData.append(fieldName, file, file.name);
    }
    for (const photo of this.sitePhotos) {
      formData.append('site_photos', photo, photo.name);
    }

    this.http.post<any>('http://localhost:3000/api/centres/register', formData, {
      reportProgress: true,
      observe: 'events',
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.submitSuccess = true;
          this.centreId = event.body?.centre_id;
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.error || 'Registration failed. Please try again.';
      },
    });
  }

  getFileSize(file: File): string {
    const kb = file.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  }
}