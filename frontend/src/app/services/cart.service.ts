// ============================================================
// frontend/src/app/services/cart.service.ts
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { SellerAuthService } from './seller-auth.service';
import { CentreAuthService } from './centre-auth.service';
import { environment } from '../../environments/environment';

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

export interface OrderItem {
  product_id: string;
  title: string;
  thumbnail: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  seller_alias: string;
  centre_name: string;
}

export interface Order {
  id: string;
  status: string;
  payment_status: string;
  fulfilment_status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  delivery_address: string;
  delivery_suburb: string;
  delivery_city: string;
  delivery_province: string;
  delivery_postal: string;
  notes: string;
  created_at: string;
  shareable_code: string;
  items: OrderItem[];
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private cartSubject = new BehaviorSubject<Cart>(this.loadFromStorage());
  cart$ = this.cartSubject.asObservable();
  cartCount$ = new BehaviorSubject<number>(this.cartSubject.value.items.reduce((s, i) => s + i.quantity, 0));

  constructor(
    private http: HttpClient,
    authService: AuthService, sellerAuth: SellerAuthService, centreAuth: CentreAuthService
  ) {
    // Register clearCart so each role's auth service can wipe it on sign-out
    // without circular DI (buyer, seller, and centre sessions all count as
    // "signed in" for cart persistence, so all three must be able to clear it).
    authService.registerCartClear(() => this.clearCart());
    sellerAuth.registerCartClear(() => this.clearCart());
    centreAuth.registerCartClear(() => this.clearCart());
  }

  private loadFromStorage(): Cart {
    // Only restore cart if someone is actually signed in
    const isSignedIn = !!localStorage.getItem('sellerId') ||
                       !!localStorage.getItem('centreId') ||
                       !!localStorage.getItem('buyerUser');
    if (!isSignedIn) return { items: [], subtotal: 0 };
    try {
      const stored = localStorage.getItem('amani_cart');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { items: [], subtotal: 0 };
  }

  private persist(cart: Cart): void {
    const isSignedIn = !!localStorage.getItem('sellerId') ||
                       !!localStorage.getItem('centreId') ||
                       !!localStorage.getItem('buyerUser');
    if (!isSignedIn) {
      localStorage.removeItem('amani_cart');
      return;
    }
    localStorage.setItem('amani_cart', JSON.stringify(cart));
  }

  private recalc(items: CartItem[]): Cart {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return { items, subtotal };
  }

  private emit(cart: Cart): void {
    this.cartSubject.next(cart);
    this.cartCount$.next(cart.items.reduce((s, i) => s + i.quantity, 0));
    this.persist(cart);
  }

  addToCart(
    productId: string,
    quantity: number,
    meta?: Partial<CartItem>
  ): Observable<Cart> {
    const items = [...this.cartSubject.value.items];
    const idx = items.findIndex(i => i.product_id === productId);

    if (quantity === 0) {
      // Remove
      if (idx >= 0) items.splice(idx, 1);
    } else if (idx >= 0) {
      // Update quantity
      items[idx] = { ...items[idx], quantity };
    } else if (meta) {
      // Add new item
      items.push({
        product_id: productId,
        title: meta.title || '',
        price: meta.price || 0,
        quantity,
        thumbnail: meta.thumbnail || '',
        seller_alias: meta.seller_alias || '',
        centre_name: meta.centre_name || '',
        currency: 'ZAR',
        survivor_income: meta.survivor_income || 0,
        centre_funding: meta.centre_funding || 0,
        platform_fee: meta.platform_fee || 0,
      });
    }

    const cart = this.recalc(items);
    this.emit(cart);
    return of(cart);
  }

  removeFromCart(productId: string): Observable<Cart> {
    return this.addToCart(productId, 0);
  }

  updateQuantity(productId: string, quantity: number): Observable<Cart> {
    return this.addToCart(productId, quantity);
  }

  clearCart(): void {
    const empty: Cart = { items: [], subtotal: 0 };
    this.emit(empty);
  }

  placeOrder(orderData: any): Observable<any> {
    const cart = this.cartSubject.value;
    const payload = {
      ...orderData,
      items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
    };

    return this.http.post<any>(`${environment.apiUrl}/api/marketplace/orders`, payload).pipe(
      map(res => {
        const receipt = { orderId: res.order_id, share_code: res.share_code, total: res.total, ...orderData };
        localStorage.setItem('amani_last_order', JSON.stringify(receipt));
        this.clearCart();
        return { success: true, orderId: res.order_id, share_code: res.share_code, receipt };
      })
    );
  }

  getImpactReceipt(orderId: string): Observable<any> {
    const stored = localStorage.getItem('amani_last_order');
    return of(stored ? JSON.parse(stored) : null);
  }

  // ── Order history (previous, cancelled, all transactions) ─
  getOrders(buyerEmail: string): Observable<Order[]> {
    return this.http.get<{ orders: Order[] }>(
      `${environment.apiUrl}/api/marketplace/orders`,
      { params: { buyer_email: buyerEmail } }
    ).pipe(
      map(res => res.orders || []),
      catchError(() => of([]))
    );
  }

  cancelOrder(orderId: string, buyerEmail: string): Observable<any> {
    return this.http.patch<any>(
      `${environment.apiUrl}/api/marketplace/orders/${orderId}/cancel`,
      { buyer_email: buyerEmail }
    );
  }

  get currentCart(): Cart { return this.cartSubject.value; }
}