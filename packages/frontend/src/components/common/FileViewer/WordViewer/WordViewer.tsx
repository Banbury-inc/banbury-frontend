import React from 'react';
import TiptapWordEditor from './TiptapWordEditor';

interface WordViewerProps {
  src: string;
  fileName?: string;
  onError?: () => void;
  onLoad?: () => void;
  onSave?: (filePath: string) => void;
  documentActions?: any;
  onDocumentEditorChange?: (editor: any, content: string, fileName: string) => void;
}

const WordViewer: React.FC<WordViewerProps> = ({
  src,
  fileName,
  onError,
  onLoad,
  onSave,
  documentActions,
  onDocumentEditorChange,
}) => {
  return (
    <TiptapWordEditor
      src={src}
      fileName={fileName}
      onError={onError}
      onLoad={onLoad}
      onSave={onSave}
      documentActions={documentActions}
      onDocumentEditorChange={onDocumentEditorChange}
    />
  );
};

export default WordViewer; 
