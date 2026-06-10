// ============================================================
// frontend/src/app/features/marketplace/marketplace.component.ts
// ============================================================
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { AuthService, User } from '../../services/auth.service';

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
  imports: [CommonModule, FormsModule, RouterModule],
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
  authError = '';
  loginEmail = '';
  loginPassword = '';
  loginRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  registerName = '';
  registerEmail = '';
  registerPassword = '';
  registerRole: 'buyer' | 'seller' | 'centre' = 'buyer';
  selectedProduct: Product | null = null;
  selectedQty = 1;
  impactInfoOpen = false;

  private destroy$ = new Subject<void>();

  readonly categories = [
    { key: 'all',       label: 'All Products' },
    { key: 'jewellery', label: 'Jewellery & Accessories' },
    { key: 'textiles',  label: 'Clothing & Textiles' },
    { key: 'food',      label: 'Food & Jams' },
    { key: 'crafts',    label: 'Art & Crafts' },
  ];

  readonly featuredCats = [
    { key: 'jewellery', label: 'Jewellery & Accessories', img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80' },
    { key: 'textiles',  label: 'Clothing & Textiles',     img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80' },
    { key: 'food',      label: 'Food & Jams',             img: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80' },
    { key: 'crafts',    label: 'Art & Crafts',            img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80' },
    { key: 'all',       label: 'Shop All',                img: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&q=80' },
  ];

  readonly allProducts: Product[] = [
    {
      id: 'p001', title: 'Beaded Sunrise Necklace', seller_alias: 'Nomsa B.',
      centre_name: 'Thistle House', category: 'jewellery', price: 180,
      survivor_income: 126, centre_funding: 54, platform_fee: 9,
      stock: 12, rating: 4.9, reviews: 34, sold: 89,
      img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
      description: 'Hand-beaded necklace using traditional Zulu patterns. Each bead is placed by hand — no two are identical.',
      story: '"I learned to bead from my grandmother. Now I teach the other women here. Every necklace I sell means my children eat." — Nomsa',
      badge: 'bestseller', seller_type: 'survivor'
    },
    {
      id: 'p002', title: 'Wire-Wrapped Earring Set', seller_alias: 'Thandi M.',
      centre_name: 'Khayelitsha Hub', category: 'jewellery', price: 95,
      survivor_income: 66.5, centre_funding: 28.5, platform_fee: 4.75,
      stock: 20, rating: 4.7, reviews: 18, sold: 52,
      img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
      description: 'Delicate copper wire earrings with seed bead accents. Lightweight and hypoallergenic.',
      story: '"Wire work keeps my hands busy and my mind calm. I have sold 52 pairs this year." — Thandi',
      seller_type: 'survivor'
    },
    {
      id: 'p003', title: 'Maasai-Style Bead Bracelet', seller_alias: 'Lindiwe K.',
      centre_name: 'Ubuntu Women\'s Centre', category: 'jewellery', price: 65,
      survivor_income: 45.5, centre_funding: 19.5, platform_fee: 3.25,
      stock: 3, rating: 4.8, reviews: 22, sold: 67,
      img: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80',
      description: 'Bold, colourful bracelet inspired by East African beadwork traditions.',
      story: '"I arrived with nothing. Now I have skills, income, and dignity." — Lindiwe',
      badge: 'low-stock', seller_type: 'survivor'
    },
    {
      id: 'p004', title: 'Recycled Glass Bead Anklet', seller_alias: 'Palesa D.',
      centre_name: 'Empilweni Centre', category: 'jewellery', price: 55,
      survivor_income: 38.5, centre_funding: 16.5, platform_fee: 2.75,
      stock: 15, rating: 4.6, reviews: 11, sold: 29,
      img: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=600&q=80',
      description: 'Made from recycled glass beads sourced locally. Adjustable fit.',
      story: '"Recycling glass into jewellery — turning broken things into beautiful ones." — Palesa',
      seller_type: 'survivor'
    },
    {
      id: 'p005', title: 'Shweshwe Print Tote Bag', seller_alias: 'Zanele P.',
      centre_name: 'Thistle House', category: 'textiles', price: 220,
      survivor_income: 154, centre_funding: 66, platform_fee: 11,
      stock: 8, rating: 4.8, reviews: 27, sold: 71,
      img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
      description: 'Handmade tote bag using traditional South African Shweshwe fabric. Fully lined with cotton.',
      story: '"I sew each bag myself. My hands have healed through this work." — Zanele',
      badge: 'bestseller', seller_type: 'survivor'
    },
    {
      id: 'p006', title: 'Hand-Dyed Ankara Scarf', seller_alias: 'Fatima O.',
      centre_name: 'New Beginnings NPO', category: 'textiles', price: 150,
      survivor_income: 105, centre_funding: 45, platform_fee: 7.5,
      stock: 11, rating: 4.5, reviews: 9, sold: 23,
      img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      description: 'Vibrant hand-dyed scarf using natural plant dyes. 100% cotton, 180cm long.',
      story: '"I brought these dyeing techniques from Nigeria. Now I share them here." — Fatima',
      seller_type: 'survivor'
    },
    {
      id: 'p007', title: 'Fig & Ginger Preserve (3-pack)', seller_alias: 'Gogo Dlamini',
      centre_name: 'Khanya Elderly Home', category: 'food', price: 120,
      survivor_income: 84, centre_funding: 36, platform_fee: 6,
      stock: 18, rating: 5.0, reviews: 41, sold: 112,
      img: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&q=80',
      description: 'Three jars of homemade fig and ginger preserve. No artificial preservatives.',
      story: '"I have been making jam since 1975. At 74, I am still the best cook here." — Gogo Dlamini',
      badge: 'bestseller', seller_type: 'elderly'
    },
    {
      id: 'p008', title: 'Rooibos & Honey Body Scrub', seller_alias: 'Amahle N.',
      centre_name: 'Khayelitsha Hub', category: 'food', price: 89,
      survivor_income: 62.3, centre_funding: 26.7, platform_fee: 4.45,
      stock: 22, rating: 4.7, reviews: 19, sold: 48,
      img: 'https://images.unsplash.com/photo-1622428051717-dcd7a1af09a5?w=600&q=80',
      description: 'All-natural exfoliating scrub made with South African rooibos, raw honey, and brown sugar.',
      story: '"I started mixing scrubs during lockdown. Now it pays school fees." — Amahle',
      seller_type: 'survivor'
    },
    {
      id: 'p009', title: 'Hand-Thrown Earth Bowl', seller_alias: 'Sipho K.',
      centre_name: 'Ubuntu Youth Programme', category: 'crafts', price: 340,
      survivor_income: 238, centre_funding: 102, platform_fee: 17,
      stock: 4, rating: 4.9, reviews: 16, sold: 38,
      img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80',
      description: 'Wheel-thrown stoneware bowl, fired at 1280°C. Food safe. Each piece unique.',
      story: '"Pottery taught me patience. I threw 200 bowls before I made one I liked." — Sipho, 19',
      badge: 'low-stock', seller_type: 'youth'
    },
    {
      id: 'p010', title: 'Wire Art — Township Cycle', seller_alias: 'Lebo M.',
      centre_name: 'Ubuntu Youth Programme', category: 'crafts', price: 280,
      survivor_income: 196, centre_funding: 84, platform_fee: 14,
      stock: 6, rating: 4.8, reviews: 12, sold: 29,
      img: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80',
      description: 'Intricate wire bicycle sculpture, approx. 25cm.',
      story: '"I started making wire toys at 8 to sell at robots. Now I sell internationally." — Lebo, 22',
      seller_type: 'youth'
    },
    {
      id: 'p011', title: 'Beeswax Pillar Candle Set', seller_alias: 'Gogo Mokoena',
      centre_name: 'Khanya Elderly Home', category: 'crafts', price: 95,
      survivor_income: 66.5, centre_funding: 28.5, platform_fee: 4.75,
      stock: 30, rating: 4.6, reviews: 8, sold: 21,
      img: 'https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80',
      description: 'Set of 3 hand-dipped beeswax candles in natural honey tones. Burns 18–22 hours each.',
      story: '"At 68, I finally started my own little business. Better late than never." — Gogo Mokoena',
      seller_type: 'elderly'
    },
    {
      id: 'p012', title: 'Woven Sisal Market Basket', seller_alias: 'Nomvula Z.',
      centre_name: 'Empilweni Centre', category: 'crafts', price: 295,
      survivor_income: 206.5, centre_funding: 88.5, platform_fee: 14.75,
      stock: 9, rating: 4.9, reviews: 24, sold: 58,
      img: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&q=80',
      description: 'Large hand-woven sisal basket with leather handles.',
      story: '"My mother taught me this weave. I am teaching my daughter. Three generations." — Nomvula',
      badge: 'bestseller', seller_type: 'survivor'
    },
  ];

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
      if (this.sortBy === 'popular')    return b.sold - a.sold;
      if (this.sortBy === 'price-asc')  return a.price - b.price;
      if (this.sortBy === 'price-desc') return b.price - a.price;
      if (this.sortBy === 'rating')     return b.rating - a.rating;
      return 0;
    });
  }

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$))
      .subscribe(c => this.cartCount = c.items.reduce((s, i) => s + i.quantity, 0));
    this.authService.user$.pipe(takeUntil(this.destroy$))
      .subscribe(u => this.currentUser = u);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled = window.scrollY > 40; }

  getCategoryLabel(): string {
    return this.categories.find(c => c.key === this.activeCategory)?.label || '';
  }

  formatPrice(p: number): string { return `R${(p || 0).toFixed(2)}`; }

  openProduct(p: Product): void { this.selectedProduct = p; this.selectedQty = 1; }
  closeProduct(): void { this.selectedProduct = null; }

  scrollToProducts(): void {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  }

  addToCart(p: Product, qty = 1): void {
    if (!this.currentUser) { this.showAuthModal('login'); return; }
    if (this.addingIds.has(p.id)) return;
    this.addingIds.add(p.id);
    this.cartService.addToCart(p.id, qty, {
      title: p.title,
      price: p.price,
      thumbnail: p.img,
      seller_alias: p.seller_alias,
      centre_name: p.centre_name,
      survivor_income: p.survivor_income,
      centre_funding: p.centre_funding,
      platform_fee: p.platform_fee,
    }).subscribe({
      next: () => {
        this.addingIds.delete(p.id);
        this.addedIds.add(p.id);
        this.showToast(`${p.title} added to cart`);
        setTimeout(() => this.addedIds.delete(p.id), 2000);
      },
      error: () => { this.addingIds.delete(p.id); }
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

  showAuthModal(m: string): void { this.authModal = m; this.authError = ''; }
  closeAuthModal(e: MouseEvent): void { this.authModal = ''; }

  doLogin(): void {
    this.authError = '';
    if (!this.loginEmail || !this.loginPassword) { this.authError = 'Please fill in all fields.'; return; }
    const ok = this.authService.login(this.loginEmail, this.loginPassword, this.loginRole);
    if (!ok) this.authError = 'Invalid credentials.';
    else this.authModal = '';
  }

  doRegister(): void {
    this.authError = '';
    if (this.registerRole === 'centre') { this.authModal = ''; this.router.navigate(['/register/centre']); return; }
    if (this.registerRole === 'seller') { this.authModal = ''; this.router.navigate(['/register/seller']); return; }
    if (!this.registerName || !this.registerEmail || !this.registerPassword) { this.authError = 'Please fill in all fields.'; return; }
    if (this.registerPassword.length < 8) { this.authError = 'Password must be at least 8 characters.'; return; }
    const ok = this.authService.register(this.registerName, this.registerEmail, this.registerPassword, this.registerRole);
    if (ok) this.authModal = '';
    else this.authError = 'Registration failed. Please try again.';
  }

  logout(): void { this.authService.logout(); this.showToast('Signed out successfully'); }

  stars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  getButtonLabel(p: Product): string {
    if (p.stock === 0) return 'Out of stock';
    if (this.addingIds.has(p.id)) return 'Adding…';
    if (this.addedIds.has(p.id)) return 'Added';
    return '+ Add to cart';
  }

  getButtonClass(p: Product): string {
    if (this.addedIds.has(p.id)) return 'card-add-btn added';
    if (this.addingIds.has(p.id)) return 'card-add-btn adding';
    return 'card-add-btn';
  }

  goToContribute(): void { this.router.navigate(['/centres']); }
}