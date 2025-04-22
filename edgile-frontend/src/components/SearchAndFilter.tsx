import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

interface SearchAndFilterProps {
  onSearch: (value: string) => void;
  onFilter?: () => void;
  searchPlaceholder?: string;
  className?: string;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onSearch,
  onFilter,
  searchPlaceholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          className="pl-9"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {onFilter && (
        <Button variant="outline" onClick={onFilter}>
          <Filter className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
