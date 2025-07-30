import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Typography
} from '@mui/material';
import { shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';
import { Text } from '../../Text/Text';
import { ToolbarButton } from '../../ToolbarButton/ToolbarButton';
import { GetApp } from '@mui/icons-material';

// Univer imports
import { Univer, UniverInstanceType, LocaleType } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';

// Import Univer CSS
import '@univerjs/design/lib/index.css';
import '@univerjs/ui/lib/index.css';
import '@univerjs/docs-ui/lib/index.css';
import '@univerjs/sheets-ui/lib/index.css';

// Enhanced locale data for English
const enUS = {
  locale: 'en-US',
  general: {
    confirm: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    edit: 'Edit',
    copy: 'Copy',
    paste: 'Paste',
    cut: 'Cut',
    delete: 'Delete',
  },
  spreadsheet: {
    toolbar: {
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
    },
  },
};

// Convert XLSX data to Univer cell data format
const convertToUniverCellData = (xlsxData: any[][]) => {
  const cellData: any = {};
  
  xlsxData.forEach((row, rowIndex) => {
    row.forEach((cellValue, colIndex) => {
      if (cellValue !== '' && cellValue != null) {
        if (!cellData[rowIndex]) {
          cellData[rowIndex] = {};
        }
        cellData[rowIndex][colIndex] = {
          v: cellValue,
          t: typeof cellValue === 'number' ? 1 : 0, // 1 for number, 0 for string
          s: null, // style
          f: null, // formula
          p: null, // rich text
        };
      }
    });
  });
  
  return cellData;
};

interface SpreadsheetEditorProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (filePath: string) => void;
}

const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({
  src,
  fileName,
  onError,
  onLoad,
  onSave
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<Univer | null>(null);

  // Load spreadsheet data from file
  const loadSpreadsheetData = async () => {
    try {
      let filePath = src;
      
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }

      // Normalize the path for cross-platform compatibility
      filePath = path.normalize(filePath);

      console.log('Loading spreadsheet file:', filePath);
      
      // Check if file exists first
      try {
        await fs.access(filePath);
      } catch (accessError) {
        console.error('File access error:', accessError);
        throw new Error(`Cannot access file: ${filePath}`);
      }

      const isCSV = filePath.toLowerCase().endsWith('.csv');
      let workbookData: any;

      if (isCSV) {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const xlsxWorkbook = XLSX.read(fileContent, { type: 'string' });
        const worksheet = xlsxWorkbook.Sheets[xlsxWorkbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        workbookData = {
          id: 'workbook',
          locale: LocaleType.EN_US,
          name: fileName || 'Workbook',
          sheetOrder: ['sheet-1'],
          appVersion: '3.0.0-alpha',
          styles: {},
          resources: [],
          sheets: {
            'sheet-1': {
              id: 'sheet-1',
              name: 'Sheet1',
              cellData: convertToUniverCellData(jsonData as any[][]),
              rowCount: Math.max(1000, jsonData.length + 100),
              columnCount: Math.max(26, jsonData.length > 0 ? Math.max(...(jsonData as any[][]).map((row: any[]) => row?.length || 0)) + 10 : 26),
              defaultRowHeight: 19,
              defaultColWidth: 73,
              selections: [{ range: { startRow: 0, startColumn: 0, endRow: 0, endColumn: 0 } }],
              status: 1,
              showGridlines: 1,
              rowHeader: { width: 46, hidden: 0 },
              columnHeader: { height: 20, hidden: 0 },
              rightToLeft: 0,
              freeze: {
                xSplit: 0,
                ySplit: 0,
                startRow: -1,
                startColumn: -1
              },
              scrollTop: 0,
              scrollLeft: 0,
            }
          }
        };
      } else {
        const fileBuffer = await fs.readFile(filePath);
        const xlsxWorkbook = XLSX.read(fileBuffer, { type: 'buffer' });
        
        const sheets: any = {};
        const sheetOrder: string[] = [];
        
        xlsxWorkbook.SheetNames.forEach((sheetName, index) => {
          const worksheet = xlsxWorkbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          const sheetId = `sheet-${index + 1}`;
          
          sheets[sheetId] = {
            id: sheetId,
            name: sheetName,
            cellData: convertToUniverCellData(jsonData as any[][]),
            rowCount: Math.max(1000, jsonData.length + 100),
            columnCount: Math.max(26, jsonData.length > 0 ? Math.max(...(jsonData as any[][]).map((row: any[]) => row?.length || 0)) + 10 : 26),
            defaultRowHeight: 19,
            defaultColWidth: 73,
            selections: [{ range: { startRow: 0, startColumn: 0, endRow: 0, endColumn: 0 } }],
            status: 1,
            showGridlines: 1,
            rowHeader: { width: 46, hidden: 0 },
            columnHeader: { height: 20, hidden: 0 },
            rightToLeft: 0,
            freeze: {
              xSplit: 0,
              ySplit: 0,
              startRow: -1,
              startColumn: -1
            },
            scrollTop: 0,
            scrollLeft: 0,
          };
          sheetOrder.push(sheetId);
        });

        workbookData = {
          id: 'workbook',
          locale: LocaleType.EN_US,
          name: fileName || 'Workbook',
          sheetOrder,
          appVersion: '3.0.0-alpha',
          styles: {},
          resources: [],
          sheets
        };
      }

      console.log('Successfully loaded spreadsheet data for:', fileName);
      return workbookData;
    } catch (error) {
      console.error('Error loading spreadsheet data:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('Cannot access file')) {
          console.error('File access issue - file may not exist or be readable');
        } else if (error.message.includes('ENOENT')) {
          console.error('File not found error');
        } else if (error.message.includes('EACCES')) {
          console.error('Permission denied error');
        }
      }
      
      // Return fallback data with editable cells
      return {
        id: 'workbook',
        locale: LocaleType.EN_US,
        name: fileName || 'Workbook',
        sheetOrder: ['sheet-1'],
        appVersion: '3.0.0-alpha',
        styles: {},
        resources: [],
        sheets: {
          'sheet-1': {
            id: 'sheet-1',
            name: 'Sheet1',
            cellData: {
              0: { 
                0: { v: 'A1', t: 0, s: null, f: null, p: null }, 
                1: { v: 'B1', t: 0, s: null, f: null, p: null }, 
                2: { v: 'C1', t: 0, s: null, f: null, p: null } 
              },
              1: { 
                0: { v: 'A2', t: 0, s: null, f: null, p: null }, 
                1: { v: 'B2', t: 0, s: null, f: null, p: null }, 
                2: { v: 'C2', t: 0, s: null, f: null, p: null } 
              },
              2: { 
                0: { v: 'A3', t: 0, s: null, f: null, p: null }, 
                1: { v: 'B3', t: 0, s: null, f: null, p: null }, 
                2: { v: 'C3', t: 0, s: null, f: null, p: null } 
              }
            },
            rowCount: 1000,
            columnCount: 26,
            defaultRowHeight: 19,
            defaultColWidth: 73,
            selections: [{ range: { startRow: 0, startColumn: 0, endRow: 0, endColumn: 0 } }],
            status: 1,
            showGridlines: 1,
            rowHeader: { width: 46, hidden: 0 },
            columnHeader: { height: 20, hidden: 0 },
            rightToLeft: 0,
            freeze: {
              xSplit: 0,
              ySplit: 0,
              startRow: -1,
              startColumn: -1
            },
            scrollTop: 0,
            scrollLeft: 0,
          }
        }
      };
    }
  };

  // Initialize Univer with correct plugin order for editing
  useEffect(() => {
    // Reset state when src changes
    setLoading(true);
    setError(false);
    setErrorMessage('');

    const initUniver = async () => {
      if (!containerRef.current) return;

      try {
        const workbookData = await loadSpreadsheetData();
        
        const univer = new Univer({
          theme: defaultTheme,
          locale: LocaleType.EN_US,
          locales: {
            [LocaleType.EN_US]: enUS,
          },
        });

        // Critical: Register plugins in the EXACT order required for editing
        // 1. Core rendering engine
        univer.registerPlugin(UniverRenderEnginePlugin);
        
        // 2. Formula engine (required for cell editing)
        univer.registerPlugin(UniverFormulaEnginePlugin);
        
        // 3. Docs plugin (provides the text editing capabilities)
        univer.registerPlugin(UniverDocsPlugin);
        
        // 4. Sheets plugin (core spreadsheet functionality)
        univer.registerPlugin(UniverSheetsPlugin);
        
        // 5. Sheets formula plugin (enables formula editing)
        univer.registerPlugin(UniverSheetsFormulaPlugin);
        
        // 6. UI plugin (provides the interface)
        univer.registerPlugin(UniverUIPlugin, {
          container: containerRef.current,
          header: true,
          toolbar: true,
          footer: true,
          contextMenu: true,
        });
        
        // 7. Docs UI plugin (provides text editing UI)
        univer.registerPlugin(UniverDocsUIPlugin);
        
        // 8. Sheets UI plugin (provides spreadsheet-specific UI including cell editing)
        univer.registerPlugin(UniverSheetsUIPlugin);

        // Create the workbook instance
        univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbookData);
        
        univerRef.current = univer;
        setLoading(false);
        onLoad?.();
      } catch (error) {
        console.error('Error initializing Univer:', error);
        setError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize spreadsheet editor');
        setLoading(false);
        onError?.();
      }
    };

    initUniver();

    // Cleanup
    return () => {
      if (univerRef.current) {
        univerRef.current.dispose();
        univerRef.current = null;
      }
    };
  }, [src, fileName]);

  const handleOpenWithSystemApp = () => {
    shell.openPath(src);
  };

  if (error) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          Error loading spreadsheet
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {errorMessage || 'Unable to load the spreadsheet file. The file may be corrupted or in an unsupported format.'}
        </Typography>
        <ToolbarButton
          onClick={handleOpenWithSystemApp}
          startIcon={<GetApp />}
          sx={{ mt: 2 }}
        >
          <Text>Open with System App</Text>
        </ToolbarButton>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading spreadsheet...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        id="univerjs-container"
        style={{
          height: '100%',
          width: '100%',
          minHeight: '400px',
          backgroundColor: '#ffffff',
        }}
      />
    </Box>
  );
};

export default SpreadsheetEditor; 