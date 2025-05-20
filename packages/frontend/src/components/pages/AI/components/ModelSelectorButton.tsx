import React, { useState, useEffect } from 'react';
import { 
  Button,
  Popover,
  Box,
  Typography,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  LinearProgress,
  Tooltip,
  Divider,
  InputAdornment
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { OllamaClient } from '@banbury/core/src/ai';
import { ipcRenderer } from 'electron';
import { addDownloadedModel } from '@banbury/core/src/ai/addDownloadedModel';
import { useAuth } from '../../../../renderer/context/AuthContext';
import { banbury } from '@banbury/core';

interface Model {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: Date;
  isDownloaded?: boolean;
  category?: string;
}

interface ModelSelectorButtonProps {
  currentModel: string;
  onModelChange: (model: string) => void;
}

interface ModelInfo {
  name: string;
  category: string;
  size: string;
}

const AVAILABLE_MODELS: ModelInfo[] = [
  // Large Language Models
  { name: 'llama2', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'llama2:7b', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'llama2:13b', category: 'Large Language Models', size: '7.3 GB' },
  { name: 'llama2:70b', category: 'Large Language Models', size: '39.1 GB' },
  { name: 'llama2-uncensored', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'mistral', category: 'Large Language Models', size: '4.1 GB' },
  { name: 'mixtral', category: 'Large Language Models', size: '26.1 GB' },
  { name: 'mixtral:8x7b', category: 'Large Language Models', size: '26.1 GB' },
  { name: 'neural-chat', category: 'Large Language Models', size: '4.1 GB' },
  { name: 'vicuna', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'vicuna:7b', category: 'Large Language Models', size: '3.8 GB' },
  { name: 'vicuna:13b', category: 'Large Language Models', size: '7.3 GB' },
  { name: 'wizard-vicuna', category: 'Large Language Models', size: '3.8 GB' },
  
  // Code Models
  { name: 'codellama', category: 'Code Models', size: '3.8 GB' },
  { name: 'codellama:7b', category: 'Code Models', size: '3.8 GB' },
  { name: 'codellama:13b', category: 'Code Models', size: '7.3 GB' },
  { name: 'codellama:34b', category: 'Code Models', size: '19.1 GB' },
  { name: 'codellama-python', category: 'Code Models', size: '3.8 GB' },
  { name: 'codellama-python:7b', category: 'Code Models', size: '3.8 GB' },
  { name: 'codellama-python:13b', category: 'Code Models', size: '7.3 GB' },
  { name: 'codellama-python:34b', category: 'Code Models', size: '19.1 GB' },
  { name: 'deepseek-coder', category: 'Code Models', size: '3.8 GB' },
  { name: 'deepseek-coder:6.7b', category: 'Code Models', size: '3.8 GB' },
  { name: 'deepseek-coder:33b', category: 'Code Models', size: '18.7 GB' },
  
  // Research Models
  { name: 'deepseek', category: 'Research Models', size: '3.8 GB' },
  { name: 'deepseek:7b', category: 'Research Models', size: '3.8 GB' },
  { name: 'deepseek:33b', category: 'Research Models', size: '18.7 GB' },
  { name: 'deepseek:67b', category: 'Research Models', size: '37.8 GB' },
  { name: 'deepseek-r1:1.5b', category: 'Research Models', size: '1.1 GB' },
  { name: 'deepseek-r1:7b', category: 'Research Models', size: '4.7 GB' },
  { name: 'deepseek-r1:8b', category: 'Research Models', size: '4.9 GB' },
  { name: 'deepseek-r1:14b', category: 'Research Models', size: '9.0 GB' },
  { name: 'deepseek-r1:32b', category: 'Research Models', size: '20 GB' },
  { name: 'deepseek-r1:70b', category: 'Research Models', size: '43 GB' },
  { name: 'deepseek-r1:671b', category: 'Research Models', size: '404 GB' },
  { name: 'phi', category: 'Research Models', size: '1.6 GB' },
  { name: 'phi:2.7b', category: 'Research Models', size: '1.6 GB' },
  { name: 'qwen', category: 'Research Models', size: '3.8 GB' },
  { name: 'qwen:7b', category: 'Research Models', size: '3.8 GB' },
  { name: 'qwen:14b', category: 'Research Models', size: '7.8 GB' },
  { name: 'qwen:72b', category: 'Research Models', size: '40.5 GB' },
  { name: 'starling-lm', category: 'Research Models', size: '4.1 GB' },
  { name: 'starling-lm:7b', category: 'Research Models', size: '4.1 GB' },
  
  // Small Models
  { name: 'orca-mini', category: 'Small Models', size: '2.0 GB' },
  { name: 'orca-mini:3b', category: 'Small Models', size: '1.8 GB' },
  { name: 'orca-mini:7b', category: 'Small Models', size: '3.8 GB' },
  { name: 'dolphin-phi', category: 'Small Models', size: '1.6 GB' },
  { name: 'tinyllama', category: 'Small Models', size: '0.7 GB' },
  { name: 'tinyllama:1.1b', category: 'Small Models', size: '0.7 GB' },
  
  // Specialized Models
  { name: 'stable-beluga', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'nous-hermes', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'solar', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'neural-chat', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'openchat', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'openhermes', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'openhermes:7b', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'openhermes:2.5', category: 'Specialized Models', size: '1.6 GB' },
  { name: 'zephyr', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'zephyr:7b', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'yi', category: 'Specialized Models', size: '4.1 GB' },
  { name: 'yi:6b', category: 'Specialized Models', size: '3.5 GB' },
  { name: 'yi:34b', category: 'Specialized Models', size: '19.1 GB' },
  { name: 'falcon', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'falcon:7b', category: 'Specialized Models', size: '3.8 GB' },
  { name: 'falcon:40b', category: 'Specialized Models', size: '22.4 GB' },
];

export default function ModelSelectorButton({ currentModel, onModelChange }: ModelSelectorButtonProps) {
  const { username, devices} = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [downloadedModels, setDownloadedModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const open = Boolean(anchorEl);

  const ollamaClient = new OllamaClient();

  useEffect(() => {
    // Load the initial model selection
    const initializeModel = async () => {
      try {
        const selectedModel = await ipcRenderer.invoke('get-selected-model');
        onModelChange(selectedModel);
      } catch (error) {
        console.error('Failed to get initial model:', error);
      }
    };
    initializeModel();
  }, []);

  useEffect(() => {
    if (open) {
      loadModels();
    }
  }, [open]);

  useEffect(() => {
    // Listen for model download progress updates
    const handleModelProgress = (_event: any, data: { modelName: string, progress: string }) => {
      setDownloadProgress(prev => ({
        ...prev,
        [data.modelName]: data.progress
      }));
    };

    ipcRenderer.on('ollama-model-progress', handleModelProgress);

    return () => {
      ipcRenderer.removeListener('ollama-model-progress', handleModelProgress);
    };
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await ollamaClient.listModels();
      setDownloadedModels(response.models.map(model => ({ ...model, isDownloaded: true })));
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchQuery('');
  };

  const handleModelSelect = async (modelName: string) => {
    onModelChange(modelName);
    // Save the selected model
    try {
      await ipcRenderer.invoke('set-selected-model', modelName);
    } catch (error) {
      console.error('Failed to save model selection:', error);
    }
    handleClose();
  };

  const handleDownloadModel = async (modelName: string) => {
    try {
      setDownloadProgress(prev => ({
        ...prev,
        [modelName]: 'Starting download...'
      }));

      const result = await ipcRenderer.invoke('download-ollama-model', modelName);
      
      if (result.success) {
        await loadModels();
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[modelName];
          return newProgress;
        });

        // After successful download, call add_downloaded_model
        try {
          if (username) {
            if (devices && devices.length > 0) {
              const device = devices.find(d => d.device_name === banbury.device.name());
              if (device) {
                const deviceId = device._id;
                const addModelResult = await addDownloadedModel(modelName, deviceId);
                if (addModelResult === 'failed' || addModelResult === 'task_add failed') {
                  console.error('Failed to register downloaded model');
                }
              }
            }
          }
        } catch (error) {
          console.error('Error registering downloaded model:', error);
        }
      } else {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[modelName];
          return newProgress;
        });
      }
    } catch (error) {
      console.error('Failed to download model:', error);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelName];
        return newProgress;
      });
    }
  };

  const categories = Array.from(new Set(AVAILABLE_MODELS.map(model => model.category)));
  
  const filteredModels = AVAILABLE_MODELS.filter(model => 
    (!selectedCategory || model.category === selectedCategory) &&
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderModelItem = (modelName: string, isDownloaded: boolean) => {
    const isDownloading = !!downloadProgress[modelName];
    const isCurrentModel = currentModel === modelName;
    const modelInfo = AVAILABLE_MODELS.find(m => m.name === modelName);

    return (
      <ListItem
        key={modelName}
        onClick={() => isDownloaded ? handleModelSelect(modelName) : handleDownloadModel(modelName)}
        sx={{
          borderRadius: 1,
          height: 'auto',
          minHeight: 48,
          mb: 0.5,
          cursor: 'pointer',
          backgroundColor: isCurrentModel 
            ? 'rgba(255, 255, 255, 0.08)'
            : 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          {isCurrentModel ? (
            <CheckIcon fontSize="inherit" sx={{ color: 'primary.main' }} />
          ) : isDownloaded ? null : (
            <CloudDownloadIcon fontSize="inherit" sx={{ color: 'grey.500' }} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="inherit" sx={{ color: 'white', fontWeight: 500 }}>
                {modelName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'grey.500', ml: 1 }}>
                {modelInfo?.size}
              </Typography>
            </Stack>
          }
          secondary={
            isDownloading ? (
              <>
                <LinearProgress sx={{ mt: 0.5 }} />
                <Typography variant="caption" sx={{ color: 'grey.500', mt: 0.5, display: 'block' }}>
                  {downloadProgress[modelName]}
                </Typography>
              </>
            ) : null
          }
        />
      </ListItem>
    );
  };

  return (
    <>
      <Tooltip title="Select AI Model">
        <Button
          onClick={handleClick}
          startIcon={<SmartToyOutlinedIcon fontSize="small" />}
          endIcon={<KeyboardArrowDownIcon fontSize="small" />}
          sx={{ 
            height: '28px',
            padding: '3px 8px',
            minWidth: 'auto',
            fontSize: '13px',
            lineHeight: 1,
            color: 'white',
            textTransform: 'none',
            '& .MuiButton-startIcon': {
              marginRight: '6px',
              marginLeft: '-2px',
            },
            '& .MuiButton-endIcon': {
              marginLeft: '2px',
              marginRight: '-4px',
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }
          }}
        >
          {currentModel}
        </Button>
      </Tooltip>

      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: '300px',
            backgroundColor: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            mt: 1,
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
            '& .MuiTypography-root': {
              color: '#ffffff',
            },
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1}>
            <TextField
              size="small"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'grey.500' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                }
              }}
            />

            {categories.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                <Button
                  size="small"
                  variant={selectedCategory === null ? "contained" : "outlined"}
                  onClick={() => setSelectedCategory(null)}
                  sx={{ 
                    borderRadius: 1.5,
                    textTransform: 'none',
                    py: 0.25,
                    px: 1,
                    minHeight: 0,
                    fontSize: '0.75rem',
                    lineHeight: 1.2
                  }}
                >
                  All
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    size="small"
                    variant={selectedCategory === category ? "contained" : "outlined"}
                    onClick={() => setSelectedCategory(category)}
                    sx={{ 
                      borderRadius: 1.5,
                      textTransform: 'none',
                      py: 0.25,
                      px: 1,
                      minHeight: 0,
                      fontSize: '0.75rem',
                      lineHeight: 1.2
                    }}
                  >
                    {category}
                  </Button>
                ))}
              </Stack>
            )}

            {loading ? (
              <ListItem>
                <ListItemText 
                  primary={
                    <Typography variant="body2" sx={{ color: 'grey.500' }}>
                      Loading models...
                    </Typography>
                  }
                />
              </ListItem>
            ) : (
              <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
                {downloadedModels.length > 0 && (
                  <>
                    <Typography variant="caption" sx={{ color: 'grey.500', px: 2 }}>
                      Downloaded Models
                    </Typography>
                    {downloadedModels
                      .filter(model => model.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(model => renderModelItem(model.name, true))
                    }
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />
                  </>
                )}
                
                {(!selectedCategory ? categories : [selectedCategory]).map(category => (
                  <React.Fragment key={category}>
                    <Typography variant="caption" sx={{ color: 'grey.500', px: 2, display: 'block', mt: 1 }}>
                      {category}
                    </Typography>
                    {filteredModels
                      .filter(model => 
                        model.category === category && 
                        !downloadedModels.some(dm => dm.name === model.name)
                      )
                      .map(model => renderModelItem(model.name, false))
                    }
                  </React.Fragment>
                ))}
              </List>
            )}
          </Stack>
        </Box>
      </Popover>
    </>
  );
} 
