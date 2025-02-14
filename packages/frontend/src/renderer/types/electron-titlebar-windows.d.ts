declare module 'electron-titlebar-windows' {
  import { Component } from 'react';

  interface TitleBarProps {
    title?: string;
    backgroundColor?: string;
    color?: string;
    borderBottom?: string;
    onClose?: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
  }

  export default class TitleBar extends Component<TitleBarProps> {}
} 