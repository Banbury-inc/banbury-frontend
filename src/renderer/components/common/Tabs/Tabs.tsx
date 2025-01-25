import React, { useEffect, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { invariant } from 'framer-motion';
import { draggable, monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { ElementDropTargetGetFeedbackArgs } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';

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
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

export const TabComponent = ({ label, isActive, onClick, onClose, style }: TabProps) => (
  <div
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
  </div>
);

const DropIndicator = ({ edge, gap }: { edge: Edge; gap: string }) => (
  <div
    style={{
      position: 'absolute',
      backgroundColor: 'white',
      width: '2px',
      height: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      left: edge === 'left' ? `-${gap}` : 'auto',
      right: edge === 'right' ? `-${gap}` : 'auto',
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
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const cleanupFns = tabs.map((tab, index) => {
      const element = tabRefs.current[index];
      if (!element) return () => {};

      return combine(
        draggable({
          element,
          getInitialData: () => ({ id: tab.id, index }),
        }),
        dropTargetForElements({
          element,
          getData: (args: ElementDropTargetGetFeedbackArgs) => attachClosestEdge(
            { id: tab.id, index },
            {
              element,
              input: args.input,
              allowedEdges: ['left', 'right']
            }
          ),
          onDrag(args) {
            setClosestEdge(extractClosestEdge(args.self.data));
          },
          onDragLeave() {
            setClosestEdge(null);
          },
          onDrop() {
            setClosestEdge(null);
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
        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceIndex = tabs.findIndex(tab => tab.id === source.data.id);
        const targetIndex = tabs.findIndex(tab => tab.id === target.data.id);
        const edge = extractClosestEdge(target.data);
        
        if (sourceIndex >= 0 && targetIndex >= 0 && onReorder) {
          const finalIndex = edge === 'right' ? targetIndex + 1 : targetIndex;
          onReorder(sourceIndex, finalIndex);
        }
      }
    });
  }, [tabs, onReorder]);

  return (
    <div className="flex items-center group">
      <style>
        {`
          .tab {
            -webkit-app-region: no-drag;
            opacity: 1;
            cursor: grab;
            position: relative;
          }
          .tab.dragging {
            opacity: 0.5;
          }
        `}
      </style>
      {tabs.map((tab, index) => (
        <div
          ref={el => tabRefs.current[index] = el}
          key={tab.id}
          className={`relative ${draggedTab === tab.id ? 'opacity-50' : ''}`}
        >
          <TabComponent
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            onClose={onTabClose ? () => onTabClose(tab.id) : undefined}
          />
          {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
        </div>
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
