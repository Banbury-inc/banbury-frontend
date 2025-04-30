import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TableSortLabel, 
  Box,
  Checkbox,
  ButtonBase,
  Rating,
  Skeleton,
  useMediaQuery,
  Typography as _Typography
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { DatabaseData, Order, HeadCell, EnhancedTableProps } from '../../types';
import { formatFileSize } from '../../utils/formatFileSize';

// Import the head cells function
const getHeadCells = (): HeadCell[] => [
  { 
    id: 'file_name', 
    numeric: false, 
    label: 'Name', 
    isVisibleOnSmallScreen: true, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['files', 'sync', 'shared']
  },
  { 
    id: 'file_size', 
    numeric: false, 
    label: 'Size', 
    isVisibleOnSmallScreen: true, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['files', 'sync', 'shared']
  },
  { 
    id: 'kind', 
    numeric: false, 
    label: 'Kind', 
    isVisibleOnSmallScreen: true, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['files', 'sync', 'shared']
  },
  { 
    id: 'device_name', 
    numeric: false, 
    label: 'Location', 
    isVisibleOnSmallScreen: true, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['files', 'sync', 'shared']
  },
  { 
    id: 'available', 
    numeric: false, 
    label: 'Status', 
    isVisibleOnSmallScreen: false, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['files', 'sync', 'shared']
  },
  { 
    id: 'file_priority', 
    numeric: false, 
    label: 'Priority', 
    isVisibleOnSmallScreen: false, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['files', 'sync']
  },
  { 
    id: 'date_uploaded', 
    numeric: false, 
    label: 'Date Uploaded', 
    isVisibleOnSmallScreen: false, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['files', 'sync', 'shared']
  },
  { 
    id: 'is_public', 
    numeric: false, 
    label: 'Visibility', 
    isVisibleOnSmallScreen: false, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['files']
  },
  { 
    id: 'original_device', 
    numeric: false, 
    label: 'Original Device', 
    isVisibleOnSmallScreen: false, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['shared']
  },
  { 
    id: 'owner', 
    numeric: false, 
    label: 'Owner', 
    isVisibleOnSmallScreen: false, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['shared']
  },
  { 
    id: 'date_modified', 
    numeric: false, 
    label: 'Last Modified', 
    isVisibleOnSmallScreen: false, 
    isVisibleNotOnCloudSync: true,
    visibleIn: ['shared']
  }
];

interface EnhancedTableHeadProps extends EnhancedTableProps {
  columnVisibility?: { [key: string]: boolean };
  currentView?: 'files' | 'sync' | 'shared';
}

function EnhancedTableHead(props: EnhancedTableHeadProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort, currentView } = props;
  const isSmallScreen = useMediaQuery('(max-width:960px)');
  const headCells = getHeadCells();
  const createSortHandler = (property: keyof DatabaseData) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell
          padding="checkbox"
          size="small"
          sx={{
            backgroundColor: 'background.paper',
            paddingLeft: '10px',
          }}
        >
          <Checkbox
            size="small"
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            style={{ width: '4px'}}
            inputProps={{
              'aria-label': 'select all desserts',
            }}
          />
        </TableCell>
        {headCells
          .filter((headCell: HeadCell) => {
            const isVisibleOnCurrentScreen = !isSmallScreen || headCell.isVisibleOnSmallScreen;
            const isVisibleInCurrentView = !headCell.visibleIn || headCell.visibleIn.includes(currentView || 'files');
            return isVisibleOnCurrentScreen && isVisibleInCurrentView;
          })
          .map((headCell: HeadCell, index: number) => (
            <TableCell
              key={`${headCell.id}-${index}`}
              align={headCell.numeric ? 'right' : 'left'}
              sortDirection={orderBy === headCell.id ? order : false}
              sx={{
                backgroundColor: 'background.paper',
              }}
            >
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            </TableCell>
          ))}
      </TableRow>
    </TableHead>
  );
}

function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number): T[] {
  return [...array]
    .map((el, index) => ({ el, index }))
    .sort((a, b) => {
      const order = comparator(a.el, b.el);
      if (order !== 0) return order;
      return a.index - b.index;
    })
    .map(({ el }) => el);
}

function getComparator(
  order: Order,
  orderBy: keyof DatabaseData,
): (a: DatabaseData, b: DatabaseData) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function descendingComparator(a: DatabaseData, b: DatabaseData, orderBy: keyof DatabaseData) {
  const aValue = a[orderBy] || '';
  const bValue = b[orderBy] || '';
  
  if (bValue < aValue) {
    return -1;
  }
  if (bValue > aValue) {
    return 1;
  }
  return 0;
}

interface FileTableProps {
  fileRows: DatabaseData[];
  isLoading: boolean;
  order: Order;
  orderBy: keyof DatabaseData;
  selected: readonly (string | number)[];
  page: number;
  rowsPerPage: number;
  isCloudSync: boolean;
  hoveredRowId: string | number | null;
  _devices: any[];
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof DatabaseData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleClick: (event: React.MouseEvent<unknown> | React.ChangeEvent<HTMLInputElement>, id: string | number) => void;
  handleFileNameClick: (id: string | number) => void;
  isSelected: (id: string | number) => boolean;
  setHoveredRowId: (id: string | number | null) => void;
  handlePriorityChange: (row: any, newValue: number | null) => void;
  columnVisibility: { [key: string]: boolean };
  currentView?: 'files' | 'sync' | 'shared';
}

const FileTable: React.FC<FileTableProps> = ({
  fileRows,
  isLoading,
  order,
  orderBy,
  selected,
  page,
  rowsPerPage,
  isCloudSync,
  hoveredRowId,
  _devices,
  onRequestSort,
  onSelectAllClick,
  handleClick,
  handleFileNameClick,
  isSelected,
  setHoveredRowId,
  handlePriorityChange,
  columnVisibility,
  currentView = 'files'
}) => {
  // Empty rows calculation for pagination display
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - fileRows.length) : 0;

  return (
    <TableContainer 
      data-testid="file-list"
      data-view="list"
      sx={{ 
        height: 'calc(100vh - 200px)',
        overflow: 'auto',
        transition: 'all 0.2s ease-in-out',
        display: 'block'
      }}
    >
      <Table 
        aria-labelledby="tableTitle" 
        size="small" 
        stickyHeader
        sx={{
          tableLayout: 'fixed'
        }}
      >
        <EnhancedTableHead
          numSelected={selected.length}
          order={order}
          orderBy={orderBy}
          onSelectAllClick={onSelectAllClick}
          onRequestSort={onRequestSort}
          rowCount={fileRows.length}
          currentView={currentView}
        />
        <TableBody>
          {isLoading
            ? Array.from(new Array(rowsPerPage)).map((_, index) => (
              <TableRow 
                key={`skeleton-${index}`}
              >
                <TableCell padding="checkbox" size="small">
                  <Skeleton variant="rectangular" width={24} height={24} />
                </TableCell>
                {columnVisibility.file_name && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {columnVisibility.file_size && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {columnVisibility.kind && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {columnVisibility.device_name && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {columnVisibility.available && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {columnVisibility.date_uploaded && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
              </TableRow>
            ))
            : stableSort(fileRows, getComparator(order, orderBy))
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => {
                const isItemSelected = isSelected(row.id);
                const labelId = `enhanced-table-checkbox-${index}`;

                return (
                  <TableRow
                    hover
                    data-testid="file-item"
                    onClick={(event) => handleClick(event, row.id)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={`row-${row.id || `${row.file_path}-${row.device_name}-${index}`}`}
                    selected={isItemSelected}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <TableCell sx={{ borderBottomColor: '#424242' }} padding="checkbox" size="small">
                      {hoveredRowId === row.id || isItemSelected ? ( // Only render Checkbox if row is hovered
                        <Checkbox
                          color="primary"
                          size="small"
                          checked={isItemSelected}
                          inputProps={{ 'aria-labelledby': labelId }}
                        />
                      ) : null}
                    </TableCell>

                    {columnVisibility.file_name && (
                      <TableCell
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        component="th"
                        id={labelId}
                        scope="row"
                        padding="normal"
                      >
                        <ButtonBase
                          onClick={(event) => {
                            event.stopPropagation();
                            handleFileNameClick(row.id);
                          }}
                          style={{ textDecoration: 'none' }}
                        >
                          {row.file_name}
                        </ButtonBase>
                      </TableCell>
                    )}

                    {columnVisibility.file_size && (
                      <TableCell
                        align="left"
                        padding="normal"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {formatFileSize(row.file_size)}
                      </TableCell>
                    )}

                    {columnVisibility.kind && (
                      <TableCell
                        align="left"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.kind}
                      </TableCell>
                    )}

                    {columnVisibility.device_name && (
                      <TableCell
                        align="left"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.device_name}
                      </TableCell>
                    )}

                    {columnVisibility.available && (
                      <TableCell
                        align="left"
                        padding="normal"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color:
                            row.available === 'Available'
                              ? '#1DB954'
                              : row.available === 'Unavailable'
                                ? 'red'
                                : 'inherit', // Default color is 'inherit'
                        }}
                      >
                        {row.available}
                      </TableCell>
                    )}

                    {columnVisibility.file_priority && (currentView === 'files' || currentView === 'sync') && (
                      <TableCell
                        align="left"
                        padding="normal"
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <Rating
                          name={`priority-${row.id || `${row.file_path}-${row.device_name}-${index}`}`}
                          value={Number(row.file_priority) || 0}
                          max={3}
                          onChange={(_event, newValue) => handlePriorityChange(row, newValue)}
                          sx={{
                            fontSize: '16px',
                            '& .MuiRating-iconFilled': {
                              color: () => {
                                const priority = Number(row.file_priority);
                                if (priority >= 4) return '#FF9500';
                                if (priority === 3) return '#FFCC00';
                                return '#1DB954';
                              }
                            }
                          }}
                        />
                      </TableCell>
                    )}

                    {columnVisibility.date_uploaded && (
                      <TableCell
                        padding="normal"
                        align="right"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.date_uploaded}
                      </TableCell>
                    )}
                    {columnVisibility.is_public && (
                      <TableCell
                        padding="normal"
                        align="right"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.is_public}
                      </TableCell>
                    )}

                    {currentView === 'shared' && row.original_device && (
                      <TableCell
                        align="left"
                        padding="normal"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.original_device}
                      </TableCell>
                    )}

                    {currentView === 'shared' && row.owner && (
                      <TableCell
                        align="left"
                        padding="normal"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.owner}
                      </TableCell>
                    )}

                    {currentView === 'shared' && row.date_modified && (
                      <TableCell
                        align="left"
                        padding="normal"
                        sx={{
                          borderBottomColor: '#424242',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.date_modified}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          {emptyRows > 0 && (
            <TableRow style={{ height: 33 * emptyRows }}>
              <TableCell colSpan={6} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FileTable;
