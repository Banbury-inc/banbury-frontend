import React from 'react';
import { Textbox } from '../../../../../../common/Textbox/Textbox';

interface ModelSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ModelSearch({ searchQuery, onSearchChange }: ModelSearchProps) {
  return (
      <Textbox
        type="search"
        placeholder="Search models..."
        value={searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
      />
  );
} 