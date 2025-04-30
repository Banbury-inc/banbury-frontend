export interface DatabaseData {
  _id?: string;
  id: number | string;
  file_name: string;
  file_path: string;
  file_size: string | number;
  kind: string;
  device_name: string;
  date_uploaded: string;
  available: string;
  file_priority?: number;
  original_device?: string;
  file_type?: string;
  file_parent?: string;
  is_public?: boolean;
  deviceID?: string;
  children?: DatabaseData[];
  helpers?: number;
  shared_with?: string[];
  source?: 'files' | 'sync' | 'shared' | 's3files';
  owner?: string;
  date_modified?: string;
  is_s3?: boolean;
  s3_url?: string;
  device_ids?: string[];
}

export type Order = 'asc' | 'desc';

export interface HeadCell {
  disablePadding?: boolean;
  id: keyof DatabaseData;
  label: string;
  numeric: boolean;
  isVisibleOnSmallScreen: boolean;
  isVisibleNotOnCloudSync: boolean;
  visibleIn?: Array<'files' | 'sync' | 'shared' | 's3files'>;
}

export interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof DatabaseData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  order: Order;
  orderBy: keyof DatabaseData;
  rowCount: number;
  currentView?: 'files' | 'sync' | 'shared' | 's3files';
}