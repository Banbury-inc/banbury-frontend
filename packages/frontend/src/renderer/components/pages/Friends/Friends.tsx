import React, { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import { Divider, TextField, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import { CardContent } from "@mui/material";
import AccountMenuIcon from '../../common/AccountMenuIcon';
import Card from '@mui/material/Card';
import { List, ListItemButton, ListItemText } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton, InputAdornment, Badge, Avatar, Tabs, Tab } from '@mui/material';
import { handlers } from '../../../handlers';
import { useAuth } from '../../../context/AuthContext';
import { Heading } from '../../../../components/heading'
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { CircularProgress } from '@mui/material';
import Skeleton from '@mui/material/Skeleton';
import NotificationsButton from '../../common/notifications/NotificationsButton';
import { useAlert } from '../../../context/AlertContext';
import { styled } from '@mui/material/styles';

interface SearchResult {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  username: string;
}

const ResizeHandle = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: -4,
  top: 0,
  bottom: 0,
  width: 8,
  cursor: 'col-resize',
  zIndex: 1000,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 4,
    width: 2,
    backgroundColor: theme.palette.primary.main,
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  '&:hover::after': {
    opacity: 1,
    transition: 'opacity 0.2s ease 0.15s',
  },
  '&.dragging::after': {
    opacity: 1,
    transition: 'none',
  }
}));

export default function Friends() {

  const [activeSection, setActiveSection] = useState('all-friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendInfo, setFriendInfo] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const { username } = useAuth();


  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [followDialog, setFollowDialog] = useState<'friends' | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingFriendInfo, setIsLoadingFriendInfo] = useState(false);
  const { showAlert } = useAlert();
  const [friendListWidth, setFriendListWidth] = useState(350);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    if (selectedFriend) {
      setIsLoadingFriendInfo(true);
      handlers.users.getUserInfo(selectedFriend?.username || '')
        .then(response => {
          if (response && response) {
            setFriendInfo(response);
          }
        })
        .catch(error => {
          console.error('Error fetching friends:', error);
        })
        .finally(() => {
          setIsLoadingFriendInfo(false);
        });
    }
  }, [selectedFriend, updates]);


  useEffect(() => {
    handlers.users.getFriends(username || '')
      .then(response => {
        if (response && response.data) {
          setFriends(response.data.friends);
        }
      })
      .catch(error => {
        console.error('Error fetching friends:', error);
      });
  }, [username, updates]);



  useEffect(() => {
    handlers.users.getFriendRequests(username || '')
      .then(response => {
        if (response && response.data) {
          setFriendRequests(response.data.friend_requests);
        }
      })
      .catch(error => {
        console.error('Error fetching friend requests:', error);
      });
  }, [username, updates]);



  // Update search handler to handle the API response correctly
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const response = await handlers.users.typeahead(query);
        if (response?.data) {
          setSearchResults(response.data.users || []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
        showAlert('Error', ['Search failed', error instanceof Error ? error.message : 'Unknown error'], 'error');
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleOpenFriends = async () => {
    setIsLoadingFriends(true);
    setFollowDialog('friends');
    try {
      const response = await handlers.users.getUserFriends(selectedFriend.username);
      if (response?.data?.friends?.friends) {
        setFollowList(response.data.friends.friends);
      } else {
        setFollowList([]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFollowList([]);
      showAlert('Error', ['Failed to fetch friends list', error instanceof Error ? error.message : 'Unknown error'], 'error');
    } finally {
      setIsLoadingFriends(false);
    }
  };


  const handleCloseDialog = () => {
    setFollowDialog(null);
    setFollowList([]);
  };

  // Add WebSocket effect
  useEffect(() => {
    const connectWebSocket = async () => {
      const socket = await handlers.devices.connect(
        username || '',
        [],
        () => { },
        () => { }
      );

      socket.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.request_type === "friend_request") {
            // Reload friend requests
            handlers.users.getFriendRequests(username || '')
              .then(response => {
                if (response && response.data) {
                  setFriendRequests(response.data.friend_requests);
                }
              })
              .catch(error => {
                console.error('Error fetching friend requests:', error);
              });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
    };

    if (username) {
      connectWebSocket();
    }
  }, [username]);

  // Update the friend request accept handler
  const handleAcceptFriendRequest = async (requestUsername: string) => {
    try {
      await handlers.users.acceptFriendRequest(username || '', requestUsername);
      setUpdates(prevUpdates => [...prevUpdates, 'friend_request_accepted']);

      // Refresh both friends and requests lists
      const [friendsResponse, requestsResponse] = await Promise.all([
        handlers.users.getFriends(username || ''),
        handlers.users.getFriendRequests(username || '')
      ]);

      if (friendsResponse?.data) {
        setFriends(friendsResponse.data.friends);
      }
      if (requestsResponse?.data) {
        setFriendRequests(requestsResponse.data.friend_requests);
      }

      showAlert('Success', ['Friend request accepted'], 'success');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showAlert('Error', ['Failed to accept friend request', error instanceof Error ? error.message : 'Unknown error'], 'error');
    }
  };

  // Update the friend request reject handler
  const handleRejectFriendRequest = async (requestUsername: string) => {
    try {
      await handlers.users.rejectFriendRequest(username || '', requestUsername);
      const response = await handlers.users.getFriendRequests(username || '');
      if (response?.data) {
        setFriendRequests(response.data.friend_requests);
      }
      showAlert('Success', ['Friend request rejected'], 'success');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      showAlert('Error', ['Failed to reject friend request', error instanceof Error ? error.message : 'Unknown error'], 'error');
    }
  };

  // Update the send friend request handler
  const handleSendFriendRequest = async (requestUsername: string) => {
    try {
      await handlers.users.sendFriendRequest(username || '', requestUsername);
      setUpdates(prevUpdates => [...prevUpdates, 'friend_request_sent']);
      showAlert('Success', ['Friend request sent'], 'success');
    } catch (error) {
      console.error('Error sending friend request:', error);
      showAlert('Error', ['Failed to send friend request', error instanceof Error ? error.message : 'Unknown error'], 'error');
    }
  };

  // Update the remove friend handler
  const handleRemoveFriend = async (friendUsername: string) => {
    try {
      await handlers.users.removeFriend(username || '', friendUsername);
      setUpdates(prevUpdates => [...prevUpdates, 'friend_removed']);
      setSelectedFriend(null);
      showAlert('Success', ['Friend removed successfully'], 'success');
    } catch (error) {
      console.error('Error removing friend:', error);
      showAlert('Error', ['Failed to remove friend', error instanceof Error ? error.message : 'Unknown error'], 'error');
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartX.current;
        const newWidth = Math.max(100, Math.min(600, dragStartWidth.current + deltaX));
        setFriendListWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = friendListWidth;
  };

  return (
    <Box sx={{ width: '100%', pt: 0 }}>
      <Card variant="outlined" sx={{ borderTop: 0, borderLeft: 0, borderBottom: 0 }}>
        <CardContent sx={{ paddingBottom: '2px !important', paddingTop: '46px' }}>
          <Stack spacing={2} direction="row" sx={{ flexWrap: 'nowrap' }}>
            <Grid container spacing={0} sx={{ display: 'flex', flexWrap: 'nowrap', pt: 0 }}>

            </Grid>
            <Grid container justifyContent='flex-end' alignItems='flex-end'>
              <Grid item>
              </Grid>
              <Grid item>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                  <Stack direction="row">
                    <NotificationsButton />
                  </Stack>
                  <Stack paddingLeft={1} direction="row">
                    <AccountMenuIcon />
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      <Stack direction="row" spacing={0} sx={{ width: '100%', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>
        <Stack
          sx={{
            position: 'relative',
            width: `${friendListWidth}px`,
            flexShrink: 0,
            transition: isDragging ? 'none' : 'width 0.3s ease',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Card variant="outlined" sx={{
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            borderLeft: 0,
            borderRight: 0,
            borderRadius: 0,
          }}>
            <CardContent sx={{ height: '100%', width: '100%', overflow: 'auto', p: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Tabs
                value={activeSection}
                onChange={(e, newValue) => setActiveSection(newValue)}
                sx={{
                  minHeight: '32px',
                  '& .MuiTab-root': {
                    minHeight: '32px',
                    padding: '6px 12px',
                    fontSize: '12px'
                  }
                }}
              >
                <Tab label="Friends" value="all-friends" />
                <Tab
                  label={
                    <Badge
                      badgeContent={friendRequests.length}
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: '#ef4444',
                          fontSize: '9px',
                          height: '14px',
                          minWidth: '14px',
                          padding: '0 2px',
                          right: '-10px',
                        }
                      }}
                    >
                      Requests
                    </Badge>
                  }
                  value="requests"
                />
                <Tab label="Search" value="search" />
              </Tabs>

              <List component="nav">
                {activeSection === 'all-friends' ? (
                  friends.map((friend) => (
                    <ListItemButton
                      dense
                      key={friend.id}
                      selected={selectedFriend?.id === friend.id}
                      onClick={() => setSelectedFriend(friend)}
                      sx={{
                        borderRadius: 1,
                        mb: 0,
                        '&.Mui-selected': {
                          backgroundColor: 'action.selected',
                        },
                      }}
                    >
                      <Avatar sx={{ mr: 2, width: 24, height: 24, fontSize: '12px' }}>{friend.first_name ? friend.first_name[0] : '?'}</Avatar>
                      <ListItemText
                        primary={`${friend.first_name || ''} ${friend.last_name || ''}`.trim() || 'Unknown User'}
                        secondary={friend.username}
                      />
                    </ListItemButton>
                  ))
                ) : activeSection === 'requests' ? (
                  friendRequests.map((request) => (
                    <ListItemButton
                      dense
                      key={request.id}
                      sx={{
                        borderRadius: 1,
                        mb: 0,
                        '&.Mui-selected': {
                          backgroundColor: 'action.selected',
                        },
                      }}
                    >
                      <Avatar sx={{ mr: 2, width: 24, height: 24, fontSize: '12px' }}>{request.first_name ? request.first_name[0] : '?'}</Avatar>
                      <ListItemText primary={`${request.first_name || ''} ${request.last_name || ''}`.trim() || 'Unknown User'} secondary={request.username} />
                      <IconButton color="success" size="small" onClick={() => handleAcceptFriendRequest(request.username)}>
                        <CheckIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                      <IconButton color="error" size="small" onClick={() => handleRejectFriendRequest(request.username)}>
                        <CloseIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                    </ListItemButton>
                  ))
                ) : (
                  // Updated search results section with null checks
                  searchResults?.map((user) => (
                    <ListItemButton
                      dense
                      key={user.id}
                      sx={{ borderRadius: 1, mb: 0 }}
                    >
                      <Avatar sx={{ mr: 2, width: 24, height: 24, fontSize: '12px' }}>
                        {user.first_name ? user.first_name[0] : '?'}
                      </Avatar>
                      <ListItemText
                        primary={`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'}
                        secondary={user.username}
                      />
                      <IconButton color="primary" size="small" onClick={() => handleSendFriendRequest(user.username)}>
                        <PersonAddIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                    </ListItemButton>
                  )) || null
                )}
              </List>
            </CardContent>
          </Card>
          <ResizeHandle
            className={isDragging ? 'dragging' : ''}
            onMouseDown={handleMouseDown}
          />
        </Stack>

        <Card variant="outlined" sx={{
          flexGrow: 1,
          height: '100%',
          overflow: 'auto',
          borderLeft: 0,
          borderRadius: 0,
        }}>
          <CardContent>
            {selectedFriend ? (
              <Stack direction="column" spacing={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {isLoadingFriendInfo ? (
                      <>
                        <Skeleton variant="circular" width={64} height={64} />
                        <Stack>
                          <Skeleton variant="text" width={200} height={32} />
                          <Skeleton variant="text" width={150} height={24} />
                          <Skeleton variant="text" width={100} height={24} sx={{ mt: 1 }} />
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Avatar sx={{ width: 64, height: 64 }}>{selectedFriend.first_name ? selectedFriend.first_name[0] : '?'}</Avatar>
                        <Stack>
                          <Heading level={5}>{selectedFriend.first_name ? selectedFriend.first_name : '?'} {selectedFriend.last_name ? selectedFriend.last_name : '?'}</Heading>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {selectedFriend.username}
                            </Typography>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: selectedFriend?.online ? '#22c55e' : '#94a3b8',
                              }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {selectedFriend?.online ? 'Online' : 'Offline'}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ cursor: 'pointer' }}
                              onClick={handleOpenFriends}
                            >
                              <strong>{friendInfo?.friends?.length || 0}</strong> Friends
                            </Typography>
                          </Stack>
                        </Stack>
                      </>
                    )}
                  </Stack>
                  <IconButton color="error" onClick={() => handleRemoveFriend(selectedFriend.username)}>
                    <PersonRemoveIcon />
                  </IconButton>
                </Box>

                <Divider />

                <Typography variant="h6">Personal Information</Typography>
                <Grid container spacing={2}>
                  {isLoadingFriendInfo ? (
                    <>
                      <Grid item xs={6}>
                        <Skeleton variant="text" width={100} height={20} />
                        <Skeleton variant="text" width={150} height={24} />
                      </Grid>
                      <Grid item xs={6}>
                        <Skeleton variant="text" width={100} height={20} />
                        <Skeleton variant="text" width={150} height={24} />
                      </Grid>
                      <Grid item xs={6}>
                        <Skeleton variant="text" width={100} height={20} />
                        <Skeleton variant="text" width={150} height={24} />
                      </Grid>
                      <Grid item xs={6}>
                        <Skeleton variant="text" width={100} height={20} />
                        <Skeleton variant="text" width={150} height={24} />
                      </Grid>
                    </>
                  ) : (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">First Name</Typography>
                        <Typography variant="body1">{friendInfo?.first_name || 'Not available'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Last Name</Typography>
                        <Typography variant="body1">{friendInfo?.last_name || 'Not available'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Email address</Typography>
                        <Typography variant="body1">{friendInfo?.email || 'Not available'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Phone</Typography>
                        <Typography variant="body1">{friendInfo?.phone_number || 'Not available'}</Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary" align="center">
                Select a friend to view their details
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
      <Dialog
        open={followDialog !== null}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {followDialog === 'friends' ? 'Friends' : 'Following'}
        </DialogTitle>
        <DialogContent>
          {isLoadingFriends ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List>
              {followList.map((user) => (
                <ListItemButton
                  key={user.id}
                  dense
                  sx={{ borderRadius: 1 }}
                >
                  <Avatar
                    sx={{ mr: 2, width: 32, height: 32, fontSize: '14px' }}
                  >
                    {user.first_name ? user.first_name[0] : '?'}
                  </Avatar>
                  <ListItemText
                    primary={`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'}
                    secondary={user.username}
                  />
                </ListItemButton>
              ))}
              {followList.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No {followDialog} found
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
