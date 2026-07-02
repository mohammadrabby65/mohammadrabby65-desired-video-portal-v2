import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { getPageUrl } from '../../lib/pagination';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string; // e.g., '/' or '/search?q=test'
  searchParams?: URLSearchParams;
}

export function Pagination({ currentPage, totalPages, basePath, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getUrl = (page: number) => getPageUrl(basePath, page, searchParams);

  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = startPage + maxVisiblePages - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-12 mb-8">
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          to={getUrl(currentPage - 1)}
          className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          rel="prev"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      ) : (
        <button disabled className="p-2 rounded-lg bg-neutral-900/50 border border-neutral-800/50 text-neutral-600 cursor-not-allowed">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* First Page & Ellipsis */}
      {startPage > 1 && (
        <>
          <Link
            to={getUrl(1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            1
          </Link>
          {startPage > 2 && (
            <div className="w-10 h-10 flex items-center justify-center text-neutral-600">
              <MoreHorizontal className="w-4 h-4" />
            </div>
          )}
        </>
      )}

      {/* Page Numbers */}
      {pages.map((page) => (
        <Link
          key={page}
          to={getUrl(page)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
            currentPage === page
              ? 'bg-red-600 text-white border border-red-500'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
          aria-current={currentPage === page ? 'page' : undefined}
        >
          {page}
        </Link>
      ))}

      {/* Last Page & Ellipsis */}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <div className="w-10 h-10 flex items-center justify-center text-neutral-600">
              <MoreHorizontal className="w-4 h-4" />
            </div>
          )}
          <Link
            to={getUrl(totalPages)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          to={getUrl(currentPage + 1)}
          className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          rel="next"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      ) : (
        <button disabled className="p-2 rounded-lg bg-neutral-900/50 border border-neutral-800/50 text-neutral-600 cursor-not-allowed">
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
