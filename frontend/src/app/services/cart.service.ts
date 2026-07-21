// ============================================================
// frontend/src/app/services/cart.service.ts
// ============================================================
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

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
  private cartSubject = new BehaviorSubject<Cart>(this.loadFromStorage());
  cart$ = this.cartSubject.asObservable();
  cartCount$ = new BehaviorSubject<number>(this.cartSubject.value.items.reduce((s, i) => s + i.quantity, 0));

  constructor(authService: AuthService) {
    // Register clearCart so AuthService can wipe it on logout without circular DI
    authService.registerCartClear(() => this.clearCart());
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
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
    const receipt = { orderId, ...orderData };
    localStorage.setItem('amani_last_order', JSON.stringify(receipt));
    const empty: Cart = { items: [], subtotal: 0 };
    this.emit(empty);
    return of({ success: true, orderId, receipt });
  }

  getImpactReceipt(orderId: string): Observable<any> {
    const stored = localStorage.getItem('amani_last_order');
    return of(stored ? JSON.parse(stored) : null);
  }

  get currentCart(): Cart { return this.cartSubject.value; }
}