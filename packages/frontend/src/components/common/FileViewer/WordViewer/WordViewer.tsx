import React from 'react';
import TiptapWordEditor from './TiptapWordEditor';

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
  onSave,
}) => {
  return (
    <TiptapWordEditor
      src={src}
      fileName={fileName}
      onError={onError}
      onLoad={onLoad}
      onSave={onSave}
    />
  );
};

export default WordViewer; 
