"use client";

export type PaginationControlsCopy = {
  next: string;
  of: string;
  page: string;
  previous: string;
  showing: string;
};

type PaginationControlsProps = {
  copy: PaginationControlsCopy;
  currentPage: number;
  endItem: number;
  onPageChange: (page: number) => void;
  startItem: number;
  totalItems: number;
  totalPages: number;
};

export const PaginationControls = ({
  copy,
  currentPage,
  endItem,
  onPageChange,
  startItem,
  totalItems,
  totalPages,
}: PaginationControlsProps) => (
  <nav className="pagination-controls" aria-label="Pagination">
    <span className="pagination-controls__meta">
      {copy.showing} {startItem}-{endItem} {copy.of} {totalItems} · {copy.page} {currentPage}/{totalPages}
    </span>
    <div className="pagination-controls__buttons">
      <button
        className="pagination-controls__button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        {copy.previous}
      </button>
      <button
        className="pagination-controls__button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        {copy.next}
      </button>
    </div>
  </nav>
);
