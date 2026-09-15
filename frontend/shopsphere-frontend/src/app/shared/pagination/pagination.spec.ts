import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Pagination } from './pagination';

describe('Pagination', () => {
  function create(currentPage: number, totalPages: number) {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('currentPage', currentPage);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.detectChanges();
    return fixture;
  }

  it('emits the next zero-based page when Next is clicked', () => {
    const fixture = create(0, 3);
    let emitted: number | undefined;
    fixture.componentInstance.pageChange.subscribe((p: number) => (emitted = p));

    fixture.nativeElement.querySelector('button:last-of-type').click();

    expect(emitted).toBe(1);
  });

  it('emits the previous zero-based page when Previous is clicked', () => {
    const fixture = create(2, 3);
    let emitted: number | undefined;
    fixture.componentInstance.pageChange.subscribe((p: number) => (emitted = p));

    fixture.nativeElement.querySelector('button:first-of-type').click();

    expect(emitted).toBe(1);
  });

  it('disables Previous on the first page and Next on the last page', () => {
    const fixture = create(0, 1);

    const previousButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button:first-of-type');
    const nextButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button:last-of-type');

    expect(previousButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(true);
  });

  it('does not emit when clicking the current page', () => {
    const fixture = create(1, 3);
    const emit = vi.fn();
    fixture.componentInstance.pageChange.subscribe(emit);

    fixture.componentInstance.goToPage(1);

    expect(emit).not.toHaveBeenCalled();
  });

  it('does not emit when asked to go before the first page or past the last page', () => {
    const fixture = create(0, 3);
    const emit = vi.fn();
    fixture.componentInstance.pageChange.subscribe(emit);

    fixture.componentInstance.goToPage(-1);
    fixture.componentInstance.goToPage(3);

    expect(emit).not.toHaveBeenCalled();
  });

  it('marks the current page button with aria-current', () => {
    const fixture = create(1, 3);

    const pageButtons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.page-button'),
    );
    const current = pageButtons.find((b) => b.textContent?.trim() === '2');

    expect(current?.getAttribute('aria-current')).toBe('page');
  });
});
