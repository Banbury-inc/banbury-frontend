import React from 'react';
import { Link } from '@mui/material';
import { Breadcrumbs } from '@mui/material';
import GrainIcon from '@mui/icons-material/Grain';
import DevicesIcon from '@mui/icons-material/Devices';
import { useAuth } from '../../../../context/AuthContext';

export function FileBreadcrumbs() {
  const { files, global_file_path, global_file_path_device } = useAuth();
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
