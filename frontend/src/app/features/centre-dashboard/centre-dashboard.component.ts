// ============================================================
// frontend/src/app/features/centre-dashboard/centre-dashboard.component.ts
// ============================================================
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface DashboardStats {
  totalDonations: number;
  thisMonthDonations: number;
  activeVolunteers: number;
  pendingVolunteers: number;
  totalSales: number;
  pendingOrders: number;
  survivorEarnings: number;
  profileViews: number;
}

interface Donation {
  id: string;
  donor: string;
  amount: number;
  type: 'money' | 'goods';
  date: string;
  recurring: boolean;
  s18aIssued: boolean;
  goods?: string[];
}

interface Volunteer {
  id: string;
  name: string;
  skill: string;
  status: 'pending' | 'active' | 'completed';
  hours: number;
  joinDate: string;
  avatar: string;
}

interface Order {
  id: string;
  product: string;
  maker: string;
  buyer_city: string;
  amount: number;
  survivor_share: number;
  centre_share: number;
  status: 'new' | 'packed' | 'shipped' | 'delivered';
  date: string;
}

interface Need {
  id: string;
  title: string;
  category: 'goods' | 'money' | 'volunteer' | 'skill';
  urgency: 'critical' | 'moderate' | 'stable';
  description: string;
  active: boolean;
}

@Component({
  selector: 'app-centre-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="cd-page">

  <!-- SIDEBAR -->
  <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
    <div class="sb-header">
      <div class="sb-logo">A</div>
      <div class="sb-centre-info" *ngIf="!sidebarCollapsed">
        <div class="sb-centre-name">{{ centreName }}</div>
        <div class="sb-centre-type">{{ centreType }}</div>
      </div>
      <button class="sb-toggle" (click)="sidebarCollapsed = !sidebarCollapsed">
        {{ sidebarCollapsed ? '→' : '←' }}
      </button>
    </div>

    <div class="sb-status" *ngIf="!sidebarCollapsed">
      <span class="status-dot" [class.verified]="verificationStatus === 'verified'" [class.pending]="verificationStatus === 'pending'"></span>
      <span class="status-label" [class.pending-label]="verificationStatus === 'pending'">{{ verificationStatus === 'verified' ? 'Verified & Live' : 'Pending Verification' }}</span>
    </div>

    <nav class="sb-nav">
      <button class="sb-link" *ngFor="let item of navItems"
        [class.active]="activeTab === item.key"
        (click)="activeTab = item.key">
        <span class="sb-icon">{{ item.icon }}</span>
        <span class="sb-label" *ngIf="!sidebarCollapsed">{{ item.label }}</span>
        <span class="sb-badge" *ngIf="item.badge && !sidebarCollapsed">{{ item.badge }}</span>
      </button>
    </nav>

    <div class="sb-footer" *ngIf="!sidebarCollapsed">
      <a routerLink="/marketplace" class="sb-footer-link">🛒 View Marketplace</a>
      <a routerLink="/for-centres" class="sb-footer-link">📖 Amani Guide</a>
      <div class="sb-signout" (click)="signOut()">🚪 Sign Out</div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="cd-main">

    <!-- TOP BAR -->
    <div class="cd-topbar">
      <div class="tb-left">
        <h1 class="tb-title">{{ currentTab?.label }}</h1>
        <span class="tb-date">{{ todayDate }}</span>
      </div>
      <div class="tb-right">
        <div class="tb-notification">
          🔔
          <span class="notif-badge" *ngIf="unreadNotifications > 0">{{ unreadNotifications }}</span>
        </div>
        <div class="tb-user">
          <div class="tb-avatar">{{ centreInitials }}</div>
          <span class="tb-username">{{ centreManagerName }}</span>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════
         TAB: OVERVIEW
    ════════════════════════════════════ -->
    <div class="tab-content" *ngIf="activeTab === 'overview'">

      <!-- Pending verification banner -->
      <div class="alert-banner info" *ngIf="verificationStatus === 'pending'">
        🌿 <strong>Welcome, {{ (centreManagerName || '').split(' ')[0] }}!</strong> Your application for <strong>{{ centreName }}</strong> has been received and is under review (1–14 days). We'll email you at the address you registered with once approved.
      </div>

      <!-- Alert banner -->
      <div class="alert-banner warning" *ngIf="hasAlert && verificationStatus === 'verified'">
        ⚠️ 3 new orders require packing confirmation.
        <button class="alert-action" (click)="activeTab = 'orders'">View orders →</button>
      </div>

      <!-- Stats grid -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="sc-icon">💰</div>
          <div class="sc-value">R{{ formatK(stats.totalDonations) }}</div>
          <div class="sc-label">Total donations received</div>
          <div class="sc-delta positive">+R{{ formatK(stats.thisMonthDonations) }} this month</div>
        </div>
        <div class="stat-card">
          <div class="sc-icon">🤝</div>
          <div class="sc-value">{{ stats.activeVolunteers }}</div>
          <div class="sc-label">Active volunteers</div>
          <div class="sc-delta warning" *ngIf="stats.pendingVolunteers > 0">{{ stats.pendingVolunteers }} awaiting review</div>
        </div>
        <div class="stat-card">
          <div class="sc-icon">🛒</div>
          <div class="sc-value">R{{ formatK(stats.totalSales) }}</div>
          <div class="sc-label">Marketplace sales</div>
          <div class="sc-delta">{{ stats.pendingOrders }} orders to pack</div>
        </div>
        <div class="stat-card">
          <div class="sc-icon">💛</div>
          <div class="sc-value">R{{ formatK(stats.survivorEarnings) }}</div>
          <div class="sc-label">Paid to survivors / makers</div>
          <div class="sc-delta positive">70% of all sales</div>
        </div>
      </div>

      <!-- Two-col layout -->
      <div class="overview-grid">

        <!-- Recent donations -->
        <div class="ov-card">
          <div class="ovc-header">
            <h3>Recent donations</h3>
            <button class="ovc-link" (click)="activeTab = 'donations'">See all →</button>
          </div>
          <div class="donation-list">
            <div class="donation-row" *ngFor="let d of recentDonations.slice(0, 5)">
              <div class="dr-left">
                <div class="dr-avatar">{{ d.donor.charAt(0) }}</div>
                <div class="dr-info">
                  <div class="dr-name">{{ d.type === 'goods' ? '📦 ' : '' }}{{ d.donor }}</div>
                  <div class="dr-date">{{ d.date }}</div>
                </div>
              </div>
              <div class="dr-right">
                <div class="dr-amount" *ngIf="d.type === 'money'">R{{ d.amount }}</div>
                <div class="dr-goods-label" *ngIf="d.type === 'goods'">Goods</div>
                <div class="dr-s18a" *ngIf="d.s18aIssued">🧾 Cert sent</div>
                <div class="dr-recurring" *ngIf="d.recurring">🔄 Monthly</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Volunteer pipeline -->
        <div class="ov-card">
          <div class="ovc-header">
            <h3>Volunteer pipeline</h3>
            <button class="ovc-link" (click)="activeTab = 'volunteers'">See all →</button>
          </div>
          <div class="vol-list">
            <div class="vol-row" *ngFor="let v of volunteers.slice(0, 5)">
              <div class="vr-avatar">{{ v.avatar }}</div>
              <div class="vr-info">
                <div class="vr-name">{{ v.name }}</div>
                <div class="vr-skill">{{ v.skill }}</div>
              </div>
              <div class="vr-status" [ngClass]="v.status">{{ v.status }}</div>
            </div>
          </div>
        </div>

        <!-- Impact bar chart (simple) -->
        <div class="ov-card wide">
          <div class="ovc-header">
            <h3>Monthly donations — last 6 months</h3>
          </div>
          <div class="chart-bars">
            <div class="chart-col" *ngFor="let m of monthlyData">
              <div class="chart-bar-wrap">
                <div class="chart-bar" [style.height.%]="(m.amount / maxMonthly) * 100"></div>
                <div class="chart-val">R{{ formatK(m.amount) }}</div>
              </div>
              <div class="chart-label">{{ m.month }}</div>
            </div>
          </div>
        </div>

        <!-- Needs board preview -->
        <div class="ov-card">
          <div class="ovc-header">
            <h3>Active needs</h3>
            <button class="ovc-link" (click)="activeTab = 'needs'">Manage →</button>
          </div>
          <div class="needs-list-small">
            <div class="nls-item" *ngFor="let n of activeNeeds.slice(0, 4)" [ngClass]="n.urgency">
              <span class="nls-badge" [ngClass]="n.category">{{ n.category }}</span>
              <span class="nls-title">{{ n.title }}</span>
              <span class="nls-urgency" [ngClass]="n.urgency">{{ n.urgency }}</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ════════════════════════════════════
         TAB: DONATIONS
    ════════════════════════════════════ -->
    <div class="tab-content" *ngIf="activeTab === 'donations'">
      <div class="donations-summary">
        <div class="ds-card">
          <div class="dsc-val">R{{ formatK(stats.totalDonations) }}</div>
          <div class="dsc-label">Total received</div>
        </div>
        <div class="ds-card">
          <div class="dsc-val">{{ recentDonations.filter(d => d.type === 'money').length }}</div>
          <div class="dsc-label">Cash donors</div>
        </div>
        <div class="ds-card">
          <div class="dsc-val">{{ recentDonations.filter(d => d.recurring).length }}</div>
          <div class="dsc-label">Monthly givers</div>
        </div>
        <div class="ds-card">
          <div class="dsc-val">{{ recentDonations.filter(d => d.s18aIssued).length }}</div>
          <div class="dsc-label">S18A certs issued</div>
        </div>
      </div>
      <div class="table-card">
        <div class="tc-header">
          <h3>All donations</h3>
          <button class="btn-export" (click)="exportDonations()">⬇ Export CSV</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Amount / Type</th>
                <th>Date</th>
                <th>Recurring</th>
                <th>S18A</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of recentDonations">
                <td><strong>{{ d.donor }}</strong></td>
                <td>
                  <span *ngIf="d.type === 'money'" class="td-money">R{{ d.amount }}</span>
                  <span *ngIf="d.type === 'goods'" class="td-goods">📦 {{ d.goods?.join(', ') }}</span>
                </td>
                <td class="td-muted">{{ d.date }}</td>
                <td><span class="pill green" *ngIf="d.recurring">Monthly</span><span class="td-muted" *ngIf="!d.recurring">Once-off</span></td>
                <td><span class="pill blue" *ngIf="d.s18aIssued">Issued</span><span class="pill grey" *ngIf="!d.s18aIssued">N/A</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════
         TAB: VOLUNTEERS
    ════════════════════════════════════ -->
    <div class="tab-content" *ngIf="activeTab === 'volunteers'">
      <div class="section-actions">
        <h3 class="sa-title">{{ volunteers.length }} volunteers</h3>
        <button class="btn-action" (click)="postVolunteerNeed()">+ Post volunteer need</button>
      </div>
      <div class="vol-cards">
        <div class="vol-card" *ngFor="let v of volunteers">
          <div class="vc-top">
            <div class="vc-avatar">{{ v.avatar }}</div>
            <div class="vc-info">
              <div class="vc-name">{{ v.name }}</div>
              <div class="vc-skill">{{ v.skill }}</div>
              <div class="vc-joined">Since {{ v.joinDate }}</div>
            </div>
            <div class="vc-status" [ngClass]="v.status">{{ v.status }}</div>
          </div>
          <div class="vc-hours" *ngIf="v.status === 'active' || v.status === 'completed'">
            <div class="vch-bar">
              <div class="vch-fill" [style.width.%]="Math.min((v.hours / 40) * 100, 100)"></div>
            </div>
            <span class="vch-label">{{ v.hours }} hrs logged</span>
          </div>
          <div class="vc-actions" *ngIf="v.status === 'pending'">
            <button class="btn-approve" (click)="approveVolunteer(v)">✓ Approve</button>
            <button class="btn-decline" (click)="declineVolunteer(v)">✗ Decline</button>
          </div>
          <div class="vc-actions" *ngIf="v.status === 'active'">
            <button class="btn-message">💬 Message</button>
            <button class="btn-log-hours" (click)="logHours(v)">⏱ Log hours</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════
         TAB: ORDERS (Marketplace)
    ════════════════════════════════════ -->
    <div class="tab-content" *ngIf="activeTab === 'orders'">
      <div class="orders-summary">
        <div class="os-stat" *ngFor="let s of orderStats">
          <div class="oss-num">{{ s.num }}</div>
          <div class="oss-label">{{ s.label }}</div>
        </div>
      </div>
      <div class="table-card">
        <div class="tc-header">
          <h3>All marketplace orders</h3>
          <div class="tc-filters">
            <button class="filter-pill" *ngFor="let s of orderStatuses"
              [class.active]="orderFilter === s"
              (click)="orderFilter = orderFilter === s ? '' : s">
              {{ s }}
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>Maker</th>
                <th>Ships to</th>
                <th>Sale</th>
                <th>Your share</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of filteredOrders">
                <td class="td-mono">#{{ o.id }}</td>
                <td><strong>{{ o.product }}</strong></td>
                <td class="td-muted">{{ o.maker }}</td>
                <td class="td-muted">{{ o.buyer_city }}</td>
                <td class="td-money">R{{ o.amount }}</td>
                <td class="td-money">R{{ o.centre_share.toFixed(0) }}</td>
                <td><span class="order-status" [ngClass]="o.status">{{ o.status }}</span></td>
                <td>
                  <button class="btn-sm" *ngIf="o.status === 'new'" (click)="markPacked(o)">Mark packed</button>
                  <button class="btn-sm" *ngIf="o.status === 'packed'" (click)="markShipped(o)">Mark shipped</button>
                  <span class="td-muted" *ngIf="o.status === 'shipped' || o.status === 'delivered'">{{ o.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════
         TAB: NEEDS BOARD
    ════════════════════════════════════ -->
    <div class="tab-content" *ngIf="activeTab === 'needs'">
      <div class="section-actions">
        <h3 class="sa-title">Needs board — visible to donors &amp; volunteers</h3>
        <button class="btn-action" (click)="showAddNeed = true">+ Add new need</button>
      </div>

      <!-- Add need form -->
      <div class="add-need-form" *ngIf="showAddNeed">
        <h4>Post a new need</h4>
        <div class="anf-row">
          <div class="anf-group">
            <label>Title</label>
            <input type="text" [(ngModel)]="newNeed.title" placeholder="e.g. Blankets for winter" />
          </div>
          <div class="anf-group">
            <label>Category</label>
            <select [(ngModel)]="newNeed.category">
              <option value="goods">Goods</option>
              <option value="money">Money</option>
              <option value="volunteer">Volunteer</option>
              <option value="skill">Skill</option>
            </select>
          </div>
          <div class="anf-group">
            <label>Urgency</label>
            <select [(ngModel)]="newNeed.urgency">
              <option value="critical">Critical</option>
              <option value="moderate">Moderate</option>
              <option value="stable">Stable</option>
            </select>
          </div>
        </div>
        <div class="anf-group full">
          <label>Description</label>
          <textarea rows="2" [(ngModel)]="newNeed.description" placeholder="Describe what you need and why…"></textarea>
        </div>
        <div class="anf-actions">
          <button class="btn-action" (click)="addNeed()">Post need</button>
          <button class="btn-cancel" (click)="showAddNeed = false">Cancel</button>
        </div>
      </div>

      <div class="needs-grid">
        <div class="need-card" *ngFor="let n of needs" [ngClass]="n.urgency">
          <div class="nc-top">
            <span class="nc-category" [ngClass]="n.category">{{ n.category }}</span>
            <span class="nc-urgency" [ngClass]="n.urgency">{{ n.urgency }}</span>
            <div class="nc-active-toggle">
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="n.active" />
                <span class="toggle-track"></span>
              </label>
              <span class="nc-active-label">{{ n.active ? 'Live' : 'Hidden' }}</span>
            </div>
          </div>
          <h3>{{ n.title }}</h3>
          <p>{{ n.description }}</p>
          <button class="btn-delete-need" (click)="deleteNeed(n)">Remove</button>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════
         TAB: PROFILE
    ════════════════════════════════════ -->
    <div class="tab-content" *ngIf="activeTab === 'profile'">
      <div class="profile-form-card">
        <h3>Centre profile — public listing</h3>
        <p class="pfc-sub">This information appears on your Amani profile page, visible to donors and volunteers.</p>

        <div class="pf-group">
          <label>Centre name</label>
          <input type="text" [(ngModel)]="profileForm.name" />
        </div>
        <div class="pf-row">
          <div class="pf-group">
            <label>City</label>
            <input type="text" [(ngModel)]="profileForm.city" />
          </div>
          <div class="pf-group">
            <label>Province</label>
            <select [(ngModel)]="profileForm.province">
              <option *ngFor="let p of provinces" [value]="p">{{ p }}</option>
            </select>
          </div>
        </div>
        <div class="pf-group">
          <label>One-line tagline</label>
          <input type="text" [(ngModel)]="profileForm.tagline" placeholder="e.g. Emergency shelter for GBV survivors in Cape Town" />
        </div>
        <div class="pf-group">
          <label>Full description</label>
          <textarea rows="4" [(ngModel)]="profileForm.description"></textarea>
        </div>
        <div class="pf-row">
          <div class="pf-group">
            <label>NPO number</label>
            <input type="text" [(ngModel)]="profileForm.npo_number" />
          </div>
          <div class="pf-group">
            <label>Phone</label>
            <input type="tel" [(ngModel)]="profileForm.phone" />
          </div>
        </div>
        <div class="pf-group">
          <label>Website (optional)</label>
          <input type="url" [(ngModel)]="profileForm.website" placeholder="https://yourcentre.co.za" />
        </div>
        <div class="pf-toggles">
          <label class="pf-toggle-row">
            <input type="checkbox" [(ngModel)]="profileForm.accepts_goods" />
            Accept goods donations
          </label>
          <label class="pf-toggle-row">
            <input type="checkbox" [(ngModel)]="profileForm.section18a" />
            Issue Section 18A certificates
          </label>
          <label class="pf-toggle-row">
            <input type="checkbox" [(ngModel)]="profileForm.marketplace_active" />
            List products on marketplace
          </label>
        </div>
        <button class="btn-save" (click)="saveProfile()">Save profile</button>
        <div class="save-success" *ngIf="profileSaved">✓ Profile saved successfully!</div>
      </div>
    </div>

    <!-- ════════════════════════════════════
         TAB: IMPACT REPORT
    ════════════════════════════════════ -->
    <div class="tab-content" *ngIf="activeTab === 'impact'">
      <div class="impact-report-intro">
        <h3>Your impact report</h3>
        <p>Quarterly reports are required to maintain Amani verification. Next report due: <strong>30 June 2026</strong>.</p>
      </div>
      <div class="impact-metrics-grid">
        <div class="im-card" *ngFor="let m of impactMetrics">
          <div class="imc-icon">{{ m.icon }}</div>
          <div class="imc-val">{{ m.value }}</div>
          <div class="imc-label">{{ m.label }}</div>
        </div>
      </div>
      <div class="impact-story-form">
        <h4>Add quarterly story</h4>
        <p class="isf-sub">Share what your funding achieved. This appears on your public profile.</p>
        <div class="pf-group">
          <label>Quarter</label>
          <select [(ngModel)]="storyQuarter">
            <option>Q1 2026 (Jan–Mar)</option>
            <option>Q2 2026 (Apr–Jun)</option>
          </select>
        </div>
        <div class="pf-group">
          <label>Your impact story</label>
          <textarea rows="5" [(ngModel)]="impactStory" placeholder="Describe what your centre achieved this quarter, who was helped, and how donations were spent…"></textarea>
        </div>
        <button class="btn-save" (click)="submitImpactReport()">Submit report</button>
        <div class="save-success" *ngIf="reportSubmitted">✓ Impact report submitted. Visible on your profile within 24 hours.</div>
      </div>
    </div>

  </main>
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
      --gold-dark:   #B8860B;
      --forest:      #3D2B1F;
      --forest-deep: #1A1210;
      --forest-mid:  #6B4C3B;
      --sage:        #5A7A3A;
      --sage-light:  #F0EAE0;
      --sage-mid:    #DDD3C4;
      --teal:        #2D6A4F;
      --amber:       #B8860B;
      --bg:          #FAF7F2;
      --sidebar-w: 240px;
      font-family: 'DM Sans', sans-serif; display: block; min-height: 100vh;
    }

    /* ── LAYOUT ── */
    .cd-page { display: flex; min-height: 100vh; background: var(--bg); }

    /* ── SIDEBAR ── */
    .sidebar {
      width: var(--sidebar-w); min-height: 100vh; background: var(--forest-deep);
      display: flex; flex-direction: column; flex-shrink: 0; transition: width .25s;
      position: sticky; top: 0; height: 100vh; overflow-y: auto;
      &.collapsed { width: 64px; }
    }
    .sb-header {
      display: flex; align-items: center; gap: 10px; padding: 18px 16px 12px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .sb-logo {
      width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--gold-light), var(--gold));
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: var(--forest-deep);
    }
    .sb-centre-info { flex: 1; min-width: 0; }
    .sb-centre-name { font-size: .82rem; font-weight: 700; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sb-centre-type { font-size: .66rem; color: rgba(255,255,255,.38); text-transform: uppercase; letter-spacing: .8px; }
    .sb-toggle { background: none; border: none; color: rgba(255,255,255,.4); cursor: pointer; font-size: .8rem; flex-shrink: 0; padding: 0; transition: color .2s; &:hover { color: white; } }
    .sb-status { display: flex; align-items: center; gap: 8px; padding: 10px 16px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; &.verified { background: var(--green); box-shadow: 0 0 6px rgba(22,163,74,.5); } &.pending { background: var(--amber); box-shadow: 0 0 6px rgba(184,134,11,.5); } }
    .status-label { font-size: .74rem; color: var(--green); font-weight: 600; &.pending-label { color: var(--amber); } }

    .sb-nav { display: flex; flex-direction: column; gap: 2px; padding: 8px 8px; flex: 1; }
    .sb-link {
      display: flex; align-items: center; gap: 10px; padding: 10px 10px;
      border-radius: 9px; border: none; background: none;
      color: rgba(255,255,255,.58); font-family: 'DM Sans', sans-serif;
      font-size: .82rem; font-weight: 500; cursor: pointer; text-align: left; transition: all .18s;
      &:hover { background: rgba(255,255,255,.08); color: white; }
      &.active { background: rgba(255,255,255,.12); color: white; font-weight: 700; }
    }
    .sb-icon { font-size: 1rem; flex-shrink: 0; width: 20px; text-align: center; }
    .sb-label { flex: 1; white-space: nowrap; }
    .sb-badge { background: var(--red); color: white; font-size: .62rem; font-weight: 700; padding: 1px 6px; border-radius: 99px; }
    .sb-footer { padding: 12px 8px; border-top: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 4px; }
    .sb-footer-link { font-size: .76rem; color: rgba(255,255,255,.45); text-decoration: none; padding: 6px 10px; border-radius: 7px; transition: all .2s; &:hover { color: white; background: rgba(255,255,255,.06); } }
    .sb-signout { font-size: .76rem; color: rgba(255,255,255,.35); padding: 6px 10px; cursor: pointer; border-radius: 7px; transition: all .2s; &:hover { color: var(--red); background: rgba(239,68,68,.08); } }

    /* ── MAIN ── */
    .cd-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

    .cd-topbar {
      background: var(--white); border-bottom: 1px solid var(--border);
      padding: 0 28px; height: 60px; display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: 0; z-index: 100;
    }
    .tb-left { display: flex; align-items: baseline; gap: 14px; }
    .tb-title { font-family: 'Playfair Display', serif; font-size: 1.15rem; color: var(--text-dark); margin: 0; font-weight: 600; }
    .tb-date  { font-size: .76rem; color: var(--text-muted); }
    .tb-right { display: flex; align-items: center; gap: 16px; }
    .tb-notification { position: relative; font-size: 1.1rem; cursor: pointer; }
    .notif-badge { position: absolute; top: -4px; right: -4px; background: var(--red); color: white; border-radius: 50%; width: 14px; height: 14px; font-size: .58rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .tb-user { display: flex; align-items: center; gap: 8px; }
    .tb-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, var(--gold-light), var(--gold)); display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 700; color: var(--forest-deep); }
    .tb-username { font-size: .82rem; font-weight: 600; color: var(--text-dark); }

    /* ── TAB CONTENT ── */
    .tab-content { padding: 24px 28px 48px; }

    /* Alert banner */
    .alert-banner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 18px; border-radius: 10px; margin-bottom: 20px; font-size: .86rem; font-weight: 500;
      &.warning { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
      &.info    { background: #F0FDF4; color: #14532D; border: 1px solid #BBF7D0; }
    }
    .alert-action { background: #92400E; color: white; border: none; padding: 6px 14px; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .78rem; font-weight: 700; cursor: pointer; }

    /* Stats grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 22px; }
    .stat-card {
      background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px;
      &.primary { background: var(--forest-deep); border-color: transparent; .sc-value { color: white; } .sc-label { color: rgba(255,255,255,.55); } }
    }
    .sc-icon  { font-size: 1.3rem; margin-bottom: 10px; }
    .sc-value { font-family: 'DM Mono', monospace; font-size: 1.5rem; font-weight: 600; color: var(--forest); margin-bottom: 4px; }
    .sc-label { font-size: .76rem; color: var(--text-muted); margin-bottom: 6px; }
    .sc-delta { font-size: .72rem; font-weight: 600; &.positive { color: var(--green); } &.warning { color: var(--amber); } color: var(--text-muted); }

    /* Overview grid */
    .overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .ov-card { background: var(--white); border: 1px solid var(--border); border-radius: 13px; padding: 18px; &.wide { grid-column: span 2; } }
    .ovc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; h3 { font-size: .9rem; font-weight: 700; color: var(--text-dark); margin: 0; } }
    .ovc-link { background: none; border: none; color: var(--forest); font-size: .76rem; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0; }

    /* Donation list */
    .donation-list { display: flex; flex-direction: column; gap: 8px; }
    .donation-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); &:last-child { border: none; } }
    .dr-left { display: flex; align-items: center; gap: 10px; }
    .dr-avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--sage-light); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .82rem; color: var(--forest); }
    .dr-name { font-size: .82rem; font-weight: 600; color: var(--text-dark); }
    .dr-date { font-size: .7rem; color: var(--text-muted); }
    .dr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
    .dr-amount { font-family: 'DM Mono', monospace; font-size: .9rem; font-weight: 600; color: var(--forest); }
    .dr-goods-label { font-size: .76rem; font-weight: 600; color: var(--teal); }
    .dr-s18a { font-size: .66rem; color: var(--amber); font-weight: 600; }
    .dr-recurring { font-size: .66rem; color: var(--green); font-weight: 600; }

    /* Volunteer list */
    .vol-list { display: flex; flex-direction: column; gap: 8px; }
    .vol-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); &:last-child { border: none; } }
    .vr-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--sage-light); display: flex; align-items: center; justify-content: center; font-size: .82rem; }
    .vr-info { flex: 1; }
    .vr-name  { font-size: .82rem; font-weight: 600; color: var(--text-dark); }
    .vr-skill { font-size: .7rem; color: var(--text-muted); }
    .vr-status {
      font-size: .68rem; font-weight: 700; padding: 3px 9px; border-radius: 99px; text-transform: capitalize;
      &.pending   { background: #FEF3C7; color: #92400E; }
      &.active    { background: var(--sage-light); color: var(--forest); }
      &.completed { background: #F3F4F6; color: var(--text-muted); }
    }

    /* Bar chart */
    .chart-bars { display: flex; gap: 12px; align-items: flex-end; height: 140px; padding-bottom: 24px; position: relative; }
    .chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .chart-bar-wrap { flex: 1; width: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
    .chart-bar { width: 100%; background: linear-gradient(180deg, var(--forest-mid), var(--forest)); border-radius: 4px 4px 0 0; min-height: 4px; transition: height .4s; }
    .chart-val { font-size: .64rem; font-family: 'DM Mono', monospace; color: var(--text-muted); margin-top: 4px; }
    .chart-label { font-size: .68rem; color: var(--text-muted); margin-top: 4px; font-weight: 600; }

    /* Needs small list */
    .needs-list-small { display: flex; flex-direction: column; gap: 8px; }
    .nls-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; font-size: .8rem;
      &.critical { background: #FEE2E2; }
      &.moderate { background: #FEF3C7; }
      &.stable   { background: var(--sage-light); }
    }
    .nls-badge { font-size: .64rem; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 99px;
      &.goods     { background: #E0F2FE; color: #075985; }
      &.money     { background: var(--gold-light); color: var(--gold-dark); }
      &.volunteer { background: var(--sage-light); color: var(--forest); }
      &.skill     { background: #EDE9FE; color: #6D28D9; }
    }
    .nls-title { flex: 1; color: var(--text-dark); font-weight: 600; }
    .nls-urgency { font-size: .64rem; font-weight: 700; text-transform: uppercase;
      &.critical { color: var(--red); }
      &.moderate { color: var(--amber); }
      &.stable   { color: var(--sage); }
    }

    /* Donations tab */
    .donations-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .ds-card { background: var(--white); border: 1px solid var(--border); border-radius: 11px; padding: 16px; text-align: center; }
    .dsc-val   { font-family: 'DM Mono', monospace; font-size: 1.4rem; font-weight: 600; color: var(--forest); }
    .dsc-label { font-size: .72rem; color: var(--text-muted); margin-top: 4px; }

    /* Table card */
    .table-card { background: var(--white); border: 1px solid var(--border); border-radius: 13px; overflow: hidden; }
    .tc-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 10px; h3 { font-size: .9rem; font-weight: 700; color: var(--text-dark); margin: 0; } }
    .btn-export { background: none; border: 1.5px solid var(--border); color: var(--text-mid); padding: 7px 14px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .78rem; font-weight: 600; cursor: pointer; transition: all .2s; &:hover { border-color: var(--forest); color: var(--forest); } }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse;
      th, td { padding: 10px 14px; text-align: left; font-size: .82rem; border-bottom: 1px solid var(--border); }
      th { font-size: .7rem; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); font-weight: 600; background: #FAFAFA; }
      tr:last-child td { border: none; }
      tr:hover td { background: #FAFAF8; }
    }
    .td-money { font-family: 'DM Mono', monospace; font-weight: 700; color: var(--forest); }
    .td-goods { color: var(--teal); font-weight: 600; }
    .td-muted { color: var(--text-muted); }
    .td-mono  { font-family: 'DM Mono', monospace; color: var(--text-muted); }
    .pill { font-size: .66rem; font-weight: 700; padding: 2px 8px; border-radius: 99px; &.green { background: var(--sage-light); color: var(--forest); } &.blue { background: #E0F2FE; color: #075985; } &.grey { background: #F3F4F6; color: var(--text-muted); } }

    /* Volunteers tab */
    .section-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .sa-title { font-size: .9rem; font-weight: 700; color: var(--text-dark); margin: 0; }
    .btn-action { background: var(--forest); color: white; border: none; padding: 9px 18px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 700; cursor: pointer; transition: all .2s; &:hover { background: var(--forest-mid); } }
    .vol-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .vol-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .vc-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .vc-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--sage-light); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
    .vc-info { flex: 1; }
    .vc-name    { font-size: .88rem; font-weight: 700; color: var(--text-dark); }
    .vc-skill   { font-size: .76rem; color: var(--text-mid); }
    .vc-joined  { font-size: .7rem; color: var(--text-muted); }
    .vc-status { font-size: .68rem; font-weight: 700; padding: 3px 9px; border-radius: 99px; text-transform: capitalize; flex-shrink: 0;
      &.pending   { background: #FEF3C7; color: #92400E; }
      &.active    { background: var(--sage-light); color: var(--forest); }
      &.completed { background: #F3F4F6; color: var(--text-muted); }
    }
    .vc-hours { margin-bottom: 12px; }
    .vch-bar { height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
    .vch-fill { height: 100%; background: var(--forest); border-radius: 3px; }
    .vch-label { font-size: .7rem; color: var(--text-muted); }
    .vc-actions { display: flex; gap: 7px; }
    .btn-approve { flex: 1; padding: 7px; background: var(--forest); color: white; border: none; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .76rem; font-weight: 700; cursor: pointer; }
    .btn-decline { flex: 1; padding: 7px; background: white; color: var(--red); border: 1.5px solid var(--border); border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .76rem; font-weight: 700; cursor: pointer; &:hover { border-color: var(--red); } }
    .btn-message { flex: 1; padding: 7px; background: white; color: var(--text-mid); border: 1.5px solid var(--border); border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .76rem; font-weight: 600; cursor: pointer; }
    .btn-log-hours { flex: 1; padding: 7px; background: var(--sage-light); color: var(--forest); border: none; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .76rem; font-weight: 700; cursor: pointer; }

    /* Orders tab */
    .orders-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    .os-stat { background: var(--white); border: 1px solid var(--border); border-radius: 11px; padding: 16px; text-align: center; }
    .oss-num { font-family: 'DM Mono', monospace; font-size: 1.4rem; font-weight: 600; color: var(--forest); }
    .oss-label { font-size: .72rem; color: var(--text-muted); margin-top: 4px; }
    .tc-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .filter-pill { padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 99px; background: white; font-size: .74rem; font-weight: 600; color: var(--text-muted); cursor: pointer; text-transform: capitalize; &.active { background: var(--forest); color: white; border-color: var(--forest); } }
    .order-status { font-size: .68rem; font-weight: 700; padding: 3px 9px; border-radius: 99px; text-transform: capitalize;
      &.new      { background: #DBEAFE; color: #1E40AF; }
      &.packed   { background: #FEF3C7; color: #92400E; }
      &.shipped  { background: var(--sage-light); color: var(--forest); }
      &.delivered { background: #F3F4F6; color: var(--text-muted); }
    }
    .btn-sm { background: var(--forest); color: white; border: none; padding: 5px 11px; border-radius: 6px; font-family: 'DM Sans', sans-serif; font-size: .72rem; font-weight: 700; cursor: pointer; &:hover { background: var(--forest-mid); } }

    /* Needs tab */
    .add-need-form { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; h4 { font-size: .88rem; font-weight: 700; color: var(--text-dark); margin: 0 0 16px; } }
    .anf-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
    .anf-group { display: flex; flex-direction: column; gap: 4px; label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-dark); } input, select { padding: 8px 11px; border: 1.5px solid var(--border); border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .84rem; outline: none; &:focus { border-color: var(--forest); } } &.full { grid-column: span 3; textarea { padding: 8px 11px; border: 1.5px solid var(--border); border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .84rem; width: 100%; box-sizing: border-box; outline: none; resize: vertical; &:focus { border-color: var(--forest); } } } }
    .anf-actions { display: flex; gap: 8px; }
    .btn-cancel { background: white; color: var(--text-mid); border: 1.5px solid var(--border); padding: 9px 16px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 600; cursor: pointer; }

    .needs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .need-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px;
      &.critical { border-left: 4px solid var(--red); }
      &.moderate { border-left: 4px solid var(--amber); }
      &.stable   { border-left: 4px solid var(--sage); }
      h3 { font-size: .9rem; font-weight: 700; color: var(--text-dark); margin: 0 0 6px; }
      p  { font-size: .8rem; color: var(--text-light); line-height: 1.55; margin: 0 0 12px; }
    }
    .nc-top { display: flex; align-items: center; gap: 7px; margin-bottom: 12px; flex-wrap: wrap; }
    .nc-category { font-size: .64rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 99px;
      &.goods     { background: #E0F2FE; color: #075985; }
      &.money     { background: var(--gold-light); color: var(--gold-dark); }
      &.volunteer { background: var(--sage-light); color: var(--forest); }
      &.skill     { background: #EDE9FE; color: #6D28D9; }
    }
    .nc-urgency { font-size: .64rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 99px;
      &.critical { background: #FEE2E2; color: #991B1B; }
      &.moderate { background: #FEF3C7; color: #92400E; }
      &.stable   { background: var(--sage-light); color: var(--forest); }
    }
    .nc-active-toggle { display: flex; align-items: center; gap: 5px; margin-left: auto; }
    .nc-active-label { font-size: .68rem; color: var(--text-muted); }
    .toggle { position: relative; display: inline-block; width: 32px; height: 18px; input { opacity: 0; width: 0; height: 0; } }
    .toggle-track { position: absolute; cursor: pointer; inset: 0; background: var(--border); border-radius: 99px; transition: background .2s; &::before { content: ''; position: absolute; height: 12px; width: 12px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: transform .2s; } }
    input:checked + .toggle-track { background: var(--green); }
    input:checked + .toggle-track::before { transform: translateX(14px); }
    .btn-delete-need { background: none; border: 1.5px solid var(--border); color: var(--text-muted); padding: 6px 12px; border-radius: 7px; font-family: 'DM Sans', sans-serif; font-size: .74rem; font-weight: 600; cursor: pointer; transition: all .2s; &:hover { border-color: var(--red); color: var(--red); } }

    /* Profile tab */
    .profile-form-card { background: var(--white); border: 1px solid var(--border); border-radius: 13px; padding: 28px; max-width: 680px; h3 { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--text-dark); margin: 0 0 6px; } }
    .pfc-sub { font-size: .82rem; color: var(--text-muted); margin-bottom: 22px; }
    .pf-group { margin-bottom: 14px; label { display: block; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-dark); margin-bottom: 5px; } input, select, textarea { width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: .86rem; outline: none; box-sizing: border-box; &:focus { border-color: var(--forest); } } textarea { resize: vertical; } }
    .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pf-toggles { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .pf-toggle-row { display: flex; align-items: center; gap: 9px; font-size: .86rem; color: var(--text-mid); cursor: pointer; input { accent-color: var(--forest); width: 16px; height: 16px; } }
    .btn-save { background: var(--forest); color: white; border: none; padding: 11px 26px; border-radius: 9px; font-family: 'DM Sans', sans-serif; font-size: .9rem; font-weight: 700; cursor: pointer; transition: all .2s; &:hover { background: var(--forest-mid); } }
    .save-success { margin-top: 12px; font-size: .82rem; color: var(--green); font-weight: 700; }

    /* Impact tab */
    .impact-report-intro { margin-bottom: 22px; h3 { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--text-dark); margin: 0 0 6px; } p { font-size: .86rem; color: var(--text-mid); } }
    .impact-metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 28px; }
    .im-card { background: var(--white); border: 1px solid var(--border); border-radius: 11px; padding: 16px; text-align: center; }
    .imc-icon  { font-size: 1.4rem; margin-bottom: 8px; }
    .imc-val   { font-family: 'DM Mono', monospace; font-size: 1.2rem; font-weight: 600; color: var(--forest); margin-bottom: 4px; }
    .imc-label { font-size: .72rem; color: var(--text-muted); }
    .impact-story-form { background: var(--white); border: 1px solid var(--border); border-radius: 13px; padding: 24px; max-width: 620px; h4 { font-size: .96rem; font-weight: 700; color: var(--text-dark); margin: 0 0 6px; } }
    .isf-sub { font-size: .82rem; color: var(--text-muted); margin-bottom: 18px; }

    /* Math shortcut */
    @media (max-width: 900px) {
      .sidebar { display: none; }
      .overview-grid { grid-template-columns: 1fr; }
      .ov-card.wide { grid-column: span 1; }
      .donations-summary, .orders-summary { grid-template-columns: repeat(2, 1fr); }
      .anf-row { grid-template-columns: 1fr; }
      .anf-group.full { grid-column: span 1; }
    }
  `]
})
export class CentreDashboardComponent implements OnInit {
  sidebarCollapsed = false;
  activeTab = 'overview';
  hasAlert = true;
  unreadNotifications = 3;
  orderFilter = '';
  showAddNeed = false;
  profileSaved = false;
  reportSubmitted = false;
  impactStory = '';
  storyQuarter = 'Q2 2026 (Apr–Jun)';
  Math = Math;
  verificationStatus: 'verified' | 'pending' = 'verified';

  centreName = 'Thistle House';
  centreType = 'GBV Centre · Cape Town';
  centreManagerName = 'Nomsa Khumalo';
  centreInitials = 'NK';
  todayDate = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  readonly provinces = ['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'];
  readonly orderStatuses = ['new', 'packed', 'shipped', 'delivered'];

  profileForm = {
    name: 'Thistle House', city: 'Cape Town', province: 'Western Cape',
    tagline: 'Emergency shelter and counselling for GBV survivors.',
    description: 'Thistle House provides 24/7 emergency shelter, trauma counselling, legal advocacy, and economic empowerment for GBV survivors in Cape Town.',
    npo_number: 'NPO-045678', phone: '021 555 0123', website: 'https://thistlehouse.co.za',
    accepts_goods: true, section18a: true, marketplace_active: true,
  };

  newNeed: any = { title: '', category: 'goods', urgency: 'moderate', description: '' };

  readonly navItems = [
    { key: 'overview',   icon: '🏠', label: 'Overview',        badge: null },
    { key: 'donations',  icon: '💰', label: 'Donations',       badge: null },
    { key: 'volunteers', icon: '🤝', label: 'Volunteers',      badge: 3 },
    { key: 'orders',     icon: '🛒', label: 'Marketplace',     badge: null },
    { key: 'needs',      icon: '📋', label: 'Needs Board',     badge: null },
    { key: 'profile',    icon: '🏥', label: 'Centre Profile',  badge: null },
    { key: 'impact',     icon: '📊', label: 'Impact Report',   badge: null },
  ];

  get currentTab() { return this.navItems.find(n => n.key === this.activeTab); }

  stats: DashboardStats = {
    totalDonations: 142000, thisMonthDonations: 18400, activeVolunteers: 12,
    pendingVolunteers: 3, totalSales: 28600, pendingOrders: 3,
    survivorEarnings: 20020, profileViews: 1840,
  };

  readonly monthlyData = [
    { month: 'Jan', amount: 18000 }, { month: 'Feb', amount: 22000 },
    { month: 'Mar', amount: 15000 }, { month: 'Apr', amount: 28000 },
    { month: 'May', amount: 18400 }, { month: 'Jun', amount: 0 },
  ];
  get maxMonthly() { return Math.max(...this.monthlyData.map(m => m.amount)); }

  recentDonations: Donation[] = [
    { id: 'd1', donor: 'Anonymous',      amount: 500,  type: 'money', date: '21 May 2026', recurring: true,  s18aIssued: true },
    { id: 'd2', donor: 'Priya Naidoo',   amount: 1000, type: 'money', date: '20 May 2026', recurring: false, s18aIssued: true },
    { id: 'd3', donor: 'MTN Foundation', amount: 5000, type: 'money', date: '18 May 2026', recurring: true,  s18aIssued: true },
    { id: 'd4', donor: 'James van Wyk',  amount: 0,    type: 'goods', date: '17 May 2026', recurring: false, s18aIssued: false, goods: ['Blankets', 'Clothing'] },
    { id: 'd5', donor: 'Leila Adams',    amount: 250,  type: 'money', date: '15 May 2026', recurring: true,  s18aIssued: true },
    { id: 'd6', donor: 'Sipho Dlamini',  amount: 100,  type: 'money', date: '12 May 2026', recurring: false, s18aIssued: false },
  ];

  volunteers: Volunteer[] = [
    { id: 'v1', name: 'Dr. Fatima Essop',   skill: 'Trauma counsellor', status: 'active',    hours: 28, joinDate: 'Mar 2026', avatar: '👩‍⚕️' },
    { id: 'v2', name: 'Adv. James Mogale',  skill: 'Legal advocacy',    status: 'active',    hours: 16, joinDate: 'Feb 2026', avatar: '⚖️' },
    { id: 'v3', name: 'Zanele Sithole',     skill: 'Social work',       status: 'pending',   hours: 0,  joinDate: 'May 2026', avatar: '🤝' },
    { id: 'v4', name: 'David Kim',          skill: 'IT support',        status: 'pending',   hours: 0,  joinDate: 'May 2026', avatar: '💻' },
    { id: 'v5', name: 'Greta Fourie',       skill: 'Admin',             status: 'pending',   hours: 0,  joinDate: 'May 2026', avatar: '📋' },
    { id: 'v6', name: 'Thabo Nkosi',        skill: 'Transport',         status: 'completed', hours: 40, joinDate: 'Jan 2026', avatar: '🚗' },
  ];

  orders: Order[] = [
    { id: '4821', product: 'Beaded Sunrise Necklace', maker: 'Nomsa B.',  buyer_city: 'Johannesburg', amount: 180, survivor_share: 126, centre_share: 54,  status: 'new',       date: '21 May' },
    { id: '4820', product: 'Shweshwe Print Tote Bag', maker: 'Zanele P.', buyer_city: 'Durban',       amount: 220, survivor_share: 154, centre_share: 66,  status: 'new',       date: '21 May' },
    { id: '4819', product: 'Woven Sisal Basket',      maker: 'Nomvula Z.',buyer_city: 'Pretoria',     amount: 295, survivor_share: 206, centre_share: 88,  status: 'new',       date: '20 May' },
    { id: '4817', product: 'Wire-Wrapped Earrings',   maker: 'Thandi M.', buyer_city: 'Cape Town',    amount: 95,  survivor_share: 66,  centre_share: 28,  status: 'packed',    date: '19 May' },
    { id: '4815', product: 'Beaded Bracelet',          maker: 'Lindiwe K.',buyer_city: 'Stellenbosch', amount: 65,  survivor_share: 45,  centre_share: 19,  status: 'shipped',   date: '17 May' },
    { id: '4810', product: 'Rooibos Body Scrub',       maker: 'Amahle N.', buyer_city: 'Bloemfontein', amount: 89,  survivor_share: 62,  centre_share: 26,  status: 'delivered', date: '14 May' },
  ];

  needs: Need[] = [
    { id: 'n1', title: 'Winter blankets for 20 residents', category: 'goods', urgency: 'critical', description: 'We need warm blankets before June. Currently 20 residents share 12 blankets.', active: true },
    { id: 'n2', title: 'Emergency transport fund', category: 'money', urgency: 'critical', description: 'We need R8,000 to transport survivors to court hearings and police stations.', active: true },
    { id: 'n3', title: 'Trauma counsellor (part-time)', category: 'volunteer', urgency: 'moderate', description: 'Looking for a qualified counsellor available 2 days per week.', active: true },
    { id: 'n4', title: 'Beading skills trainer', category: 'skill', urgency: 'stable', description: 'We are expanding our marketplace programme. Need a skilled beader to train 8 survivors.', active: true },
  ];

  get activeNeeds() { return this.needs.filter(n => n.active); }

  readonly orderStats = [
    { num: 3, label: 'New — needs packing' },
    { num: 1, label: 'Packed — awaiting courier' },
    { num: 1, label: 'In transit' },
    { num: 1, label: 'Delivered this month' },
  ];

  get filteredOrders(): Order[] {
    if (!this.orderFilter) return this.orders;
    return this.orders.filter(o => o.status === this.orderFilter);
  }

  readonly impactMetrics = [
    { icon: '🏠', value: '84', label: 'Residents sheltered' },
    { icon: '⚖️', value: '23', label: 'Court cases supported' },
    { icon: '💛', value: '18', label: 'Survivors earning income' },
    { icon: '🤝', value: '340', label: 'Volunteer hours' },
    { icon: '💰', value: 'R142K', label: 'Donations received' },
    { icon: '📦', value: '61', label: 'Products sold' },
  ];

  ngOnInit(): void {
    // ── Pull data saved by the registration form ─────────────
    const stored = {
      name:        localStorage.getItem('centreName'),
      type:        localStorage.getItem('centreType'),
      city:        localStorage.getItem('centreCity'),
      province:    localStorage.getItem('centreProvince'),
      email:       localStorage.getItem('centreEmail'),
      manager:     localStorage.getItem('centreManagerName'),
      phone:       localStorage.getItem('centrePhone'),
      npo:         localStorage.getItem('centreNpoNumber'),
    };

    if (stored.name) {
      this.centreName = stored.name;

      // Pretty-print centre type
      const typeMap: Record<string, string> = {
        gbv_centre:   'GBV Centre',
        orphanage:    'Orphanage / Child Care',
        old_age_home: 'Old Age Home',
      };
      const typeLabel = stored.type ? (typeMap[stored.type] || stored.type) : 'Care Centre';
      this.centreType = typeLabel + (stored.city ? ` · ${stored.city}` : '');

      if (stored.manager) {
        this.centreManagerName = stored.manager;
        this.centreInitials    = stored.manager.split(' ')
          .map((w: string) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
      }

      // Pre-fill the editable profile form
      if (stored.name)     this.profileForm.name      = stored.name;
      if (stored.city)     this.profileForm.city      = stored.city;
      if (stored.province) this.profileForm.province  = stored.province;
      if (stored.phone)    this.profileForm.phone     = stored.phone;
      if (stored.npo)      this.profileForm.npo_number = stored.npo;
      const desc    = localStorage.getItem('centreDescription');
      const mission = localStorage.getItem('centreMission');
      const website = localStorage.getItem('centreWebsite');
      if (desc)    this.profileForm.description = desc;
      if (mission) this.profileForm.tagline     = mission.slice(0, 100);
      if (website) this.profileForm.website     = website;

      // Newly registered centres are pending verification
      this.verificationStatus = 'pending';
    }
  }

  formatK(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
  }

  approveVolunteer(v: Volunteer): void { v.status = 'active'; this.stats.activeVolunteers++; this.stats.pendingVolunteers--; }
  declineVolunteer(v: Volunteer): void { this.volunteers = this.volunteers.filter(x => x.id !== v.id); this.stats.pendingVolunteers--; }
  logHours(v: Volunteer): void { v.hours = Math.min(v.hours + 4, 40); }
  markPacked(o: Order): void { o.status = 'packed'; this.updateOrderStats(); }
  markShipped(o: Order): void { o.status = 'shipped'; this.updateOrderStats(); }
  updateOrderStats(): void { this.stats.pendingOrders = this.orders.filter(o => o.status === 'new').length; if (this.stats.pendingOrders === 0) this.hasAlert = false; }
  postVolunteerNeed(): void { this.activeTab = 'needs'; this.showAddNeed = true; }
  addNeed(): void {
    if (!this.newNeed.title) return;
    this.needs.unshift({ ...this.newNeed, id: `n${Date.now()}`, active: true });
    this.newNeed = { title: '', category: 'goods', urgency: 'moderate', description: '' };
    this.showAddNeed = false;
  }
  deleteNeed(n: Need): void { this.needs = this.needs.filter(x => x.id !== n.id); }
  saveProfile(): void { this.profileSaved = true; setTimeout(() => this.profileSaved = false, 3000); }
  submitImpactReport(): void { this.reportSubmitted = true; setTimeout(() => this.reportSubmitted = false, 4000); }
  exportDonations(): void { alert('CSV export would download here.'); }
  signOut(): void { alert('Signed out.'); }
}