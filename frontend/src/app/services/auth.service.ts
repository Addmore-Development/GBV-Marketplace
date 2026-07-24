// ============================================================
// frontend/src/app/services/auth.service.ts
// ============================================================
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  constructor() {
    const stored = localStorage.getItem('amani_buyer_user');
    if (stored) {
      try { this.userSubject.next(JSON.parse(stored)); } catch { localStorage.removeItem('amani_buyer_user'); }
    }
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
    return true;
  }

  register(name: string, email: string, password: string, role: 'buyer' | 'seller' | 'centre'): boolean {
    if (!name || !email || !password) return false;
    if (role === 'buyer') {
      const initials = name.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase();
      const user: User = { name, email, role, initials };
      this.userSubject.next(user);
      localStorage.setItem('amani_buyer_user', JSON.stringify(user));
    }
    return true;
  }

  logout(): void {
    this.userSubject.next(null);
    if (this._cartClear) this._cartClear();
    localStorage.removeItem('amani_cart');
    localStorage.removeItem('amani_buyer_user');
  }
}