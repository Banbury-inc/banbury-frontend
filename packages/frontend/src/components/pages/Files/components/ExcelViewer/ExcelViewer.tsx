import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  Toolbar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Save,
  GetApp,
  Edit,
  Visibility
} from '@mui/icons-material';
import { shell } from 'electron';
import fs from 'fs';
import * as XLSX from 'xlsx';

// Note: Luckysheet requires a different integration approach
// For now, we'll use a simpler table-based approach with XLSX

interface ExcelViewerProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (filePath: string) => void;
}

interface SheetData {
  name: string;
  data: any[][];
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({
  src,
  fileName,
  onError,
  onLoad,
  onSave
}) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [originalSheets, setOriginalSheets] = useState<SheetData[]>([]);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
          // Handle CSV files using XLSX library
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const workbook = XLSX.read(fileContent, { type: 'string' });
          
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            sheetsData.push({
              name: 'Sheet1', // Use a consistent name for CSV
              data: jsonData as any[][]
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
              data: jsonData as any[][]
            });
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
  }, [src, onError, onLoad]);

  const handleOpenWithSystemApp = () => {
    let filePath = src;
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }
    shell.openPath(filePath);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleView = () => {
    setIsEditing(false);
  };

  const handleCellEdit = (sheetIndex: number, rowIndex: number, colIndex: number, value: any) => {
    const newSheets = [...sheets];
    
    // Ensure the row exists
    while (newSheets[sheetIndex].data.length <= rowIndex) {
      newSheets[sheetIndex].data.push([]);
    }
    
    // Ensure the column exists
    while (newSheets[sheetIndex].data[rowIndex].length <= colIndex) {
      newSheets[sheetIndex].data[rowIndex].push('');
    }
    
    newSheets[sheetIndex].data[rowIndex][colIndex] = value;
    setSheets(newSheets);
    
    // Check if there are changes
    const hasChanges = JSON.stringify(newSheets) !== JSON.stringify(originalSheets);
    setHasChanges(hasChanges);
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
          const worksheet = XLSX.utils.aoa_to_sheet(sheets[0].data);
          XLSX.writeFile({ Sheets: { Sheet1: worksheet }, SheetNames: ['Sheet1'] }, filePath, { bookType: 'csv' });
        }
      } else {
        // Save as Excel
        const workbook = XLSX.utils.book_new();
        
        sheets.forEach((sheet) => {
          const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
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

  const renderCell = (value: any, sheetIndex: number, rowIndex: number, colIndex: number) => {
    if (isEditing) {
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleCellEdit(sheetIndex, rowIndex, colIndex, e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            padding: '4px',
            fontSize: '14px',
            color: '#000000',
            backgroundColor: 'transparent'
          }}
        />
      );
    }
    
    return (
      <div style={{ 
        padding: '4px', 
        fontSize: '14px',
        color: '#000000',
        backgroundColor: 'transparent',
        minHeight: '22px'
      }}>
        {value || ''}
      </div>
    );
  };

  const getColumnLabel = (index: number): string => {
    let label = '';
    let num = index;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return label;
  };

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
        <Typography variant="h6" color="error" gutterBottom>
          Failed to load spreadsheet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fileName ? `Could not display "${fileName}"` : 'The spreadsheet could not be displayed'}
        </Typography>
        <Button 
          variant="outlined" 
          onClick={handleOpenWithSystemApp}
          sx={{ mt: 1 }}
          startIcon={<GetApp />}
        >
          Open with System App
        </Button>
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
      {/* Excel Toolbar */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 48,
          gap: 1
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {fileName}
        </Typography>
        
        {hasChanges && (
          <Typography variant="body2" color="warning.main" sx={{ mr: 2 }}>
            Unsaved changes
          </Typography>
        )}
        
        <IconButton 
          onClick={isEditing ? handleView : handleEdit} 
          size="small" 
          title={isEditing ? "View mode" : "Edit mode"}
        >
          {isEditing ? <Visibility /> : <Edit />}
        </IconButton>
        
        {isEditing && (
          <IconButton 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            size="small" 
            title="Save spreadsheet"
          >
            <Save />
          </IconButton>
        )}
        
        <IconButton onClick={handleOpenWithSystemApp} size="small" title="Open with system app">
          <GetApp />
        </IconButton>
      </Toolbar>

      {/* Sheet Tabs */}
      {sheets.length > 1 && (
        <Box sx={{ 
          display: 'flex',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          {sheets.map((sheet, index) => (
            <Button
              key={index}
              variant={activeSheet === index ? 'contained' : 'text'}
              size="small"
              onClick={() => setActiveSheet(index)}
              sx={{ 
                borderRadius: 0,
                textTransform: 'none'
              }}
            >
              {sheet.name}
            </Button>
          ))}
        </Box>
      )}

      {/* Excel Content */}
      <Box sx={{ 
        flexGrow: 1,
        overflow: 'auto',
        bgcolor: '#f5f5f5'
      }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && sheets[activeSheet] && (
          <Box sx={{ p: 1 }}>
            <table style={{ 
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              width: '100%',
              color: '#000000'
            }}>
              <thead>
                <tr>
                  <th style={{ 
                    border: '1px solid #ddd',
                    padding: '8px',
                    backgroundColor: '#f0f0f0',
                    width: '40px',
                    fontSize: '12px',
                    color: '#000000'
                  }}>
                    
                  </th>
                  {/* Generate column headers based on maximum row length */}
                  {Array.from({ length: Math.max(...sheets[activeSheet].data.map(row => row.length), 1) }, (_, colIndex) => (
                    <th key={colIndex} style={{ 
                      border: '1px solid #ddd',
                      padding: '8px',
                      backgroundColor: '#f0f0f0',
                      minWidth: '100px',
                      fontSize: '12px',
                      color: '#000000'
                    }}>
                      {getColumnLabel(colIndex)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheets[activeSheet].data.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ 
                      border: '1px solid #ddd',
                      padding: '20px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      No data to display
                    </td>
                  </tr>
                ) : (
                  sheets[activeSheet].data.map((row, rowIndex) => {
                    const maxCols = Math.max(...sheets[activeSheet].data.map(r => r.length), 1);
                    return (
                      <tr key={rowIndex}>
                        <td style={{ 
                          border: '1px solid #ddd',
                          padding: '4px',
                          backgroundColor: '#f0f0f0',
                          textAlign: 'center',
                          fontSize: '12px',
                          color: '#000000'
                        }}>
                          {rowIndex + 1}
                        </td>
                        {Array.from({ length: maxCols }, (_, colIndex) => (
                          <td key={colIndex} style={{ 
                            border: '1px solid #ddd',
                            minWidth: '100px',
                            height: '30px',
                            backgroundColor: 'white',
                            color: '#000000'
                          }}>
                            {renderCell(row[colIndex], activeSheet, rowIndex, colIndex)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Box>
        )}
      </Box>
      
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
    </Box>
  );
};

export default ExcelViewer; 