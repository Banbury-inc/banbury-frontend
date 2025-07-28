import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Toolbar,
  IconButton,
  Button,
  Typography,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  ButtonGroup,
} from '@mui/material';
import {
  Save,
  GetApp,
  Edit,
  Visibility,
  Add,
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  InsertChart,
  Functions,
  Undo,
  Redo,
  ContentCopy,
  ContentPaste,
  ContentCut,
  Delete,
  BorderAll,
  Palette,
  MoreVert,
} from '@mui/icons-material';
import { shell } from 'electron';
import fs from 'fs';
import * as XLSX from 'xlsx';
import Spreadsheet, { CellBase, Matrix } from 'react-spreadsheet';
import { Text } from '../../Text/Text';
import { ToolbarButton } from '../../ToolbarButton/ToolbarButton';

interface SpreadsheetEditorProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (filePath: string) => void;
}

interface SheetData {
  name: string;
  data: Matrix<CellBase>;
}

interface CellData extends CellBase {
  value: any;
  formula?: string;
  style?: {
    fontWeight?: 'bold' | 'normal';
    fontStyle?: 'italic' | 'normal';
    textDecoration?: 'underline' | 'none';
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    color?: string;
    border?: string;
  };
}

const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({
  src,
  fileName,
  onError,
  onLoad,
  onSave
}) => {
  // Custom ToolbarButton component for consistent styling
  const CustomToolbarButton = ({ 
    onClick, 
    active = false, 
    disabled = false, 
    children, 
    tooltip,
    color = 'default'
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    tooltip: string;
    color?: 'default' | 'primary' | 'secondary';
  }) => (
    <Tooltip title={tooltip}>
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          size="small"
          sx={{
            color: active ? '#1976d2' : '#424242',
            backgroundColor: active ? '#e3f2fd' : 'transparent',
            border: active ? '1px solid #1976d2' : '1px solid transparent',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: active ? '#bbdefb' : '#f5f5f5',
              color: active ? '#0d47a1' : '#212121',
              border: '1px solid #ccc',
            },
            '&:disabled': {
              color: '#bdbdbd',
              backgroundColor: 'transparent',
            },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [originalSheets, setOriginalSheets] = useState<SheetData[]>([]);
  
  // Advanced features state
  const [selectedRange, setSelectedRange] = useState<any>(null);
  const [clipboard, setClipboard] = useState<Matrix<CellBase> | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [isFormulaBarFocused, setIsFormulaBarFocused] = useState<boolean>(false);
  const [history, setHistory] = useState<Matrix<CellBase>[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Dialog states
  const [chartDialogOpen, setChartDialogOpen] = useState<boolean>(false);
  const [newSheetDialogOpen, setNewSheetDialogOpen] = useState<boolean>(false);
  const [newSheetName, setNewSheetName] = useState<string>('');
  
  // Menu states
  const [formatMenuAnchor, setFormatMenuAnchor] = useState<null | HTMLElement>(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

  // Convert XLSX data to react-spreadsheet format
  const convertToSpreadsheetData = useCallback((xlsxData: any[][]): Matrix<CellData> => {
    return xlsxData.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        value: cell || '',
        formula: cell && typeof cell === 'string' && cell.startsWith('=') ? cell : undefined,
        style: {
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'left',
          backgroundColor: '#ffffff',
          color: '#000000'
        }
      }))
    );
  }, []);

  // Convert react-spreadsheet data back to XLSX format
  const convertFromSpreadsheetData = useCallback((spreadsheetData: Matrix<CellBase>): any[][] => {
    return spreadsheetData.map(row =>
      row.map(cell => {
        if (cell && typeof cell === 'object') {
          const cellData = cell as CellData;
          return cellData.formula || cellData.value || '';
        }
        return cell || '';
      })
    );
  }, []);

  useEffect(() => {
    const loadExcelFile = async () => {
      try {
        let filePath = src;
        
        // Remove file:// protocol if present
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace('file://', '');
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error('Excel/CSV file does not exist');
        }

        // Determine if it's a CSV file
        const isCSV = filePath.toLowerCase().endsWith('.csv');
        
        let sheetsData: SheetData[] = [];
        
        if (isCSV) {
          // Handle CSV files
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const workbook = XLSX.read(fileContent, { type: 'string' });
          
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            sheetsData.push({
              name: 'Sheet1',
              data: convertToSpreadsheetData(jsonData as any[][])
            });
          });
        } else {
          // Handle Excel files
          const fileBuffer = fs.readFileSync(filePath);
          const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
          
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            sheetsData.push({
              name: sheetName,
              data: convertToSpreadsheetData(jsonData as any[][])
            });
          });
        }
        
        // Ensure we have at least one sheet
        if (sheetsData.length === 0) {
          sheetsData.push({
            name: 'Sheet1',
            data: convertToSpreadsheetData([])
          });
        }
        
        setSheets(sheetsData);
        setOriginalSheets(JSON.parse(JSON.stringify(sheetsData)));
        setLoading(false);
        onLoad?.();
        
      } catch (error) {
        console.error('Error loading Excel/CSV file:', error);
        setError(true);
        setLoading(false);
        onError?.();
      }
    };

    loadExcelFile();
  }, [src, onError, onLoad, convertToSpreadsheetData]);

  // Add to history for undo/redo
  const addToHistory = useCallback((data: Matrix<CellBase>) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(data)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Handle spreadsheet data change
  const handleDataChange = useCallback((data: Matrix<CellBase>) => {
    const newSheets = [...sheets];
    newSheets[activeSheet].data = data;
    setSheets(newSheets);
    
    // Check if there are changes
    const hasChanges = JSON.stringify(newSheets) !== JSON.stringify(originalSheets);
    setHasChanges(hasChanges);
    
    // Add to history
    addToHistory(data);
  }, [sheets, activeSheet, originalSheets, addToHistory]);

  // Keyboard shortcuts and actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newSheets = [...sheets];
      newSheets[activeSheet].data = history[historyIndex - 1];
      setSheets(newSheets);
      setHistoryIndex(historyIndex - 1);
    }
  }, [sheets, activeSheet, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newSheets = [...sheets];
      newSheets[activeSheet].data = history[historyIndex + 1];
      setSheets(newSheets);
      setHistoryIndex(historyIndex + 1);
    }
  }, [sheets, activeSheet, history, historyIndex]);

  const handleCopy = useCallback(() => {
    if (selectedRange) {
      // In a real implementation, you'd extract the selected cells
      // For now, we'll use a placeholder
      setClipboard(sheets[activeSheet].data);
    }
  }, [selectedRange, sheets, activeSheet]);

  const handlePaste = useCallback(() => {
    if (clipboard) {
      // In a real implementation, you'd paste the clipboard data at the selected position
      // For now, this is a placeholder
      console.log('Paste operation would happen here');
    }
  }, [clipboard]);

  const handleOpenWithSystemApp = () => {
    let filePath = src;
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }
    shell.openPath(filePath);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      let filePath = src;
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }

      const isCSV = filePath.toLowerCase().endsWith('.csv');
      
      if (isCSV) {
        // Save as CSV
        if (sheets.length > 0) {
          const xlsxData = convertFromSpreadsheetData(sheets[0].data);
          const worksheet = XLSX.utils.aoa_to_sheet(xlsxData);
          XLSX.writeFile({ Sheets: { Sheet1: worksheet }, SheetNames: ['Sheet1'] }, filePath, { bookType: 'csv' });
        }
      } else {
        // Save as Excel
        const workbook = XLSX.utils.book_new();
        
        sheets.forEach((sheet) => {
          const xlsxData = convertFromSpreadsheetData(sheet.data);
          const worksheet = XLSX.utils.aoa_to_sheet(xlsxData);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
        });
        
        XLSX.writeFile(workbook, filePath);
      }
      
      setOriginalSheets(JSON.parse(JSON.stringify(sheets)));
      setHasChanges(false);
      onSave?.(filePath);
      
    } catch (error) {
      console.error('Error saving Excel/CSV file:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSheet = () => {
    setNewSheetDialogOpen(true);
    setNewSheetName(`Sheet${sheets.length + 1}`);
  };

  const handleCreateSheet = () => {
    const newSheet: SheetData = {
      name: newSheetName || `Sheet${sheets.length + 1}`,
      data: convertToSpreadsheetData([])
    };
    setSheets([...sheets, newSheet]);
    setActiveSheet(sheets.length);
    setNewSheetDialogOpen(false);
    setNewSheetName('');
  };

  const currentSheetData = useMemo(() => {
    return sheets[activeSheet]?.data || [];
  }, [sheets, activeSheet]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          textAlign: 'center',
          height: '100%'
        }}
      >
        <Text className="text-lg font-semibold text-red-600 mb-2">
          Failed to load spreadsheet
        </Text>
        <Text className="mb-4">
          {fileName ? `Could not display "${fileName}"` : 'The spreadsheet could not be displayed'}
        </Text>
        <ToolbarButton 
          onClick={handleOpenWithSystemApp}
          className="mt-2"
        >
          <GetApp fontSize="inherit" /> Open with System App
        </ToolbarButton>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>

      {/* Formatting Toolbar */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          backgroundColor: '#f5f5f5',
          borderBottom: 1,
          borderColor: '#e0e0e0',
          minHeight: 40,
          flexShrink: 0,
          gap: 1,
          flexWrap: 'wrap',
          px: 1,
          py: 0.5
        }}
      >
        {/* Text Formatting */}
        <ButtonGroup size="small" variant="outlined">
          <CustomToolbarButton
            onClick={handleSave}
            disabled={!hasChanges || saving}
            active={hasChanges}
            tooltip="Save"
          >
            <Save fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            tooltip="Undo"
          >
            <Undo fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            tooltip="Redo"
          >
            <Redo fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement bold formatting */}}
            tooltip="Bold"
          >
            <FormatBold fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement italic formatting */}}
            tooltip="Italic"
          >
            <FormatItalic fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement underline formatting */}}
            tooltip="Underline"
          >
            <FormatUnderlined fontSize="inherit" />
          </CustomToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />
        
        {/* Text Alignment */}
        <ButtonGroup size="small" variant="outlined">
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement align left */}}
            tooltip="Align Left"
          >
            <FormatAlignLeft fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement align center */}}
            tooltip="Align Center"
          >
            <FormatAlignCenter fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement align right */}}
            tooltip="Align Right"
          >
            <FormatAlignRight fontSize="inherit" />
          </CustomToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />
        
        {/* Cell Styling */}
        <ButtonGroup size="small" variant="outlined">
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement borders */}}
            tooltip="Borders"
          >
            <BorderAll fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement fill color */}}
            tooltip="Fill Color"
          >
            <Palette fontSize="inherit" />
          </CustomToolbarButton>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />
        
        {/* Advanced Features */}
        <ButtonGroup size="small" variant="outlined">
          <CustomToolbarButton
            onClick={() => setChartDialogOpen(true)}
            tooltip="Insert Chart"
          >
            <InsertChart fontSize="inherit" />
          </CustomToolbarButton>
          <CustomToolbarButton
            onClick={() => {/* TODO: Implement functions */}}
            tooltip="Functions"
          >
            <Functions fontSize="inherit" />
          </CustomToolbarButton>
        </ButtonGroup>
      </Toolbar>

      {/* Formula Bar */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottom: 1,
        borderColor: '#e0e0e0',
        px: 1,
        py: 0.5,
        minHeight: 36
      }}>
        <Typography variant="body2" sx={{ 
          mr: 1, 
          minWidth: 40, 
          color: '#333',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          fx
        </Typography>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          value={formulaBarValue}
          onChange={(e) => setFormulaBarValue(e.target.value)}
          onFocus={() => setIsFormulaBarFocused(true)}
          onBlur={() => setIsFormulaBarFocused(false)}
          placeholder="Enter formula or value"
          sx={{ 
            '& .MuiOutlinedInput-root': { 
              height: 32,
              fontSize: '14px',
              backgroundColor: '#fff',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#ccc',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#999',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1976d2',
            },
            '& .MuiInputBase-input': {
              color: '#333',
            }
          }}
        />
      </Box>

      
      {/* Loading Overlay */}
      {saving && (
        <Box sx={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 1,
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <CircularProgress size={20} />
          <Typography>Saving spreadsheet...</Typography>
        </Box>
      )}

      {/* Add Sheet Dialog */}
      <Dialog open={newSheetDialogOpen} onClose={() => setNewSheetDialogOpen(false)}>
        <DialogTitle>Add New Sheet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Sheet Name"
            fullWidth
            variant="outlined"
            value={newSheetName}
            onChange={(e) => setNewSheetName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSheetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSheet} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Chart Dialog */}
      <Dialog open={chartDialogOpen} onClose={() => setChartDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Insert Chart</DialogTitle>
        <DialogContent>
          <Typography>Chart creation functionality would be implemented here.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChartDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => setChartDialogOpen(false)} variant="contained">Insert</Button>
        </DialogActions>
      </Dialog>

      {/* Spreadsheet Content */}
      <Box sx={{ 
        flexGrow: 1,
        overflow: 'auto',
        bgcolor: '#ffffff',
        position: 'relative',
        '& .Spreadsheet': {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          minWidth: 'max-content',
          width: 'auto',
        },
        '& .Spreadsheet__table': {
          borderCollapse: 'collapse',
          tableLayout: 'auto',
          minWidth: 'max-content',
        },
        '& .Spreadsheet__cell': {
          border: '1px solid #ddd',
          padding: '4px 8px',
          minWidth: '100px',
          width: '100px',
          maxWidth: 'none',
          minHeight: '24px',
          backgroundColor: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        '& .Spreadsheet__cell--selected': {
          backgroundColor: '#e3f2fd',
          outline: '2px solid #1976d2',
          outlineOffset: '-1px',
        },
        '& .Spreadsheet__cell--editing': {
          backgroundColor: '#fff',
          whiteSpace: 'normal',
          overflow: 'visible',
        },
        '& .Spreadsheet__header': {
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          padding: '4px 8px',
          fontWeight: 'bold',
          textAlign: 'center',
          minWidth: '100px',
          width: '100px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        },
        '& .Spreadsheet__header--row': {
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          padding: '4px 8px',
          fontWeight: 'bold',
          textAlign: 'center',
          minWidth: '40px',
          width: '40px',
          position: 'sticky',
          left: 0,
          zIndex: 2,
        },
        '& .Spreadsheet__header--row.Spreadsheet__header--column': {
          zIndex: 3,
        },
      }}>
        {loading && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 10
          }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && sheets[activeSheet] && (
          <Box sx={{ 
            minWidth: 'max-content',
            minHeight: 'max-content',
            position: 'relative'
          }}>
            <Spreadsheet
              data={currentSheetData}
              onChange={handleDataChange}
              onSelect={setSelectedRange}
              columnLabels={['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ']}
              rowLabels={Array.from({ length: 200 }, (_, i) => String(i + 1))}
              hideColumnIndicators={false}
              hideRowIndicators={false}
            />
          </Box>
        )}
      </Box>

      {/* Sheet Tabs - Moved to bottom */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        borderTop: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#f9f9f9',
        minHeight: 40,
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', flex: 1, overflow: 'auto' }}>
          {sheets.map((sheet, index) => (
            <Button
              key={index}
              onClick={() => setActiveSheet(index)}
              sx={{
                minWidth: 100,
                height: 32,
                borderRadius: 0,
                textTransform: 'none',
                fontSize: '14px',
                color: activeSheet === index ? '#1976d2' : '#666',
                borderTop: activeSheet === index ? 2 : 0,
                borderColor: '#1976d2',
                backgroundColor: activeSheet === index ? '#e3f2fd' : 'transparent',
                '&:hover': {
                  backgroundColor: activeSheet === index ? '#bbdefb' : '#f0f0f0'
                }
              }}
            >
              {sheet.name}
            </Button>
          ))}
        </Box>
        
        <CustomToolbarButton
          onClick={handleAddSheet}
          tooltip="Add Sheet"
        >
          <Add fontSize="inherit" />
        </CustomToolbarButton>
      </Box>
    </Box>
  );
};

export default SpreadsheetEditor; 