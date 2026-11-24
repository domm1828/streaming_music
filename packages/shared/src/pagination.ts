import type { PaginationMeta } from './api-response';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

/** Construye los metadatos de paginación a partir del total de registros. */
export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginationMeta {
  const safePerPage = Math.min(Math.max(perPage, 1), MAX_PER_PAGE);
  const lastPage = Math.max(Math.ceil(total / safePerPage), 1);
  const currentPage = Math.min(Math.max(page, 1), lastPage);
  return {
    currentPage,
    perPage: safePerPage,
    total,
    lastPage,
    nextPage: currentPage < lastPage ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
  };
}
