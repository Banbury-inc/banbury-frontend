import React from 'react';
import { 
  Dropdown, 
  DropdownButton, 
  DropdownMenu, 
  DropdownItem 
} from '../../../../../../common/Dropdown/Dropdown';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const displayText = selectedCategory === '' ? 'All Categories' : selectedCategory;

  return (
    <Dropdown>
      <DropdownButton outline className="whitespace-nowrap text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white">
        {displayText}
      </DropdownButton>
      <DropdownMenu anchor="top" modal className="z-[9999] !fixed">
        <DropdownItem
          onClick={() => onCategoryChange('')}
        >
          All Categories
        </DropdownItem>
        {categories.map(category => (
          <DropdownItem
            key={category}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
} 