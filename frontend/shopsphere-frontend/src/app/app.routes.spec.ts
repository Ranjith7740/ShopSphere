import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { routes } from './app.routes';
import { ProductDetail } from './features/products/product-detail/product-detail';
import { ProductList } from './features/products/product-list/product-list';
import { Cart } from './features/cart/cart';
import { AuthService } from './core/services/auth.service';

describe('app routes', () => {
  // authGuard reads AuthService.isLoggedIn() - stub it directly rather than
  // wiring up a real token, matching auth.guard.spec.ts's approach.
  function configure(isLoggedIn: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isLoggedIn: () => isLoggedIn } },
      ],
    });
  }

  beforeEach(() => {
    configure(true);
  });

  it('resolves /products/1 to the ProductDetail component', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/products/1');

    expect(component).toBeInstanceOf(ProductDetail);
  });

  it('resolves /products to the ProductList component', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/products');

    expect(component).toBeInstanceOf(ProductList);
  });

  it('resolves /cart to the Cart component when authenticated', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/cart');

    expect(component).toBeInstanceOf(Cart);
  });

  it('redirects /cart to /login when not authenticated', async () => {
    configure(false);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/cart');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
