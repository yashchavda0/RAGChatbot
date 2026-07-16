import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConversationFilters } from '@/types/conversation';

interface ConversationFiltersProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
}

const SORT_OPTIONS: { value: ConversationFilters['sortBy']; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

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
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search conversations..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="flex-1"
        />

        <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-black/[0.06] bg-[#F5F5F7]">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onFiltersChange({ ...filters, sortBy: option.value })}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                filters.sortBy === option.value
                  ? 'bg-white shadow-sm text-[#1D1D1F]'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filters.search && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
