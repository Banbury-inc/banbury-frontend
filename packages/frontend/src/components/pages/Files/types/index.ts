import { FilesColumns, DatabaseData, GoogleDriveFileRow, AvailableTableColumns } from '@banbury/core/src/types/Types';

// Re-export types from core for use in Files components
export { FilesColumns, DatabaseData, GoogleDriveFileRow, AvailableTableColumns };

export type Order = 'asc' | 'desc';

// Type representing only the columns that are actually available in the table

export interface HeadCell {
  disablePadding?: boolean;
  id: AvailableTableColumns;
  label: string;
  numeric: boolean;
  isVisibleOnSmallScreen: boolean;
  isVisibleNotOnCloudSync: boolean;
  visibleIn?: Array<'files' | 'sync' | 'shared' | 'cloud' | 'google_drive'>;
  width?: string;
}

export interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof DatabaseData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  order: Order;
  orderBy: keyof DatabaseData;
  rowCount: number;
  currentView?: 'files' | 'sync' | 'shared' | 'cloud' | 'google_drive';
}
