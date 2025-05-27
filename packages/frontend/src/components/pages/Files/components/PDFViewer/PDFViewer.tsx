import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  Box,
  CircularProgress,
  TextField,
  Toolbar,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  NavigateBefore,
  NavigateNext,
  Fullscreen,
  GetApp
} from '@mui/icons-material';
import { shell } from 'electron';
import fs from 'fs';
import { Text } from '../../../../common/Text/Text';
import { ToolbarButton } from '../../../../common/ToolbarButton/ToolbarButton';

// Polyfill for Promise.withResolvers if not available
if (!Promise.withResolvers) {
  Promise.withResolvers = function <T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  src,
  fileName,
  onError,
  onLoad
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);

  React.useEffect(() => {
    const loadPDF = async () => {
      try {
        let filePath = src;
        
        // Remove file:// protocol if present
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace('file://', '');
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error('PDF file does not exist');
        }

        // Read the PDF file and convert to base64 data URL
        const pdfBuffer = fs.readFileSync(filePath);
        const base64 = pdfBuffer.toString('base64');
        const dataUrl = `data:application/pdf;base64,${base64}`;
        setPdfDataUrl(dataUrl);
        
      } catch (error) {
        console.error('Error loading PDF:', error);
        setError(true);
        setLoading(false);
        onError?.();
      }
    };

    loadPDF();
  }, [src, onError]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    onLoad?.();
  }, [onLoad]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF document:', error);
    setError(true);
    setLoading(false);
    onError?.();
  }, [onError]);

  const handleOpenWithSystemApp = () => {
    let filePath = src;
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }
    shell.openPath(filePath);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(event.target.value);
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
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
        <Text className="text-lg font-semibold text-red-600 mb-2">
          Failed to load PDF
        </Text>
        <Text className="mb-4">
          {fileName ? `Could not display "${fileName}"` : 'The PDF could not be displayed'}
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
      {/* PDF Toolbar */}
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
        <ToolbarButton onClick={goToPrevPage} disabled={pageNumber <= 1} className="min-w-[30px] p-0">
          <NavigateBefore fontSize="inherit" />
        </ToolbarButton>
        
        <TextField
          size="small"
          type="number"
          value={pageNumber}
          onChange={handlePageInputChange}
          inputProps={{
            min: 1,
            max: numPages,
            style: { textAlign: 'center', width: '60px' }
          }}
          variant="outlined"
        />
        
        <Text className="mx-2">
          / {numPages}
        </Text>
        
        <ToolbarButton onClick={goToNextPage} disabled={pageNumber >= numPages} className="min-w-[30px] p-0">
          <NavigateNext fontSize="inherit" sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }} />
        </ToolbarButton>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <ToolbarButton onClick={zoomOut} disabled={scale <= 0.5} className="min-w-[30px] p-0">
          <ZoomOut fontSize="inherit" />
        </ToolbarButton>
        
        <Text className="mx-2 min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </Text>
        
        <ToolbarButton onClick={zoomIn} disabled={scale >= 3.0} className="min-w-[30px] p-0">
          <ZoomIn fontSize="inherit" />
        </ToolbarButton>
        
        <ToolbarButton onClick={handleOpenWithSystemApp} className="min-w-[30px] p-0" title="Open with system app">
          <Fullscreen fontSize="inherit" />
        </ToolbarButton>
      </Toolbar>

      {/* PDF Content */}
      <Box sx={{ 
        flexGrow: 1,
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        p: 2
      }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        )}
        
        {pdfDataUrl && (
          <Document
            file={pdfDataUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<CircularProgress />}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
      </Box>
      
      {fileName && !loading && (
        <Box sx={{ p: 1, textAlign: 'center', bgcolor: 'background.paper' }}>
          <Text className="text-xs text-gray-500">
            {fileName}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default PDFViewer; 
