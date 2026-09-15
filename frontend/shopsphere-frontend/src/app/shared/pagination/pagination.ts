import { Component, computed, input, output } from '@angular/core';

const MAX_VISIBLE_PAGES = 5;

/**
 * Generic, backend-page-driven pagination control. `currentPage` and the
 * `pageChange` output are both zero-based (matching the Spring Pageable
 * convention the rest of the app talks to) - only the rendered button
 * labels are 1-based, for the user's benefit.
 */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  readonly isFirstPage = computed(() => this.currentPage() <= 0);
  readonly isLastPage = computed(() => this.currentPage() >= this.totalPages() - 1);

  // Windows the page numbers around the current page so a large catalog
  // doesn't render one button per page.
  readonly visiblePages = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: total }, (_, i) => i);
    }

    let start = Math.max(0, current - Math.floor(MAX_VISIBLE_PAGES / 2));
    const end = Math.min(total - 1, start + MAX_VISIBLE_PAGES - 1);
    start = Math.max(0, end - MAX_VISIBLE_PAGES + 1);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.pageChange.emit(page);
  }

  previous(): void {
    this.goToPage(this.currentPage() - 1);
  }

  next(): void {
    this.goToPage(this.currentPage() + 1);
  }
}
