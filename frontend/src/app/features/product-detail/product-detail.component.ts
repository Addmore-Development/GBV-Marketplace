// ============================================================
// frontend/src/app/features/product-detail/product-detail.component.ts
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { AuthService, User } from '../../services/auth.service';

interface Review {
  buyer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  story?: string;
  category: string;
  tags?: string[];
  price: number;
  currency: string;
  thumbnail: string;
  images?: string[];
  seller_alias: string;
  seller_type: string;
  centre_name: string;
  city: string;
  province: string;
  stock_quantity: number;
  total_sold: number;
  rating_avg: number;
  rating_count: number;
  processing_days: number;
  ships_from_hub: boolean;
  survivor_income: number;
  centre_funding: number;
  platform_fee: number;
  survivor_pct: number;
  centre_pct: number;
  platform_pct: number;
  provides_counselling: boolean;
  provides_legal_support: boolean;
  has_shelter: boolean;
  is_24_hour: boolean;
  services_offered?: string[];
  languages_spoken?: string[];
  reviews: Review[];
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
<div class="detail-page">

  <!-- ── NAV ── -->
  <nav class="detail-nav">
    <a routerLink="/marketplace" class="back-link">← Back</a>

    <div class="nav-breadcrumb" *ngIf="product">
      <a routerLink="/marketplace">Marketplace</a>
      <span class="bc-sep">/</span>
      <span>{{ formatCategory(product.category) }}</span>
      <span class="bc-sep">/</span>
      <span class="bc-current">{{ product.title | slice:0:30 }}…</span>
    </div>

    <div class="nav-right">
      <!-- Auth buttons -->
      <ng-container *ngIf="!currentUser">
        <button class="nav-sign-in" (click)="showAuthModal('login')">Sign In</button>
        <button class="nav-register" (click)="showAuthModal('register')">Register</button>
      </ng-container>
      <div class="user-chip" *ngIf="currentUser">
        <div class="user-avatar">{{ currentUser.initials }}</div>
        <span class="user-name">{{ currentUser.name.split(' ')[0] }}</span>
      </div>

      <!-- Cart -->
      <a routerLink="/cart" class="nav-cart">
        🛒
        <span class="cart-badge" *ngIf="cartCount > 0">{{ cartCount }}</span>
      </a>
    </div>
  </nav>

  <!-- ── LOADING ── -->
  <div class="loading-state" *ngIf="isLoading">
    <div class="spinner"></div>
    <p>Loading product…</p>
  </div>

  <!-- ── ERROR ── -->
  <div class="error-state" *ngIf="!isLoading && !product">
    <div style="font-size:3rem; margin-bottom:16px">🌿</div>
    <h2>Product not found</h2>
    <a routerLink="/marketplace" class="btn-primary">Back to Marketplace</a>
  </div>

  <!-- ── PRODUCT CONTENT ── -->
  <div class="detail-wrapper" *ngIf="!isLoading && product">

    <!-- ── MAIN DETAIL LAYOUT ── -->
    <div class="detail-layout">

      <!-- LEFT: Images -->
      <div class="images-panel">

        <!-- Main image -->
        <div class="main-image">
          <img [src]="selectedImage || product.thumbnail" [alt]="product.title" />
          <div class="img-badge category-badge">
            {{ getCategoryIcon(product.category) }} {{ formatCategory(product.category) }}
          </div>
          <div class="img-badge sold-badge" *ngIf="product.total_sold > 10">
            🔥 {{ product.total_sold }} sold
          </div>
          <button class="wishlist-btn">♡ Save</button>
        </div>

        <!-- Thumbnails -->
        <div class="thumbnails" *ngIf="product.images && product.images.length > 1">
          <div class="thumb" *ngFor="let img of product.images"
            [class.active]="selectedImage === img"
            (click)="selectedImage = img">
            <img [src]="img" [alt]="product.title" />
          </div>
        </div>

        <!-- Centre card -->
        <div class="centre-card">
          <div class="cc-header">
            <span class="cc-icon">🏠</span>
            <div>
              <div class="cc-name">{{ product.centre_name }}</div>
              <div class="cc-loc">📍 {{ product.city }}, {{ product.province }}</div>
            </div>
            <span class="cc-verified">✅ Verified</span>
          </div>
          <div class="cc-services" *ngIf="product.services_offered?.length">
            <span class="cc-chip" *ngFor="let s of product.services_offered?.slice(0, 4)">{{ s }}</span>
          </div>
          <div class="cc-badges">
            <span class="cbadge teal"  *ngIf="product.provides_counselling">💬 Counselling</span>
            <span class="cbadge green" *ngIf="product.provides_legal_support">⚖️ Legal Aid</span>
            <span class="cbadge gold"  *ngIf="product.has_shelter">🏠 Shelter</span>
            <span class="cbadge blue"  *ngIf="product.is_24_hour">🕐 24/7</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: Product info -->
      <div class="info-panel">

        <!-- Title -->
        <h1 class="product-title">{{ product.title }}</h1>

        <div class="seller-row">
          <span class="seller-alias">✨ Handmade by <em>{{ product.seller_alias }}</em></span>
          <span class="seller-badge">{{ formatSellerType(product.seller_type) }}</span>
        </div>

        <!-- Rating row -->
        <div class="rating-row" *ngIf="product.rating_count > 0">
          <div class="stars">
            <span *ngFor="let s of getStars(product.rating_avg)"
              class="star" [class.filled]="s === 1">★</span>
          </div>
          <span class="rating-val">{{ product.rating_avg.toFixed(1) }}</span>
          <span class="rating-cnt">({{ product.rating_count }} reviews)</span>
          <span class="sold-cnt" *ngIf="product.total_sold > 0">· {{ product.total_sold }} sold</span>
        </div>

        <!-- Price -->
        <div class="price-block">
          <span class="price-main">R{{ product.price.toFixed(2) }}</span>
          <span class="price-currency">ZAR</span>
          <span class="stock-pill"
            [class.in-stock]="product.stock_quantity > 3"
            [class.low-stock]="product.stock_quantity > 0 && product.stock_quantity <= 3"
            [class.out-of-stock]="product.stock_quantity === 0">
            {{ product.stock_quantity === 0 ? '❌ Out of stock'
              : product.stock_quantity <= 3 ? '⚠️ Only ' + product.stock_quantity + ' left!'
              : '✅ In stock' }}
          </span>
        </div>

        <!-- Tabs: Description / Story / Shipping -->
        <div class="info-tabs">
          <button class="info-tab" [class.active]="infoTab === 'desc'"     (click)="infoTab = 'desc'">Description</button>
          <button class="info-tab" [class.active]="infoTab === 'story'"    (click)="infoTab = 'story'" *ngIf="product.story">Maker's Story</button>
          <button class="info-tab" [class.active]="infoTab === 'shipping'" (click)="infoTab = 'shipping'">Delivery</button>
        </div>

        <div class="tab-content" *ngIf="infoTab === 'desc'">
          <p>{{ product.description }}</p>
          <div class="tags-row" *ngIf="product.tags?.length">
            <span class="tag" *ngFor="let tag of product.tags">{{ tag }}</span>
          </div>
        </div>

        <div class="tab-content" *ngIf="infoTab === 'story' && product.story">
          <div class="story-block">
            <div class="story-label">💬 In the maker's words</div>
            <blockquote>{{ product.story }}</blockquote>
          </div>
        </div>

        <div class="tab-content" *ngIf="infoTab === 'shipping'">
          <div class="shipping-item">
            <span>🏭</span>
            <div>
              <strong>Ships from Centre Hub</strong>
              <p>Packed and shipped from {{ product.centre_name }}. Your address is never shared with the maker.</p>
            </div>
          </div>
          <div class="shipping-item">
            <span>⏱️</span>
            <div>
              <strong>Processing Time</strong>
              <p>Allow {{ product.processing_days }}–{{ product.processing_days + 2 }} business days before dispatch.</p>
            </div>
          </div>
          <div class="shipping-item">
            <span>🔒</span>
            <div>
              <strong>Seller Anonymity</strong>
              <p>{{ product.seller_alias }} uses an alias. Their real name and location are never disclosed.</p>
            </div>
          </div>
        </div>

        <!-- ── IMPACT RECEIPT ── -->
        <div class="impact-receipt">
          <div class="ir-head">
            <span class="ir-icon">🧾</span>
            <div>
              <strong>Your Impact Receipt</strong>
              <small>Exactly where every rand goes</small>
            </div>
          </div>
          <div class="ir-bars">
            <div class="ir-bar-row">
              <div class="ir-bar-label">
                <span class="ir-dot survivor"></span>
                <span>Survivor Income</span>
                <strong>R{{ (product.survivor_income * quantity).toFixed(2) }}</strong>
              </div>
              <div class="ir-bar-track">
                <div class="ir-bar-fill survivor" [style.width.%]="product.survivor_pct"></div>
              </div>
              <span class="ir-bar-pct">{{ product.survivor_pct | number:'1.0-0' }}%</span>
            </div>
            <div class="ir-bar-row">
              <div class="ir-bar-label">
                <span class="ir-dot centre"></span>
                <span>Centre Funding</span>
                <strong>R{{ (product.centre_funding * quantity).toFixed(2) }}</strong>
              </div>
              <div class="ir-bar-track">
                <div class="ir-bar-fill centre" [style.width.%]="product.centre_pct"></div>
              </div>
              <span class="ir-bar-pct">{{ product.centre_pct | number:'1.0-0' }}%</span>
            </div>
            <div class="ir-bar-row">
              <div class="ir-bar-label">
                <span class="ir-dot platform"></span>
                <span>Platform</span>
                <strong>R{{ (product.platform_fee * quantity).toFixed(2) }}</strong>
              </div>
              <div class="ir-bar-track">
                <div class="ir-bar-fill platform" [style.width.%]="product.platform_pct"></div>
              </div>
              <span class="ir-bar-pct">{{ product.platform_pct | number:'1.0-0' }}%</span>
            </div>
          </div>
          <div class="ir-total-row">
            <span>Total · {{ quantity }} item{{ quantity > 1 ? 's' : '' }}</span>
            <strong>R{{ (product.price * quantity).toFixed(2) }}</strong>
          </div>
        </div>

        <!-- ── PURCHASE BLOCK ── -->
        <div class="purchase-block">
          <div class="qty-row">
            <label>Quantity</label>
            <div class="qty-control">
              <button (click)="quantity > 1 ? quantity = quantity - 1 : null" [disabled]="quantity <= 1">−</button>
              <span>{{ quantity }}</span>
              <button (click)="quantity < product.stock_quantity ? quantity = quantity + 1 : null"
                [disabled]="quantity >= product.stock_quantity">+</button>
            </div>
            <span class="qty-hint">{{ product.stock_quantity }} available</span>
          </div>

          <div class="purchase-btns">
            <button class="add-btn"
              [class.added]="addedToCart"
              [disabled]="product.stock_quantity === 0 || isAddingToCart"
              (click)="addToCart()">
              <span *ngIf="addedToCart">✓ Added to Cart!</span>
              <span *ngIf="isAddingToCart && !addedToCart">Adding…</span>
              <span *ngIf="!isAddingToCart && !addedToCart">
                {{ product.stock_quantity === 0 ? 'Out of Stock' : '🛒 Add to Cart' }}
              </span>
            </button>

            <a routerLink="/cart" class="buy-now-btn"
              *ngIf="product.stock_quantity > 0"
              (click)="addToCart()">
              Buy Now →
            </a>
          </div>

          <a routerLink="/cart" class="view-cart-link" *ngIf="addedToCart">
            View Cart &amp; Checkout →
          </a>

          <div class="purchase-trust">
            <span>🔒 Secure Checkout</span>
            <span>📦 Tracked Delivery</span>
            <span>↩️ Easy Returns</span>
          </div>
        </div>

      </div>
    </div>

    <!-- ── REVIEWS ── -->
    <div class="reviews-section" *ngIf="product.reviews?.length">
      <div class="reviews-inner">
        <div class="reviews-header">
          <h2 class="reviews-title">Customer Reviews</h2>
          <div class="reviews-summary">
            <span class="rs-avg">{{ product.rating_avg.toFixed(1) }}</span>
            <div>
              <div class="stars">
                <span *ngFor="let s of getStars(product.rating_avg)" class="star" [class.filled]="s === 1">★</span>
              </div>
              <span class="rs-count">{{ product.rating_count }} reviews</span>
            </div>
          </div>
        </div>
        <div class="reviews-grid">
          <div class="review-card" *ngFor="let review of product.reviews">
            <div class="review-header">
              <div class="reviewer-avatar">{{ review.buyer_name.charAt(0).toUpperCase() }}</div>
              <div class="reviewer-info">
                <div class="reviewer-name">{{ review.buyer_name }}</div>
                <div class="stars small">
                  <span *ngFor="let s of getStars(review.rating)" class="star" [class.filled]="s === 1">★</span>
                </div>
              </div>
              <div class="review-date">{{ review.created_at | date:'mediumDate' }}</div>
            </div>
            <p class="review-comment">{{ review.comment }}</p>
          </div>
        </div>
      </div>
    </div>

  </div><!-- end detail-wrapper -->

</div><!-- end detail-page -->

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

    <!-- Register success -->
    <div *ngIf="authModal === 'register-success'">
      <div class="modal-success">
        <div class="ms-icon">✅</div>
        <h2>Application Submitted!</h2>
        <p>Your {{ registerRole }} application is under review. We'll contact you within 3–5 business days.</p>
        <button class="modal-cta" (click)="authModal = ''">Close</button>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

    :host {
      --gold: #C49A3C; --gold-light: #F5E9C8; --gold-dark: #B8860B;
      --forest: #2D5016; --forest-deep: #1A3009; --forest-mid: #3D6B20;
      --sage: #5A7A3A; --sage-light: #EFF4E8; --sage-mid: #D1DEC4;
      --teal: #1A6B5A; --teal-light: #E4F2EF;
      --red: #EF4444; --amber: #D97706; --green: #16A34A;
      --text-dark: #1C2B1A; --text-mid: #4A5C47; --text-light: #7A8C77; --text-muted: #9CA3AF;
      --border: #E5E7EB; --bg: #F7F9F5; --white: #FFFFFF;
      font-family: 'DM Sans', sans-serif;
      background: var(--bg); display: block; min-height: 100vh;
    }

    /* NAV */
    .detail-nav {
      background: var(--forest-deep); padding: 0 28px; height: 64px;
      display: flex; align-items: center; gap: 16px;
      position: sticky; top: 0; z-index: 200;
    }
    .back-link {
      color: rgba(255,255,255,.65); text-decoration: none; font-size: .84rem;
      white-space: nowrap; transition: color .2s; flex-shrink: 0;
      &:hover { color: white; }
    }
    .nav-breadcrumb {
      display: flex; align-items: center; gap: 6px; font-size: .8rem;
      color: rgba(255,255,255,.5); flex: 1; overflow: hidden;
      a { color: rgba(255,255,255,.5); text-decoration: none; white-space: nowrap; &:hover { color: white; } }
      .bc-sep { color: rgba(255,255,255,.25); }
      .bc-current { color: rgba(255,255,255,.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }
    .nav-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
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
    .nav-cart {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--gold), var(--gold-dark));
      color: var(--forest-deep); width: 38px; height: 38px; border-radius: 9px;
      text-decoration: none; font-size: 1rem; position: relative;
      box-shadow: 0 2px 8px rgba(196,154,60,.35); transition: all .2s;
      &:hover { transform: translateY(-1px); }
    }
    .cart-badge {
      position: absolute; top: -5px; right: -5px;
      background: var(--red); color: white; font-size: .6rem; font-weight: 700;
      width: 16px; height: 16px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--forest-deep);
    }

    /* LOADING / ERROR */
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; color: var(--text-muted); }
    .spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--sage); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-state { text-align: center; padding: 80px 24px; h2 { font-family: 'Playfair Display', serif; color: var(--text-dark); margin: 0 0 20px; } }
    .btn-primary { display: inline-block; background: var(--forest); color: white; text-decoration: none; padding: 12px 28px; border-radius: 9px; font-weight: 700; }

    /* WRAPPER */
    .detail-wrapper { max-width: 1280px; margin: 0 auto; padding: 0 0 60px; }

    /* DETAIL LAYOUT */
    .detail-layout {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0;
      @media (max-width: 860px) { grid-template-columns: 1fr; }
    }

    /* IMAGES */
    .images-panel { padding: 28px; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 64px; align-self: start; }
    .main-image {
      position: relative; aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: var(--sage-light);
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .img-badge {
      position: absolute; font-size: .75rem; font-weight: 700; padding: 4px 12px; border-radius: 99px;
      &.category-badge { top: 14px; left: 14px; background: rgba(255,255,255,.92); backdrop-filter: blur(4px); color: var(--text-dark); }
      &.sold-badge     { top: 14px; right: 54px; background: linear-gradient(135deg, var(--gold), var(--gold-dark)); color: white; }
    }
    .wishlist-btn {
      position: absolute; top: 14px; right: 14px;
      background: rgba(255,255,255,.92); backdrop-filter: blur(4px);
      border: none; border-radius: 99px; padding: 5px 12px;
      font-size: .75rem; font-weight: 600; color: var(--text-mid); cursor: pointer;
      transition: all .2s;
      &:hover { color: var(--red); background: white; }
    }
    .thumbnails { display: flex; gap: 8px; flex-wrap: wrap; }
    .thumb {
      width: 68px; height: 68px; border-radius: 8px; overflow: hidden;
      border: 2px solid transparent; cursor: pointer; transition: border-color .2s;
      &.active { border-color: var(--gold); }
      &:hover  { border-color: var(--sage); }
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    /* CENTRE CARD */
    .centre-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
    .cc-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
    .cc-icon { font-size: 1.2rem; flex-shrink: 0; }
    .cc-name { font-weight: 700; font-size: .88rem; color: var(--forest); }
    .cc-loc  { font-size: .75rem; color: var(--text-muted); margin-top: 2px; }
    .cc-verified { margin-left: auto; font-size: .7rem; font-weight: 700; background: var(--sage-light); color: var(--forest); padding: 3px 9px; border-radius: 99px; white-space: nowrap; }
    .cc-services { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
    .cc-chip { font-size: .68rem; background: var(--sage-light); color: var(--text-mid); padding: 2px 8px; border-radius: 99px; }
    .cc-badges { display: flex; flex-wrap: wrap; gap: 5px; }
    .cbadge {
      font-size: .7rem; font-weight: 600; padding: 3px 9px; border-radius: 99px;
      &.teal  { background: var(--teal-light); color: var(--teal); }
      &.green { background: var(--sage-light); color: var(--forest); }
      &.gold  { background: var(--gold-light); color: var(--gold-dark); }
      &.blue  { background: #EFF6FF; color: #1D4ED8; }
    }

    /* INFO PANEL */
    .info-panel { padding: 28px; display: flex; flex-direction: column; gap: 18px; border-left: 1px solid var(--border); }
    .product-title { font-family: 'Playfair Display', serif; font-size: clamp(1.4rem, 3vw, 2rem); color: var(--text-dark); margin: 0; line-height: 1.2; font-weight: 700; }
    .seller-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      .seller-alias { font-size: .9rem; color: var(--text-mid); em { color: var(--sage); font-style: normal; font-weight: 700; } }
    }
    .seller-badge { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; background: var(--gold-light); color: var(--gold-dark); padding: 2px 9px; border-radius: 99px; }
    .rating-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
      .stars { display: flex; }
      .star { font-size: .9rem; color: var(--border); &.filled { color: #F59E0B; } }
      .rating-val { font-size: .88rem; font-weight: 700; color: var(--text-dark); }
      .rating-cnt, .sold-cnt { font-size: .82rem; color: var(--text-muted); }
    }
    .price-block { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
      .price-main { font-family: 'DM Mono', monospace; font-size: 2.2rem; font-weight: 600; color: var(--forest); }
      .price-currency { font-size: .8rem; color: var(--text-muted); }
    }
    .stock-pill {
      font-size: .8rem; font-weight: 700; padding: 4px 12px; border-radius: 99px;
      &.in-stock    { background: #DCFCE7; color: var(--green); }
      &.low-stock   { background: #FEF3C7; color: #92400E; }
      &.out-of-stock { background: #FEE2E2; color: var(--red); }
    }

    /* INFO TABS */
    .info-tabs { display: flex; border-bottom: 2px solid var(--border); gap: 0; }
    .info-tab {
      padding: 10px 18px; border: none; background: none; font-family: 'DM Sans', sans-serif;
      font-size: .84rem; font-weight: 600; color: var(--text-muted); cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s;
      &:hover { color: var(--forest); }
      &.active { color: var(--forest); border-bottom-color: var(--forest); }
    }

    .tab-content {
      p { font-size: .9rem; color: var(--text-mid); line-height: 1.65; margin: 0; }
    }
    .tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .tag { font-size: .74rem; background: var(--sage-light); color: var(--text-mid); padding: 3px 10px; border-radius: 99px; }

    .story-block {
      background: var(--gold-light); border-left: 3px solid var(--gold);
      border-radius: 0 10px 10px 0; padding: 14px 18px;
      .story-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--gold-dark); margin-bottom: 7px; }
      blockquote { margin: 0; font-family: 'Playfair Display', serif; font-style: italic; color: var(--text-dark); line-height: 1.6; font-size: .92rem; }
    }

    .shipping-item {
      display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; &:last-child { margin: 0; }
      > span { font-size: 1.2rem; flex-shrink: 0; }
      strong { display: block; font-size: .85rem; color: var(--text-dark); margin-bottom: 2px; }
      p { margin: 0; font-size: .8rem; color: var(--text-mid); line-height: 1.5; }
    }

    /* IMPACT RECEIPT */
    .impact-receipt {
      background: var(--forest-deep); border-radius: 14px; overflow: hidden;
    }
    .ir-head {
      display: flex; gap: 12px; align-items: flex-start; padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      .ir-icon { font-size: 1.3rem; }
      strong { display: block; font-size: .88rem; color: white; margin-bottom: 2px; }
      small  { color: rgba(255,255,255,.5); font-size: .72rem; }
    }
    .ir-bars { padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; }
    .ir-bar-row { display: flex; flex-direction: column; gap: 5px; }
    .ir-bar-label {
      display: flex; align-items: center; gap: 7px; font-size: .8rem; color: rgba(255,255,255,.7);
      strong { margin-left: auto; color: white; font-family: 'DM Mono', monospace; font-size: .82rem; }
    }
    .ir-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      &.survivor { background: #F59E0B; }
      &.centre   { background: var(--sage); }
      &.platform { background: rgba(255,255,255,.3); }
    }
    .ir-bar-track { height: 6px; background: rgba(255,255,255,.1); border-radius: 3px; overflow: hidden; flex: 1; }
    .ir-bar-fill {
      height: 100%; border-radius: 3px; transition: width .4s;
      &.survivor { background: #F59E0B; }
      &.centre   { background: var(--sage); }
      &.platform { background: rgba(255,255,255,.3); }
    }
    .ir-bar-pct { font-family: 'DM Mono', monospace; font-size: .7rem; color: rgba(255,255,255,.4); }
    .ir-total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 18px; background: rgba(255,255,255,.05); border-top: 1px solid rgba(255,255,255,.08);
      font-size: .84rem; color: rgba(255,255,255,.6);
      strong { font-family: 'DM Mono', monospace; font-size: 1.1rem; color: white; }
    }

    /* PURCHASE BLOCK */
    .purchase-block {
      background: var(--white); border: 1px solid var(--border);
      border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
    }
    .qty-row { display: flex; align-items: center; gap: 14px;
      label { font-size: .82rem; font-weight: 700; color: var(--text-dark); flex-shrink: 0; }
      .qty-hint { font-size: .75rem; color: var(--text-muted); }
    }
    .qty-control {
      display: flex; align-items: center; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden;
      button {
        width: 36px; height: 40px; border: none; background: white; font-size: 1.1rem; font-weight: 600;
        color: var(--text-dark); cursor: pointer; transition: background .15s;
        &:hover:not(:disabled) { background: var(--sage-light); }
        &:disabled { opacity: .3; cursor: not-allowed; }
      }
      span {
        width: 40px; text-align: center; font-family: 'DM Mono', monospace; font-size: .95rem;
        font-weight: 700; border-left: 1.5px solid var(--border); border-right: 1.5px solid var(--border);
        line-height: 40px;
      }
    }
    .purchase-btns { display: grid; grid-template-columns: 1fr auto; gap: 10px; }
    .add-btn {
      padding: 13px 0; background: var(--forest); color: white; border: none; border-radius: 9px;
      font-family: 'DM Sans', sans-serif; font-size: .94rem; font-weight: 700; cursor: pointer; transition: all .2s;
      &.added    { background: var(--green); }
      &:hover:not(:disabled) { background: var(--sage); transform: translateY(-1px); }
      &:disabled { background: var(--border); color: var(--text-muted); cursor: not-allowed; }
    }
    .buy-now-btn {
      display: flex; align-items: center; justify-content: center; padding: 13px 20px;
      background: linear-gradient(135deg, var(--gold), var(--gold-dark)); color: var(--forest-deep);
      border: none; border-radius: 9px; font-family: 'DM Sans', sans-serif;
      font-size: .88rem; font-weight: 700; text-decoration: none; cursor: pointer;
      white-space: nowrap; transition: all .2s; box-shadow: 0 4px 14px rgba(196,154,60,.3);
      &:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(196,154,60,.4); }
    }
    .view-cart-link {
      display: block; text-align: center; padding: 11px;
      background: var(--gold-light); color: var(--gold-dark); text-decoration: none;
      border-radius: 9px; font-weight: 700; font-size: .88rem;
      border: 1px solid rgba(196,154,60,.3); transition: all .2s;
      &:hover { background: var(--gold); color: white; }
    }
    .purchase-trust {
      display: flex; justify-content: center; gap: 16px;
      font-size: .72rem; color: var(--text-muted);
    }

    /* REVIEWS */
    .reviews-section { border-top: 8px solid var(--bg); padding: 40px 28px; }
    .reviews-inner { max-width: 1280px; margin: 0 auto; }
    .reviews-header { display: flex; align-items: center; gap: 24px; margin-bottom: 28px; }
    .reviews-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--text-dark); margin: 0; }
    .reviews-summary { display: flex; align-items: center; gap: 10px;
      .rs-avg { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: var(--text-dark); }
      .stars { display: flex; }
      .star { font-size: .9rem; color: var(--border); &.filled { color: #F59E0B; } }
      .rs-count { font-size: .78rem; color: var(--text-muted); margin-top: 2px; }
    }
    .reviews-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .review-card {
      background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px;
      transition: box-shadow .2s; &:hover { box-shadow: 0 4px 14px rgba(0,0,0,.08); }
    }
    .review-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
    .reviewer-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: var(--forest);
      color: white; font-family: 'Playfair Display', serif; font-weight: 700; font-size: .88rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .reviewer-info { flex: 1; }
    .reviewer-name { font-size: .88rem; font-weight: 700; color: var(--text-dark); margin-bottom: 2px; }
    .stars.small .star { font-size: .78rem; }
    .review-date { font-size: .72rem; color: var(--text-muted); white-space: nowrap; }
    .review-comment { font-size: .86rem; color: var(--text-mid); line-height: 1.55; margin: 0; }

    /* AUTH MODAL */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 500;
      background: rgba(15,32,9,.6); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; padding: 24px;
      opacity: 0; pointer-events: none; transition: opacity .25s;
      &.open { opacity: 1; pointer-events: auto; }
    }
    .modal {
      background: white; border-radius: 20px; padding: 40px; width: 100%; max-width: 460px;
      position: relative; max-height: 90vh; overflow-y: auto;
      transform: translateY(20px) scale(.97); transition: all .28s cubic-bezier(.34,1.56,.64,1);
      box-shadow: 0 32px 80px rgba(15,32,9,.4);
      &.open { transform: translateY(0) scale(1); }
    }
    .modal-close { position: absolute; top: 16px; right: 16px; width: 30px; height: 30px; border-radius: 50%; border: none; background: #F3F4F6; cursor: pointer; font-size: .82rem; display: flex; align-items: center; justify-content: center; }
    .modal-head { margin-bottom: 22px; }
    .modal-logo { width: 40px; height: 40px; border-radius: 9px; background: linear-gradient(135deg, #3D6B20, #2D5016); display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: white; margin-bottom: 14px; }
    .modal-title { font-family: 'Playfair Display', serif; font-size: 1.7rem; font-weight: 700; color: var(--text-dark); margin-bottom: 4px; }
    .modal-sub   { font-size: .86rem; color: var(--text-muted); }
    .modal-tabs  { display: flex; background: var(--sage-light); border-radius: 10px; padding: 4px; margin-bottom: 20px; gap: 3px; }
    .mtab { flex: 1; padding: 8px; border-radius: 8px; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 600; color: var(--text-muted); cursor: pointer; &.active { background: white; color: var(--forest); box-shadow: 0 1px 4px rgba(0,0,0,.08); } }
    .mf-group {
      margin-bottom: 13px;
      label { display: block; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-dark); margin-bottom: 5px; }
      input { width: 100%; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .88rem; color: var(--text-dark); background: white; outline: none; box-sizing: border-box; &:focus { border-color: var(--forest); } }
    }
    .mf-note { background: var(--sage-light); border-radius: 8px; padding: 10px 14px; font-size: .78rem; color: var(--text-mid); margin-bottom: 14px; &.vetting { background: rgba(196,98,58,.08); color: #92400E; } }
    .modal-error { background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 14px; color: #DC2626; font-size: .82rem; margin-bottom: 14px; }
    .modal-cta { width: 100%; padding: 13px; background: linear-gradient(135deg, var(--forest), #3D6B20); color: white; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: .94rem; font-weight: 700; cursor: pointer; margin-bottom: 10px; }
    .modal-switch { text-align: center; font-size: .82rem; color: var(--text-muted); span { color: var(--forest); font-weight: 700; cursor: pointer; text-decoration: underline; } }
    .role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 18px; }
    .role-card { border: 2px solid var(--border); border-radius: 10px; padding: 12px 8px; text-align: center; cursor: pointer; &.selected { border-color: var(--forest); background: var(--sage-light); } }
    .rc-icon  { font-size: 1.3rem; margin-bottom: 4px; }
    .rc-label { font-size: .78rem; font-weight: 700; color: var(--text-dark); }
    .rc-desc  { font-size: .66rem; color: var(--text-muted); margin-top: 2px; }
    .modal-success { text-align: center; padding: 16px 0; .ms-icon { font-size: 3rem; margin-bottom: 14px; } h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--text-dark); margin-bottom: 10px; } p { color: var(--text-light); line-height: 1.6; margin-bottom: 22px; } }
  `]
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  isLoading = true;
  selectedImage = '';
  quantity = 1;
  isAddingToCart = false;
  addedToCart = false;
  cartCount = 0;
  infoTab: 'desc' | 'story' | 'shipping' = 'desc';
  currentUser: User | null = null;

  // ── Auth modal ────────────────────────────────────────
  authModal = '';
  loginRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  loginEmail = '';
  loginPassword = '';
  authError = '';
  registerRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  registerName = '';
  registerEmail = '';
  registerPassword = '';

  readonly categoryIcons: Record<string, string> = {
    jewellery: '💎', clothing_textiles: '👗', food_preserves: '🫙',
    art_crafts: '🎨', home_decor: '🏡', skincare_wellness: '🌿',
    stationery: '📝', toys_gifts: '🎁',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    public cartService: CartService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.loadProduct(params['id']);
    });
    this.cartService.cartCount$.pipe(takeUntil(this.destroy$))
      .subscribe(c => this.cartCount = c);
    this.authService.user$.pipe(takeUntil(this.destroy$))
      .subscribe(u => this.currentUser = u);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.http.get<Product>(`http://localhost:3000/api/marketplace/products/${id}`)
      .subscribe({
        next: p => {
          this.product = p;
          this.selectedImage = p.thumbnail || (p.images?.[0] || '');
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  addToCart(): void {
    if (!this.product || this.isAddingToCart) return;
    this.isAddingToCart = true;
    this.cartService.addToCart(this.product.id, this.quantity).subscribe({
      next: () => {
        this.isAddingToCart = false;
        this.addedToCart = true;
        setTimeout(() => this.addedToCart = false, 3000);
      },
      error: () => { this.isAddingToCart = false; }
    });
  }

  // ── Auth modal ────────────────────────────────────────
  showAuthModal(modal: string): void { this.authModal = modal; this.authError = ''; }
  closeAuthModal(event: MouseEvent): void { this.authModal = ''; }

  doLogin(): void {
    this.authError = '';
    if (!this.loginEmail || !this.loginPassword) { this.authError = 'Please fill in all fields.'; return; }
    const ok = this.authService.login(this.loginEmail, this.loginPassword, this.loginRole);
    if (ok) { this.authModal = ''; }
  }

  doRegister(): void {
    this.authError = '';
    if (!this.registerName || !this.registerEmail || !this.registerPassword) { this.authError = 'Please fill in all fields.'; return; }
    if (this.registerPassword.length < 8) { this.authError = 'Password must be at least 8 characters.'; return; }
    const ok = this.authService.register(this.registerName, this.registerEmail, this.registerPassword, this.registerRole);
    if (ok) {
      if (this.registerRole === 'buyer') { this.authModal = ''; }
      else { this.authModal = 'register-success'; }
    }
  }

  // ── Helpers ───────────────────────────────────────────
  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.round(rating) ? 1 : 0);
  }

  getCategoryIcon(cat: string): string { return this.categoryIcons[cat] || '🛒'; }
  formatCategory(cat: string): string  { return cat?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || ''; }
  formatSellerType(type: string): string { return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || ''; }
}