export type PaginatedItems<TItem> = {
  currentPage: number;
  endItem: number;
  items: TItem[];
  startItem: number;
  totalItems: number;
  totalPages: number;
};

const clampPage = (page: number, totalPages: number): number => {
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  if (page > totalPages) {
    return totalPages;
  }

  return Math.trunc(page);
};

export const paginateItems = <TItem>(
  items: TItem[],
  requestedPage: number,
  pageSize: number
): PaginatedItems<TItem> => {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error(`Invalid pagination page size: ${pageSize}.`);
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = clampPage(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    currentPage,
    endItem: totalItems === 0 ? 0 : endIndex,
    items: items.slice(startIndex, endIndex),
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    totalItems,
    totalPages,
  };
};
