import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  console.log('=== SpreadsheetEditor component rendered ===');
  console.log('Props:', { src, fileName });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<Univer | null>(null);
  
  // Monitor when container ref becomes available
  useEffect(() => {
    console.log('=== Container ref monitor effect ===');
    console.log('Container ref available:', !!containerRef.current);
    if (containerRef.current) {
      console.log('Container ref is now available in monitor effect');
    }
  });

  // Load spreadsheet data from file
  const loadSpreadsheetData = async () => {
    console.log('=== Starting loadSpreadsheetData ===');
    console.log('Raw src:', src);
    console.log('FileName:', fileName);
    
    try {
      let filePath = src;
      
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }

      // Normalize the path for cross-platform compatibility
      filePath = path.normalize(filePath);

      console.log('Normalized file path:', filePath);
      
      // Check if file exists first
      try {
        await fs.access(filePath);
        console.log('File access successful');
      } catch (accessError) {
        console.error('File access error:', accessError);
        throw new Error(`Cannot access file: ${filePath}`);
      }

      const isCSV = filePath.toLowerCase().endsWith('.csv');
      let workbookData: any;

      if (isCSV) {
        console.log('Reading CSV file...');
        const fileContent = await fs.readFile(filePath, 'utf8');
        console.log('CSV file content length:', fileContent.length);
        const xlsxWorkbook = XLSX.read(fileContent, { type: 'string' });
        console.log('XLSX workbook created, sheet names:', xlsxWorkbook.SheetNames);
        const worksheet = xlsxWorkbook.Sheets[xlsxWorkbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        console.log('JSON data extracted, rows:', jsonData.length);
        
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
        console.log('Reading Excel file...');
        const fileBuffer = await fs.readFile(filePath);
        console.log('Excel file buffer length:', fileBuffer.length);
        const xlsxWorkbook = XLSX.read(fileBuffer, { type: 'buffer' });
        console.log('Excel workbook created, sheet names:', xlsxWorkbook.SheetNames);
        
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
      console.log('Workbook structure:', {
        id: workbookData.id,
        sheetCount: workbookData.sheetOrder?.length || 0,
        sheetNames: workbookData.sheetOrder
      });
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
  useLayoutEffect(() => {
    console.log('=== useLayoutEffect triggered ===');
    console.log('src:', src);
    console.log('fileName:', fileName);
    console.log('Container ref available in useLayoutEffect:', !!containerRef.current);
    
    if (!src || !fileName) {
      console.log('Missing src or fileName, skipping initialization');
      return;
    }
    
    // Reset state when src changes
    setLoading(true);
    setError(false);
    setErrorMessage('');

    // Initialize immediately since useLayoutEffect runs after DOM is laid out
    const initializeUniver = async () => {
      console.log('=== Starting Univer initialization ===');
      
      if (!containerRef.current) {
        console.warn('Container ref not available in useLayoutEffect, trying fallback...');
        
        // Fallback: try to find the container by ID
        const fallbackContainer = document.getElementById('univerjs-container');
        if (fallbackContainer) {
          console.log('Found container using fallback method');
          // Force the ref to point to the found element
          (containerRef as any).current = fallbackContainer;
        } else {
          console.error('Container ref not available and fallback failed');
          setError(true);
          setErrorMessage('Failed to initialize spreadsheet container - DOM element not found');
          setLoading(false);
          onError?.();
          return;
        }
      }

      const container = containerRef.current!; // We know it's not null due to the check above
      console.log('Container element found:', container);
      console.log('Container dimensions:', {
        width: container.offsetWidth,
        height: container.offsetHeight,
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight
      });

      try {
        console.log('Loading spreadsheet data...');
        const workbookData = await loadSpreadsheetData();
        console.log('Workbook data loaded:', workbookData);
        
        console.log('Creating Univer instance...');
        const univer = new Univer({
          theme: defaultTheme,
          locale: LocaleType.EN_US,
          locales: {
            [LocaleType.EN_US]: enUS,
          },
        });
        console.log('Univer instance created');

        // Critical: Register plugins in the EXACT order required for editing
        console.log('Registering plugins...');
        
        // 1. Core rendering engine
        console.log('Registering UniverRenderEnginePlugin...');
        univer.registerPlugin(UniverRenderEnginePlugin);
        
        // 2. Formula engine (required for cell editing)
        console.log('Registering UniverFormulaEnginePlugin...');
        univer.registerPlugin(UniverFormulaEnginePlugin);
        
        // 3. Docs plugin (provides the text editing capabilities)
        console.log('Registering UniverDocsPlugin...');
        univer.registerPlugin(UniverDocsPlugin);
        
        // 4. Sheets plugin (core spreadsheet functionality)
        console.log('Registering UniverSheetsPlugin...');
        univer.registerPlugin(UniverSheetsPlugin);
        
        // 5. Sheets formula plugin (enables formula editing)
        console.log('Registering UniverSheetsFormulaPlugin...');
        univer.registerPlugin(UniverSheetsFormulaPlugin);
        
        // 6. UI plugin (provides the interface)
        console.log('Registering UniverUIPlugin...');
        univer.registerPlugin(UniverUIPlugin, {
          container: container,
          header: true,
          toolbar: true,
          footer: true,
          contextMenu: true,
        });
        
        // 7. Docs UI plugin (provides text editing UI)
        console.log('Registering UniverDocsUIPlugin...');
        univer.registerPlugin(UniverDocsUIPlugin);
        
        // 8. Sheets UI plugin (provides spreadsheet-specific UI including cell editing)
        console.log('Registering UniverSheetsUIPlugin...');
        univer.registerPlugin(UniverSheetsUIPlugin);

        // Create the workbook instance
        console.log('Creating workbook unit...');
        univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbookData);
        console.log('Workbook unit created successfully');
        
        univerRef.current = univer;
        setLoading(false);
        console.log('=== Univer initialization complete ===');
        onLoad?.();
      } catch (error) {
        console.error('Error initializing Univer:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        setError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize spreadsheet editor');
        setLoading(false);
        onError?.();
      }
    };

    // Add a timeout to detect hanging
    const timeoutId = setTimeout(() => {
      console.error('Univer initialization is taking too long (>10 seconds)');
      setError(true);
      setErrorMessage('Spreadsheet loading timed out. The file may be too large or corrupted.');
      setLoading(false);
      onError?.();
    }, 10000);

    initializeUniver().finally(() => {
      clearTimeout(timeoutId);
    });

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (univerRef.current) {
        console.log('Cleaning up Univer instance');
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

  console.log('=== Rendering SpreadsheetEditor ===');
  console.log('Loading:', loading, 'Error:', error, 'ErrorMessage:', errorMessage);
  
  // Force DOM creation and verification
  useEffect(() => {
    console.log('=== Forcing DOM creation check ===');
    
    // Check if our container exists
    const existingContainer = document.getElementById('univerjs-container');
    console.log('Existing container found:', !!existingContainer);
    
    if (!existingContainer) {
      console.log('No container found, but component should be rendering...');
      console.log('Body children count:', document.body.children.length);
      console.log('All elements with id containing "univer":', 
        Array.from(document.querySelectorAll('[id*="univer"]')).map(el => el.id));
    }
    
    // Try to create container manually if it doesn't exist
    setTimeout(() => {
      const stillNoContainer = document.getElementById('univerjs-container');
      if (!stillNoContainer) {
        console.error('CRITICAL: Container still not found after 1 second - DOM not being created');
        console.log('Available elements in body:', Array.from(document.body.children).map(el => el.tagName + (el.id ? '#' + el.id : '')));
      }
    }, 1000);
  }, []);

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        minHeight: '400px',
        position: 'relative',
        backgroundColor: '#ff0000', // Bright red to verify visibility
        border: '4px solid green', // Very obvious border
      }}
    >
      {/* Debug info */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        background: 'yellow', 
        color: 'black', 
        padding: '8px', 
        fontSize: '14px',
        zIndex: 9999,
        border: '2px solid black',
        fontWeight: 'bold'
      }}>
        🔴 SPREADSHEET DEBUG - L:{loading ? 'Y' : 'N'} E:{error ? 'Y' : 'N'}
      </div>
      
      {/* Simple test div */}
      <div style={{
        position: 'absolute',
        top: '50px',
        left: '10px',
        background: 'blue',
        color: 'white',
        padding: '10px',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        TEST DIV - Component is rendering!
      </div>
      
      <div
        ref={containerRef}
        id="univerjs-container"
        style={{
          height: 'calc(100% - 100px)',
          width: '100%',
          minHeight: '300px',
          backgroundColor: '#ffffff',
          border: '4px solid blue',
          boxSizing: 'border-box',
          marginTop: '100px',
          display: 'block',
        }}
      />
    </div>
  );
};

export default SpreadsheetEditor; 