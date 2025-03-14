import React from 'react';
import { Link } from '@mui/material';
import { Breadcrumbs } from '@mui/material';
import GrainIcon from '@mui/icons-material/Grain';

export function FileBreadcrumbs({
  filePath,
  setFilePath,
}: {
  filePath: string;
  setFilePath: (filePath: string) => void;
}) {
  const pathSegments = filePath ? filePath.split('/').filter(Boolean) : [];

  const handleBreadcrumbClick = (path: string) => {
    setFilePath(path);
  };

  return (
    <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center' }}>
      <Link
        underline="hover"
        color="inherit"
        href="#"
        onClick={() => handleBreadcrumbClick('/Core')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: 'text.primary'
        }}
      >
        <GrainIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        {!filePath && "Core"}
      </Link>
      {pathSegments.length > 0 && (
        <>
          <span style={{ margin: '0 4px' }}>/</span>
          <Breadcrumbs aria-label="breadcrumb" separator="/">
            {pathSegments.map((segment, index) => {
              const pathUpToSegment = pathSegments.slice(0, index + 1).join('/');
              return (
                <Link
                  key={index}
                  underline="hover"
                  color="inherit"
                  href="#"
                  onClick={() => handleBreadcrumbClick(pathUpToSegment)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.primary'
                  }}
                >
                  {segment}
                </Link>
              );
            })}
          </Breadcrumbs>
        </>
      )}
    </div>
  );
} 
