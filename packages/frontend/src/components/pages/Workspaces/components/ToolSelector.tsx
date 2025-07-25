import React, { useState, useMemo } from 'react';
import {
  Box,
  Tooltip,
  Popover,
  Typography,
  Stack,
  Divider,
} from '@mui/material';
import { ToolbarButton } from '../../../common/ToolbarButton/ToolbarButton';
import BuildIcon from '@mui/icons-material/Build';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EmailIcon from '@mui/icons-material/Email';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CloudIcon from '@mui/icons-material/Cloud';
import TaskIcon from '@mui/icons-material/Task';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  category?: string;
  requiresAuth?: boolean;
  note?: string;
}

interface ToolSelectorProps {
  onToolsChange?: (enabledTools: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

const availableTools: Tool[] = [
  {
    id: 'webSearch',
    name: 'Web Search',
    description: 'Search and browse the web for real-time information',
    icon: SearchIcon,
    enabled: true,
    category: 'Research'
  },
  {
    id: 'filesystem',
    name: 'File System',
    description: 'Read, write, and manage files and directories',
    icon: FolderOpenIcon,
    enabled: true,
    category: 'File Management'
  },
  {
    id: 'banbury',
    name: 'Banbury Core',
    description: 'Access Banbury platform features and data',
    icon: CloudIcon,
    enabled: true,
    category: 'Platform'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read, send, and manage Gmail emails',
    icon: EmailIcon,
    enabled: false,
    category: 'Communication',
    requiresAuth: true,
    note: 'Requires Gmail authentication'
  },
  {
    id: 'googleCalendar',
    name: 'Google Calendar',
    description: 'View and manage calendar events',
    icon: CalendarTodayIcon,
    enabled: false,
    category: 'Productivity',
    requiresAuth: true,
    note: 'Requires Google Calendar authentication'
  },
  {
    id: 'googleDrive',
    name: 'Google Drive',
    description: 'Access and manage Google Drive files',
    icon: StorageIcon,
    enabled: false,
    category: 'File Management',
    requiresAuth: true,
    note: 'Requires Google Drive authentication'
  },
  {
    id: 'googleTasks',
    name: 'Google Tasks',
    description: 'Manage tasks and to-do lists',
    icon: TaskIcon,
    enabled: false,
    category: 'Productivity',
    requiresAuth: true,
    note: 'Requires Google Tasks authentication'
  },
  {
    id: 'codeExecution',
    name: 'Code Execution',
    description: 'Execute code snippets and scripts',
    icon: CodeIcon,
    enabled: false,
    category: 'Development',
    note: 'Execute Python, JavaScript, and other code'
  }
];

const ToolSelector: React.FC<ToolSelectorProps> = ({ onToolsChange, disabled = false, compact = false }) => {
  const [tools, setTools] = useState(availableTools);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const enabledTools = useMemo(() => tools.filter(tool => tool.enabled), [tools]);

  const toggleTool = React.useCallback((toolId: string) => {
    setTools(prevTools => {
      const newTools = prevTools.map(tool => 
        tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
      );
      
      const newEnabledIds = newTools.filter(t => t.enabled).map(t => t.id);
      onToolsChange?.(newEnabledIds);
      
      return newTools;
    });
  }, [onToolsChange]);

  const toggleWebSearch = React.useCallback(() => {
    toggleTool('webSearch');
  }, [toggleTool]);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen(!open);
  }, [open]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
    setAnchorEl(null);
  }, []);

  // Handle clicks outside of the menu
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (open && anchorEl && !anchorEl.contains(event.target as Node) && 
          !(event.target as Element).closest('[data-tool-menu]')) {
        setOpen(false);
        setAnchorEl(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        setAnchorEl(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, anchorEl]);

  const groupedTools = useMemo(() => {
    const groups: { [category: string]: Tool[] } = {};
    tools.forEach(tool => {
      const category = tool.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tool);
    });
    return groups;
  }, [tools]);

  const webSearchTool = tools.find(tool => tool.id === 'webSearch');
  const otherEnabledCount = enabledTools.filter(tool => tool.id !== 'webSearch').length;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {/* Web Search Toggle (separate button) */}
      <Tooltip 
        title={`${webSearchTool?.name}: ${webSearchTool?.description}`}
        arrow
        placement="top"
      >
        <span>
          <ToolbarButton
            disabled={disabled}
            onClick={toggleWebSearch}
            sx={{
              paddingLeft: '4px', 
              paddingRight: '4px', 
              minWidth: '30px',
              backgroundColor: webSearchTool?.enabled ? 'rgba(33,150,243,0.15)' : 'transparent',
              color: webSearchTool?.enabled ? 'info.main' : 'text.primary',
              '&:hover': {
                backgroundColor: webSearchTool?.enabled ? 'rgba(33,150,243,0.22)' : 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <LanguageIcon fontSize="inherit" />
            {!compact && <Typography variant="caption" sx={{ ml: 0.5 }}>Web</Typography>}
          </ToolbarButton>
        </span>
      </Tooltip>

      {/* Tools Menu Toggle */}
      <Tooltip 
        title="AI Tools - Enable additional capabilities for the assistant"
        arrow
        placement="top"
      >
        <span>
          <ToolbarButton
            {...({ ref: setAnchorEl } as any)}
            disabled={disabled}
            onClick={handleClick}
            sx={{
              paddingLeft: '4px', 
              paddingRight: '4px', 
              minWidth: '30px',
              backgroundColor: otherEnabledCount > 0 ? 'rgba(33,150,243,0.15)' : 'transparent',
              color: otherEnabledCount > 0 ? 'info.main' : 'text.primary',
              '&:hover': {
                backgroundColor: otherEnabledCount > 0 ? 'rgba(33,150,243,0.22)' : 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <BuildIcon fontSize="inherit" />
          </ToolbarButton>
        </span>
      </Tooltip>

      {/* Tools Menu */}
      <Popover 
        open={open} 
        anchorEl={anchorEl} 
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        sx={{ zIndex: 9999 }}
        data-tool-menu
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            AI Tools
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Enable tools to enhance AI capabilities
          </Typography>
        </Box>

        <Box sx={{ py: 1, maxHeight: 400, overflow: 'auto' }}>
          {Object.entries(groupedTools).map(([category, categoryTools]) => (
            <Box key={category}>
              {categoryTools.length > 0 && (
                <>
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {category}
                    </Typography>
                  </Box>
                  {categoryTools
                    .filter(tool => tool.id !== 'webSearch') // Exclude web search as it has its own button
                    .map((tool) => (
                      <Box
                        key={tool.id}
                        sx={{
                          mx: 1,
                          borderRadius: 1,
                          backgroundColor: tool.enabled ? 'primary.light' : 'transparent',
                          color: tool.enabled ? 'primary.contrastText' : 'text.primary',
                          '&:hover': {
                            backgroundColor: tool.enabled ? 'primary.main' : 'action.hover',
                          },
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                          <tool.icon sx={{ fontSize: 20 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: tool.enabled ? 600 : 400 }}>
                              {tool.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {tool.description}
                            </Typography>
                            {tool.note && (
                              <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                                {tool.note}
                              </Typography>
                            )}
                          </Box>
                          {tool.enabled && (
                            <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                          )}
                        </Stack>
                      </Box>
                    ))}
                  <Divider sx={{ my: 1 }} />
                </>
              )}
            </Box>
          ))}
          
          <Box sx={{ mx: 1, borderRadius: 1, justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Close
            </Typography>
          </Box>
        </Box>
      </Popover>
    </Stack>
  );
};

export default ToolSelector; 