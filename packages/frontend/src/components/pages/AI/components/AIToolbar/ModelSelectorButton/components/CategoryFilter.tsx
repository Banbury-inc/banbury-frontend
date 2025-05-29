import React from 'react';
import { Button, Stack } from '@mui/material';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      <Button
        size="small"
        variant={selectedCategory === '' ? "contained" : "outlined"}
        onClick={() => onCategoryChange('')}
        sx={{ 
          borderRadius: 1.5,
          textTransform: 'none',
          py: 0.25,
          px: 1,
          minHeight: 0,
          fontSize: '0.75rem',
          lineHeight: 1.2
        }}
      >
        All
      </Button>
      {categories.map(category => (
        <Button
          key={category}
          size="small"
          variant={selectedCategory === category ? "contained" : "outlined"}
          onClick={() => onCategoryChange(category)}
          sx={{ 
            borderRadius: 1.5,
            textTransform: 'none',
            py: 0.25,
            px: 1,
            pt: 0.5,
            minHeight: 0,
            fontSize: '0.75rem',
            lineHeight: 1.2
          }}
        >
          {category}
        </Button>
      ))}
    </Stack>
  );
} 