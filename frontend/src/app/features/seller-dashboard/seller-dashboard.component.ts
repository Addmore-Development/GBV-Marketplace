import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface SellerProfile {
  id: string;
  alias: string;
  email: string;
  product_categories: string[];
  payout_method: string;
  verification_status: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  status: string;
}

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, FormsModule],
  templateUrl: './seller-dashboard.component.html',
  styleUrls: ['./seller-dashboard.component.scss'],
})
export class SellerDashboardComponent implements OnInit {
  seller: SellerProfile | null = null;
  products: Product[] = [];
  isLoading = true;
  activeTab: 'products' | 'sales' | 'hidden' = 'products';
  
  // Hidden layer PIN modal
  showPinModal = false;
  hiddenPin = '';
  pinError = '';
  hiddenLayerAccess = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadSellerProfile();
    this.loadProducts();
  }

  loadSellerProfile(): void {
    const sellerId = localStorage.getItem('sellerId');
    if (!sellerId) {
      this.router.navigate(['/register/seller']);
      return;
    }
    this.http.get<SellerProfile>(`http://localhost:3000/api/sellers/profile/${sellerId}`)
      .subscribe({
        next: (data) => {
          this.seller = data;
        },
        error: () => {
          this.seller = {
            id: sellerId,
            alias: localStorage.getItem('sellerAlias') || 'Seller',
            email: localStorage.getItem('sellerEmail') || '',
            product_categories: [],
            payout_method: 'eft',
            verification_status: 'pending'
          };
        }
      });
  }

  loadProducts(): void {
    const sellerId = localStorage.getItem('sellerId');
    if (!sellerId) return;
    this.http.get<Product[]>(`http://localhost:3000/api/sellers/products/${sellerId}`)
      .subscribe({
        next: (data) => {
          this.products = data;
          this.isLoading = false;
        },
        error: () => {
          // Demo mock products
          this.products = [
            { id: '1', name: 'Beaded Necklace', description: 'Handmade with love', price: 120, category: 'Beaded jewellery', status: 'active' },
            { id: '2', name: 'Wire Art Sculpture', description: 'Unique design', price: 250, category: 'Wire art', status: 'draft' }
          ];
          this.isLoading = false;
        }
      });
  }

  // ========== Product Management Methods (added) ==========
  addProduct(): void {
    // Placeholder – can open a modal or navigate to a product form
    alert('Add product functionality – will be implemented soon');
    // Example: this.router.navigate(['/seller/products/new']);
  }

  editProduct(product: Product): void {
    alert(`Edit product: ${product.name}`);
    // Example: this.router.navigate([`/seller/products/${product.id}/edit`]);
  }

  deleteProduct(productId: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      // Call backend delete API
      this.http.delete(`http://localhost:3000/api/sellers/products/${productId}`)
        .subscribe({
          next: () => {
            this.products = this.products.filter(p => p.id !== productId);
            alert('Product deleted successfully');
          },
          error: (err) => {
            console.error(err);
            alert('Failed to delete product');
          }
        });
    }
  }
  // ========================================================

  requestHiddenLayer(): void {
    this.showPinModal = true;
    this.hiddenPin = '';
    this.pinError = '';
  }

  verifyPin(): void {
    const storedPin = localStorage.getItem('hiddenPin');
    if (this.hiddenPin === storedPin) {
      this.hiddenLayerAccess = true;
      this.showPinModal = false;
      this.router.navigate(['/seller/hidden']);
    } else {
      this.pinError = 'Incorrect PIN. Please try again.';
    }
  }

  closePinModal(): void {
    this.showPinModal = false;
  }

  quickExit(): void {
    window.location.href = '/news';
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}