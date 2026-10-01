import { Component, computed, inject, signal } from '@angular/core';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-navbar',

  imports: [RouterLink, RouterLinkActive],

  templateUrl: './navbar.html',

  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly authService = inject(AuthService);

  private readonly cartService = inject(CartService);

  private readonly router = inject(Router);

  readonly menuOpen = signal(false);

  readonly accountMenuOpen = signal(false);

  readonly isAuthenticated = this.authService.isAuthenticated;

  readonly currentUser = this.authService.currentUser;

  readonly cartItemCount = computed<number | null>(() => {
    const cart = this.cartService.cart();

    if (!cart) {
      return null;
    }

    return cart.items.reduce(
      (sum, item) => sum + item.quantity,

      0,
    );
  });

  showNavbar(): boolean {
    return !['/login', '/register'].includes(this.router.url);
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);

    if (this.menuOpen()) {
      this.accountMenuOpen.set(false);
    }
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen.update((value) => !value);
  }

  closeMenus(): void {
    this.menuOpen.set(false);

    this.accountMenuOpen.set(false);
  }

  logout(): void {
    this.closeMenus();

    this.authService.logout();

    this.router.navigateByUrl('/login');
  }
}
