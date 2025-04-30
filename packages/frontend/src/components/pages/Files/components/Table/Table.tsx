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
  Skeleton
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { DatabaseData, Order } from '../../types';
import { formatFileSize } from '../../utils/formatFileSize';
import { EnhancedTableProps, HeadCell } from '../../types';

// Import the head cells function
const getHeadCells = (): HeadCell[] => [
  { id: 'file_name', numeric: false, label: 'Name', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'file_size', numeric: false, label: 'Size', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'kind', numeric: false, label: 'Kind', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
  { id: 'device_name', numeric: false, label: 'Location', isVisibleOnSmallScreen: false, isVisibleNotOnCloudSync: true },
  { id: 'available', numeric: false, label: 'Status', isVisibleOnSmallScreen: false, isVisibleNotOnCloudSync: true },
  { id: 'file_priority', numeric: false, label: 'Priority', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: false },
  { id: 'date_uploaded', numeric: true, label: 'Date Uploaded', isVisibleOnSmallScreen: true, isVisibleNotOnCloudSync: true },
];

interface EnhancedTableHeadProps extends EnhancedTableProps {
  columnVisibility?: { [key: string]: boolean };
}

function EnhancedTableHead(props: EnhancedTableHeadProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort, columnVisibility } = props;
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
          .filter(headCell => !columnVisibility || columnVisibility[headCell.id] !== false)
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

function stableSort<T>(array: T[], comparator: (a: T, b: T) => number): T[] {
  return array
    .map((el, index) => ({ el, index })) // Attach the original index to each element
    .sort((a, b) => {
      const order = comparator(a.el, b.el);
      if (order !== 0) return order; // If elements are not equal, sort them according to `comparator`
      return a.index - b.index; // If elements are equal, sort them according to their original position
    })
    .map(({ el }) => el); // Extract the sorted elements
}

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

interface FileTableProps {
  fileRows: any[];
  isLoading: boolean;
  order: Order;
  orderBy: keyof DatabaseData;
  selected: readonly number[];
  page: number;
  rowsPerPage: number;
  isCloudSync: boolean;
  hoveredRowId: number | null;
  devices: any[];
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof DatabaseData) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleClick: (event: React.MouseEvent<unknown> | React.ChangeEvent<HTMLInputElement>, id: number) => void;
  handleFileNameClick: (id: number) => Promise<void>;
  isSelected: (id: number) => boolean;
  setHoveredRowId: (id: number | null) => void;
  handlePriorityChange: (row: any, newValue: number | null) => Promise<void>;
  columnVisibility?: { [key: string]: boolean };
}

export default function FileTable({
  fileRows,
  isLoading,
  order,
  orderBy,
  selected,
  page,
  rowsPerPage,
  isCloudSync,
  hoveredRowId,
  devices: _devices,
  onRequestSort,
  onSelectAllClick,
  handleClick,
  handleFileNameClick,
  isSelected,
  setHoveredRowId,
  handlePriorityChange,
  columnVisibility
}: FileTableProps) {
  
  // Helper function to check if a column is visible
  const isColumnVisible = (columnId: string): boolean => {
    if (!columnVisibility) return true;
    return columnVisibility[columnId] !== false;
  };
  
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
          columnVisibility={columnVisibility}
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
                {isColumnVisible('file_name') && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {isColumnVisible('file_size') && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {isColumnVisible('kind') && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {isColumnVisible('device_name') && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {isColumnVisible('available') && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
                {isColumnVisible('date_uploaded') && (
                  <TableCell>
                    <Skeleton variant="text" width="100%" />
                  </TableCell>
                )}
              </TableRow>
            ))
            : stableSort(fileRows, getComparator(order, orderBy))
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => {
                const isItemSelected = isSelected(row.id as number);
                const labelId = `enhanced-table-checkbox-${index}`;

                return (
                  <TableRow
                    hover
                    data-testid="file-item"
                    onClick={(event) => handleClick(event, row.id as number)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={row.id}
                    selected={isItemSelected}
                    onMouseEnter={() => setHoveredRowId(row.id as number)}
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

                    {isColumnVisible('file_name') && (
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
                            handleFileNameClick(row.id as number);
                          }}
                          style={{ textDecoration: 'none' }}
                        >
                          {row.file_name}
                        </ButtonBase>
                      </TableCell>
                    )}

                    {isColumnVisible('file_size') && (
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

                    {(!isCloudSync && isColumnVisible('kind')) && (
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

                    {(!isCloudSync && isColumnVisible('device_name')) && (
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

                    {(!isCloudSync && isColumnVisible('available')) && (
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

                    {isColumnVisible('is_public') && (
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
                        {row.is_public ? 'Public' : 'Private'}
                      </TableCell>
                    )}

                    {(isCloudSync && isColumnVisible('file_priority')) && (
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
                          name={`priority-${row.id}`}
                          value={Number(row.file_priority)}
                          max={5}
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

                    {(!isCloudSync && isColumnVisible('date_uploaded')) && (
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
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
