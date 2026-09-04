import React from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import './AdminPagination.css';

export const ADMIN_PAGE_SIZE = 10;

function pageItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  const items = [1];
  if (start > 2) items.push('start-gap');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push('end-gap');
  items.push(totalPages);
  return items;
}

export default function AdminPagination({
  page = 1,
  totalItems = 0,
  pageSize = ADMIN_PAGE_SIZE,
  onPageChange,
  label = 'records',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  if (totalItems <= pageSize) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);
  const goTo = (nextPage) => onPageChange?.(Math.min(Math.max(1, nextPage), totalPages));

  return (
    <div className="admin-pagination" aria-label="Pagination">
      <span className="admin-pagination__summary">Showing {from}–{to} of {totalItems} {label}</span>
      <div className="admin-pagination__controls">
        <button type="button" onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
          <RiArrowLeftSLine /> Prev
        </button>
        {pageItems(currentPage, totalPages).map((item) => (
          typeof item === 'string'
            ? <span key={item} className="admin-pagination__ellipsis">…</span>
            : <button key={item} type="button" className={item === currentPage ? 'is-active' : ''} onClick={() => goTo(item)} aria-current={item === currentPage ? 'page' : undefined}>{item}</button>
        ))}
        <button type="button" onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page">
          Next <RiArrowRightSLine />
        </button>
      </div>
    </div>
  );
}
