import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet, RouterLink, provideRouter } from '@angular/router';
import { AdminLayout } from './admin-layout';

describe('AdminLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout, RouterOutlet, RouterLink],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the AdminLayout component', () => {
    const fixture = TestBed.createComponent(AdminLayout);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render the sidebar navigation links', () => {
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('a[routerLink="/admin"]')?.textContent).toContain('Dashboard');
    expect(compiled.querySelector('a[routerLink="/admin/products"]')?.textContent).toContain('Products');
    expect(compiled.querySelector('a[routerLink="/admin/categories"]')?.textContent).toContain('Categories');
    expect(compiled.querySelector('a[routerLink="/admin/inventory"]')?.textContent).toContain('Inventory');
    expect(compiled.querySelector('a[routerLink="/admin/orders"]')?.textContent).toContain('Orders');
    expect(compiled.querySelector('a[routerLink="/admin/users"]')?.textContent).toContain('Customers');
  });

  it('should contain a router-outlet', () => {
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
