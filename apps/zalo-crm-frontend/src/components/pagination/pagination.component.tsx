import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { IPaginationProps } from './pagination.type';

export const PaginationComponent: React.FC<IPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers array with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages, currentPage + 1);

      if (currentPage <= 3) {
        start = 1;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-5 py-3.5 border-t border-slate-100 rounded-b-3xl">
      {/* Items Range Summary & Per-Page Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold">
        <span>
          Hiển thị <strong className="text-slate-800 font-black">{startItem} - {endItem}</strong> trên tổng số{' '}
          <strong className="text-[#0e6877] font-black">{totalItems}</strong> bản ghi
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-400">| Số bản ghi / trang:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0e6877] cursor-pointer"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Trang đầu"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:cursor-not-allowed transition-all border-none cursor-pointer"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Trang trước"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:cursor-not-allowed transition-all border-none cursor-pointer"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page Numbers */}
        {pages.map((p, idx) => {
          if (typeof p === 'string') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400 font-bold select-none">
                ...
              </span>
            );
          }
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all border-none cursor-pointer ${
                isActive
                  ? 'bg-[#0e6877] text-white shadow-xs shadow-teal-900/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Trang sau"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:cursor-not-allowed transition-all border-none cursor-pointer"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Trang cuối"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:cursor-not-allowed transition-all border-none cursor-pointer"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
};
