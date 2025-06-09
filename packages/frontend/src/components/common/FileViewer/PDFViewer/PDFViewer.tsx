import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Box,
  CircularProgress,
  Toolbar,
  Typography,
  Tooltip,
  IconButton,
  TextField,
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

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';

interface PDFViewerProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = React.memo(({ 
  src, 
  fileName, 
  onError, 
  onLoad 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadPDF = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let pdfData: Uint8Array;
      
      // Remove file:// protocol if present
      let filePath = src;
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('PDF file does not exist');
      }

      // Read the PDF file
      pdfData = fs.readFileSync(filePath);

      // Load the PDF document
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      
      onLoad?.();
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      onError?.();
    } finally {
      setLoading(false);
    }
  }, [src, onLoad, onError]);

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocument || !canvasRef.current) return;

    try {
      const page = await pdfDocument.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render PDF page');
    }
  }, [pdfDocument, scale]);

  useEffect(() => {
    loadPDF();
  }, [loadPDF]);

  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, scale, renderPage]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.25));
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, numPages));
  }, [numPages]);

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (fileName && src) {
      try {
        let filePath = src;
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace('file://', '');
        }
        shell.showItemInFolder(filePath);
      } catch (error) {
        console.error('Error showing file:', error);
      }
    }
  }, [fileName, src]);

  const handlePageInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(event.target.value, 10);
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  }, [numPages]);

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="400px"
        bgcolor="background.paper"
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading PDF...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="400px"
        bgcolor="background.paper"
      >
        <Typography variant="body1" color="error">
          Error loading PDF: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}
    >
      <Toolbar sx={{ minHeight: '48px !important', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tooltip title="Previous Page">
          <IconButton 
            onClick={handlePrevPage} 
            disabled={currentPage <= 1}
          >
            <NavigateBefore />
          </IconButton>
        </Tooltip>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
          <TextField
            type="number"
            value={currentPage}
            onChange={handlePageInputChange}
            inputProps={{ min: 1, max: numPages }}
            sx={{ width: '60px', mx: 1 }}
            size="small"
          />
          <Typography variant="body2">of {numPages}</Typography>
        </Box>
        
        <Tooltip title="Next Page">
          <IconButton 
            onClick={handleNextPage} 
            disabled={currentPage >= numPages}
          >
            <NavigateNext />
          </IconButton>
        </Tooltip>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Tooltip title="Zoom Out">
          <IconButton onClick={handleZoomOut}>
            <ZoomOut />
          </IconButton>
        </Tooltip>
        
        <Typography variant="body2" sx={{ mx: 1 }}>
          {Math.round(scale * 100)}%
        </Typography>
        
        <Tooltip title="Zoom In">
          <IconButton onClick={handleZoomIn}>
            <ZoomIn />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Fullscreen">
          <IconButton onClick={handleFullscreen}>
            <Fullscreen />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Show in Folder">
          <IconButton onClick={handleDownload}>
            <GetApp />
          </IconButton>
        </Tooltip>
      </Toolbar>
      
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-start',
          p: 2,
          bgcolor: '#f5f5f5'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            border: '1px solid #ccc',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            backgroundColor: 'white'
          }}
        />
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Only re-render if src, fileName, onError, or onLoad actually change
  return (
    prevProps.src === nextProps.src &&
    prevProps.fileName === nextProps.fileName &&
    prevProps.onError === nextProps.onError &&
    prevProps.onLoad === nextProps.onLoad
  );
});

export default PDFViewer; 
