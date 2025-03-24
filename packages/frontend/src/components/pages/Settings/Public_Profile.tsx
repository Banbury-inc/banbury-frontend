import React, { useState } from 'react';
import { Button, Card, Grid, Stack, Typography, Box, Divider, TextField, Avatar, Menu, MenuItem } from '@mui/material';
import { banbury } from '@banbury/core';
import { useAuth } from '../../../renderer/context/AuthContext';
import { handlers } from '../../../renderer/handlers';
import EditIcon from '@mui/icons-material/Edit';
import { useAlert } from '../../../renderer/context/AlertContext';


export default function Public_Profile() {
    const { showAlert } = useAlert();
    const { username, first_name, last_name, phone_number, email, tasks, setTasks, setTaskbox_expanded, setFirstname, setLastname, setPhoneNumber, setEmail, picture, setPicture } = useAuth();
    const [localPicture, setLocalPicture] = useState<any | null>(null);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSave = async (
        first_name: string,
        last_name: string,
        phone_number: string,
        email: string) => {

        try {
            const task_description = 'Updating Settings';
            const taskInfo = await banbury.sessions.addTask(username ?? '', task_description, tasks, setTasks);
            setTaskbox_expanded(true);

            const pictureData = localPicture ? {
                data: localPicture.base64,
                content_type: localPicture.content_type
            } : undefined;

            const response = await handlers.users.change_profile_info(
                username ?? '',
                first_name,
                last_name,
                phone_number,
                email,
                pictureData
            );

            if (response === 'success') {
                await banbury.sessions.completeTask(username ?? '', taskInfo, tasks, setTasks);
                setPicture(pictureData || null);
                showAlert('Success', ['Profile settings updated successfully'], 'success');
            } else {
                await banbury.sessions.failTask(username ?? '', taskInfo, 'Failed to update profile settings', tasks, setTasks);
                showAlert('Error', ['Failed to update profile settings'], 'error');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            showAlert('Error', ['Failed to save profile settings', error instanceof Error ? error.message : 'Unknown error'], 'error');
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showAlert('Error', ['Image file is too large. Maximum size is 5MB'], 'error');
                return;
            }

            try {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result?.toString().split(',')[1];
                    if (base64) {
                        setLocalPicture({
                            content_type: file.type,
                            data: base64,
                            source: 'upload',
                            size: file.size,
                            base64: base64
                        });
                        showAlert('Success', ['Image uploaded successfully'], 'success');
                    }
                };
                reader.onerror = () => {
                    showAlert('Error', ['Failed to read image file'], 'error');
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error uploading image:', error);
                showAlert('Error', ['Failed to process image', error instanceof Error ? error.message : 'Unknown error'], 'error');
            }
            handleClose();
        }
    };

    const handleRemovePhoto = () => {
        try {
            setLocalPicture(null);
            handleClose();
            showAlert('Success', ['Profile picture removed'], 'success');
        } catch (error) {
            console.error('Error removing photo:', error);
            showAlert('Error', ['Failed to remove profile picture', error instanceof Error ? error.message : 'Unknown error'], 'error');
        }
    };

    return (
        <>
            <Typography id="public-profile" paddingBottom={2} variant="h4" gutterBottom>
                Public Profile
            </Typography>


            <Card variant='outlined' sx={{ p: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Stack spacing={2}>


                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Stack spacing={2} sx={{ width: '100%' }}>
                                    <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: '1' }}>
                                            <Typography variant="h6" gutterBottom>Profile Picture</Typography>
                                            <Typography color="textSecondary" variant="caption">Upload a profile picture</Typography>
                                        </Box>
                                        <Box sx={{ width: '300px', display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar
                                                sx={{ width: 64, height: 64 }}
                                                src={localPicture?.data
                                                    ? `data:${localPicture.content_type};base64,${localPicture.data}`
                                                    : username && picture?.data
                                                        ? `${banbury.config.url.replace(/\/+$/, '')}/users/get_profile_picture/${username}`
                                                        : undefined
                                                }
                                            />
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={handleClick}
                                                startIcon={<EditIcon />}
                                                sx={{ height: '24px', minWidth: 'unset', padding: '2px 8px' }}
                                            >
                                                Edit
                                            </Button>
                                            <Menu
                                                anchorEl={anchorEl}
                                                open={open}
                                                onClose={handleClose}
                                            >
                                                <MenuItem component="label">
                                                    Upload a photo...
                                                    <input
                                                        type="file"
                                                        hidden
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                    />
                                                </MenuItem>
                                                <MenuItem onClick={handleRemovePhoto}>
                                                    Remove photo
                                                </MenuItem>
                                            </Menu>
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Box>

                            <Divider />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Stack spacing={2} sx={{ width: '100%' }}>
                                    <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: '1' }}>
                                            <Typography variant="h6" gutterBottom>First Name</Typography>
                                            <Typography color="textSecondary" variant="caption">The first name of the user</Typography>
                                        </Box>
                                        <Box sx={{ width: '300px' }}>
                                            <TextField
                                                size="small"
                                                value={first_name ?? ''}
                                                onChange={(e) => setFirstname(e.target.value)}
                                                fullWidth
                                            />
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Box>

                            <Divider />


                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Stack spacing={2} sx={{ width: '100%' }}>
                                    <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: '1' }}>
                                            <Typography variant="h6" gutterBottom>Last Name</Typography>
                                            <Typography color="textSecondary" variant="caption">The last name of the user</Typography>
                                        </Box>
                                        <Box sx={{ width: '300px' }}>
                                            <TextField
                                                size="small"
                                                value={last_name ?? ''}
                                                onChange={(e) => setLastname(e.target.value)}
                                                fullWidth
                                            />
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Box>

                            <Divider />


                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Stack spacing={2} sx={{ width: '100%' }}>
                                    <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: '1' }}>
                                            <Typography variant="h6" gutterBottom>Phone Number</Typography>
                                            <Typography color="textSecondary" variant="caption">The phone number of the user</Typography>
                                        </Box>
                                        <Box sx={{ width: '300px' }}>
                                            <TextField
                                                size="small"
                                                value={phone_number ?? ''}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                fullWidth
                                                type="tel"
                                            />
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Box>



                            <Divider />


                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Stack spacing={2} sx={{ width: '100%' }}>
                                    <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: '1' }}>
                                            <Typography variant="h6" gutterBottom>Email</Typography>
                                            <Typography color="textSecondary" variant="caption">The email of the user</Typography>
                                        </Box>
                                        <Box sx={{ width: '300px' }}>
                                            <TextField
                                                size="small"
                                                value={email ?? ''}
                                                onChange={(e) => setEmail(e.target.value)}
                                                fullWidth
                                                type="email"
                                            />
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Box>


                        </Stack>
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                handleSave(
                                    first_name ?? '',
                                    last_name ?? '',
                                    phone_number ?? '',
                                    email ?? '',
                                )
                            }}
                            sx={{ mt: 2, fontSize: '12px', padding: '2px 8px', height: '24px', minWidth: 'unset' }}
                        >
                            Save
                        </Button>
                    </Grid>
                </Grid>
            </Card>
        </>
    );
}
