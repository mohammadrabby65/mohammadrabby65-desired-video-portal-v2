import { Link, useLocation } from "react-router-dom";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const location = useLocation();

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set("page", page.toString());
    return `${location.pathname}?${searchParams.toString()}`;
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }
    return pages;
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 sm:mt-14 flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 px-2 max-w-full tabular-nums"
    >
      <Link
        to={currentPage > 1 ? createPageUrl(currentPage - 1) : "#"}
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : undefined}
        className={`min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4 inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-colors border ${
          currentPage > 1
            ? "bg-neutral-900 border-white/[0.08] text-white hover:bg-neutral-800 hover:border-white/15"
            : "bg-neutral-900/40 border-white/[0.04] text-neutral-600 cursor-not-allowed pointer-events-none"
        }`}
      >
        Previous
      </Link>

      <div className="flex items-center gap-1 sm:gap-1.5">
        {getPageNumbers().map((page, idx) =>
          typeof page === "number" ? (
            <Link
              key={idx}
              to={createPageUrl(page)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
              className={`min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] px-2.5 flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition-colors border ${
                currentPage === page
                  ? "bg-primary border-primary text-white shadow-sm"
                  : "bg-neutral-900 border-white/[0.08] text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {page}
            </Link>
          ) : (
            <span
              key={idx}
              aria-hidden="true"
              className="w-6 sm:w-8 flex justify-center text-xs sm:text-sm text-neutral-500 select-none"
            >
              ...
            </span>
          ),
        )}
      </div>

      <Link
        to={currentPage < totalPages ? createPageUrl(currentPage + 1) : "#"}
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
        className={`min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4 inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-colors border ${
          currentPage < totalPages
            ? "bg-neutral-900 border-white/[0.08] text-white hover:bg-neutral-800 hover:border-white/15"
            : "bg-neutral-900/40 border-white/[0.04] text-neutral-600 cursor-not-allowed pointer-events-none"
        }`}
      >
        Next
      </Link>
    </nav>
  );
}

