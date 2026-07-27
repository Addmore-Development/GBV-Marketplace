// ============================================================
// frontend/src/app/services/auth-coordinator.service.ts
// ============================================================
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type AuthRole = 'buyer' | 'seller' | 'centre';

// Amani only ever supports being signed in as ONE role per browser session
// (buyer, seller, or centre). The three role-specific auth services used to
// have no idea about each other, so an old session (e.g. a buyer login left
// over from testing) would keep re-appearing on other pages no matter which
// role you actually signed into afterwards.
//
// This coordinator lets each auth service announce "I just became the
// active session" and lets the other two react by clearing their own local
// session data — without the three services having to depend on each other
// directly, which would create a circular DI graph.
@Injectable({ providedIn: 'root' })
export class AuthCoordinatorService {
  private roleActivated = new Subject<AuthRole>();
  roleActivated$ = this.roleActivated.asObservable();

  announce(role: AuthRole): void {
    this.roleActivated.next(role);
  }
}