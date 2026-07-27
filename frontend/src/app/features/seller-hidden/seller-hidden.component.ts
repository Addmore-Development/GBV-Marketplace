import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-seller-hidden',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './seller-hidden.component.html',
  styleUrls: ['./seller-hidden.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SellerHiddenComponent implements OnInit {
  activeSection: 'case' | 'evidence' | 'support' | 'share' | 'affidavit' = 'case';
  caseJourney = [
    { step: 'Medical', completed: false, date: null },
    { step: 'Police', completed: false, date: null },
    { step: 'Protection Order', completed: false, date: null },
    { step: 'Court', completed: false, date: null },
    { step: 'Counselling', completed: false, date: null },
  ];
  evidenceItems: any[] = [];
  showUploadModal = false;
  newEvidence = { type: 'photo', file: null, description: '' };
  selectedEvidenceFile: File | null = null;
  uploading = false;

  // Voice affidavit
  isRecording = false;
  affidavitTranscript = '';
  recognition: any = null;
  generatingAffidavit = false;
  lastAffidavitUrl = '';

  // Case sharing
  myShares: any[] = [];
  showShareModal = false;
  shareCreating = false;
  shareError = '';
  newShare = {
    email: '',
    name: '',
    type: 'lawyer',
    permission: 'journey_and_evidence',
    expiresDays: 30,
    notes: ''
  };

  // Support requests status
  mySupportRequests: any[] = [];

  private sellerId: string | null = null;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    const pinValid = localStorage.getItem('hiddenLayerAccess') === 'true';
    if (!pinValid) {
      this.router.navigate(['/seller/dashboard'], { queryParams: { error: 'unauthorized' } });
      return;
    }
    this.sellerId = localStorage.getItem('sellerId');
    if (this.sellerId) {
      this.loadEvidence();
      this.loadMyShares();
      this.loadSupportRequests();
    }
  }

  // ── Evidence Vault (real upload) ───────────────────────────────
  onEvidenceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.selectedEvidenceFile = input.files[0];
    }
  }

  uploadEvidence(): void {
    if (!this.sellerId) return;
    if (!this.selectedEvidenceFile) {
      alert('Please select a file first.');
      return;
    }
    this.uploading = true;
    const formData = new FormData();
    formData.append('seller_id', this.sellerId);
    formData.append('item_type', this.newEvidence.type);
    if (this.newEvidence.description) formData.append('description', this.newEvidence.description);
    formData.append('file', this.selectedEvidenceFile);

    this.http.post<any>(`${environment.apiUrl}/api/sellers/evidence`, formData).subscribe({
      next: (res) => {
        this.evidenceItems.unshift(res);
        this.showUploadModal = false;
        this.selectedEvidenceFile = null;
        this.newEvidence = { type: 'photo', file: null, description: '' };
        this.uploading = false;
        alert('Evidence uploaded successfully');
      },
      error: (err) => {
        this.uploading = false;
        alert('Upload failed: ' + (err.error?.error || 'Please try again'));
      }
    });
  }

  loadEvidence(): void {
    if (!this.sellerId) return;
    this.http.get<any[]>(`${environment.apiUrl}/api/sellers/evidence/${this.sellerId}`).subscribe({
      next: (data) => { this.evidenceItems = data; },
      error: () => {}
    });
  }

  // ── Voice Affidavit ───────────────────────────────────────────
  private initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-ZA';

    this.recognition.onresult = (event: any) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        }
      }
      if (final) {
        this.affidavitTranscript = (this.affidavitTranscript + final).trim();
      }
    };
    this.recognition.onerror = () => { this.isRecording = false; };
    this.recognition.onend = () => { this.isRecording = false; };
  }

  startRecording(): void {
    if (!this.recognition) this.initSpeechRecognition();
    if (this.recognition) {
      this.recognition.start();
      this.isRecording = true;
    } else {
      alert('Speech recognition not available.');
    }
  }

  stopRecording(): void {
    if (this.recognition) this.recognition.stop();
    this.isRecording = false;
  }

  clearAffidavit(): void {
    this.affidavitTranscript = '';
    this.lastAffidavitUrl = '';
  }

  generateAffidavitPDF(): void {
    if (!this.affidavitTranscript.trim()) {
      alert('Please speak or type your statement first.');
      return;
    }
    this.generatingAffidavit = true;
    this.http.post(`${environment.apiUrl}/api/sellers/affidavit/generate`, {
      seller_id: this.sellerId,
      statement: this.affidavitTranscript
    }, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.generatingAffidavit = false;
        const url = window.URL.createObjectURL(blob);
        this.lastAffidavitUrl = url;
        this.loadEvidence(); // refresh vault
        alert('Affidavit PDF generated and saved to your Safe Space.');
      },
      error: () => {
        this.generatingAffidavit = false;
        alert('Failed to generate affidavit.');
      }
    });
  }

  // ── Unified Case Sharing ──────────────────────────────────────
  loadMyShares(): void {
    if (!this.sellerId) return;
    this.http.get<any[]>(`${environment.apiUrl}/api/sellers/case/shares?seller_id=${this.sellerId}`).subscribe({
      next: (shares) => {
        this.myShares = shares.map(s => ({
          ...s,
          share_url: `${window.location.origin}/shared-case/${s.share_token}`
        }));
      },
      error: () => {}
    });
  }

  openShareModal(): void {
    this.newShare = { email: '', name: '', type: 'lawyer', permission: 'journey_and_evidence', expiresDays: 30, notes: '' };
    this.shareError = '';
    this.showShareModal = true;
  }

  closeShareModal(): void {
    this.showShareModal = false;
  }

  createShare(): void {
    if (!this.newShare.email) {
      this.shareError = 'Professional email is required';
      return;
    }
    this.shareCreating = true;
    this.http.post<any>(`${environment.apiUrl}/api/sellers/case/share`, {
      seller_id: this.sellerId,
      professional_email: this.newShare.email,
      professional_name: this.newShare.name || null,
      professional_type: this.newShare.type,
      permission: this.newShare.permission,
      expires_in_days: this.newShare.expiresDays,
      notes: this.newShare.notes || null
    }).subscribe({
      next: () => {
        this.shareCreating = false;
        this.showShareModal = false;
        this.loadMyShares();
        alert('Share link created!');
      },
      error: (err) => {
        this.shareCreating = false;
        this.shareError = err.error?.error || 'Could not create share';
      }
    });
  }

  revokeShare(shareId: string): void {
    if (!confirm('Revoke this share?')) return;
    this.http.delete(`${environment.apiUrl}/api/sellers/case/share/${shareId}`, {
      body: { seller_id: this.sellerId }
    }).subscribe({
      next: () => this.loadMyShares(),
      error: () => alert('Could not revoke')
    });
  }

  copyShareLink(url: string): void {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard');
  }

  truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len) + '…' : str;
  }

  // ── Support Request Status ────────────────────────────────────
  loadSupportRequests(): void {
    if (!this.sellerId) return;
    this.http.get<any[]>(`${environment.apiUrl}/api/sellers/support-requests?seller_id=${this.sellerId}`).subscribe({
      next: (data) => { this.mySupportRequests = data; },
      error: () => {}
    });
  }

  // ── Original methods (kept, but now integrated with real backend) ──
  requestSupport(type: string): void {
    if (!this.sellerId) return;
    this.http.post(`${environment.apiUrl}/api/sellers/support`, {
      seller_id: this.sellerId,
      request_type: type,
      message: 'Request from hidden layer'
    }).subscribe({
      next: () => alert('Your request has been received. A professional will be in touch soon.'),
      error: () => alert('Request noted. Please also speak to your centre manager.')
    });
    this.loadSupportRequests();
  }

  generateCourtPack(): void {
    if (!this.sellerId) return;
    this.http.post(`${environment.apiUrl}/api/sellers/generate-court-pack/${this.sellerId}`, {}, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `court-pack-${this.sellerId}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => alert('Could not generate court pack')
      });
  }

  quickExit(): void {
    localStorage.removeItem('hiddenLayerAccess');
    window.location.href = '/news';
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}