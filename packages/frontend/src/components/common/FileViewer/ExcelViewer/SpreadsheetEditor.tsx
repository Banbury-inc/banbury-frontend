import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Toolbar,
  IconButton,
  Button,
  Typography,
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
  BorderAll,
  Palette,
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
    tooltip
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    tooltip: string;
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
  
  // Simplified state management following react-spreadsheet patterns
  const [selectedRange, setSelectedRange] = useState<any>(null);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  
  // Dialog states
  const [chartDialogOpen, setChartDialogOpen] = useState<boolean>(false);
  const [newSheetDialogOpen, setNewSheetDialogOpen] = useState<boolean>(false);
  const [newSheetName, setNewSheetName] = useState<string>('');
  
  // Performance optimization - track original data for change detection
  const originalDataRef = useRef<Matrix<CellBase>[]>([]);
  const changeTimeoutRef = useRef<NodeJS.Timeout>();

  // Convert XLSX data to proper react-spreadsheet CellBase format
  const convertToSpreadsheetData = useCallback((xlsxData: any[][]): Matrix<CellBase> => {
    return xlsxData.map((row) =>
      row.map((cellValue) => {
        // Follow the CellBase interface exactly as specified in the API
        const cell: CellBase = {
          value: cellValue ?? ''
        };
        return cell;
      })
    );
  }, []);

  // Convert react-spreadsheet data back to XLSX format
  const convertFromSpreadsheetData = useCallback((spreadsheetData: Matrix<CellBase>): any[][] => {
    return spreadsheetData.map(row =>
      row.map(cell => cell?.value ?? '')
    );
  }, []);

  // Optimized change detection using shallow comparison
  const checkForChanges = useCallback(() => {
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    changeTimeoutRef.current = setTimeout(() => {
      if (!sheets[activeSheet] || !originalDataRef.current[activeSheet]) {
        setHasChanges(false);
        return;
      }

      const currentData = sheets[activeSheet].data;
      const originalData = originalDataRef.current[activeSheet];

      // Quick reference check first
      if (currentData === originalData) {
        setHasChanges(false);
        return;
      }

      // Efficient shallow comparison
      let hasChanges = false;
      
      if (currentData.length !== originalData.length) {
        hasChanges = true;
      } else {
        for (let rowIndex = 0; rowIndex < currentData.length && !hasChanges; rowIndex++) {
          const currentRow = currentData[rowIndex];
          const originalRow = originalData[rowIndex];
          
          if (!currentRow || !originalRow || currentRow.length !== originalRow.length) {
            hasChanges = true;
            break;
          }
          
          for (let colIndex = 0; colIndex < currentRow.length; colIndex++) {
            const currentCell = currentRow[colIndex];
            const originalCell = originalRow[colIndex];
            
            if (currentCell?.value !== originalCell?.value) {
              hasChanges = true;
              break;
            }
          }
        }
      }
      
      setHasChanges(hasChanges);
    }, 50); // Reduced debounce time for better responsiveness
  }, [sheets, activeSheet]);

  // Load Excel/CSV file
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
        
        // Store original data for change detection
        originalDataRef.current = sheetsData.map(sheet => 
          sheet.data.map(row => 
            row.map(cell => cell ? { ...cell } as CellBase : undefined)
          )
        );
        
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

  // Optimized data change handler - follows react-spreadsheet patterns
  const handleDataChange = useCallback((data: Matrix<CellBase>) => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets];
      newSheets[activeSheet] = {
        ...newSheets[activeSheet],
        data: data
      };
      return newSheets;
    });
    
    // Trigger change detection
    checkForChanges();
  }, [activeSheet, checkForChanges]);

  // Selection handler - follows react-spreadsheet API
  const handleSelectionChange = useCallback((selection: any) => {
    setSelectedRange(selection);
    
    // Update formula bar based on selection
    if (selection && sheets[activeSheet]) {
      // For single cell selection, show the cell value
      try {
        const cell = sheets[activeSheet].data[selection.start?.row]?.[selection.start?.column];
        if (cell) {
          setFormulaBarValue(String(cell.value || ''));
        } else {
          setFormulaBarValue('');
        }
      } catch {
        setFormulaBarValue('');
      }
    } else {
      setFormulaBarValue('');
    }
  }, [sheets, activeSheet]);

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
      
      // Update original data reference
      originalDataRef.current = sheets.map(sheet => 
        sheet.data.map(row => 
          row.map(cell => cell ? { ...cell } as CellBase : undefined)
        )
      );
      
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

  // Memoize current sheet data to prevent unnecessary re-renders
  const currentSheetData = useMemo(() => {
    return sheets[activeSheet]?.data || [];
  }, [sheets, activeSheet]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, []);

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
            tooltip="Save"
          >
            <Save fontSize="inherit" />
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
        },
        '& .Spreadsheet__table': {
          borderCollapse: 'collapse',
        },
        '& .Spreadsheet__cell': {
          border: '1px solid #ddd',
          padding: '4px 8px',
          minWidth: '100px',
          minHeight: '24px',
          backgroundColor: '#fff',
        },
        '& .Spreadsheet__cell--selected': {
          backgroundColor: '#e3f2fd',
          outline: '2px solid #1976d2',
          outlineOffset: '-1px',
        },
        '& .Spreadsheet__header': {
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          padding: '4px 8px',
          fontWeight: 'bold',
          textAlign: 'center',
          minWidth: '100px',
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
          <Spreadsheet
            data={currentSheetData}
            onChange={handleDataChange}
            onSelect={handleSelectionChange}
            hideColumnIndicators={false}
            hideRowIndicators={false}
          />
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