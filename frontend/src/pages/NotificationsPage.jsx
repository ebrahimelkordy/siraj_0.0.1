import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFriendRequests,
  acceptFriendRequest
} from "../lib/api";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../lib/notifications';
import { BellIcon, ClockIcon, MessageSquareIcon, UserCheckIcon } from 'lucide-react';
import { capitialize } from '../lib/utils';
import { getLanguageFlag } from '../components/FriendCard';
import NoNotificationsFound from '../components/NoNotificationsFound';
function NotificationsPage() {
  const queryClient = useQueryClient();

  // Fetch user notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: getUserNotifications,
  });

  // Mark all notifications as read
  const { mutate: markAllRead } = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => refetch(),
  });

  // Mark a single notification as read
  const { mutate: markOneRead } = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => refetch(),
  });

  const { data: friendRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const { mutate: acceptRequestMutation, isPending } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: (response, requestId) => {
      // Update friends list
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      // Update requests list locally
      queryClient.setQueryData(["friendRequests"], (oldData) => {
        if (!oldData) return oldData;
        const updatedRequest = response.request;
        return {
          ...oldData,
          incomingReqs: oldData.incomingReqs.filter(req => req._id !== updatedRequest._id),
          acceptedReqs: [...oldData.acceptedReqs, updatedRequest]
        };
      });
      // Update notifications immediately
      queryClient.setQueryData(["notifications"], (oldNotifs = []) => {
        return oldNotifs.map((notif) => {
          if (notif.type === 'friend_request' && notif.requestId === requestId) {
            return {
              ...notif,
              type: 'friend_accept',
              message: `You and ${response.request.recipient.fullName || ''} are now friends!`,
              read: false,
            };
          }
          return notif;
        });
      });
    },
  });
  const acceptedRequests = friendRequests?.acceptedReqs || [];
  const incomingRequests = friendRequests?.incomingReqs || [];
  return (
    <div className='p-4 sm:p-6 lg:p-8 '>
      <div className='container mx-auto max-w-4xl space-y-8'>
        <h1 className='text-2xl sm:text-3xl font-bold tracking-tight mb-6'>Notifications</h1>
        <div className="flex justify-end mb-4">
          <button className="btn btn-sm btn-primary" onClick={() => markAllRead()}>Mark all as read</button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : notifications.length === 0 ? (
          <NoNotificationsFound />
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              return (
                <div key={notif._id} className={`card bg-base-100 shadow-sm flex flex-col md:flex-row items-center justify-between p-4 border border-base-200 ${!notif.read ? 'bg-primary/10 border-l-4 border-primary' : ''}`}>
                  <div className="flex items-center gap-3">
                    {/* Icon based on notification type */}
                    {notif.type === 'friend_request' && <span className="badge badge-info"><i className="fa fa-user-plus"></i></span>}
                    {notif.type === 'friend_accept' && <span className="badge badge-success"><i className="fa fa-user-check"></i></span>}
                    {notif.type === 'group_invite' && <span className="badge badge-warning"><i className="fa fa-users"></i></span>}
                    {notif.type === 'admin_action' && <span className="badge badge-error"><i className="fa fa-shield"></i></span>}
                    {notif.type === 'new_message' && <span className="badge badge-accent"><i className="fa fa-comment"></i></span>}
                    <div>
                      <div className="font-semibold text-base-content">{notif.message}</div>
                      <div className="text-xs text-gray-500">{new Date(notif.createdAt).toLocaleString('ar-EG')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-0">
                    {/* Accept request button if notification type is friend_request */}
                    {notif.type === 'friend_request' && notif.requestId && (
                      <button
                        className="btn btn-xs btn-success"
                        disabled={isPending}
                        onClick={() => {
                          acceptRequestMutation(notif.requestId);
                        }}
                      >
                        {isPending ? 'جاري القبول...' : 'Accept'}
                      </button>
                    )}
                    {/* Mark as read button */}
                    {!notif.read && (
                      <button className="btn btn-xs btn-outline ml-2" onClick={() => markOneRead(notif._id)}>Mark as read</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

  );
}

export default NotificationsPage;