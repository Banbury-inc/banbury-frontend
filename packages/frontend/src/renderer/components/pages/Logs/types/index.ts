export type Order = 'asc' | 'desc';

export interface HeadCell {
  id: keyof LogData;
  numeric: boolean;
  label: string;
  isVisibleOnSmallScreen?: boolean;
  isVisibleNotOnCloudSync?: boolean;
}

export interface LogData {
  _id: string;
  device_id: string;
  username: string;
  task_name: string;
  task_device: string;
  task_status: string;
  task_progress: number;
  task_date_added: string;
  task_date_modified: string;
  file_name: string;
  file_size: string;
  kind: string;
  available: string;
  original_device: string;
  owner: string;
  date_uploaded: string;
  date_modified: string;
}

// Alias for backward compatibility
export type DatabaseData = LogData;

export interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof LogData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: string;
  rowCount: number;
} 