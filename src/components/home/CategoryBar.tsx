const CATEGORIES = ['All', 'Bangla', 'Indian', 'Pakistani', 'Hindi', 'English'];

interface CategoryBarProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

export function CategoryBar({ activeCategory, onSelectCategory }: CategoryBarProps) {
  return (
    <div className="sticky top-16 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-900 py-4 mb-8">
      <div className="container mx-auto px-4 flex gap-3 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
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
