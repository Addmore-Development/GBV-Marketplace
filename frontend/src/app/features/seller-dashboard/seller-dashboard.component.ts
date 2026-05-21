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

  // Product CRUD modals
  showProductModal = false;
  isEditing = false;
  currentProduct: Product = {
    id: '',
    name: '',
    description: '',
    price: 0,
    category: '',
    status: 'active'
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadSellerProfile();
    this.loadProducts();
  }

  // ==================== PROFILE ====================
  loadSellerProfile(): void {
    const sellerId = localStorage.getItem('sellerId');
    if (!sellerId) {
      this.router.navigate(['/register/seller']);
      return;
    }
    this.http.get<SellerProfile>(`http://localhost:3000/api/sellers/profile/${sellerId}`)
      .subscribe({
        next: (data) => (this.seller = data),
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

  // ==================== READ PRODUCTS ====================
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
          this.products = [];
          this.isLoading = false;
        }
      });
  }

  // ==================== CREATE PRODUCT ====================
  openAddProductModal(): void {
    this.isEditing = false;
    this.currentProduct = {
      id: '',
      name: '',
      description: '',
      price: 0,
      category: '',
      status: 'active'
    };
    this.showProductModal = true;
  }

  // ==================== UPDATE PRODUCT ====================
  editProduct(product: Product): void {
    this.isEditing = true;
    this.currentProduct = { ...product };
    this.showProductModal = true;
  }

  // ==================== SAVE (CREATE or UPDATE) ====================
  saveProduct(): void {
    const sellerId = localStorage.getItem('sellerId');
    if (!sellerId) return;
    if (!this.currentProduct.name || this.currentProduct.price <= 0) {
      alert('Product name and positive price are required');
      return;
    }

    if (this.isEditing) {
      // UPDATE
      this.http.put(`http://localhost:3000/api/sellers/products/${this.currentProduct.id}`, this.currentProduct)
        .subscribe({
          next: (updated: any) => {
            const index = this.products.findIndex(p => p.id === this.currentProduct.id);
            if (index !== -1) this.products[index] = updated.product;
            this.closeProductModal();
            alert('Product updated');
          },
          error: () => alert('Failed to update product')
        });
    } else {
      // CREATE
      this.http.post('http://localhost:3000/api/sellers/products', {
        seller_id: sellerId,
        ...this.currentProduct
      }).subscribe({
        next: (res: any) => {
          this.products.unshift(res.product);
          this.closeProductModal();
          alert('Product added');
        },
        error: () => alert('Failed to add product')
      });
    }
  }

  // ==================== DELETE PRODUCT ====================
  deleteProduct(productId: string): void {
    if (confirm('Permanently delete this product? This action cannot be undone.')) {
      this.http.delete(`http://localhost:3000/api/sellers/products/${productId}`)
        .subscribe({
          next: () => {
            this.products = this.products.filter(p => p.id !== productId);
            alert('Product deleted');
          },
          error: () => alert('Failed to delete product')
        });
    }
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.currentProduct = { id: '', name: '', description: '', price: 0, category: '', status: 'active' };
  }

  // ==================== HIDDEN LAYER ====================
  requestHiddenLayer(): void {
    this.showPinModal = true;
    this.hiddenPin = '';
    this.pinError = '';
  }

  verifyPin(): void {
  const storedPin = localStorage.getItem('hiddenPin');
  if (this.hiddenPin === storedPin) {
    this.hiddenLayerAccess = true;
    localStorage.setItem('hiddenLayerAccess', 'true');  // <-- add this line
    this.showPinModal = false;
    this.router.navigate(['/seller/hidden']);
  } else {
    this.pinError = 'Incorrect PIN. Please try again.';
  }
}
  closePinModal(): void {
    this.showPinModal = false;
  }

  // ==================== UTILITIES ====================
  quickExit(): void {
    window.location.href = '/news';
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}