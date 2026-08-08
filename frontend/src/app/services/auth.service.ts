// ============================================================
// frontend/src/app/services/auth.service.ts
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthCoordinatorService } from './auth-coordinator.service';

export interface User {
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'centre';
  initials: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  // Lazy reference to avoid circular DI — set by CartService
  private _cartClear?: () => void;

  constructor(
    private http: HttpClient,
    private coordinator: AuthCoordinatorService,
  ) {
    const stored = localStorage.getItem('amani_buyer_user');
    if (stored) {
      try { this.userSubject.next(JSON.parse(stored)); } catch { localStorage.removeItem('amani_buyer_user'); }
    }

    // Buyer sessions are intentionally left alone when a seller or centre
    // signs in on the same browser — a shopper's cart/checkout session
    // should survive someone else (or the same person, testing) logging
    // into a seller or centre dashboard in another tab.
  }

  get currentUser(): User | null { return this.userSubject.value; }

  registerCartClear(fn: () => void): void { this._cartClear = fn; }

  login(email: string, password: string, role: 'buyer' | 'seller' | 'centre'): boolean {
    if (!email || !password) return false;
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const initials = name.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase();
    const user: User = { name, email, role, initials };
    this.userSubject.next(user);
    localStorage.setItem('amani_buyer_user', JSON.stringify(user));
    this.coordinator.announce('buyer');
    return true;
  }

  register(name: string, email: string, password: string, role: 'buyer' | 'seller' | 'centre'): boolean {
    if (!name || !email || !password) return false;
    if (role === 'buyer') {
      const initials = name.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase();
      const user: User = { name, email, role, initials };
      this.userSubject.next(user);
      localStorage.setItem('amani_buyer_user', JSON.stringify(user));
      this.coordinator.announce('buyer');

      // Persist the registration so it shows up on the admin dashboard
      // immediately (previously this only ever lived in localStorage).
      // Fire-and-forget: a failure here shouldn't block the buyer from
      // browsing/checking out, so there's no error handler beyond a
      // silent subscribe to trigger the request.
      this.http.post(`${environment.apiUrl}/api/marketplace/buyers/register`, { name, email })
        .subscribe({ next: () => {}, error: () => {} });
    }
    return true;
  }

  logout(): void {
    this.clearLocalSession();
  }

  // Clears only the buyer session, without any other side effects. Used
  // both for an explicit buyer logout and when a seller/centre session
  // becomes active elsewhere in the app.
  private clearLocalSession(): void {
    this.userSubject.next(null);
    if (this._cartClear) this._cartClear();
    localStorage.removeItem('amani_cart');
    localStorage.removeItem('amani_buyer_user');
  }
}