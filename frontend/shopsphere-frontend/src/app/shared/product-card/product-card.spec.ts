import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProductCard } from './product-card';
import { ProductResponse } from '../../core/models/product.model';

const PRODUCT: ProductResponse = {
  id: 7,
  categoryId: 3,
  categoryName: 'Electronics',
  name: 'Wireless Mouse',
  description: 'Ergonomic wireless mouse',
  price: 29.99,
  stockQuantity: 120,
  status: 'ACTIVE',
  createdAt: '2026-01-10T12:00:00',
  updatedAt: '2026-01-10T12:00:00',
};

describe('ProductCard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductCard],
      providers: [provideRouter([])],
    });
  });

  it('displays the product name, category, price and description', () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', PRODUCT);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Wireless Mouse');
    expect(text).toContain('Electronics');
    expect(text).toContain('29.99');
    expect(text).toContain('Ergonomic wireless mouse');
  });

  it('shows "In Stock" when stockQuantity is greater than zero', () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', PRODUCT);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('In Stock');
  });

  it('shows "Out of Stock" when stockQuantity is zero', () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', { ...PRODUCT, stockQuantity: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Out of Stock');
  });

  it('links to the product detail route', () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', PRODUCT);
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/products/7');
  });
});
