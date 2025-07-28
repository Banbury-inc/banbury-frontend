import React, { useState } from 'react';
import { 
  Button, 
  Tooltip, 
  Popover, 
  Box, 
  Typography, 
  MenuItem, 
  MenuList,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import GridOnIcon from '@mui/icons-material/GridOn';
import { useAuth } from '../../../../../../renderer/context/AuthContext';
import { useAlert } from '../../../../../../renderer/context/AlertContext';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';
import banbury from '@banbury/core';
import path from 'path';
import os from 'os';
import { writeFile } from 'fs/promises';

interface CreateNewButtonProps {
  onFileCreated?: (fileName: string, filePath: string) => void;
  onRefreshFiles?: () => void;
}

export default function CreateNewButton({ onFileCreated, onRefreshFiles }: CreateNewButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { showAlert } = useAlert();
  const { username, devices, tasks, setTasks, setTaskbox_expanded } = useAuth();
  
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const createNewDocument = async () => {
    let taskInfo: any = null;
    
    try {
      handleClose();

      if (!username || !devices || devices.length === 0) {
        showAlert('Error', ['Please ensure you are logged in with a registered device.'], 'error');
        return;
      }

      // Create a task for the document creation
      const taskDescription = 'Creating new document';
      taskInfo = await banbury.sessions.addTask(taskDescription, tasks || [], setTasks);
      setTaskbox_expanded(true);

      // Generate a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `New Document ${timestamp}.docx`;

      // Create a new DOCX document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "New Document",
                  bold: true,
                  size: 32, // 16pt font
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "",
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Start typing your content here...",
                  italics: true,
                }),
              ],
            }),
          ]
        }]
      });

      // Generate DOCX buffer
      const docxBuffer = await Packer.toBuffer(doc);

      // Create a temporary file path
      const tempDir = path.join(os.homedir(), 'BCloud');
      const tempFilePath = path.join(tempDir, fileName);

      // Write the file temporarily
      await writeFile(tempFilePath, docxBuffer);

      // Create a File object for upload
      const file = new File([docxBuffer], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Upload to cloud
      const deviceName = devices[0].device_name;
      await banbury.files.uploadToS3(
        file,
        deviceName,
        'Core/Cloud',
        'Cloud'
      );

      // Complete the task
      await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);

      showAlert('Success', [
        `Document "${fileName}" created and uploaded to cloud successfully.`
      ], 'success');

      // Call the callback if provided (before cleaning up the file)
      if (onFileCreated) {
        onFileCreated(fileName, tempFilePath);
      }

      // Refresh the file tree to show the new file
      if (onRefreshFiles) {
        onRefreshFiles();
      }

      // Clean up temporary file after callback
      try {
        const fs = await import('fs/promises');
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('Could not clean up temporary file:', cleanupError);
      }

    } catch (error) {
      console.error('Error creating document:', error);
      
      // Fail the task if it was created
      if (taskInfo) {
        await banbury.sessions.failTask(
          taskInfo, 
          error instanceof Error ? error.message : 'Unknown error', 
          tasks || [], 
          setTasks
        );
      }

      showAlert('Error', [
        'Failed to create document.',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      ], 'error');
    }
  };

  const createNewSpreadsheet = async () => {
    let taskInfo: any = null;
    
    try {
      handleClose();

      if (!username || !devices || devices.length === 0) {
        showAlert('Error', ['Please ensure you are logged in with a registered device.'], 'error');
        return;
      }

      // Create a task for the spreadsheet creation
      const taskDescription = 'Creating new spreadsheet';
      taskInfo = await banbury.sessions.addTask(taskDescription, tasks || [], setTasks);
      setTaskbox_expanded(true);

      // Generate a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `New Spreadsheet ${timestamp}.xlsx`;

      // Create a new Excel workbook with sample data
      const workbook = XLSX.utils.book_new();
      
      // Create sample data for the first sheet
      const sampleData = [
        ['A', 'B', 'C', 'D'],
        ['1', '', '', ''],
        ['2', '', '', ''],
        ['3', '', '', ''],
        ['4', '', '', '']
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      // Create a temporary file path
      const tempDir = path.join(os.homedir(), 'BCloud');
      const tempFilePath = path.join(tempDir, fileName);

      // Write the file temporarily
      await writeFile(tempFilePath, excelBuffer);

      // Create a File object for upload
      const file = new File([excelBuffer], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Upload to cloud
      const deviceName = devices[0].device_name;
      await banbury.files.uploadToS3(
        file,
        deviceName,
        'Core/Cloud',
        'Cloud'
      );

      // Complete the task
      await banbury.sessions.completeTask(taskInfo, tasks || [], setTasks);

      showAlert('Success', [
        `Spreadsheet "${fileName}" created and uploaded to cloud successfully.`
      ], 'success');

      // Call the callback if provided (before cleaning up the file)
      if (onFileCreated) {
        onFileCreated(fileName, tempFilePath);
      }

      // Refresh the file tree to show the new file
      if (onRefreshFiles) {
        onRefreshFiles();
      }

      // Clean up temporary file after callback
      try {
        const fs = await import('fs/promises');
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('Could not clean up temporary file:', cleanupError);
      }

    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      
      // Fail the task if it was created
      if (taskInfo) {
        await banbury.sessions.failTask(
          taskInfo, 
          error instanceof Error ? error.message : 'Unknown error', 
          tasks || [], 
          setTasks
        );
      }

      showAlert('Error', [
        'Failed to create spreadsheet.',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      ], 'error');
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Tooltip title="Create new file">
        <Button
          onClick={handleClick}
          sx={{ 
            paddingLeft: '4px', 
            paddingRight: '4px', 
            minWidth: '30px',
            color: 'inherit'
          }}
        >
          <AddIcon fontSize="inherit" />
        </Button>
      </Tooltip>
      
      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: '200px',
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
            mt: 1,
            boxShadow: 3,
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" sx={{ p: 1, color: 'text.secondary' }}>
            Create New
          </Typography>
          <MenuList dense>
            <MenuItem onClick={createNewDocument} sx={{ borderRadius: '4px' }}>
              <ListItemIcon>
                <DescriptionIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Document" secondary="DOCX file" />
            </MenuItem>
            <MenuItem onClick={createNewSpreadsheet} sx={{ borderRadius: '4px' }}>
              <ListItemIcon>
                <GridOnIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Spreadsheet" secondary="XLSX file" />
            </MenuItem>
          </MenuList>
        </Box>
      </Popover>
    </Box>
  );
} 