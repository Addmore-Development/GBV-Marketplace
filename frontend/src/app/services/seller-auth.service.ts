import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthCoordinatorService } from './auth-coordinator.service';

export interface SellerUser {
  id: string;
  alias: string;
  email: string;
  verification_status: string;
  hidden_layer_granted: boolean;
}

@Injectable({ providedIn: 'root' })
export class SellerAuthService {
  private userSubject = new BehaviorSubject<SellerUser | null>(null);
  user$ = this.userSubject.asObservable();
  // Lazy reference to avoid circular DI — set by CartService
  private _cartClear?: () => void;

  registerCartClear(fn: () => void): void { this._cartClear = fn; }

  constructor(
    private http: HttpClient,
    private router: Router,
    private coordinator: AuthCoordinatorService,
  ) {
    const stored = localStorage.getItem('sellerUser');
    if (stored) {
      this.userSubject.next(JSON.parse(stored));
    } else {
      // Some login paths only ever wrote the individual sellerId/sellerAlias/
      // sellerEmail keys (used directly by the dashboard) without writing the
      // combined sellerUser record this service reads. That left existing,
      // otherwise-valid sessions looking signed-out anywhere that relies on
      // user$ (marketplace nav, centre-profile nav). Rebuild it from the
      // individual keys as a one-time repair so those sessions self-heal.
      const id = localStorage.getItem('sellerId');
      const alias = localStorage.getItem('sellerAlias');
      const email = localStorage.getItem('sellerEmail');
      if (id && alias && email) {
        const repaired = {
          id, alias, email,
          verification_status: 'pending',
          hidden_layer_granted: false,
        };
        localStorage.setItem('sellerUser', JSON.stringify(repaired));
        this.userSubject.next(repaired);
      }
    }

    // Amani only supports one active role per browser session. If a buyer
    // or centre signs in, drop any leftover seller session immediately so
    // it can't keep winning on other pages.
    this.coordinator.roleActivated$.subscribe(role => {
      if (role !== 'seller') this.clearLocalSession();
    });
  }

  login(email: string, pin: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/sellers/login`, { email, pin })
      .pipe(tap((res: any) => {
        // /api/sellers/login returns the seller row as `id` — unlike
        // /api/sellers/register, which returns `seller_id`. Reading
        // res.seller_id here was always undefined, which localStorage
        // happily stringified to the literal text "undefined". That
        // passed every truthiness check downstream and got sent straight
        // to the backend as a UUID (GET /profile/undefined), which
        // Postgres correctly rejected with a 500.
        const user: SellerUser = {
          id: res.id,
          alias: res.alias,
          email: res.email,
          verification_status: res.verification_status,
          hidden_layer_granted: !!res.hidden_layer_granted,
        };
        localStorage.setItem('sellerUser', JSON.stringify(user));
        localStorage.setItem('sellerId', res.id);
        localStorage.setItem('sellerAlias', res.alias);
        localStorage.setItem('sellerEmail', res.email);
        localStorage.setItem('hiddenPin', pin);
        this.userSubject.next(user);
        this.coordinator.announce('seller');
      }));
  }

  register(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/sellers/register`, data);
  }

  // Used right after a successful registration response, which returns the
  // new seller's id/alias/email/pin directly rather than going through
  // login(). Keeps the shared session state and mutual role-exclusion
  // consistent instead of only writing the raw localStorage keys.
  setSessionFromRegistration(seller_id: string, alias: string, email: string, pin: string): void {
    const user: SellerUser = {
      id: seller_id,
      alias,
      email,
      verification_status: 'pending',
      hidden_layer_granted: false,
    };
    localStorage.setItem('sellerUser', JSON.stringify(user));
    localStorage.setItem('sellerId', seller_id);
    localStorage.setItem('sellerAlias', alias);
    localStorage.setItem('sellerEmail', email);
    localStorage.setItem('hiddenPin', pin);
    localStorage.setItem('hiddenLayerAccess', 'false');
    this.userSubject.next(user);
    this.coordinator.announce('seller');
  }

  grantHiddenLayer(sellerId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/sellers/volunteer`, { sellerId });
  }

  logout(): void {
    const id = localStorage.getItem('sellerId');
    const user = this.userSubject.value;
    if (id) {
      this.http.post(`${environment.apiUrl}/api/sellers/logout`, {
        seller_id: id,
        alias: user?.alias,
        email: user?.email,
      }).subscribe({ error: () => {} });
    }
    this.clearLocalSession();
    // No navigation here on purpose — this service is shared by pages that
    // each want different post-logout behaviour (marketplace/centres just
    // stay put and update the nav; centre-profile sends the user back to
    // /centres). The seller dashboard has its own logout() that navigates
    // itself. Hard-coding a redirect to /login here was overriding all of
    // that and always bouncing sellers to the maker login screen.
  }

  // Clears only this seller's local session data, without hitting the
  // logout endpoint. Used both for an explicit seller logout and when a
  // buyer or centre session becomes active elsewhere in the app.
  private clearLocalSession(): void {
    localStorage.removeItem('sellerUser');
    localStorage.removeItem('sellerId');
    localStorage.removeItem('sellerAlias');
    localStorage.removeItem('sellerEmail');
    localStorage.removeItem('hiddenPin');
    localStorage.removeItem('hiddenLayerAccess');
    this.userSubject.next(null);
    if (this._cartClear) this._cartClear();
  }

  get currentUser(): SellerUser | null {
    return this.userSubject.value;
  }
}