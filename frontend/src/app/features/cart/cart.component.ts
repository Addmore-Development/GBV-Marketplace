// ============================================================
// frontend/src/app/features/cart/cart.component.ts
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CartService, Cart } from '../../services/cart.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
<div class="cart-page">

  <!-- ── TOP NAV ── -->
  <nav class="cart-nav">
    <a routerLink="/marketplace" class="back-btn">← Continue Shopping</a>
    <div class="brand" routerLink="/marketplace">
      <div class="brand-mark">A</div>
      <span class="brand-name">Amani</span>
    </div>
    <div class="nav-right">
      <ng-container *ngIf="!currentUser">
        <button class="nav-sign-in" (click)="showAuthModal('login')">Sign In</button>
        <button class="nav-register" (click)="showAuthModal('register')">Register</button>
      </ng-container>
      <div class="user-chip" *ngIf="currentUser">
        <div class="user-avatar">{{ currentUser.initials }}</div>
        <span class="user-name">{{ currentUser.name.split(' ')[0] }}</span>
      </div>
    </div>
  </nav>

  <!-- ── STEP BREADCRUMB ── -->
  <div class="steps-bar" *ngIf="cart.items.length > 0 && !orderPlaced">
    <div class="step" [class.active]="true" [class.done]="true">
      <span class="step-num">1</span> <span class="step-label">Cart</span>
    </div>
    <div class="step-line"></div>
    <div class="step" [class.active]="true">
      <span class="step-num">2</span> <span class="step-label">Delivery</span>
    </div>
    <div class="step-line"></div>
    <div class="step">
      <span class="step-num">3</span> <span class="step-label">Payment</span>
    </div>
    <div class="step-line"></div>
    <div class="step">
      <span class="step-num">4</span> <span class="step-label">Confirm</span>
    </div>
  </div>

  <!-- ── EMPTY CART ── -->
  <div class="empty-cart" *ngIf="cart.items.length === 0 && !orderPlaced">
    <div class="empty-icon">🛒</div>
    <h2>Your cart is empty</h2>
    <p>Discover handmade products by survivors, youth, and the elderly across South Africa.</p>
    <a routerLink="/marketplace" class="btn-shop">Browse the Marketplace</a>
  </div>

  <!-- ── ORDER SUCCESS ── -->
  <div class="order-success" *ngIf="orderPlaced">
    <div class="success-animation">
      <div class="success-circle">✓</div>
    </div>
    <h1>Your order is confirmed!</h1>
    <p>Thank you for shopping with purpose. Your Impact Receipt has been sent to your email.</p>

    <div class="receipt-box">
      <div class="receipt-label">Impact Receipt Code</div>
      <div class="receipt-code">{{ shareCode }}</div>
      <small>Share this code to show the impact of your purchase</small>
    </div>

    <div class="impact-summary-final">
      <h3>🧾 Where your money went</h3>
      <div class="isf-row">
        <div class="isf-left">
          <span class="isf-dot survivor"></span>
          <span>Survivor Income</span>
        </div>
        <strong>{{ formatPrice(totalSurvivor) }}</strong>
      </div>
      <div class="isf-row">
        <div class="isf-left">
          <span class="isf-dot centre"></span>
          <span>Centre Counselling</span>
        </div>
        <strong>{{ formatPrice(totalCentre) }}</strong>
      </div>
      <div class="isf-row muted">
        <div class="isf-left">
          <span class="isf-dot platform"></span>
          <span>Platform Sustainability</span>
        </div>
        <strong>{{ formatPrice(totalPlatform) }}</strong>
      </div>
      <div class="isf-total">
        <span>Total Paid</span>
        <strong>{{ formatPrice(totalSurvivor + totalCentre + totalPlatform) }}</strong>
      </div>
    </div>

    <a routerLink="/marketplace" class="btn-shop">Keep Shopping</a>
  </div>

  <!-- ── CART LAYOUT ── -->
  <div class="cart-layout" *ngIf="cart.items.length > 0 && !orderPlaced">

    <!-- LEFT: Items -->
    <div class="cart-left">

      <!-- Items header -->
      <div class="section-header">
        <h2 class="section-title">Shopping Cart
          <span class="item-count">({{ cart.items.length }} item{{ cart.items.length !== 1 ? 's' : '' }})</span>
        </h2>
        <button class="clear-btn" (click)="clearCart()">Clear All</button>
      </div>

      <!-- Cart items -->
      <div class="cart-items-list">
        <div class="cart-item" *ngFor="let item of cart.items">

          <!-- Checkbox + Image -->
          <div class="item-select">
            <input type="checkbox" class="item-checkbox" checked />
          </div>

          <div class="item-image">
            <img [src]="item.thumbnail || 'assets/placeholder.jpg'" [alt]="item.title" />
          </div>

          <div class="item-details">
            <div class="item-centre">🏠 {{ item.centre_name }}</div>
            <h3 class="item-title">{{ item.title }}</h3>
            <div class="item-seller">by {{ item.seller_alias }}</div>
            <div class="item-impact-chips">
              <span class="chip survivor">💛 {{ formatPrice(item.survivor_income) }} to maker</span>
              <span class="chip centre">🏠 {{ formatPrice(item.centre_funding) }} to centre</span>
            </div>
          </div>

          <div class="item-actions">
            <div class="qty-control">
              <button (click)="updateQty(item.product_id, item.quantity - 1)"
                [disabled]="item.quantity <= 1">−</button>
              <span>{{ item.quantity }}</span>
              <button (click)="updateQty(item.product_id, item.quantity + 1)">+</button>
            </div>
            <div class="item-price">{{ formatPrice(item.price * item.quantity) }}</div>
            <button class="remove-btn" (click)="removeItem(item.product_id)">
              🗑 Remove
            </button>
          </div>

        </div>
      </div>

      <!-- Delivery note -->
      <div class="delivery-note">
        <span class="dn-icon">📦</span>
        <div>
          <strong>Centre Hub Delivery</strong>
          <p>Your order ships from a verified Centre Hub. Your delivery address is never shared with the seller — only the courier sees it.</p>
        </div>
      </div>

      <!-- Recommended -->
      <div class="section-header" style="margin-top: 32px;">
        <h2 class="section-title">You Might Also Like</h2>
      </div>
      <div class="reco-strip">
        <div class="reco-card" *ngFor="let r of recommended">
          <div class="reco-img">
            <img [src]="r.img" [alt]="r.title" />
          </div>
          <div class="reco-body">
            <div class="reco-title">{{ r.title }}</div>
            <div class="reco-price">{{ r.price }}</div>
          </div>
        </div>
      </div>

      <!-- Delivery Details (below You Might Also Like) -->
      <div class="checkout-form-box" style="margin-top:24px;">
        <h3 class="cfb-title">📍 Delivery Details</h3>
        <form [formGroup]="checkoutForm" (ngSubmit)="placeOrder()">

          <div class="cf-group">
            <label>Full Name <span class="req">*</span></label>
            <input type="text" formControlName="buyer_name" placeholder="Your full name"
              [class.invalid]="checkoutForm.get('buyer_name')?.invalid && checkoutForm.get('buyer_name')?.touched" />
          </div>

          <div class="cf-row">
            <div class="cf-group">
              <label>Email <span class="req">*</span></label>
              <input type="email" formControlName="buyer_email" placeholder="email@example.com"
                [class.invalid]="checkoutForm.get('buyer_email')?.invalid && checkoutForm.get('buyer_email')?.touched" />
              <small>Impact Receipt sent here</small>
            </div>
            <div class="cf-group">
              <label>Phone</label>
              <input type="tel" formControlName="buyer_phone" placeholder="0821234567" />
            </div>
          </div>

          <div class="cf-group">
            <label>Street Address <span class="req">*</span></label>
            <input type="text" formControlName="delivery_address" placeholder="e.g. 14 Main Road"
              [class.invalid]="checkoutForm.get('delivery_address')?.invalid && checkoutForm.get('delivery_address')?.touched" />
          </div>

          <div class="cf-row">
            <div class="cf-group">
              <label>Suburb <span class="req">*</span></label>
              <input type="text" formControlName="delivery_suburb" placeholder="Suburb"
                [class.invalid]="checkoutForm.get('delivery_suburb')?.invalid && checkoutForm.get('delivery_suburb')?.touched" />
            </div>
            <div class="cf-group">
              <label>City <span class="req">*</span></label>
              <input type="text" formControlName="delivery_city" placeholder="City"
                [class.invalid]="checkoutForm.get('delivery_city')?.invalid && checkoutForm.get('delivery_city')?.touched" />
            </div>
          </div>

          <div class="cf-row">
            <div class="cf-group">
              <label>Province <span class="req">*</span></label>
              <select formControlName="delivery_province"
                [class.invalid]="checkoutForm.get('delivery_province')?.invalid && checkoutForm.get('delivery_province')?.touched">
                <option value="">Select province…</option>
                <option *ngFor="let p of provinces" [value]="p">{{ p }}</option>
              </select>
            </div>
            <div class="cf-group">
              <label>Postal Code <span class="req">*</span></label>
              <input type="text" formControlName="delivery_postal" placeholder="0000" maxlength="4"
                [class.invalid]="checkoutForm.get('delivery_postal')?.invalid && checkoutForm.get('delivery_postal')?.touched" />
            </div>
          </div>

          <div class="cf-group">
            <label>Payment Method <span class="req">*</span></label>
            <div class="payment-options">
              <label class="payment-opt" *ngFor="let pm of paymentMethods"
                [class.selected]="checkoutForm.get('payment_method')?.value === pm.value">
                <input type="radio" formControlName="payment_method" [value]="pm.value" />
                <span class="pm-icon">{{ pm.icon }}</span>
                <span class="pm-label">{{ pm.label }}</span>
              </label>
            </div>
          </div>

          <div class="cf-group">
            <label>Order Notes <span class="opt">(optional)</span></label>
            <textarea formControlName="notes" rows="2" placeholder="Special delivery instructions…"></textarea>
          </div>

          <div class="error-msg" *ngIf="orderError">⚠️ {{ orderError }}</div>

          <button type="submit" class="place-order-btn"
            [disabled]="checkoutForm.invalid || isPlacingOrder">
            <span *ngIf="!isPlacingOrder">🌿 Place Order — {{ formatPrice(getTotal()) }}</span>
            <span *ngIf="isPlacingOrder" class="loading-dots">Placing Order<span>.</span><span>.</span><span>.</span></span>
          </button>

          <div class="trust-badges">
            <span>🔒 SSL Secured</span>
            <span>📦 Tracked Delivery</span>
            <span>✅ POPIA Compliant</span>
          </div>

        </form>
      </div>

    </div>

    <!-- RIGHT: Summary + Checkout -->
    <div class="cart-right">

      <!-- Sign-in prompt if not logged in -->
      <div class="signin-prompt" *ngIf="!currentUser">
        <div class="sip-icon">🔒</div>
        <p>Sign in or register to complete your purchase</p>
        <div class="sip-btns">
          <button class="sip-btn-primary" (click)="showAuthModal('login')">Sign In</button>
          <button class="sip-btn-outline" (click)="showAuthModal('register')">Register</button>
        </div>
      </div>

      <!-- Promo code -->
      <div class="promo-box">
        <input class="promo-input" type="text" placeholder="Promo code / voucher" [(ngModel)]="promoCode" />
        <button class="promo-btn" (click)="applyPromo()">Apply</button>
      </div>
      <div class="promo-success" *ngIf="promoApplied">✓ Code applied — R25 discount added!</div>

      <!-- Impact summary -->
      <div class="impact-summary-box">
        <div class="isb-header">
          <span>🧾 Your Impact</span>
          <span class="isb-sub">Every rand tracked</span>
        </div>
        <div class="is-row">
          <div class="is-label"><span class="is-dot survivor"></span> Survivor Income</div>
          <strong>{{ formatPrice(totalSurvivor) }}</strong>
        </div>
        <div class="is-row">
          <div class="is-label"><span class="is-dot centre"></span> Centre Counselling</div>
          <strong>{{ formatPrice(totalCentre) }}</strong>
        </div>
        <div class="is-row muted">
          <div class="is-label"><span class="is-dot platform"></span> Platform Fee</div>
          <strong>{{ formatPrice(totalPlatform) }}</strong>
        </div>
        <div class="is-divider"></div>
        <div class="impact-bar-full">
          <div class="ibf-fill survivor" [style.width.%]="cart.subtotal > 0 ? (totalSurvivor / cart.subtotal) * 100 : 0"></div>
          <div class="ibf-fill centre"   [style.width.%]="cart.subtotal > 0 ? (totalCentre   / cart.subtotal) * 100 : 0"></div>
          <div class="ibf-fill platform" [style.flex]="1"></div>
        </div>
        <div class="impact-legend">
          <span class="leg survivor">● Maker</span>
          <span class="leg centre">● Centre</span>
          <span class="leg platform">● Platform</span>
        </div>
      </div>

      <!-- Order summary -->
      <div class="order-summary-box">
        <h3 class="osb-title">Order Summary</h3>
        <div class="os-row">
          <span>Subtotal ({{ cart.items.length }} items)</span>
          <span>{{ formatPrice(cart.subtotal) }}</span>
        </div>
        <div class="os-row">
          <span>Delivery</span>
          <span class="free-delivery" *ngIf="cart.subtotal >= 500">Free</span>
          <span *ngIf="cart.subtotal < 500">R65.00</span>
        </div>
        <div class="os-row discount" *ngIf="promoApplied">
          <span>Promo Discount</span>
          <span>− R25.00</span>
        </div>
        <div class="os-divider"></div>
        <div class="os-row total">
          <span>Total</span>
          <strong>{{ formatPrice(getTotal()) }}</strong>
        </div>
        <div class="free-delivery-hint" *ngIf="cart.subtotal < 500">
          Add {{ formatPrice(500 - cart.subtotal) }} more for free delivery!
          <div class="fdh-bar"><div class="fdh-fill" [style.width.%]="(cart.subtotal / 500) * 100"></div></div>
        </div>
      </div>


    </div>
  </div>

</div>

<!-- ── AUTH MODAL ── -->
<div class="modal-backdrop" [class.open]="authModal" (click)="closeAuthModal($event)">
  <div class="modal" [class.open]="authModal" (click)="$event.stopPropagation()">
    <button class="modal-close" (click)="authModal = ''">✕</button>

    <!-- Login -->
    <div *ngIf="authModal === 'login'">
      <div class="modal-head">
        <div class="modal-logo">A</div>
        <h2 class="modal-title">Welcome back</h2>
        <p class="modal-sub">Sign in to your Amani account</p>
      </div>
      <div class="modal-tabs">
        <button class="mtab" [class.active]="loginRole === 'buyer'"  (click)="loginRole = 'buyer'">Buyer</button>
        <button class="mtab" [class.active]="loginRole === 'seller'" (click)="loginRole = 'seller'">Seller</button>
        <button class="mtab" [class.active]="loginRole === 'centre'" (click)="loginRole = 'centre'">Centre</button>
      </div>
      <div class="mf-group"><label>Email</label><input [(ngModel)]="loginEmail" type="email" placeholder="you@example.com" /></div>
      <div class="mf-group"><label>Password</label><input [(ngModel)]="loginPassword" type="password" placeholder="Your password" /></div>
      <div class="modal-error" *ngIf="authError">{{ authError }}</div>
      <button class="modal-cta" (click)="doLogin()">Sign In →</button>
      <div class="modal-switch">No account? <span (click)="authModal = 'register'">Register here</span></div>
    </div>

    <!-- Register -->
    <div *ngIf="authModal === 'register'">
      <div class="modal-head">
        <div class="modal-logo">A</div>
        <h2 class="modal-title">Join Amani</h2>
        <p class="modal-sub">Create your account</p>
      </div>
      <div class="role-grid">
        <div class="role-card" [class.selected]="registerRole === 'buyer'"  (click)="registerRole = 'buyer'">
          <div class="rc-icon">🛒</div><div class="rc-label">Buyer</div><div class="rc-desc">Shop &amp; donate</div>
        </div>
        <div class="role-card" [class.selected]="registerRole === 'seller'" (click)="registerRole = 'seller'">
          <div class="rc-icon">🎨</div><div class="rc-label">Seller</div><div class="rc-desc">Sell creations</div>
        </div>
        <div class="role-card" [class.selected]="registerRole === 'centre'" (click)="registerRole = 'centre'">
          <div class="rc-icon">🏠</div><div class="rc-label">Centre</div><div class="rc-desc">Register centre</div>
        </div>
      </div>
      <div class="mf-group"><label>Full Name</label><input [(ngModel)]="registerName" placeholder="Your full name" /></div>
      <div class="mf-group"><label>Email</label><input [(ngModel)]="registerEmail" type="email" placeholder="you@example.com" /></div>
      <div class="mf-group"><label>Password</label><input [(ngModel)]="registerPassword" type="password" placeholder="Min. 8 characters" /></div>
      <div class="mf-note" [class.vetting]="registerRole !== 'buyer'">
        <span *ngIf="registerRole === 'buyer'">ℹ️ Buyer accounts activate immediately.</span>
        <span *ngIf="registerRole === 'seller'">⚠️ Seller accounts require NRSO vetting.</span>
        <span *ngIf="registerRole === 'centre'">⚠️ Centre registration requires site visit &amp; NPO documentation.</span>
      </div>
      <div class="modal-error" *ngIf="authError">{{ authError }}</div>
      <button class="modal-cta" (click)="doRegister()">Create Account →</button>
      <div class="modal-switch">Have an account? <span (click)="authModal = 'login'">Sign in</span></div>
    </div>

  </div>
</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

    :host {
      --cream:       #FAF7F2;
      --beige:       #F0EAE0;
      --beige-dark:  #DDD3C4;
      --brown:       #3D2B1F;
      --brown-mid:   #6B4C3B;
      --brown-light: #A07858;
      --black:       #1A1210;
      --white:       #FFFFFF;
      --border:      #E0D8CE;
      --text-dark:   #1A1210;
      --text-mid:    #4A3830;
      --text-light:  #7A6A62;
      --text-muted:  #9C8C84;
      --green:       #2D6A4F;
      --red:         #8B2635;
      --gold:        #B8860B;
      --gold-light:  #F5E9C8;
      --forest:      #3D2B1F;
      --forest-deep: #1A1210;
      --forest-mid:  #6B4C3B;
      --sage:        #5A7A3A;
      --sage-light:  #F0EAE0;
      --sage-mid:    #DDD3C4;
      --teal:        #2D6A4F;
      --amber:       #B8860B;
      --bg:          #FAF7F2;
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      display: block;
      min-height: 100vh;
    }

    /* NAV */
    .cart-nav {
      background: var(--brown);
      padding: 0 28px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 200;
    }
    .back-btn {
      color: rgba(255,255,255,.65);
      text-decoration: none;
      font-size: .84rem;
      transition: color .2s;
      white-space: nowrap;
      &:hover { color: white; }
    }
    .brand {
      display: flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: none;
    }
    .brand-mark {
      width: 34px; height: 34px; border-radius: 8px;
      background: linear-gradient(135deg, var(--gold-light), var(--gold));
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: var(--forest-deep);
    }
    .brand-name { font-family: 'Playfair Display', serif; color: white; font-size: 1rem; font-weight: 700; }

    .nav-right { display: flex; align-items: center; gap: 8px; }
    .nav-sign-in {
      background: rgba(255,255,255,.1); border: 1.5px solid rgba(255,255,255,.2); color: white;
      padding: 7px 14px; border-radius: 7px; font-family: 'DM Sans', sans-serif;
      font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .2s;
      &:hover { background: rgba(255,255,255,.18); }
    }
    .nav-register {
      background: white; color: var(--forest-deep); border: none;
      padding: 7px 16px; border-radius: 7px; font-family: 'DM Sans', sans-serif;
      font-size: .82rem; font-weight: 700; cursor: pointer; transition: all .2s;
      &:hover { background: var(--gold-light); }
    }
    .user-chip {
      display: flex; align-items: center; gap: 7px;
      background: rgba(255,255,255,.1); border: 1.5px solid rgba(255,255,255,.18);
      padding: 4px 12px 4px 4px; border-radius: 99px;
    }
    .user-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, var(--gold-light), var(--gold));
      display: flex; align-items: center; justify-content: center;
      font-size: .72rem; font-weight: 700; color: var(--forest-deep);
    }
    .user-name { color: white; font-size: .8rem; font-weight: 500; }

    /* STEPS BAR */
    .steps-bar {
      background: var(--white);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px 24px;
      gap: 0;
    }
    .step {
      display: flex; align-items: center; gap: 7px;
      font-size: .8rem; font-weight: 600; color: var(--text-muted);
      &.active { color: var(--forest); }
      &.done .step-num { background: var(--green); color: white; border-color: var(--green); }
    }
    .step-num {
      width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: .75rem; font-weight: 700;
      .step.active & { background: var(--forest); color: white; border-color: var(--forest); }
    }
    .step-label { @media (max-width: 500px) { display: none; } }
    .step-line { width: 40px; height: 2px; background: var(--border); margin: 0 8px; }

    /* EMPTY */
    .empty-cart {
      text-align: center; padding: 100px 24px; max-width: 460px; margin: 0 auto;
      .empty-icon { font-size: 4rem; margin-bottom: 20px; }
      h2 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text-dark); margin: 0 0 12px; }
      p  { color: var(--text-light); line-height: 1.65; margin-bottom: 28px; }
    }
    .btn-shop {
      display: inline-block; background: var(--forest); color: white; text-decoration: none;
      padding: 13px 32px; border-radius: 9px; font-weight: 700; font-size: .95rem; transition: all .2s;
      &:hover { background: var(--sage); transform: translateY(-1px); }
    }

    /* ORDER SUCCESS */
    .order-success {
      text-align: center; padding: 60px 24px; max-width: 540px; margin: 0 auto;
    }
    .success-animation { margin-bottom: 24px; }
    .success-circle {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, var(--green), #22c55e);
      color: white; font-size: 2rem;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(22,163,74,.3);
      animation: pop .4s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
    .order-success h1 { font-family: 'Playfair Display', serif; font-size: 2rem; color: var(--text-dark); margin: 0 0 10px; }
    .order-success p  { color: var(--text-light); margin-bottom: 28px; line-height: 1.6; }

    .receipt-box {
      background: var(--sage-light); border: 1px solid var(--sage-mid); border-radius: 14px;
      padding: 22px; margin-bottom: 20px;
      .receipt-label { font-size: .72rem; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); margin-bottom: 8px; }
      .receipt-code  { font-family: 'DM Mono', monospace; font-size: 1.6rem; font-weight: 700; color: var(--forest); letter-spacing: 2px; margin-bottom: 4px; }
      small { color: var(--text-muted); font-size: .76rem; }
    }

    .impact-summary-final {
      background: var(--white); border: 1px solid var(--border); border-radius: 14px;
      padding: 20px; margin-bottom: 28px; text-align: left;
      h3 { font-family: 'Playfair Display', serif; font-size: .95rem; color: var(--text-dark); margin: 0 0 14px; }
    }
    .isf-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid var(--border); font-size: .88rem;
      &:last-child { border: none; }
      &.muted { opacity: .6; }
      strong { color: var(--forest); }
    }
    .isf-left { display: flex; align-items: center; gap: 8px; color: var(--text-mid); }
    .isf-dot {
      width: 8px; height: 8px; border-radius: 50%;
      &.survivor { background: #F59E0B; }
      &.centre   { background: var(--sage); }
      &.platform { background: var(--border); }
    }
    .isf-total {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 12px; margin-top: 4px; font-weight: 700; font-size: 1rem;
      strong { font-family: 'DM Mono', monospace; color: var(--forest); font-size: 1.2rem; }
    }

    /* CART LAYOUT */
    .cart-layout {
      max-width: 1300px; margin: 28px auto; padding: 0 24px 60px;
      display: grid; grid-template-columns: 1fr 400px; gap: 24px; align-items: start;
      @media (max-width: 1000px) { grid-template-columns: 1fr; }
    }

    /* SECTION HEADER */
    .section-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
    }
    .section-title {
      font-family: 'Playfair Display', serif; font-size: 1.2rem; color: var(--text-dark); margin: 0;
      .item-count { font-family: 'DM Sans', sans-serif; font-size: .82rem; color: var(--text-muted); font-weight: 400; margin-left: 6px; }
    }
    .clear-btn {
      background: none; border: none; color: var(--red); font-size: .8rem;
      font-weight: 600; cursor: pointer; padding: 4px 8px;
      &:hover { text-decoration: underline; }
    }

    /* CART ITEMS */
    .cart-items-list { display: flex; flex-direction: column; gap: 12px; }

    .cart-item {
      display: grid; grid-template-columns: 24px 90px 1fr auto;
      gap: 14px; align-items: start;
      background: var(--white); border: 1px solid var(--border);
      border-radius: 12px; padding: 16px;
      transition: box-shadow .2s;
      &:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
    }

    .item-select { padding-top: 2px; }
    .item-checkbox {
      width: 16px; height: 16px; accent-color: var(--forest); cursor: pointer;
    }

    .item-image {
      width: 90px; height: 90px; border-radius: 10px; overflow: hidden; background: var(--sage-light);
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .item-details { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .item-centre  { font-size: .68rem; color: var(--teal); font-weight: 700; text-transform: uppercase; }
    .item-title   { font-family: 'Playfair Display', serif; font-size: .98rem; color: var(--text-dark); margin: 0; line-height: 1.3; }
    .item-seller  { font-size: .76rem; color: var(--text-muted); }
    .item-impact-chips { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 4px; }
    .chip {
      font-size: .68rem; font-weight: 600; padding: 2px 8px; border-radius: 99px;
      &.survivor { background: rgba(245,158,11,.1); color: #B45309; }
      &.centre   { background: var(--sage-light); color: var(--forest); }
    }

    .item-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }

    .qty-control {
      display: flex; align-items: center; border: 1.5px solid var(--border); border-radius: 7px; overflow: hidden;
      button {
        width: 30px; height: 30px; border: none; background: var(--white);
        font-size: .95rem; font-weight: 700; color: var(--text-dark); cursor: pointer;
        transition: background .15s;
        &:hover:not(:disabled) { background: var(--sage-light); }
        &:disabled { opacity: .3; cursor: not-allowed; }
      }
      span {
        width: 32px; text-align: center; font-family: 'DM Mono', monospace;
        font-size: .88rem; font-weight: 600;
        border-left: 1.5px solid var(--border); border-right: 1.5px solid var(--border);
        line-height: 30px;
      }
    }

    .item-price  { font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 600; color: var(--forest); }
    .remove-btn  {
      background: none; border: none; color: var(--text-muted); font-size: .76rem;
      cursor: pointer; padding: 0; transition: color .2s;
      &:hover { color: var(--red); }
    }

    /* DELIVERY NOTE */
    .delivery-note {
      display: flex; gap: 14px; align-items: flex-start;
      background: var(--sage-light); border: 1px solid var(--sage-mid);
      border-radius: 10px; padding: 14px 16px; margin-top: 16px;
      .dn-icon { font-size: 1.4rem; flex-shrink: 0; }
      strong { display: block; font-size: .85rem; color: var(--forest); margin-bottom: 3px; }
      p { margin: 0; font-size: .78rem; color: var(--text-mid); line-height: 1.5; }
    }

    /* RECOMMENDED */
    .reco-strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
    .reco-card {
      flex-shrink: 0; width: 140px; background: var(--white);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden; cursor: pointer;
      transition: transform .2s;
      &:hover { transform: translateY(-2px); }
    }
    .reco-img { height: 100px; overflow: hidden; img { width: 100%; height: 100%; object-fit: cover; } }
    .reco-body { padding: 8px 10px; }
    .reco-title { font-size: .72rem; color: var(--text-dark); font-weight: 600; line-height: 1.3; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .reco-price { font-family: 'DM Mono', monospace; font-size: .8rem; font-weight: 600; color: var(--forest); }

    /* PROMO */
    .promo-box {
      display: flex; gap: 0; background: var(--white);
      border: 1.5px solid var(--border); border-radius: 9px; overflow: hidden;
      margin-bottom: 8px;
    }
    .promo-input {
      flex: 1; padding: 11px 14px; border: none; font-family: 'DM Sans', sans-serif;
      font-size: .86rem; outline: none; color: var(--text-dark);
      &::placeholder { color: var(--text-muted); }
    }
    .promo-btn {
      padding: 11px 18px; background: var(--forest); color: white; border: none;
      font-family: 'DM Sans', sans-serif; font-size: .84rem; font-weight: 700;
      cursor: pointer; transition: background .2s; flex-shrink: 0;
      &:hover { background: var(--sage); }
    }
    .promo-success { font-size: .78rem; color: var(--green); font-weight: 600; padding: 4px 0 10px; }

    /* IMPACT SUMMARY */
    .impact-summary-box {
      background: var(--white); border: 1px solid var(--border);
      border-radius: 12px; padding: 16px; margin-bottom: 14px;
    }
    .isb-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;
      font-weight: 700; font-size: .9rem; color: var(--text-dark);
      .isb-sub { font-size: .72rem; color: var(--text-muted); font-weight: 400; }
    }
    .is-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 7px 0; font-size: .84rem; color: var(--text-mid);
      border-bottom: 1px solid var(--border);
      &.muted { opacity: .6; border: none; }
      strong { color: var(--forest); }
    }
    .is-label { display: flex; align-items: center; gap: 7px; }
    .is-dot {
      width: 8px; height: 8px; border-radius: 50%;
      &.survivor { background: #F59E0B; }
      &.centre   { background: var(--sage); }
      &.platform { background: var(--border); }
    }
    .is-divider { height: 1px; background: var(--border); margin: 8px 0; }

    .impact-bar-full {
      height: 8px; border-radius: 4px; display: flex; overflow: hidden; gap: 1px; margin: 10px 0 6px;
    }
    .ibf-fill {
      height: 100%; transition: width .4s;
      &.survivor { background: #F59E0B; }
      &.centre   { background: var(--sage); }
      &.platform { background: #E5E7EB; }
    }
    .impact-legend { display: flex; gap: 12px;
      .leg { font-size: .7rem; font-weight: 600;
        &.survivor { color: #B45309; }
        &.centre   { color: var(--sage); }
        &.platform { color: var(--text-muted); } } }

    /* ORDER SUMMARY */
    .order-summary-box {
      background: var(--white); border: 1px solid var(--border);
      border-radius: 12px; padding: 18px; margin-bottom: 14px;
    }
    .osb-title { font-family: 'Playfair Display', serif; font-size: .95rem; color: var(--text-dark); margin: 0 0 14px; }
    .os-row {
      display: flex; justify-content: space-between; font-size: .88rem;
      color: var(--text-mid); padding: 6px 0;
      &.total { font-weight: 700; font-size: 1.05rem; color: var(--text-dark); padding-top: 10px;
        strong { font-family: 'DM Mono', monospace; color: var(--forest); font-size: 1.2rem; } }
      &.discount { color: var(--green); font-weight: 600; }
    }
    .free-delivery { color: var(--green); font-weight: 700; }
    .os-divider { height: 1px; background: var(--border); margin: 6px 0; }
    .free-delivery-hint {
      margin-top: 10px; font-size: .78rem; color: var(--amber); font-weight: 600;
    }
    .fdh-bar { height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; margin-top: 6px; }
    .fdh-fill { height: 100%; background: var(--green); border-radius: 3px; transition: width .4s; }

    /* CHECKOUT FORM */
    .checkout-form-box {
      background: var(--white); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px;
    }
    .cfb-title { font-family: 'Playfair Display', serif; font-size: .95rem; color: var(--text-dark); margin: 0 0 18px; }

    .cf-group {
      margin-bottom: 14px;
      label {
        display: block; font-size: .73rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: .4px; color: var(--text-dark); margin-bottom: 5px;
        .req { color: var(--red); }
        .opt { font-weight: 400; text-transform: none; color: var(--text-muted); }
      }
      input, select, textarea {
        width: 100%; padding: 10px 12px; border: 1.5px solid var(--border);
        border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .87rem;
        color: var(--text-dark); background: white; outline: none; box-sizing: border-box;
        transition: border-color .2s;
        &:focus { border-color: var(--forest); }
        &.invalid { border-color: var(--red); }
      }
      small { display: block; margin-top: 4px; font-size: .72rem; color: var(--text-muted); }
      textarea { resize: vertical; }
    }
    .cf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    /* Payment options */
    .payment-options { display: flex; flex-direction: column; gap: 8px; }
    .payment-opt {
      display: flex; align-items: center; gap: 10px;
      border: 1.5px solid var(--border); border-radius: 8px; padding: 10px 14px;
      cursor: pointer; transition: all .2s; background: white;
      &.selected { border-color: var(--forest); background: var(--sage-light); }
      input[type="radio"] { accent-color: var(--forest); }
      .pm-icon  { font-size: 1.1rem; }
      .pm-label { font-size: .86rem; font-weight: 500; color: var(--text-dark); }
    }

    .error-msg {
      background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px;
      padding: 10px 14px; color: #DC2626; font-size: .84rem; margin-bottom: 14px;
    }

    .place-order-btn {
      width: 100%; padding: 15px;
      background: linear-gradient(135deg, var(--gold), var(--gold-dark));
      color: white; border: none; border-radius: 10px;
      font-family: 'DM Sans', sans-serif; font-size: .95rem; font-weight: 700;
      cursor: pointer; transition: all .2s;
      box-shadow: 0 4px 16px rgba(196,154,60,.35);
      margin-bottom: 14px;
      &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(196,154,60,.45); }
      &:disabled { opacity: .5; cursor: not-allowed; transform: none; }
    }

    .loading-dots {
      span { animation: blink 1.2s infinite; &:nth-child(2) { animation-delay: .2s; } &:nth-child(3) { animation-delay: .4s; } }
    }
    @keyframes blink { 0%,80%,100% { opacity: 0; } 40% { opacity: 1; } }

    /* SIGN-IN PROMPT */
    .signin-prompt {
      background: #FAF7F2; border: 2px dashed #DDD3C4; border-radius: 12px;
      padding: 22px; text-align: center; margin-bottom: 14px;
      .sip-icon { font-size: 1.8rem; margin-bottom: 8px; }
      p { color: #4A3830; font-size: .88rem; margin: 0 0 14px; }
    }
    .sip-btns { display: flex; gap: 8px; justify-content: center; }
    .sip-btn-primary {
      background: #3D2B1F; color: white; border: none; padding: 9px 22px;
      border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .84rem;
      font-weight: 700; cursor: pointer;
    }
    .sip-btn-outline {
      background: transparent; color: #3D2B1F; border: 1.5px solid #3D2B1F;
      padding: 9px 22px; border-radius: 8px; font-family: 'DM Sans', sans-serif;
      font-size: .84rem; font-weight: 700; cursor: pointer;
    }

    .trust-badges {
      display: flex; justify-content: center; gap: 16px;
      font-size: .72rem; color: var(--text-muted);
    }

    /* ─── AUTH MODAL ─── */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 500;
      background: rgba(15,32,9,.6); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; padding: 24px;
      opacity: 0; pointer-events: none; transition: opacity .25s;
      &.open { opacity: 1; pointer-events: auto; }
    }
    .modal {
      background: white; border-radius: 20px; padding: 40px;
      width: 100%; max-width: 460px; position: relative; max-height: 90vh; overflow-y: auto;
      transform: translateY(20px) scale(.97); transition: all .28s cubic-bezier(.34,1.56,.64,1);
      box-shadow: 0 32px 80px rgba(15,32,9,.4);
      &.open { transform: translateY(0) scale(1); }
    }
    .modal-close {
      position: absolute; top: 16px; right: 16px; width: 30px; height: 30px;
      border-radius: 50%; border: none; background: #F3F4F6; cursor: pointer; font-size: .82rem;
      display: flex; align-items: center; justify-content: center;
    }
    .modal-head { margin-bottom: 24px; }
    .modal-logo {
      width: 40px; height: 40px; border-radius: 9px;
      background: linear-gradient(135deg, #3D6B20, #2D5016);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: white; margin-bottom: 14px;
    }
    .modal-title { font-family: 'Playfair Display', serif; font-size: 1.7rem; font-weight: 700; color: var(--text-dark); margin-bottom: 4px; }
    .modal-sub   { font-size: .86rem; color: var(--text-muted); }
    .modal-tabs  { display: flex; background: var(--sage-light); border-radius: 10px; padding: 4px; margin-bottom: 20px; gap: 3px; }
    .mtab {
      flex: 1; padding: 8px; border-radius: 8px; border: none; background: none;
      font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 600; color: var(--text-muted); cursor: pointer;
      &.active { background: white; color: var(--forest); box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    }
    .mf-group {
      margin-bottom: 13px;
      label { display: block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dark); margin-bottom: 5px; }
      input { width: 100%; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .88rem; color: var(--text-dark); background: white; outline: none; box-sizing: border-box; &:focus { border-color: var(--forest); } }
    }
    .mf-note { background: var(--sage-light); border-radius: 8px; padding: 10px 14px; font-size: .78rem; color: var(--text-mid); margin-bottom: 14px; &.vetting { background: rgba(196,98,58,.08); color: #92400E; } }
    .modal-error { background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 14px; color: #DC2626; font-size: .82rem; margin-bottom: 14px; }
    .modal-cta {
      width: 100%; padding: 13px; background: linear-gradient(135deg, var(--forest), #3D6B20);
      color: white; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif;
      font-size: .94rem; font-weight: 700; cursor: pointer; margin-bottom: 10px;
    }
    .modal-switch { text-align: center; font-size: .82rem; color: var(--text-muted);
      span { color: var(--forest); font-weight: 700; cursor: pointer; text-decoration: underline; } }
    .role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 18px; }
    .role-card {
      border: 2px solid var(--border); border-radius: 10px; padding: 12px 8px; text-align: center; cursor: pointer;
      &.selected { border-color: var(--forest); background: var(--sage-light); }
    }
    .rc-icon  { font-size: 1.3rem; margin-bottom: 4px; }
    .rc-label { font-size: .78rem; font-weight: 700; color: var(--text-dark); }
    .rc-desc  { font-size: .66rem; color: var(--text-muted); margin-top: 2px; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .cart-nav { padding: 0 16px; }
      .cart-layout { padding: 0 16px; }
    }
    @media (max-width: 600px) {
      .cart-item { grid-template-columns: 20px 64px 1fr; }
      .item-actions { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; align-items: center; }
      .cf-row { grid-template-columns: 1fr; }
      .role-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart = { items: [], subtotal: 0 };
  checkoutForm!: FormGroup;
  isPlacingOrder = false;
  orderPlaced = false;
  orderError = '';
  shareCode = '';
  totalSurvivor = 0;
  totalCentre = 0;
  totalPlatform = 0;
  promoCode = '';
  promoApplied = false;
  currentUser: User | null = null;

  // ── Auth modal state ──────────────────────────────────
  authModal = '';
  loginRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  loginEmail = '';
  loginPassword = '';
  authError = '';
  registerRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  registerName = '';
  registerEmail = '';
  registerPassword = '';

  readonly provinces = ['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'];

  readonly paymentMethods = [
    { value: 'snapscan', icon: '📱', label: 'SnapScan' },
    { value: 'eft',      icon: '🏦', label: 'EFT / Bank Transfer' },
    { value: 'card',     icon: '💳', label: 'Credit / Debit Card' },
  ];

  readonly recommended = [
    { title: 'Beaded Map Necklace', price: 'R120', img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80' },
    { title: 'Woven Sisal Basket',  price: 'R280', img: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&q=80' },
    { title: 'Rooibos Body Scrub',  price: 'R89',  img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&q=80' },
    { title: 'Pottery Earth Bowl',  price: 'R320', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=80' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe(cart => {
      this.cart = cart;
      this.calcImpact();
    });

    this.authService.user$.pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        this.currentUser = u;
        if (u) {
          this.checkoutForm?.patchValue({ buyer_name: u.name, buyer_email: u.email });
        }
      });

    this.checkoutForm = this.fb.group({
      buyer_name:        ['', Validators.required],
      buyer_email:       ['', [Validators.required, Validators.email]],
      buyer_phone:       [''],
      delivery_address:  ['', Validators.required],
      delivery_suburb:   ['', Validators.required],
      delivery_city:     ['', Validators.required],
      delivery_province: ['', Validators.required],
      delivery_postal:   ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      payment_method:    ['', Validators.required],
      notes:             [''],
    });

    // Pre-fill if already logged in
    if (this.currentUser) {
      this.checkoutForm.patchValue({ buyer_name: this.currentUser.name, buyer_email: this.currentUser.email });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Impact calc ───────────────────────────────────────
  calcImpact(): void {
    this.totalSurvivor = this.cart.items.reduce((s, i) => s + i.survivor_income * i.quantity, 0);
    this.totalCentre   = this.cart.items.reduce((s, i) => s + i.centre_funding  * i.quantity, 0);
    this.totalPlatform = this.cart.items.reduce((s, i) => s + i.platform_fee    * i.quantity, 0);
  }

  // ── Cart actions ──────────────────────────────────────
  updateQty(productId: string, qty: number): void {
    this.cartService.updateQuantity(productId, qty).subscribe();
  }

  removeItem(productId: string): void {
    this.cartService.removeFromCart(productId).subscribe();
  }

  clearCart(): void {
    this.cart.items.forEach(i => this.cartService.removeFromCart(i.product_id).subscribe());
  }

  // ── Promo ─────────────────────────────────────────────
  applyPromo(): void {
    if (this.promoCode.trim().toUpperCase() === 'AMANI25') {
      this.promoApplied = true;
    }
  }

  // ── Total ─────────────────────────────────────────────
  getTotal(): number {
    let total = this.cart.subtotal;
    if (this.cart.subtotal < 500) total += 65;
    if (this.promoApplied) total -= 25;
    return Math.max(total, 0);
  }

  // ── Place order ───────────────────────────────────────
  placeOrder(): void {
    if (!this.currentUser) { this.showAuthModal('login'); return; }
    if (this.checkoutForm.invalid || this.isPlacingOrder) {
      this.checkoutForm.markAllAsTouched();
      return;
    }
    this.isPlacingOrder = true;
    this.orderError = '';

    this.cartService.placeOrder(this.checkoutForm.value).subscribe({
      next: (res: any) => {
        this.isPlacingOrder = false;
        this.orderPlaced    = true;
        this.shareCode      = res?.share_code || `AMN-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err: any) => {
        this.isPlacingOrder = false;
        this.orderError = err.error?.error || 'Order failed. Please try again.';
      }
    });
  }

  // ── Auth modal ────────────────────────────────────────
  showAuthModal(modal: string): void { this.authModal = modal; this.authError = ''; }
  closeAuthModal(event: MouseEvent): void { this.authModal = ''; }

  doLogin(): void {
    this.authError = '';
    if (!this.loginEmail || !this.loginPassword) { this.authError = 'Please fill in all fields.'; return; }
    const ok = this.authService.login(this.loginEmail, this.loginPassword, this.loginRole);
    if (ok) {
      this.authModal = '';
      this.checkoutForm.patchValue({ buyer_name: this.currentUser!.name, buyer_email: this.currentUser!.email });
    }
  }

  doRegister(): void {
    this.authError = '';
    if (!this.registerName || !this.registerEmail || !this.registerPassword) { this.authError = 'Please fill in all fields.'; return; }
    if (this.registerPassword.length < 8) { this.authError = 'Password must be at least 8 characters.'; return; }
    const ok = this.authService.register(this.registerName, this.registerEmail, this.registerPassword, this.registerRole);
    if (ok && this.registerRole === 'buyer') { this.authModal = ''; }
  }

  formatPrice(p: number): string { return `R${(p || 0).toFixed(2)}`; }
}