import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-seller-hidden',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './seller-hidden.component.html',
  styleUrls: ['./seller-hidden.component.scss'],
  encapsulation: ViewEncapsulation.None,  // Ensures styles are applied globally
})
export class SellerHiddenComponent implements OnInit {
  activeSection: 'case' | 'evidence' | 'support' = 'case';
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

  constructor(private router: Router) {}

  ngOnInit(): void {
    const pinValid = localStorage.getItem('hiddenLayerAccess') === 'true';
    if (!pinValid) {
      this.router.navigate(['/seller/dashboard'], { queryParams: { error: 'unauthorized' } });
    }
  }

  requestSupport(): void {
    alert('Support request will connect you to a companion or pro bono professional.');
  }

  uploadEvidence(): void {
    alert('Upload evidence (photos, voice notes, WhatsApp messages). File will be encrypted.');
  }

  generateCourtPack(): void {
    alert('Generate court‑ready PDF with all evidence and case timeline.');
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