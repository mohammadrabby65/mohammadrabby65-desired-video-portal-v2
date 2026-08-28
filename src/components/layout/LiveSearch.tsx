import { useNavigate } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";

export function LiveSearch() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/search")}
      className="p-2.5 rounded-full transition-all duration-200 group relative"
      aria-label="Search"
    >
      <div className="absolute inset-0 bg-neutral-800/0 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800/80 rounded-full transition-colors" />
      <SearchIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white relative z-10 transition-colors" />
    </button>
  );
}
