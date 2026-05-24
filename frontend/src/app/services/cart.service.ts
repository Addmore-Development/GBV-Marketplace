// ============================================================
// frontend/src/app/services/cart.service.ts
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface CartItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  thumbnail: string;
  seller_alias: string;
  centre_name: string;
  currency: string;
  survivor_income: number;
  centre_funding: number;
  platform_fee: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  session_id?: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly API = 'http://localhost:3000/api/marketplace';
  private sessionId: string;

  private cartSubject = new BehaviorSubject<Cart>({ items: [], subtotal: 0 });
  cart$ = this.cartSubject.asObservable();
  cartCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {
    this.sessionId = localStorage.getItem('amani_session') || this.generateSession();
    this.loadCart();
  }

  private generateSession(): string {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('amani_session', id);
    return id;
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'x-session-id': this.sessionId });
  }

  loadCart(): void {
    this.http.get<Cart>(`${this.API}/cart`, { headers: this.headers })
      .subscribe({
        next: cart => {
          this.cartSubject.next(cart);
          this.cartCount$.next(cart.items.reduce((s, i) => s + i.quantity, 0));
        },
        error: () => {}
      });
  }

  addToCart(productId: string, quantity: number): Observable<Cart> {
    return this.http.post<Cart>(
      `${this.API}/cart`,
      { product_id: productId, quantity },
      { headers: this.headers }
    ).pipe(
      tap(cart => {
        if (cart.session_id) {
          this.sessionId = cart.session_id;
          localStorage.setItem('amani_session', cart.session_id);
        }
        this.cartSubject.next(cart);
        this.cartCount$.next(cart.items.reduce((s, i) => s + i.quantity, 0));
      })
    );
  }

  removeFromCart(productId: string): Observable<Cart> {
    return this.addToCart(productId, 0);
  }

  updateQuantity(productId: string, quantity: number): Observable<Cart> {
    return this.addToCart(productId, quantity);
  }

  placeOrder(orderData: any): Observable<any> {
    return this.http.post(
      `${this.API}/orders`, orderData, { headers: this.headers }
    ).pipe(tap(() => {
      this.cartSubject.next({ items: [], subtotal: 0 });
      this.cartCount$.next(0);
    }));
  }

  getImpactReceipt(orderId: string): Observable<any> {
    return this.http.get(`${this.API}/orders/${orderId}/receipt`);
  }

  get currentCart(): Cart { return this.cartSubject.value; }
}