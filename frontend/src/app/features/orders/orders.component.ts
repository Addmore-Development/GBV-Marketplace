// ============================================================
// frontend/src/app/features/orders/orders.component.ts
// ============================================================
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CartService, Order } from '../../services/cart.service';
import { AuthService, User } from '../../services/auth.service';

type FilterTab = 'all' | 'active' | 'cancelled';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="orders-page">

  <nav class="orders-nav">
    <a routerLink="/marketplace" class="back-btn">← Continue Shopping</a>
    <div class="brand" routerLink="/marketplace">
      <div class="brand-mark">A</div>
      <span class="brand-name">Amani</span>
    </div>
    <div class="nav-right">
      <div class="user-chip" *ngIf="currentUser">
        <div class="user-avatar">{{ currentUser.initials }}</div>
        <span class="user-name">{{ currentUser.name.split(' ')[0] }}</span>
      </div>
    </div>
  </nav>

  <div class="orders-body">
    <h1 class="orders-title">My Orders</h1>

    <!-- Not signed in -->
    <div class="signed-out" *ngIf="!currentUser">
      <p>Sign in to view your order history.</p>
      <a routerLink="/cart" class="btn-primary">Go to Cart to Sign In</a>
    </div>

    <ng-container *ngIf="currentUser">

      <!-- Tabs -->
      <div class="tabs" *ngIf="!isLoading && !loadError">
        <button class="tab" [class.active]="activeTab === 'all'" (click)="activeTab = 'all'">
          All Orders <span class="count">{{ orders.length }}</span>
        </button>
        <button class="tab" [class.active]="activeTab === 'active'" (click)="activeTab = 'active'">
          Previous Orders <span class="count">{{ activeOrders.length }}</span>
        </button>
        <button class="tab" [class.active]="activeTab === 'cancelled'" (click)="activeTab = 'cancelled'">
          Cancelled <span class="count">{{ cancelledOrders.length }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div class="loading-state" *ngIf="isLoading">Loading your orders…</div>

      <!-- Error -->
      <div class="error-state" *ngIf="loadError && !isLoading">
        <p>{{ loadError }}</p>
        <button class="btn-primary" (click)="loadOrders()">Try Again</button>
      </div>

      <!-- Empty -->
      <div class="empty-state" *ngIf="!isLoading && !loadError && filteredOrders.length === 0">
        <p *ngIf="activeTab === 'all'">You haven't placed any orders yet.</p>
        <p *ngIf="activeTab === 'active'">No previous orders to show.</p>
        <p *ngIf="activeTab === 'cancelled'">No cancelled orders.</p>
        <a routerLink="/marketplace" class="btn-primary">Browse the Marketplace</a>
      </div>

      <!-- Orders list -->
      <div class="orders-list" *ngIf="!isLoading && !loadError">
        <div class="order-card" *ngFor="let order of filteredOrders">

          <div class="order-card-header">
            <div>
              <div class="order-id">Order #{{ order.id.slice(0, 8).toUpperCase() }}</div>
              <div class="order-date">{{ order.created_at | date: 'medium' }}</div>
            </div>
            <span class="status-badge" [class]="'status-' + order.status">{{ order.status }}</span>
          </div>

          <div class="order-items">
            <div class="order-item" *ngFor="let item of order.items">
              <img [src]="item.thumbnail || 'assets/placeholder.jpg'" [alt]="item.title" />
              <div class="oi-details">
                <div class="oi-title">{{ item.title }}</div>
                <div class="oi-meta">Qty {{ item.quantity }} · {{ formatPrice(item.unit_price) }} each</div>
              </div>
              <div class="oi-total">{{ formatPrice(item.total_price) }}</div>
            </div>
          </div>

          <div class="order-card-footer">
            <div class="order-total">
              <span>Total</span>
              <strong>{{ formatPrice(order.total) }}</strong>
            </div>
            <button
              class="cancel-btn"
              *ngIf="order.status === 'pending' || order.status === 'new'"
              [disabled]="cancellingId === order.id"
              (click)="cancelOrder(order)">
              {{ cancellingId === order.id ? 'Cancelling…' : 'Cancel Order' }}
            </button>
          </div>

        </div>
      </div>

    </ng-container>
  </div>

</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');

    :host {
      --cream:       #FAF7F2;
      --beige:       #F0EAE0;
      --brown:       #3D2B1F;
      --text-dark:   #1A1210;
      --text-mid:    #4A3830;
      --text-light:  #7A6A62;
      --border:      #E0D8CE;
      --green:       #2D6A4F;
      --red:         #8B2635;
      --gold:        #B8860B;
      --gold-dark:   #8C6508;
      font-family: 'DM Sans', sans-serif;
      background: var(--cream);
      display: block;
      min-height: 100vh;
    }

    .orders-nav {
      background: var(--brown);
      padding: 0 28px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .back-btn { color: rgba(255,255,255,.65); text-decoration: none; font-size: .84rem; }
    .back-btn:hover { color: white; }
    .brand { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .brand-mark {
      width: 34px; height: 34px; border-radius: 8px;
      background: linear-gradient(135deg, #F5E9C8, var(--gold));
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: var(--brown);
    }
    .brand-name { font-family: 'Playfair Display', serif; color: white; font-size: 1rem; font-weight: 700; }
    .user-chip { display: flex; align-items: center; gap: 8px; color: white; }
    .user-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: var(--gold); color: white; font-weight: 700;
      display: flex; align-items: center; justify-content: center; font-size: .78rem;
    }
    .user-name { font-size: .86rem; }

    .orders-body { max-width: 820px; margin: 0 auto; padding: 40px 24px 80px; }
    .orders-title { font-family: 'Playfair Display', serif; font-size: 2rem; color: var(--text-dark); margin: 0 0 24px; }

    .signed-out, .loading-state, .error-state, .empty-state {
      background: white; border: 1px solid var(--border); border-radius: 14px;
      padding: 48px 24px; text-align: center; color: var(--text-mid);
    }
    .btn-primary {
      display: inline-block; margin-top: 16px; padding: 12px 24px;
      background: var(--gold); color: white; border: none; border-radius: 8px;
      text-decoration: none; font-weight: 600; cursor: pointer; font-size: .9rem;
    }

    .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
    .tab {
      background: none; border: none; padding: 12px 18px; font-size: .88rem; font-weight: 600;
      color: var(--text-light); cursor: pointer; border-bottom: 2px solid transparent;
      display: flex; align-items: center; gap: 6px;
    }
    .tab.active { color: var(--brown); border-bottom-color: var(--gold); }
    .tab .count {
      background: var(--beige); color: var(--text-mid); border-radius: 20px;
      padding: 1px 8px; font-size: .74rem;
    }
    .tab.active .count { background: var(--gold); color: white; }

    .orders-list { display: flex; flex-direction: column; gap: 16px; }
    .order-card { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
    .order-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .order-id { font-weight: 700; color: var(--text-dark); font-size: .92rem; }
    .order-date { color: var(--text-light); font-size: .78rem; margin-top: 2px; }

    .status-badge {
      text-transform: capitalize; font-size: .74rem; font-weight: 700;
      padding: 4px 12px; border-radius: 20px;
    }
    .status-pending, .status-new { background: #FBEFD8; color: #9C6B0B; }
    .status-cancelled { background: #F6DEE1; color: var(--red); }
    .status-completed, .status-delivered { background: #DCEEE3; color: var(--green); }
    .status-processing, .status-shipped { background: #DCE8F6; color: #1E5FA8; }

    .order-items { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 12px 0; margin-bottom: 14px; }
    .order-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
    .order-item img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; background: var(--beige); }
    .oi-details { flex: 1; }
    .oi-title { font-size: .86rem; color: var(--text-dark); font-weight: 600; }
    .oi-meta { font-size: .76rem; color: var(--text-light); }
    .oi-total { font-size: .86rem; font-weight: 700; color: var(--text-dark); }

    .order-card-footer { display: flex; justify-content: space-between; align-items: center; }
    .order-total { display: flex; align-items: baseline; gap: 8px; font-size: .84rem; color: var(--text-mid); }
    .order-total strong { font-size: 1.05rem; color: var(--text-dark); }

    .cancel-btn {
      background: white; border: 1px solid var(--red); color: var(--red);
      border-radius: 8px; padding: 8px 16px; font-size: .82rem; font-weight: 600; cursor: pointer;
    }
    .cancel-btn:hover:not(:disabled) { background: var(--red); color: white; }
    .cancel-btn:disabled { opacity: .6; cursor: not-allowed; }

    @media (max-width: 600px) {
      .orders-nav { padding: 0 16px; }
      .orders-body { padding: 24px 16px 60px; }
    }
  `]
})
export class OrdersComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  orders: Order[] = [];
  isLoading = false;
  loadError = '';
  activeTab: FilterTab = 'all';
  cancellingId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      this.currentUser = u;
      if (u) this.loadOrders();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadOrders(): void {
    if (!this.currentUser) return;
    this.isLoading = true;
    this.loadError = '';
    this.cartService.getOrders(this.currentUser.email).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'Could not load your orders. Please try again.';
        this.isLoading = false;
      }
    });
  }

  get activeOrders(): Order[] {
    return this.orders.filter(o => o.status !== 'cancelled');
  }

  get cancelledOrders(): Order[] {
    return this.orders.filter(o => o.status === 'cancelled');
  }

  get filteredOrders(): Order[] {
    if (this.activeTab === 'active') return this.activeOrders;
    if (this.activeTab === 'cancelled') return this.cancelledOrders;
    return this.orders;
  }

  cancelOrder(order: Order): void {
    if (!this.currentUser || this.cancellingId) return;
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    this.cancellingId = order.id;
    this.cartService.cancelOrder(order.id, this.currentUser.email).subscribe({
      next: () => {
        order.status = 'cancelled';
        this.cancellingId = null;
      },
      error: (err) => {
        alert(err.error?.error || 'Could not cancel this order.');
        this.cancellingId = null;
      }
    });
  }

  formatPrice(p: number): string { return `R${(Number(p) || 0).toFixed(2)}`; }
}