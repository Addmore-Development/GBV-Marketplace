// ============================================================
// frontend/src/app/features/shared-case/shared-case.component.ts
// ============================================================
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

interface SharedCase {
  seller_alias: string;
  permission: string;
  professional_name?: string;
  professional_type?: string;
  notes?: string;
  expires_at: string;
  journey?: any;
  evidence?: any[];
}

@Component({
  selector: 'app-shared-case',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './shared-case.component.html',
  styleUrls: ['./shared-case.component.scss'],
})
export class SharedCaseComponent implements OnInit {
  private readonly API = `${environment.apiUrl}/api/sellers`;

  token = '';
  caseData: SharedCase | null = null;
  isLoading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.error = 'Invalid share link.';
      this.isLoading = false;
      return;
    }
    this.http.get<SharedCase>(`${this.API}/case/view/${this.token}`).subscribe({
      next: (data) => {
        this.caseData = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error =
          err.status === 404
            ? 'This share link is invalid or has expired.'
            : 'Could not load the shared case. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  evidenceIcon(type: string): string {
    const map: Record<string, string> = {
      photo: '📷', voice_note: '🎤', whatsapp: '💬',
      medical: '🏥', document: '📄', other: '📎',
    };
    return map[type] || '📎';
  }

  formatDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en-ZA') : '—';
  }

  getFileUrl(url: string): string {
    if (!url) return '';
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }
}