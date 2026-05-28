import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CartService } from '../../services/cart.service';
import { AuthService, User } from '../../services/auth.service';
import { SellerAuthService, SellerUser } from '../../services/seller-auth.service';

interface Product {
  id: string;
  title: string;
  seller_alias: string;
  centre_name: string;
  category: string;
  price: number;
  survivor_income: number;
  centre_funding: number;
  platform_fee: number;
  stock: number;
  rating: number;
  reviews: number;
  sold: number;
  img: string;
  description: string;
  story: string;
  badge?: 'bestseller' | 'low-stock' | 'out-of-stock';
  seller_type: 'survivor' | 'youth' | 'elderly';
}

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.scss']
})
export class MarketplaceComponent implements OnInit, OnDestroy {
  searchQuery = '';
  activeCategory = 'all';
  sortBy = 'popular';
  maxPrice = 1000;
  cartCount = 0;
  scrolled = false;
  currentUser: User | null = null;
  toastMsg = '';
  toastVisible = false;
  addingIds = new Set<string>();
  addedIds = new Set<string>();
  authModal = '';
  selectedProduct: Product | null = null;
  selectedQty = 1;

  // Real products from backend
  products: Product[] = [];
  isLoadingProducts = true;

  private destroy$ = new Subject<void>();

  readonly categories = [
    { key: 'all',        label: 'All Products', icon: '✦', count: 24 },
    { key: 'jewellery',  label: 'Jewellery',    icon: '💛', count: 8  },
    { key: 'textiles',   label: 'Clothing',     icon: '👗', count: 5  },
    { key: 'food',       label: 'Food & Jams',  icon: '🍯', count: 4  },
    { key: 'crafts',     label: 'Art & Crafts', icon: '🎨', count: 7  },
  ];

  get allProducts(): Product[] {
    return this.products;
  }

  get filteredProducts(): Product[] {
    return this.allProducts.filter(p => {
      const catMatch = this.activeCategory === 'all' || p.category === this.activeCategory;
      const priceMatch = p.price <= this.maxPrice;
      const searchMatch = !this.searchQuery ||
        p.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.centre_name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.seller_alias.toLowerCase().includes(this.searchQuery.toLowerCase());
      return catMatch && priceMatch && searchMatch;
    }).sort((a, b) => {
      if (this.sortBy === 'popular')   return b.sold - a.sold;
      if (this.sortBy === 'price-asc') return a.price - b.price;
      if (this.sortBy === 'price-desc') return b.price - a.price;
      if (this.sortBy === 'rating')    return b.rating - a.rating;
      return 0;
    });
  }

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private sellerAuth: SellerAuthService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.loadRealProducts();
    this.cartService.cart$.pipe(takeUntil(this.destroy$))
      .subscribe(c => this.cartCount = c.items.reduce((s, i) => s + i.quantity, 0));
    this.authService.user$.pipe(takeUntil(this.destroy$))
      .subscribe(u => this.currentUser = u);
    this.sellerAuth.user$.pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        if (u) {
          this.currentUser = {
            name: u.alias,
            email: u.email,
            role: 'seller',
            initials: u.alias.slice(0,2).toUpperCase()
          };
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRealProducts(): void {
    this.isLoadingProducts = true;
    this.http.get<any>('http://localhost:3000/api/marketplace/products')
      .subscribe({
        next: (res) => {
          this.products = res.products;
          this.isLoadingProducts = false;
        },
        error: () => {
          this.isLoadingProducts = false;
          this.products = [];
        }
      });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 40;
  }

  formatPrice(p: number): string {
    return `R${(p || 0).toFixed(2)}`;
  }

  formatSurvivorPct(p: Product): string {
    return `${Math.round((p.survivor_income / p.price) * 100)}%`;
  }

  openProduct(p: Product): void {
    this.selectedProduct = p;
    this.selectedQty = 1;
  }

  closeProduct(): void {
    this.selectedProduct = null;
  }

  addToCart(p: Product, qty = 1): void {
    if (this.addingIds.has(p.id)) return;
    this.addingIds.add(p.id);
    this.cartService.addToCart(p.id, qty).subscribe({
      next: () => {
        this.addingIds.delete(p.id);
        this.addedIds.add(p.id);
        this.showToast(`${p.title} added to cart`);
        setTimeout(() => this.addedIds.delete(p.id), 2000);
      },
      error: () => {
        this.addingIds.delete(p.id);
      }
    });
  }

  addFromModal(): void {
    if (this.selectedProduct) {
      this.addToCart(this.selectedProduct, this.selectedQty);
      this.closeProduct();
    }
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 2800);
  }

  showAuthModal(m: string): void {
    this.authModal = m;
  }

  closeAuthModal(e: MouseEvent): void {
    this.authModal = '';
  }

  redirectTo(role: string, action: string): void {
    this.authModal = '';
    if (role === 'seller') {
      if (action === 'login') {
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/register/seller']);
      }
    } else if (role === 'centre') {
      if (action === 'login') {
        // No centre login yet – go to centre dashboard (or a placeholder)
        this.router.navigate(['/centre-dashboard']);
      } else {
        this.router.navigate(['/register-centre']);
      }
    } else if (role === 'buyer') {
      // Buyer does not need an account
      if (action === 'login') {
        this.showToast('Shop as guest – no account needed');
      } else {
        this.showToast('Buyers can shop without registration');
      }
    }
  }

  stars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  getButtonLabel(p: Product): string {
    if (p.stock === 0) return 'Out of stock';
    if (this.addingIds.has(p.id)) return 'Adding…';
    if (this.addedIds.has(p.id)) return '✓ Added';
    return '+ Add to cart';
  }

  getButtonClass(p: Product): string {
    if (this.addedIds.has(p.id)) return 'card-add-btn added';
    if (this.addingIds.has(p.id)) return 'card-add-btn adding';
    return 'card-add-btn';
  }

  goToDonate(): void {
    this.router.navigate(['/donate']);
  }

  goToCentres(): void {
    this.router.navigate(['/for-centres']);
  }
}