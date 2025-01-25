import React from 'react';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

export interface Tab {
  id: string;
  label: string;
  path?: string;
}

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabAdd?: () => void;
}

export const TabComponent = ({ label, isActive, onClick, onClose, style }: TabProps) => (
  <button
    onClick={onClick}
    style={style}
    className={`
      mt-4
      pl-4  
      h-8
      px-4 
      min-w-[140px]
      text-sm 
      font-medium 
      relative 
      mx-0.5
      rounded-[5px_5px_0_0]
      flex
      items-center
      justify-between
      gap-2
      ${isActive 
        ? 'text-white bg-[rgba(23,23,23)] border-t border-l border-r border-[#333] before:absolute before:top-0 before:left-0 before:right-0 before:h-[0px] before:bg-white' 
        : 'text-white/70 hover:bg-[#2a2a2a] hover:h-7 hover:rounded-[5px_5px_5px_5px]'
      }
      hover:text-white 
      focus:outline-none
      z-[9999]
      first:ml-2
    `}
  >
    <Typography
      variant="body2"
      className="truncate pl-2"
      sx={{ fontWeight: isActive ? 500 : 400 }}
    >
      {label}
    </Typography>
    {onClose && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`
          p-0.5
          rounded-sm
          hover:bg-white/10
          transition-colors
          opacity-0
          group-hover:opacity-100
          ${isActive ? 'opacity-100' : ''}
        `}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </button>
    )}
  </button>
);

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  onTabClose, 
  onTabAdd 
}) => {
  return (
    <div className="flex items-center group">
      {tabs.map(tab => (
        <TabComponent
          key={tab.id}
          label={tab.label}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          onClose={tabs.length > 1 ? () => onTabClose?.(tab.id) : undefined}
        />
      ))}
      {onTabAdd && (
        <button
          onClick={onTabAdd}
          className="
            h-7
            mt-4
            px-3
            ml-1
            text-white/70
            hover:text-white
            hover:bg-[#2a2a2a]
            rounded-[5px_5px_0_0]
            transition-colors
            z-[9999]
          "
        >
          <AddIcon fontSize="inherit" />
        </button>
      )}
    </div>
  );
};

export default Tabs;
