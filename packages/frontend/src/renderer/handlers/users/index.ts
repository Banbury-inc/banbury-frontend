// Direct imports from core modules to avoid build dependency issues
export { typeahead } from '@banbury/core/src/users/typeahead';
export { getFriends } from '@banbury/core/src/users/get_friends';
export { getFriendRequests } from '@banbury/core/src/users/get_friend_requests';
export { getFriendUserInfo } from '@banbury/core/src/users/get_user_info';
export { registerUser } from '@banbury/core/src/users/registerUser';
export { getUserFriends } from '@banbury/core/src/users/get_user_followers';
export { getUserFollowing } from '@banbury/core/src/users/get_user_following';
export { change_profile_info } from '@banbury/core/src/users/changeProfileInfo';

// Additional user functions that might be needed
export { acceptFriendRequest } from '@banbury/core/src/users/accept_friend_request';
export { rejectFriendRequest } from '@banbury/core/src/users/reject_friend_request';
export { sendFriendRequest } from '@banbury/core/src/users/send_friend_request';
export { removeFriend } from '@banbury/core/src/users/remove_friend'; 