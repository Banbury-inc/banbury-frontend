import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  Toolbar,
} from '@mui/material';
import {
  Save,
  GetApp,
  Edit,
  Visibility
} from '@mui/icons-material';
import { shell } from 'electron';
import fs from 'fs';
import yauzl from 'yauzl';
import mammoth from 'mammoth';
import { renderAsync } from 'docx-preview';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
  onSave
}) => {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [conversionMethod, setConversionMethod] = useState<string>('');
  
  const quillRef = useRef<ReactQuill>(null);
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
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
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
              setOriginalContent(htmlContent);
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
          setOriginalContent(fallbackContent);
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleView = () => {
    setIsEditing(false);
  };

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setHasChanges(value !== originalContent);
  }, [originalContent]);

  const convertHtmlToDocx = (html: string): Document => {
    try {
      // Simple HTML to DOCX conversion
      // Remove HTML tags for basic text conversion
      const sanitizeHtml = require('sanitize-html');
      const textContent = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ');
      
      // Split into paragraphs and filter out empty ones
      const paragraphs = textContent.split('\n').filter(line => line.trim() !== '');
      
      // If no content, create a document with a single empty paragraph
      if (paragraphs.length === 0) {
        paragraphs.push('');
      }
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs.map(line => 
            new Paragraph({
              children: [new TextRun(line.trim())],
            })
          ),
        }],
      });
      
      return doc;
    } catch (error) {
      console.error('Error converting HTML to DOCX:', error);
      // Return a minimal document if conversion fails
      return new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun('Error: Could not convert document content')],
            })
          ],
        }],
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      let filePath = src;
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }

      // Convert HTML content back to DOCX
      const doc = convertHtmlToDocx(content);
      
      try {
        // Generate buffer with proper error handling
        const buffer = await Promise.resolve(Packer.toBuffer(doc));
        
        // Save to file with error handling
        fs.writeFileSync(filePath, buffer);
        
        setOriginalContent(content);
        setHasChanges(false);
        
        onSave?.(filePath);
        
      } catch (packingError) {
        console.error('Error packing document:', packingError);
        throw new Error('Failed to convert document to DOCX format');
      }
      
    } catch (error) {
      console.error('Error saving Word document:', error);
      alert('Failed to save document. Please try again or use "Open with System App".');
    } finally {
      setSaving(false);
    }
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
          Failed to load Word document
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fileName ? `Could not display "${fileName}"` : 'The Word document could not be displayed'}
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

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

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
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {fileName}
        </Typography>
        
        {conversionMethod && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
            Method: {conversionMethod}
          </Typography>
        )}
        
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
            title="Save document"
          >
            <Save />
          </IconButton>
        )}
        
        <IconButton onClick={handleOpenWithSystemApp} size="small" title="Open with system app">
          <GetApp />
        </IconButton>
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
            <Typography sx={{ ml: 2 }}>Loading document...</Typography>
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
            {isEditing ? (
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={content}
                onChange={handleContentChange}
                modules={modules}
                style={{ 
                  height: 'calc(100% - 42px)',
                  border: 'none'
                }}
              />
            ) : (
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
            )}
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
          <Typography>Saving document...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default WordViewer; 
