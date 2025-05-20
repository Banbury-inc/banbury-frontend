import React from 'react';
import { Stack, Chip } from '@mui/material';
import { banbury } from "@banbury/core";

interface ScannedFoldersChipsProps {
  scanned_folders: string[];
  username: string;
  onFoldersUpdate: () => void; // New callback prop
}

export default function ScannedFoldersChips({ scanned_folders, onFoldersUpdate }: ScannedFoldersChipsProps) {
  // Handler to delete a folder from the list
  const handleDeleteFolder = async (folderToDelete: string) => {
    try {
      await banbury.device.removeScannedFolder(folderToDelete);
      onFoldersUpdate(); // Call the callback to trigger a refresh
    } catch (error) {
      console.error("Error deleting folder:", error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 2 }}>
      {scanned_folders.map((folder, index) => (
        <Chip
          key={index}

          label={folder}
          onDelete={() => handleDeleteFolder(folder)}
          color="primary"
          variant="outlined"
          size="small"
          sx={{ fontSize: '12px' }}

        />
      ))}
    </Stack>
  );
}
