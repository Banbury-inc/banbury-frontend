import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Toolbar,
  Button,
  Menu,
  MenuItem,
  Chip,
  useTheme
} from '@mui/material';
import {
  Save,
  GetApp,
  Edit,
  Visibility,
  Settings,
  WrapText,
  FormatSize,
  Palette
} from '@mui/icons-material';
import { shell } from 'electron';
import fs from 'fs';
import path from 'path';
import AceEditor from 'react-ace';

// Import ACE editor modes and themes
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-ruby';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-scss';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-xml';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/mode-powershell';
import 'ace-builds/src-noconflict/mode-dockerfile';
import 'ace-builds/src-noconflict/mode-text';

// Import themes
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-tomorrow_night';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-solarized_light';

// Import extensions
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

interface CodeViewerProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (filePath: string) => void;
}

// Language mapping for ACE Editor
const getLanguageFromExtension = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  const languageMap: { [key: string]: string } = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.c': 'c_cpp',
    '.cpp': 'c_cpp',
    '.cxx': 'c_cpp',
    '.cc': 'c_cpp',
    '.h': 'c_cpp',
    '.hpp': 'c_cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'golang',
    '.rs': 'rust',
    '.html': 'html',
    '.htm': 'html',
    '.xml': 'xml',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'scss',
    '.less': 'css',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.markdown': 'markdown',
    '.sql': 'sql',
    '.sh': 'sh',
    '.bash': 'sh',
    '.zsh': 'sh',
    '.fish': 'sh',
    '.ps1': 'powershell',
    '.dockerfile': 'dockerfile',
    '.txt': 'text',
    '.log': 'text'
  };
  
  return languageMap[ext] || 'text';
};

// Get file size in human readable format
const getFileSize = (filePath: string): string => {
  try {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  } catch {
    return 'Unknown';
  }
};

const CodeViewer: React.FC<CodeViewerProps> = ({
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
  const [language, setLanguage] = useState<string>('text');
  const [lineCount, setLineCount] = useState<number>(0);
  const [fileSize, setFileSize] = useState<string>('');
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [editorOptions, setEditorOptions] = useState({
    wordWrap: false,
    fontSize: 14,
    theme: 'monokai' as string
  });
  
  const editorRef = useRef<AceEditor>(null);
  const theme = useTheme();

  useEffect(() => {
    const loadCodeFile = async () => {
      try {
        let filePath = src;
        
        // Remove file:// protocol if present
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace('file://', '');
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error('Code file does not exist');
        }

        // Detect language from file extension
        const detectedLanguage = getLanguageFromExtension(fileName || filePath);
        setLanguage(detectedLanguage);

        // Get file size
        setFileSize(getFileSize(filePath));

        // Read the file content
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Count lines
        const lines = fileContent.split('\n').length;
        setLineCount(lines);
        
        setContent(fileContent);
        setOriginalContent(fileContent);
        setLoading(false);
        onLoad?.();
        
      } catch (error) {
        console.error('Error loading code file:', error);
        setError(true);
        setLoading(false);
        onError?.();
      }
    };

    loadCodeFile();
  }, [src, fileName, onError, onLoad]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(value !== originalContent);
    setLineCount(value.split('\n').length);
  };

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

  const handleSave = async () => {
    try {
      setSaving(true);
      
      let filePath = src;
      if (filePath.startsWith('file://')) {
        filePath = filePath.replace('file://', '');
      }

      // Save the file
      fs.writeFileSync(filePath, content, 'utf-8');
      
      setOriginalContent(content);
      setHasChanges(false);
      
      onSave?.(filePath);
      
    } catch (error) {
      console.error('Error saving code file:', error);
      alert('Failed to save file. Please try again or use "Open with System App".');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  const toggleWordWrap = () => {
    setEditorOptions(prev => ({
      ...prev,
      wordWrap: !prev.wordWrap
    }));
    handleSettingsClose();
  };

  const changeFontSize = (delta: number) => {
    setEditorOptions(prev => ({
      ...prev,
      fontSize: Math.max(8, Math.min(32, prev.fontSize + delta))
    }));
  };

  const toggleTheme = () => {
    setEditorOptions(prev => ({
      ...prev,
      theme: prev.theme === 'monokai' ? 'github' : 'monokai'
    }));
    handleSettingsClose();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (hasChanges && isEditing) {
        handleSave();
      }
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
          Failed to load code file
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fileName ? `Could not display "${fileName}"` : 'The code file could not be displayed'}
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography>Loading code file...</Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Code Editor Toolbar */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 48,
          gap: 1,
          flexWrap: 'wrap'
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1, minWidth: 200 }}>
          {fileName}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip 
            label={language.toUpperCase()} 
            size="small" 
            variant="outlined"
            sx={{ textTransform: 'uppercase' }}
          />
          
          <Chip 
            label={`${lineCount} lines`} 
            size="small" 
            variant="outlined"
          />
          
          <Chip 
            label={fileSize} 
            size="small" 
            variant="outlined"
          />
          
          {hasChanges && (
            <Chip 
              label="Unsaved" 
              size="small" 
              color="warning"
              variant="filled"
            />
          )}
        </Box>
        
        <IconButton 
          onClick={handleSettingsClick}
          size="small" 
          title="Editor settings"
        >
          <Settings />
        </IconButton>
        
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
            title="Save file (Ctrl+S)"
          >
            <Save />
          </IconButton>
        )}
        
        <IconButton 
          onClick={handleOpenWithSystemApp} 
          size="small" 
          title="Open with system app"
        >
          <GetApp />
        </IconButton>
      </Toolbar>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
      >
        <MenuItem onClick={toggleWordWrap}>
          <WrapText sx={{ mr: 1 }} />
          Word Wrap: {editorOptions.wordWrap ? 'On' : 'Off'}
        </MenuItem>
        <MenuItem onClick={() => changeFontSize(-2)}>
          <FormatSize sx={{ mr: 1 }} />
          Decrease Font Size
        </MenuItem>
        <MenuItem onClick={() => changeFontSize(2)}>
          <FormatSize sx={{ mr: 1 }} />
          Increase Font Size
        </MenuItem>
        <MenuItem onClick={toggleTheme}>
          <Palette sx={{ mr: 1 }} />
          Theme: {editorOptions.theme === 'monokai' ? 'Dark' : 'Light'}
        </MenuItem>
      </Menu>

      {/* ACE Editor */}
      <Box sx={{ 
        flexGrow: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <AceEditor
          ref={editorRef}
          mode={language}
          theme={editorOptions.theme}
          value={content}
          onChange={handleContentChange}
          name="code-editor"
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
            fontSize: editorOptions.fontSize,
            wrap: editorOptions.wordWrap,
            readOnly: !isEditing,
            highlightActiveLine: isEditing,
            highlightSelectedWord: true,
            showPrintMargin: true,
            printMarginColumn: 120,
            useSoftTabs: true,
            navigateWithinSoftTabs: true
          }}
          width="100%"
          height="100%"
          style={{
            fontFamily: 'Consolas, Monaco, "Courier New", monospace'
          }}
        />
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
          <Typography>Saving file...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default CodeViewer; 