import React, { useEffect, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { draggable, monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { ElementDropTargetGetFeedbackArgs } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { createRoot } from 'react-dom/client';

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
  isNew?: boolean;
  isClosing?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabAdd?: () => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

const DragPreview = ({ label }: { label: string }) => (
  <div
    className="
      bg-[#1e1e1e]
      text-white
      w-20
      h-8
      px-4
      py-2
      rounded-md
      flex
      items-center
      gap-2
      shadow-lg
      border-[#333]
    "
  >
    <div className="w-4 h-4 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M14 4v10H2V4h12zm0-1H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1zm-1-1V1H3v1h10z"/>
      </svg>
    </div>
    {label}
  </div>
);

export const TabComponent = ({ label, isActive, onClick, onClose, style, isNew, isClosing }: TabProps) => (
  <div
    onClick={onClick}
    style={style}
    className={`
      tab
      ${isNew ? 'animate-tab-enter opacity-0' : ''}
      ${isClosing ? 'animate-tab-exit' : ''}
      mt-5
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
        ? 'text-white bg-[rgba(23,23,23)] border-t border-l border-r border-[rgba(23,23,23)] before:absolute before:top-0 before:left-0 before:right-0 before:h-[0px] before:bg-white' 
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
          rounded-sm
          hover:bg-white/10
          transition-colors
          opacity-0
          group-hover:opacity-100
          ${isActive ? 'opacity-100' : ''}
        `}
      >
        <CloseIcon sx={{ fontSize: 'inherit' }} />
      </button>
    )}
  </div>
);

const DropIndicator = ({ edge, gap, left }: { edge: Edge; gap: string; left: number }) => (
  <div
    style={{
      position: 'fixed',
      backgroundColor: 'white',
      width: '2px',
      height: '28px',
      top: '25px',
      left: `${left}px`,
      transform: 'translateY(-50%)',
      transition: 'left 150ms ease',
      boxShadow: '0 0 3px rgba(126, 107, 242, 0.8)',
      borderRadius: '1px',
      zIndex: 10000,
    }}
  />
);

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  onTabClose, 
  onTabAdd,
  onReorder
}) => {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [draggedOverTab, setDraggedOverTab] = useState<string | null>(null);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [indicatorPosition, setIndicatorPosition] = useState<number | null>(null);
  const [newTabId, setNewTabId] = useState<string | null>(null);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);
  const [renderedTabs, setRenderedTabs] = useState(tabs);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTabsLength = useRef(tabs.length);

  // Handle tab close animation
  const handleTabClose = (tabId: string) => {
    // Don't animate if it's the last tab
    if (tabs.length <= 1) {
      if (onTabClose) {
        onTabClose(tabId);
      }
      return;
    }

    setClosingTabId(tabId);
    setTimeout(() => {
      if (onTabClose) {
        onTabClose(tabId);
      }
      setClosingTabId(null);
    }, 200);
  };

  // Watch for new tabs being added
  useEffect(() => {
    if (tabs.length > prevTabsLength.current) {
      // A new tab was added
      const newTab = tabs[tabs.length - 1];
      // Only animate if it's not the first tab
      if (tabs.length > 1) {
        setNewTabId(newTab.id);
        setTimeout(() => {
          setRenderedTabs(tabs);
        }, 0);
      } else {
        setRenderedTabs(tabs);
      }
    } else {
      setRenderedTabs(tabs);
    }
    prevTabsLength.current = tabs.length;
  }, [tabs]);

  // Reset new tab animation after it plays
  useEffect(() => {
    if (newTabId) {
      const timer = setTimeout(() => {
        setNewTabId(null);
      }, 200); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [newTabId]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => ({ type: 'container' }),
      onDrag: () => {},
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    });
  }, []);

  useEffect(() => {
    const cleanupFns = tabs.map((tab, index) => {
      const element = tabRefs.current[index];
      if (!element) return () => {};

      return combine(
        draggable({
          element,
          getInitialData: () => ({ id: tab.id, index, type: 'tab' }),
          onDragStart: () => {
            setDraggedTab(tab.id);
          },
          onGenerateDragPreview: ({ nativeSetDragImage }) => {
            if (!nativeSetDragImage) return;
            
            // Create drag preview
            const previewEl = document.createElement('div');
            previewEl.style.position = 'fixed';
            previewEl.style.top = '0';
            previewEl.style.left = '0';
            previewEl.style.width = '100px';
            previewEl.style.height = '100px';
            document.body.appendChild(previewEl);
            
            const root = createRoot(previewEl);
            root.render(<DragPreview label={tab.label} />);
            
            nativeSetDragImage(previewEl, 10, 10);
            
            // Clean up after a short delay
            setTimeout(() => {
              root.unmount();
              document.body.removeChild(previewEl);
            }, 0);
          },
          onDrag: () => {},
          onDrop: () => {
            setDraggedTab(null);
          }
        }),
        dropTargetForElements({
          element,
          getData: (args: ElementDropTargetGetFeedbackArgs) => attachClosestEdge(
            { id: tab.id, index, type: 'tab' },
            {
              element,
              input: args.input,
              allowedEdges: ['left', 'right']
            }
          ),
          onDrag(args) {
            const edge = extractClosestEdge(args.self.data);
            if (edge) {
              const rect = element.getBoundingClientRect();
              setDraggedOverTab(tab.id);
              setClosestEdge(edge);
              setIndicatorPosition(edge === 'left' ? rect.left : rect.right);
            }
          },
          onDragLeave() {
            setDraggedOverTab(null);
            setClosestEdge(null);
            setIndicatorPosition(null);
          },
          onDrop() {
            setDraggedOverTab(null);
            setClosestEdge(null);
            setIndicatorPosition(null);
          }
        })
      );
    });

    return () => {
      cleanupFns.forEach(cleanup => cleanup());
    };
  }, [tabs]);

  useEffect(() => {
    return monitorForElements({
      onDrop({ location, source }) {
        if (source.data.type !== 'tab') return;

        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceIndex = tabs.findIndex(tab => tab.id === source.data.id);
        
        if (target.data.type === 'container') {
          // If dropped on container, move to end
          if (sourceIndex >= 0 && onReorder) {
            onReorder(sourceIndex, tabs.length);
          }
        } else {
          // If dropped on another tab
          const targetIndex = tabs.findIndex(tab => tab.id === target.data.id);
          const edge = extractClosestEdge(target.data);
          
          if (sourceIndex >= 0 && targetIndex >= 0 && onReorder) {
            const finalIndex = edge === 'right' ? targetIndex + 1 : targetIndex;
            onReorder(sourceIndex, finalIndex);
          }
        }
      }
    });
  }, [tabs, onReorder]);

  return (
    <div ref={containerRef} className="flex items-center group">
      <style>
        {`
          .tab {
            -webkit-app-region: no-drag;
            cursor: grab;
            position: relative;
            transform-origin: left center;
          }
          .tab.dragging {
            opacity: 0.5;
          }
          @keyframes tabEnter {
            0% {
              opacity: 0;
              transform: scaleX(0);
            }
            100% {
              opacity: 1;
              transform: scaleX(1);
            }
          }
          @keyframes tabExit {
            0% {
              opacity: 1;
              transform: scaleX(1);
            }
            100% {
              opacity: 0;
              transform: scaleX(0);
            }
          }
          .animate-tab-enter {
            animation: tabEnter 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
            will-change: transform, opacity;
          }
          .animate-tab-exit {
            animation: tabExit 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
            will-change: transform, opacity;
          }
        `}
      </style>
      {renderedTabs.map((tab) => (
        <div
          ref={el => tabRefs.current[tabs.indexOf(tab)] = el}
          key={tab.id}
          className="relative"
        >
          <TabComponent
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            onClose={() => handleTabClose(tab.id)}
            isNew={tab.id === newTabId}
            isClosing={tab.id === closingTabId}
          />
        </div>
      ))}
      {onTabAdd && (
        <button
          onClick={() => {
            if (onTabAdd) {
              onTabAdd();
            }
          }}
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
      {closestEdge && indicatorPosition !== null && (
        <DropIndicator 
          edge={closestEdge} 
          gap="1px" 
          left={indicatorPosition} 
        />
      )}
    </div>
  );
};

export default Tabs;
