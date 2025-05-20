import * as React from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../renderer/context/AuthContext';
import { banbury } from '@banbury/core';
import { clearBanburyCredentials } from '@banbury/core/src/middleware/axiosGlobalHeader';
export default function AccountMenuIcon() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mainImageError, setMainImageError] = React.useState(false);
  const [menuImageError, setMenuImageError] = React.useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (anchorEl) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  React.useEffect(() => {
    if (username === null) {
      navigate('/login');
    }
  }, [username, navigate]);

  const handleLogout = () => {
    // Remove tokens/credentials from storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUsername');
    localStorage.removeItem('deviceId');
    clearBanburyCredentials();
    handleClose();
    logout();
  };

  const handleSettingsClick = React.useCallback(() => {
    navigate('/main', { state: { activeTab: 'Settings' } });
    handleClose();
  }, [navigate]);

  return (
    <React.Fragment>
      <Box sx={{ zIndex: 9999, mr: '20px', pr: '10px', pb: '2px', display: 'flex', alignItems: 'center', textAlign: 'center' }}>
        <Tooltip title="Account">
          <Avatar
            data-testid="account-menu-button"
            onClick={handleClick}
            aria-controls={open ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            sx={{
              cursor: 'pointer',
              width: 24,
              height: 24,
              fontSize: '0.875rem',
              bgcolor: 'primary.main'
            }}
          >
            {username && !mainImageError ? (
              <img
                src={`${banbury.config.url}/users/get_profile_picture/${username}/`}
                alt={username || 'User'}
                style={{ width: 'inherit', height: 'inherit', objectFit: 'cover' }}
                onError={() => setMainImageError(true)}
              />
            ) : (
              username?.charAt(0).toUpperCase() || ''
            )}
          </Avatar>
        </Tooltip>
      </Box>
      <Menu
        anchorEl={anchorEl}
        data-testid="account-menu"
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            fontSize: 'inherit',
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 22,
              height: 22,
              ml: -0.5,
              mr: 2,
            },
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.default',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleClose}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {username && !menuImageError ? (
              <img
                src={`${banbury.config.url}/users/get_profile_picture/${username}/`}
                alt={username || 'User'}
                style={{ width: 'inherit', height: 'inherit', objectFit: 'cover' }}
                onError={() => setMenuImageError(true)}
              />
            ) : (
              username?.charAt(0).toUpperCase() || ''
            )}
          </Avatar> Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <PersonAddIcon fontSize="inherit" />
          </ListItemIcon>
          Add another account
        </MenuItem>
        <MenuItem onClick={handleSettingsClick}>
          <ListItemIcon>
            <SettingsIcon fontSize="inherit" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem data-testid="logout-button" onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="inherit" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </React.Fragment>
  );
}


