import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { routes } from './app.routes';
import { ProductDetail } from './features/products/product-detail/product-detail';
import { ProductList } from './features/products/product-list/product-list';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
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
});
