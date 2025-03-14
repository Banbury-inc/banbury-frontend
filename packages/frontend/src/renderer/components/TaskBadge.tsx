import * as React from 'react';
import Badge from '@mui/material/Badge';
import { Box } from '@mui/system';
import ShareIcon from '@mui/icons-material/Share';
import { useEffect, useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';




import CircularProgress, {

  CircularProgressProps,
} from '@mui/material/CircularProgress';

export default function TaskBadge() {

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  function CircularProgressWithLabel(
    props: CircularProgressProps & { value: number },
  ) {
    return (
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" {...props} />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/*   <Typography */}
          {/*     variant="caption" */}
          {/*     component="div" */}
          {/*     color="text.secondary" */}
          {/*   >{`${Math.round(props.value)}%`}</Typography> */}
        </Box>
      </Box>
    );
  }


  const [progress, setProgress] = useState(10); // Starting progress at 10%

  useEffect(() => {
    // Create an interval that updates the progress
    const timer = setInterval(() => {
      // Increment the progress
      setProgress((prevProgress) => {
        // If previous progress is 100, reset to 0
        if (prevProgress >= 100) {
          return 0;
        }
        return prevProgress + 1; // Increment by 10%
      });
    }, 100); // Adjust the interval time as needed

    // Clear the interval on component unmount
    return () => {
      clearInterval(timer);
    };
  }, []);


  return (



    <Box mr={4}>
      <IconButton aria-label="cart">
        <Tooltip title="Activity">
          <Badge badgeContent={1}
            onClick={handleClick}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                transition: 'transform 0.3s ease',
                border: `2px solid`,
                padding: '0 4px',
                '&:hover': {
                }

              }
            }}
          >
            <ShareIcon fontSize="inherit" color="inherit" />
          </Badge>
        </Tooltip>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleClose}>
          <Typography style={{ paddingRight: '30px' }}>

            Syncing files
          </Typography>
          <ListItemIcon style={{ paddingLeft: '30px' }}>
            <CircularProgressWithLabel value={progress} size={20} />
          </ListItemIcon>
        </MenuItem>
      </Menu>

    </Box>
  );
}



