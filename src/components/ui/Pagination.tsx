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
    <div className="mt-10 sm:mt-16 flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 px-2 max-w-full">
      <Link
        to={currentPage > 1 ? createPageUrl(currentPage - 1) : "#"}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
          currentPage > 1
            ? "bg-neutral-800 text-white hover:bg-neutral-700"
            : "bg-neutral-900 text-neutral-600 cursor-not-allowed pointer-events-none"
        }`}
      >
        Previous
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        {getPageNumbers().map((page, idx) =>
          typeof page === "number" ? (
            <Link
              key={idx}
              to={createPageUrl(page)}
              className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-colors ${
                currentPage === page
                  ? "bg-primary text-white"
                  : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              {page}
            </Link>
          ) : (
            <span
              key={idx}
              className="w-6 sm:w-8 flex justify-center text-xs sm:text-sm text-neutral-500"
            >
              ...
            </span>
          ),
        )}
      </div>

      <Link
        to={currentPage < totalPages ? createPageUrl(currentPage + 1) : "#"}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
          currentPage < totalPages
            ? "bg-neutral-800 text-white hover:bg-neutral-700"
            : "bg-neutral-900 text-neutral-600 cursor-not-allowed pointer-events-none"
        }`}
      >
        Next
      </Link>
    </div>
  );
}
