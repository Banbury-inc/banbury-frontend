import React, { useState, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Toolbar,
} from '@mui/material';
import {
  GetApp,
} from '@mui/icons-material';
import { shell } from 'electron';
import fs from 'fs';
import yauzl from 'yauzl';
import mammoth from 'mammoth';
import { Text } from '../../Text/Text';
import { ToolbarButton } from '../../ToolbarButton/ToolbarButton';
import { renderAsync } from 'docx-preview';

interface WordViewerProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (filePath: string) => void;
}

const WordViewer: React.FC<WordViewerProps> = ({
  src,
  fileName,
  onError,
  onLoad,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [conversionMethod, setConversionMethod] = useState<string>('');
  
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Method 1: Use docx-preview library
  const tryDocxPreview = async (filePath: string): Promise<string> => {
    try {
      const docBuffer = fs.readFileSync(filePath);
      
      // Create a temporary container for docx-preview
      const tempDiv = document.createElement('div');
      
      await renderAsync(docBuffer, tempDiv, undefined, {
        className: 'docx-preview-container',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: true,
        trimXmlDeclaration: true,
        useBase64URL: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true
      });
      
      const htmlContent = tempDiv.innerHTML;
      if (htmlContent && htmlContent.trim().length > 0) {
        setConversionMethod('docx-preview');
        return htmlContent;
      }
      throw new Error('Empty content from docx-preview');
    } catch (error) {
      console.warn('docx-preview failed:', error);
      throw error;
    }
  };

  // Method 2: Use mammoth library (existing method)
  const tryMammoth = async (filePath: string): Promise<string> => {
    try {
      const docBuffer = fs.readFileSync(filePath);
      
      const conversionPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Mammoth conversion timeout'));
        }, 8000);

        mammoth.convertToHtml({ buffer: docBuffer })
          .then((result) => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      });

      const result = await conversionPromise;
      const htmlContent = result.value || '';
      
      if (htmlContent.trim().length > 0) {
        setConversionMethod('mammoth');
        return htmlContent;
      }
      throw new Error('Empty content from mammoth');
    } catch (error) {
      console.warn('Mammoth conversion failed:', error);
      throw error;
    }
  };

  // Method 3: Manual extraction from docx file
  const tryManualExtraction = async (filePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      yauzl.open(filePath, { lazyEntries: true }, (err: any, zipfile: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error('Failed to open docx file'));
          return;
        }

        let documentXmlContent = '';

        zipfile.readEntry();
        zipfile.on('entry', (entry: any) => {
          if (entry.fileName === 'word/document.xml') {
            zipfile.openReadStream(entry, (err: any, readStream: any) => {
              if (err) {
                reject(err);
                return;
              }

              if (!readStream) {
                reject(new Error('Failed to read document.xml'));
                return;
              }

              const chunks: Buffer[] = [];
              readStream.on('data', (chunk: any) => {
                chunks.push(chunk);
              });

              readStream.on('end', () => {
                documentXmlContent = Buffer.concat(chunks).toString('utf-8');
                
                // Extract text from XML
                const textContent = extractTextFromDocumentXml(documentXmlContent);
                if (textContent.trim().length > 0) {
                  setConversionMethod('manual-extraction');
                  resolve(textContent);
                } else {
                  reject(new Error('No text found in document'));
                }
              });

              readStream.on('error', reject);
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          if (!documentXmlContent) {
            reject(new Error('document.xml not found in docx file'));
          }
        });

        zipfile.on('error', reject);
      });
    });
  };

  // Helper function to extract text from document.xml
  const extractTextFromDocumentXml = (xmlContent: string): string => {
    try {
      // Remove XML tags and extract text content
      let textContent = xmlContent
        .replace(/<w:p[^>]*>/g, '\n\n') // Paragraphs
        .replace(/<w:br[^>]*\/>/g, '\n') // Line breaks
        .replace(/<w:tab[^>]*\/>/g, '\t') // Tabs
        .replace(/<[^>]*>/g, '') // Remove all XML tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
        .trim();

      // Convert to basic HTML with paragraphs
      const paragraphs = textContent.split('\n\n').filter(p => p.trim().length > 0);
      
      const htmlContent = `
        <div style="padding: 20px; font-family: 'Times New Roman', serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
          <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color: #333; margin: 0; font-size: 24px;">${fileName || 'Document'}</h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">Extracted content • Method: Manual XML parsing</p>
          </div>
          ${paragraphs.map(paragraph => 
            `<p style="margin: 12px 0; text-align: justify; text-indent: 20px;">${paragraph.replace(/\n/g, '<br>')}</p>`
          ).join('')}
        </div>
      `;

      return htmlContent;
    } catch (error) {
      console.error('Error extracting text from XML:', error);
      throw error;
    }
  };

  // Method 4: Fallback with file info
  const createFallbackContent = (filePath: string): string => {
    const stats = fs.statSync(filePath);
    setConversionMethod('fallback');
    
    return `
      <div style="padding: 40px 20px; font-family: Arial, sans-serif; line-height: 1.6; text-align: center; max-width: 600px; margin: 0 auto;">
        <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
        
        <h1 style="color: #333; margin: 0 0 10px 0; font-size: 28px;">
          ${fileName || 'Word Document'}
        </h1>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: left;">
          <h3 style="margin: 0 0 15px 0; color: #495057;">Document Information</h3>
          <p style="margin: 5px 0;"><strong>File:</strong> ${fileName || 'Unknown'}</p>
          <p style="margin: 5px 0;"><strong>Size:</strong> ${(stats.size / 1024).toFixed(1)} KB</p>
          <p style="margin: 5px 0;"><strong>Modified:</strong> ${stats.mtime.toLocaleDateString()}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${filePath}</p>
        </div>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107; margin: 20px 0; text-align: left;">
          <h4 style="margin: 0 0 10px 0; color: #856404;">Unable to Extract Content</h4>
          <p style="margin: 0; color: #856404;">
            This Word document could not be parsed by any of our available methods. 
            The file appears to be valid but may use features not supported by the preview system.
          </p>
        </div>
        
        <div style="margin-top: 30px;">
          <p style="color: #6c757d; font-size: 14px; margin-bottom: 20px;">
            💡 To view the complete document with all formatting, tables, and images, 
            please use the "Open with System App" button above.
          </p>
        </div>
      </div>
    `;
  };

  React.useEffect(() => {
    const loadWordDocument = async () => {
      try {
        let filePath = src;
        
        // Remove file:// protocol if present
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace('file://', '');
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error('Word document does not exist');
        }

        // Try multiple methods in order of preference
        const methods = [
          { name: 'docx-preview', fn: () => tryDocxPreview(filePath) },
          { name: 'mammoth', fn: () => tryMammoth(filePath) },
          { name: 'manual-extraction', fn: () => tryManualExtraction(filePath) }
        ];

        let success = false;

        for (const method of methods) {
          try {
            const htmlContent = await method.fn();
            
            if (htmlContent && htmlContent.trim().length > 0) {
              setContent(htmlContent);
              success = true;
              break;
            }
          } catch (error) {
            console.error(`Method ${method.name} failed:`, error);
            continue;
          }
        }

        // If all methods fail, show fallback content
        if (!success) {
          const fallbackContent = createFallbackContent(filePath);
          setContent(fallbackContent);
        }
        
        setLoading(false);
        onLoad?.();
        
      } catch (error) {
        console.error('Error loading Word document:', error);
        setError(true);
        setLoading(false);
        onError?.();
      }
    };

    loadWordDocument();
  }, [src, fileName, onError, onLoad]);

  const handleOpenWithSystemApp = () => {
    let filePath = src;
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }
    shell.openPath(filePath);
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
          Failed to load Word document
        </Text>
        <Text className="mb-4">
          {fileName ? `Could not display "${fileName}"` : 'The Word document could not be displayed'}
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
      {/* Word Document Toolbar */}
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
        <Text className="text-base font-semibold flex-grow">
          {fileName}
        </Text>
        
        {conversionMethod && (
          <Text className="text-xs text-zinc-400 mr-2">
            Method: {conversionMethod}
          </Text>
        )}
        
        <ToolbarButton 
          onClick={handleOpenWithSystemApp} 
          className="min-w-[32px] h-8 p-0 flex items-center justify-center"
          title="Open with system app"
        >
          <GetApp fontSize="inherit" />
        </ToolbarButton>
      </Toolbar>

      {/* Word Document Content */}
      <Box sx={{ 
        flexGrow: 1,
        overflow: 'auto',
        bgcolor: '#f5f5f5',
        p: 2
      }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress />
            <Text className="ml-2">Loading document...</Text>
          </Box>
        )}
        
        {!loading && (
          <Box sx={{
            maxWidth: '8.5in',
            margin: '0 auto',
            bgcolor: 'white',
            minHeight: '11in',
            boxShadow: 2,
            p: 1
          }}>
              <Box 
                ref={previewContainerRef}
                sx={{ 
                  p: 2,
                  minHeight: '100%',
                  '& img': { maxWidth: '100%' },
                  '& .docx-preview-container': {
                    width: '100%',
                    height: 'auto'
                  }
                }}
                dangerouslySetInnerHTML={{ __html: content }}
              />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WordViewer; 
