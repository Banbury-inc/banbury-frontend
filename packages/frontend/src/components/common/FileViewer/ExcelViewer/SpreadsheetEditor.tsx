import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  CircularProgress,
  Typography
} from '@mui/material';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';

// Univer imports
import { Univer, UniverInstanceType, LocaleType, IUniverInstanceService } from '@univerjs/core';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui';
import { UniverSheetsNumfmtPlugin } from '@univerjs/sheets-numfmt';
import { UniverSheetsNumfmtUIPlugin } from '@univerjs/sheets-numfmt-ui';



// Import Univer CSS
import '@univerjs/design/lib/index.css';
import '@univerjs/ui/lib/index.css';
import '@univerjs/docs-ui/lib/index.css';
import '@univerjs/sheets-ui/lib/index.css';



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

const convertFromUniverCellData = (sheet: any): any[][] => {
  const aoa: any[][] = [];
  if (sheet && sheet.cellData) {
      const rowIds = Object.keys(sheet.cellData).map(Number).sort((a, b) => a - b);
      if (rowIds.length > 0) {
          const maxRow = rowIds[rowIds.length - 1];
          for (let r = 0; r <= maxRow; r++) {
              const rowData = sheet.cellData[r] || {};
              const colIds = Object.keys(rowData).map(Number).sort((a, b) => a - b);
              const row: any[] = [];
              if (colIds.length > 0) {
                  const maxCol = colIds[colIds.length - 1];
                  for (let c = 0; c <= maxCol; c++) {
                      const cell = rowData[c];
                      row[c] = cell ? cell.v : undefined;
                  }
              }
              aoa[r] = row;
          }
      }
  }
  // Fill in empty rows to make it a consistent 2d array
  for (let i = 0; i < aoa.length; i++) {
      if (aoa[i] === undefined) {
          aoa[i] = [];
      }
  }
  return aoa;
};

interface SpreadsheetEditorProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (filePath: string) => void;
  onSaveRequest?: () => void;
}

const SpreadsheetEditor = forwardRef<{ save: () => Promise<void> }, SpreadsheetEditorProps>(({
  src,
  fileName,
  onError,
  onLoad,
  onSave,
}, ref) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<Univer | null>(null);

  // Load spreadsheet data from file
  const loadSpreadsheetData = async () => {
    try {
      let filePath = src;
      if (filePath.startsWith('file://')) {
        filePath = fileURLToPath(filePath);
      }

      const isCSV = filePath.toLowerCase().endsWith('.csv');
      let workbookData: any;

      if (isCSV) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
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
        const fileBuffer = fs.readFileSync(filePath);
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

      return workbookData;
    } catch (error) {
      console.error('Error loading spreadsheet data:', error);
      setError(true);
      return null;
    }
  };

  useEffect(() => {
    return () => {
      univerRef.current?.dispose();
    };
  }, []);

  // Expose save function to parent component
  useImperativeHandle(ref, () => ({
    save: handleSave
  }), []);

  useEffect(() => {
    const initUniver = async () => {
      if (!containerRef.current) {
        return;
      }

      univerRef.current?.dispose();
      
      try {
        setLoading(true);
        
        const univer = new Univer({
          locale: LocaleType.EN_US,
          locales: {
            [LocaleType.EN_US]: {
              toolbar: {
                undo: "Undo",
                redo: "Redo",
                cut: "Cut",
                copy: "Copy",
                paste: "Paste",
                bold: "Bold",
                italic: "Italic",
                underline: "Underline",
                strikethrough: "Strikethrough",
                fontFamily: "Font",
                fontSize: "Size",
                color: "Color",
                backgroundColor: "Background",
                alignLeft: "Align Left",
                alignCenter: "Align Center",
                alignRight: "Align Right",
                alignJustify: "Justify",
                mergeCells: "Merge Cells",
                unmergeCells: "Unmerge Cells",
                insertRow: "Insert Row",
                insertColumn: "Insert Column",
                deleteRow: "Delete Row",
                deleteColumn: "Delete Column",
                sort: "Sort",
                filter: "Filter",
                freeze: "Freeze",
                unfreeze: "Unfreeze",
                zoomIn: "Zoom In",
                zoomOut: "Zoom Out",
                zoomReset: "Reset Zoom",
                formatPainter: "Format Painter",
                heading: {
                  normal: "Normal",
                  title: "Title",
                  subTitle: "Sub Title",
                  1: "Heading 1",
                  2: "Heading 2",
                  3: "Heading 3",
                  4: "Heading 4",
                  5: "Heading 5",
                  6: "Heading 6",
                  tooltip: "Set Heading"
                }
              },
              ribbon: {
                start: "Start",
                startDesc: "Initiate the worksheet and set basic parameters.",
                insert: "Insert",
                insertDesc: "Insert rows, columns, charts and various other elements.",
                formulas: "Formulas",
                formulasDesc: "Use functions and formulas for data calculations.",
                data: "Data",
                dataDesc: "Manage data, including import, sorting and filtering.",
                view: "View",
                viewDesc: "Switch view modes and adjust the display effect.",
                others: "Others",
                othersDesc: "Other functions and settings.",
                more: "More"
              },
              fontFamily: {
                TimesNewRoman: "Times New Roman",
                Arial: "Arial",
                Tahoma: "Tahoma",
                Verdana: "Verdana",
                MicrosoftYaHei: "Microsoft YaHei",
                SimSun: "SimSun",
                SimHei: "SimHei",
                Kaiti: "Kaiti",
                FangSong: "FangSong",
                NSimSun: "NSimSun",
                STXinwei: "STXinwei",
                STXingkai: "STXingkai",
                STLiti: "STLiti",
                HanaleiFill: "HanaleiFill",
                Anton: "Anton",
                Pacifico: "Pacifico"
              },
              "shortcut-panel": {
                title: "Shortcuts"
              },
              shortcut: {
                undo: "Undo",
                redo: "Redo",
                cut: "Cut",
                copy: "Copy",
                paste: "Paste",
                "shortcut-panel": "Toggle Shortcut Panel"
              },
              "common-edit": "Common Editing Shortcuts",
              "toggle-shortcut-panel": "Toggle Shortcut Panel",
              clipboard: {
                authentication: {
                  title: "Permission Denied",
                  content: "Please allow Univer to access your clipboard."
                }
              },
              textEditor: {
                formulaError: "Please enter a valid formula, such as =SUM(A1)",
                rangeError: "Please enter a valid range, such as A1:B10"
              },
              rangeSelector: {
                title: "Select a data range",
                addAnotherRange: "Add range",
                buttonTooltip: "Select data range",
                placeHolder: "Select range or enter.",
                confirm: "Confirm",
                cancel: "Cancel"
              },
              "global-shortcut": "Global Shortcut",
              "zoom-slider": {
                resetTo: "Reset to"
              },
              menu: {
                file: "File",
                edit: "Edit",
                view: "View",
                insert: "Insert",
                format: "Format",
                data: "Data",
                tools: "Tools",
                help: "Help"
              },
              contextMenu: {
                cut: "Cut",
                copy: "Copy",
                paste: "Paste",
                insertRow: "Insert Row",
                insertColumn: "Insert Column",
                deleteRow: "Delete Row",
                deleteColumn: "Delete Column",
                clearContents: "Clear Contents",
                clearFormats: "Clear Formats",
                clearAll: "Clear All"
              },
              sheets: {
                sheet: "Sheet",
                newSheet: "New Sheet",
                deleteSheet: "Delete Sheet",
                renameSheet: "Rename Sheet",
                moveSheet: "Move Sheet",
                copySheet: "Copy Sheet",
                hideSheet: "Hide Sheet",
                showSheet: "Show Sheet"
              },
              formula: {
                insertFunction: "Insert Function",
                functionLibrary: "Function Library",
                autoSum: "Auto Sum",
                moreFunctions: "More Functions"
              },
              common: {
                ok: "OK",
                cancel: "Cancel",
                apply: "Apply",
                reset: "Reset",
                close: "Close",
                save: "Save",
                open: "Open",
                new: "New",
                delete: "Delete",
                edit: "Edit",
                view: "View",
                help: "Help",
                about: "About",
                settings: "Settings",
                preferences: "Preferences"
              },
              statusBar: {
                ready: "Ready",
                calculating: "Calculating...",
                saving: "Saving...",
                loading: "Loading..."
              },
              rightClickMenu: {
                cut: "Cut",
                copy: "Copy",
                paste: "Paste",
                insertRow: "Insert Row",
                insertColumn: "Insert Column",
                deleteRow: "Delete Row",
                deleteColumn: "Delete Column",
                clearContents: "Clear Contents",
                clearFormats: "Clear Formats",
                clearAll: "Clear All"
              }
            },
          },
        });
        univerRef.current = univer;

        univer.registerPlugin(UniverRenderEnginePlugin);
        univer.registerPlugin(UniverFormulaEnginePlugin);

        univer.registerPlugin(UniverUIPlugin, {
          container: containerRef.current,
        });

        univer.registerPlugin(UniverDocsPlugin);
        univer.registerPlugin(UniverDocsUIPlugin);

        univer.registerPlugin(UniverSheetsPlugin);
        univer.registerPlugin(UniverSheetsUIPlugin);
        univer.registerPlugin(UniverSheetsFormulaPlugin);
        univer.registerPlugin(UniverSheetsFormulaUIPlugin);
        univer.registerPlugin(UniverSheetsNumfmtPlugin);
        univer.registerPlugin(UniverSheetsNumfmtUIPlugin);

        const workbookData = await loadSpreadsheetData();
        if (workbookData) {
          univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbookData);
        } else {
          setError(true);
        }



        setLoading(false);
        onLoad?.();
      } catch (e) {
        console.error('Error initializing Univer:', e);
        setError(true);
        setLoading(false);
        onError?.();
      }
    };

    initUniver();
  }, [src, fileName]);

  const handleSave = async () => {
    if (!univerRef.current) return;

    try {
        const univer = univerRef.current;
        const univerInstanceService = univer.__getInjector().get(IUniverInstanceService);
        const workbook = univerInstanceService.getUniverSheetInstance('workbook');
        if (!workbook) {
            console.error("Workbook not found");
            return;
        }

        const workbookSnapshot = workbook.getSnapshot();
        const newXlsxWorkbook = XLSX.utils.book_new();

        for (const sheetId of workbookSnapshot.sheetOrder) {
            const sheetSnapshot = workbookSnapshot.sheets[sheetId];
            const sheetDataAOA = convertFromUniverCellData(sheetSnapshot);
            const worksheet = XLSX.utils.aoa_to_sheet(sheetDataAOA);
            XLSX.utils.book_append_sheet(newXlsxWorkbook, worksheet, sheetSnapshot.name);
        }

        let realPath = src;
        if (realPath.startsWith('file://')) {
          realPath = fileURLToPath(realPath);
        }

        const isCSV = realPath.toLowerCase().endsWith('.csv');
        if (isCSV) {
            const firstSheetName = newXlsxWorkbook.SheetNames[0];
            const csvOutput = XLSX.utils.sheet_to_csv(newXlsxWorkbook.Sheets[firstSheetName]);
            fs.writeFileSync(realPath, csvOutput);
        } else {
            const fileBuffer = XLSX.write(newXlsxWorkbook, { bookType: 'xlsx', type: 'buffer' });
            fs.writeFileSync(realPath, fileBuffer);
        }

        onSave?.(realPath);
        
    } catch (e) {
        console.error("Error saving file:", e);
        alert('Error saving file. See console for details.');
    }
  };



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
      <Box sx={{ flex: 1, position: 'relative' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 10,
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, ml: 2 }}>
              Loading spreadsheet...
            </Typography>
          </Box>
        )}
        {error && !loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              p: 3,
            }}
          >
            <Typography variant="h6" color="error" gutterBottom>
              Error loading spreadsheet
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              The file may be corrupted or in an unsupported format.
            </Typography>
          </Box>
        )}
        <div
          ref={containerRef}
          id="univerjs-container"
          style={{
            height: '100%',
            width: '100%',
            visibility: loading || error ? 'hidden' : 'visible',
          }}
        />
      </Box>
    </Box>
  );
});

export default SpreadsheetEditor;
