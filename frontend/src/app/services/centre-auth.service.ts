import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CentreUser {
  id: string;
  name: string;
  email: string;
  type: string;
  status: string;
  managerName: string;
  city: string;
  province: string;
  phone: string;
  npoNumber: string;
  profilePic: string | null;
}

const CENTRE_KEYS = [
  'centreId', 'centreName', 'centreType', 'centreEmail', 'centreManagerName',
  'centreCity', 'centreProvince', 'centrePhone', 'centreNpoNumber',
  'centreDescription', 'centreMission', 'centreWebsite', 'centreToken',
  'centreProfilePic', 'centreStatus',
];

// Shared, reactive centre login state. Unlike the old per-component pattern
// (each page read localStorage once in ngOnInit and never again), every
// consumer subscribes to `user$` here, so a logout on one page is reflected
// everywhere else immediately -- including other already-open tabs, via the
// native `storage` event.
@Injectable({ providedIn: 'root' })
export class CentreAuthService {
  private userSubject = new BehaviorSubject<CentreUser | null>(this.readFromStorage());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key && CENTRE_KEYS.includes(e.key)) {
        this.userSubject.next(this.readFromStorage());
      }
    });
  }

  private readFromStorage(): CentreUser | null {
    const id = localStorage.getItem('centreId');
    if (!id) return null;
    return {
      id,
      name: localStorage.getItem('centreName') || 'Centre',
      email: localStorage.getItem('centreEmail') || '',
      type: localStorage.getItem('centreType') || '',
      status: localStorage.getItem('centreStatus') || '',
      managerName: localStorage.getItem('centreManagerName') || '',
      city: localStorage.getItem('centreCity') || '',
      province: localStorage.getItem('centreProvince') || '',
      phone: localStorage.getItem('centrePhone') || '',
      npoNumber: localStorage.getItem('centreNpoNumber') || '',
      profilePic: localStorage.getItem('centreProfilePic') || null,
    };
  }

  // Called after a successful POST to /api/centres/login (or right after
  // centre registration) with that response body.
  setSession(res: any): void {
    localStorage.setItem('centreId', res.centre_id || '');
    localStorage.setItem('centreToken', res.token || '');
    localStorage.setItem('centreName', res.centre_name || '');
    localStorage.setItem('centreType', res.centre_type || '');
    localStorage.setItem('centreEmail', res.contact_email || '');
    localStorage.setItem('centreManagerName', res.contact_person_name || '');
    localStorage.setItem('centreCity', res.city || '');
    localStorage.setItem('centreProvince', res.province || '');
    localStorage.setItem('centrePhone', res.contact_phone || '');
    localStorage.setItem('centreNpoNumber', res.npo_number || '');
    localStorage.setItem('centreStatus', res.status || '');
    if (res.profile_picture_url) localStorage.setItem('centreProfilePic', res.profile_picture_url);
    else localStorage.removeItem('centreProfilePic');
    this.userSubject.next(this.readFromStorage());
  }

  logout(): void {
    const centreId = localStorage.getItem('centreId');
    const centreName = localStorage.getItem('centreName');
    const centreEmail = localStorage.getItem('centreEmail');
    if (centreId) {
      this.http.post(`${environment.apiUrl}/api/centres/logout`, {
        centre_id: centreId, centre_name: centreName, contact_email: centreEmail,
      }).subscribe({ error: () => {} });
    }
    CENTRE_KEYS.forEach(k => localStorage.removeItem(k));
    this.userSubject.next(null);
  }

  get currentUser(): CentreUser | null {
    return this.userSubject.value;
  }
}