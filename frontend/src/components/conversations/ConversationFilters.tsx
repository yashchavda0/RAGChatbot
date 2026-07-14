import { Search } from 'lucide-react';
import { ConversationFilters } from '@/types/conversation';

interface ConversationFiltersProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
}

export function ConversationFiltersComponent({ filters, onFiltersChange }: ConversationFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      sortBy: 'newest',
    });
  };

  return (
    <div className="flex gap-4 items-center p-4 bg-white rounded-xl border border-[#E5E5EA]">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E5EA] focus:outline-none focus:border-[#5B5EFF] text-sm"
        />
      </div>

      <select
        value={filters.sortBy}
        onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as 'newest' | 'oldest' })}
        className="px-3 py-2 rounded-lg border border-[#E5E5EA] focus:outline-none focus:border-[#5B5EFF] text-sm bg-white"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>

      {(filters.search) && (
        <button
          onClick={handleClearFilters}
          className="px-3 py-2 text-sm text-[#5B5EFF] hover:bg-[#5B5EFF]/10 rounded-lg transition"
        >
          Clear
        </button>
      )}
    </div>
  );
}
