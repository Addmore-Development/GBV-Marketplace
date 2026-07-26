import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

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

  constructor(private http: HttpClient, private router: Router) {
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
  }

  login(email: string, pin: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/sellers/login`, { email, pin })
      .pipe(tap((res: any) => {
        const user: SellerUser = {
          id: res.seller_id,
          alias: res.alias,
          email: res.email,
          verification_status: res.verification_status,
          hidden_layer_granted: false // will be fetched separately if needed
        };
        localStorage.setItem('sellerUser', JSON.stringify(user));
        localStorage.setItem('sellerId', res.seller_id);
        localStorage.setItem('hiddenPin', pin);
        this.userSubject.next(user);
      }));
  }

  register(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/sellers/register`, data);
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
    localStorage.removeItem('sellerUser');
    localStorage.removeItem('sellerId');
    localStorage.removeItem('hiddenPin');
    this.userSubject.next(null);
    // No navigation here on purpose — this service is shared by pages that
    // each want different post-logout behaviour (marketplace/centres just
    // stay put and update the nav; centre-profile sends the user back to
    // /centres). The seller dashboard has its own logout() that navigates
    // itself. Hard-coding a redirect to /login here was overriding all of
    // that and always bouncing sellers to the maker login screen.
  }

  get currentUser(): SellerUser | null {
    return this.userSubject.value;
  }
}