import React from 'react';
import { Link } from '@mui/material';
import { Breadcrumbs } from '@mui/material';
import GrainIcon from '@mui/icons-material/Grain';
import { useAuth } from '../../../../context/AuthContext';

export function FileBreadcrumbs() {
  const { files, global_file_path, setGlobal_file_path } = useAuth();
  const pathSegments = global_file_path ? global_file_path.split('/').filter(Boolean) : [];

  const handleBreadcrumbClick = (path: string) => {
    setGlobal_file_path(path);
  };

  return (
    <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center' }}>
      <Link
        underline="hover"
        color="inherit"
        href="#"
        onClick={() => handleBreadcrumbClick('/')}
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: 'text.primary'
        }}
      >
        <GrainIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        {!global_file_path && "Core"}
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
