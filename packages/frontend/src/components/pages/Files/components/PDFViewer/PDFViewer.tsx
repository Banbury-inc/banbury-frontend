import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  TextField,
  Toolbar,
  useTheme,
  useMediaQuery
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
        <Typography variant="h6" color="error" gutterBottom>
          Failed to load PDF
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fileName ? `Could not display "${fileName}"` : 'The PDF could not be displayed'}
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
        <IconButton onClick={goToPrevPage} disabled={pageNumber <= 1} size="small">
          <NavigateBefore />
        </IconButton>
        
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
        
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
          / {numPages}
        </Typography>
        
        <IconButton onClick={goToNextPage} disabled={pageNumber >= numPages} size="small">
          <NavigateNext />
        </IconButton>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <IconButton onClick={zoomOut} disabled={scale <= 0.5} size="small">
          <ZoomOut />
        </IconButton>
        
        <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </Typography>
        
        <IconButton onClick={zoomIn} disabled={scale >= 3.0} size="small">
          <ZoomIn />
        </IconButton>
        
        <IconButton onClick={handleOpenWithSystemApp} size="small" title="Open with system app">
          <Fullscreen />
        </IconButton>
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
          <Typography variant="caption" color="text.secondary">
            {fileName}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PDFViewer; 