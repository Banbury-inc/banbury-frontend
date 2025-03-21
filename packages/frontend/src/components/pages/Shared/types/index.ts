export interface DatabaseData {
  _id?: string;
  id: string | number;
  file_name: string;
  kind: string;
  date_uploaded: string;
  date_modified: string;
  file_size: string;
  file_path: string;
  deviceID: string;
  device_name: string;
  helpers: number;
  available: string;
  file_priority: string;
  device_ids: string[];
  original_device: string;
  owner: string;
}

export type Order = 'asc' | 'desc';

export interface HeadCell {
  disablePadding?: boolean;
  id: keyof DatabaseData;
  label: string;
  numeric: boolean;
  isVisibleOnSmallScreen: boolean;
  isVisibleNotOnCloudSync: boolean;
}

export interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof DatabaseData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  order: Order;
  orderBy: keyof DatabaseData;
  rowCount: number;
} 