const CATEGORIES = ['All', 'Bangla', 'Indian', 'Pakistani', 'Hindi', 'English', 'Trending', 'Latest', 'Popular'];

interface CategoryBarProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

export function CategoryBar({ activeCategory, onSelectCategory }: CategoryBarProps) {
  return (
    <div className="sticky top-16 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-900 py-3 mb-6">
      <div className="container mx-auto px-4 flex gap-2.5 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-neutral-100 text-neutral-950'
                : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
