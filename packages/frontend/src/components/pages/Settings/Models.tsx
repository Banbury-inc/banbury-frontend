import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,

  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Save, Delete } from '@mui/icons-material';
import { useAlert } from '../../../renderer/context/AlertContext';

interface ModelConfig {
  anthropicApiKey: string;
  defaultModel: string;
  provider: 'ollama' | 'anthropic';
  enableAnthropic: boolean;
}

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-sonnet-4-20250514',
];

export default function Models() {
  const { showAlert } = useAlert();
  const [config, setConfig] = useState<ModelConfig>({
    anthropicApiKey: '',
    defaultModel: 'claude-sonnet-4-20250514',
    provider: 'ollama',
    enableAnthropic: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved configuration on component mount
  useEffect(() => {
    loadModelConfig();
  }, []);

  const loadModelConfig = async () => {
    try {
      setIsLoading(true);
      const saved = localStorage.getItem('banbury_model_config');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        setConfig({ ...config, ...parsedConfig });
      }
    } catch (error) {
      console.error('Error loading model config:', error);
      showAlert('Error', ['Failed to load model configuration'], 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (field: keyof ModelConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Validate API key format if Anthropic is enabled
      if (config.enableAnthropic && config.anthropicApiKey) {
        if (!config.anthropicApiKey.startsWith('sk-ant-')) {
          showAlert('Error', ['Invalid Anthropic API key format. It should start with "sk-ant-"'], 'error');
          return;
        }
      }

      // Save to localStorage
      localStorage.setItem('banbury_model_config', JSON.stringify(config));
      
      // Also save to the secure storage for API keys
      if (config.anthropicApiKey) {
        // Store in environment-like format for the Agent to access
        localStorage.setItem('ANTHROPIC_API_KEY', config.anthropicApiKey);
      }

      setHasChanges(false);
      showAlert('Success', ['Model configuration saved successfully'], 'success');
    } catch (error) {
      console.error('Error saving model config:', error);
      showAlert('Error', ['Failed to save model configuration'], 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearApiKey = () => {
    setConfig(prev => ({ ...prev, anthropicApiKey: '' }));
    localStorage.removeItem('ANTHROPIC_API_KEY');
    setHasChanges(true);
    showAlert('Success', ['API key cleared'], 'success');
  };

  const testAnthropicConnection = async () => {
    if (!config.anthropicApiKey) {
      showAlert('Error', ['Please enter an Anthropic API key first'], 'error');
      return;
    }

    try {
      setIsLoading(true);
      // Simple test to validate the API key
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.defaultModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      if (response.ok || response.status === 400) {
        // 400 is acceptable since we're sending a minimal request
        showAlert('Success', ['Anthropic API key is valid'], 'success');
      } else {
        showAlert('Error', ['Invalid Anthropic API key'], 'error');
      }
    } catch (error) {
      console.error('Error testing Anthropic connection:', error);
      showAlert('Error', ['Failed to test Anthropic connection'], 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        AI Models Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure AI model providers and their settings. Changes are saved locally and will be used by the AI agent.
      </Typography>

      <Grid container spacing={3}>
        {/* Provider Selection */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Default Provider
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>AI Provider</InputLabel>
                <Select
                  value={config.provider}
                  onChange={(e) => handleConfigChange('provider', e.target.value)}
                  label="AI Provider"
                >
                  <MenuItem value="ollama">Ollama (Local)</MenuItem>
                  <MenuItem value="anthropic">Anthropic (Cloud)</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Choose the default AI provider for new conversations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Anthropic Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                  Anthropic Configuration
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableAnthropic}
                      onChange={(e) => handleConfigChange('enableAnthropic', e.target.checked)}
                    />
                  }
                  label="Enable Anthropic"
                />
              </Box>

              {config.enableAnthropic && (
                <Box>
                  <TextField
                    fullWidth
                    label="Anthropic API Key"
                    type={showApiKey ? 'text' : 'password'}
                    value={config.anthropicApiKey}
                    onChange={(e) => handleConfigChange('anthropicApiKey', e.target.value)}
                    margin="normal"
                    placeholder="sk-ant-..."
                    helperText="Your Anthropic API key. Get one from https://console.anthropic.com/"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowApiKey(!showApiKey)}
                            edge="end"
                          >
                            {showApiKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                          {config.anthropicApiKey && (
                            <IconButton
                              onClick={handleClearApiKey}
                              edge="end"
                              title="Clear API key"
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </InputAdornment>
                      ),
                    }}
                  />

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Default Anthropic Model</InputLabel>
                    <Select
                      value={config.defaultModel}
                      onChange={(e) => handleConfigChange('defaultModel', e.target.value)}
                      label="Default Anthropic Model"
                    >
                      {ANTHROPIC_MODELS.map((model) => (
                        <MenuItem key={model} value={model}>
                          {model}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box mt={2}>
                    <Button
                      variant="outlined"
                      onClick={testAnthropicConnection}
                      disabled={!config.anthropicApiKey || isLoading}
                    >
                      Test Connection
                    </Button>
                  </Box>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Note:</strong> Your API key is stored locally in your browser and will be used to authenticate with Anthropic's API.
                      Make sure to keep your API key secure and never share it with others.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Ollama Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ollama (Local Models)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Ollama runs AI models locally on your machine. No API key required.
                Models are managed through the AI interface.
              </Typography>
              <Alert severity="info">
                <Typography variant="body2">
                  Ollama models provide privacy and don't require internet connectivity, 
                  but may have different performance characteristics compared to cloud models.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>
    </Box>
  );
} 
