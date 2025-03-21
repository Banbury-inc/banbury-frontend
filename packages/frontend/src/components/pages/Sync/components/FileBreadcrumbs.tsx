import React from 'react';
import { Link } from '@mui/material';
import { Breadcrumbs } from '@mui/material';
import { useAuth } from '../../../../renderer/context/AuthContext';

export function FileBreadcrumbs() {
  const { global_file_path } = useAuth();
  const pathSegments = global_file_path ? global_file_path.split('/').filter(Boolean) : [];

  const handleBreadcrumbClick = (path: string) => {
    console.info(`Navigate to: ${path}`);
    // Set global_file_path or navigate logic here
  };

  return (
    <div style={{ padding: '8px 16px' }}>
      <Breadcrumbs aria-label="breadcrumb">
        {pathSegments.map((segment, index) => {
          const pathUpToSegment = '/' + pathSegments.slice(0, index + 1).join('/');
          return (
            <Link
              key={index}
              underline="hover"
              color="inherit"
              href="#"
              onClick={() => handleBreadcrumbClick(pathUpToSegment)}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {segment}
            </Link>
          );
        })}
      </Breadcrumbs>
    </div>
  );
} 
