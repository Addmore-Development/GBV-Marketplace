import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SellerAuthService } from '../services/seller-auth.service';

@Injectable({ providedIn: 'root' })
export class HiddenLayerGuard implements CanActivate {
  constructor(private auth: SellerAuthService, private router: Router) {}
  canActivate(): boolean {
    const user = this.auth.currentUser;
    // allow access if centre approved OR hidden layer granted via volunteer
    if (user && (user.verification_status === 'approved' || user.hidden_layer_granted)) {
      return true;
    }
    this.router.navigate(['/seller/dashboard'], { queryParams: { error: 'unauthorized' } });
    return false;
  }
}