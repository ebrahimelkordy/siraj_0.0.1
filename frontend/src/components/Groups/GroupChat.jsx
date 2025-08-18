import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import useAutheUser from '../../hooks/useAutheUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStreamToken } from '../../lib/api';
import { toast } from 'react-hot-toast';
import "stream-chat-react/dist/css/v2/index.css";
import {
  Chat,
  Channel,
  Window,
  MessageList,
  MessageInput,
  Thread,
} from "stream-chat-react";
import { client } from '../../lib/stream';
import ChatLoader from '../ChatLoader';
import { useThemeStore } from '../../hooks/useThemestore.js';
import { VideoIcon, Settings, LogOut, Info, Link2, X } from 'lucide-react';
import axios from 'axios';

export const GroupChat = () => {
  const { groupId } = useParams();
  const cleanedGroupId = groupId.replace(/group-/g, '');
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { theme } = useThemeStore();
  const { authUser } = useAutheUser();
  const [isUserMemberOfGroup, setIsUserMemberOfGroup] = useState(false);
  const queryClient = useQueryClient();
  const [groupData, setGroupData] = useState(null);

  const { data: tokenData } = useQuery({
    queryKey: ['streamToken'],
    queryFn: getStreamToken,
    enabled: !!authUser
  });

  const { data: groupDataData } = useQuery({
    queryKey: ['group', cleanedGroupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${cleanedGroupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch group information');
      return response.json();
    },
    enabled: !!cleanedGroupId
  });

  const handleVideoCall = async () => {
    if (channel) {
      try {
        // Create a unique ID for the call
        const callId = `group-${cleanedGroupId}-${Date.now()}`;
        const callUrl = `${window.location.origin}/call/${callId}`;

        // Send a message containing the call link
        await channel.sendMessage({
          text: `New video call: ${callUrl}`,
          type: 'regular',
          user: {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic
          }
        });

        // Open the call in a new window
        const callWindow = window.open(callUrl, '_blank');
        if (!callWindow) {
          toast.error("Please allow pop-ups for the browser");
          return;
        }
        toast.success("Video call started");
      } catch (error) {
        console.error('Error starting video call:', error);
        if (error.message.includes('not allowed to perform action CreateMessage')) {
          toast.error("You do not have sufficient permissions to start a video call");
        } else {
          toast.error("An error occurred while starting the video call");
        }
      }
    }
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const closeSettingsModal = () => {
    setShowSettings(false);
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/groups/join/${cleanedGroupId}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied');
    closeSettingsModal();
  };

  const handleJoinGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${cleanedGroupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'An error occurred while joining the group');
      }

      toast.success('Successfully joined the group', { style: { background: '#4ade80', color: '#fff' } });
      queryClient.invalidateQueries(['group', cleanedGroupId]);
      closeSettingsModal();

    } catch (error) {
      window.location.reload()
      toast.success('Successfully joined the group', { style: { background: '#4ade80', color: '#fff' } });
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${cleanedGroupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'An error occurred while leaving the group');
      }

      toast.success('Successfully left the group', { style: { background: '#4ade80', color: '#fff' } });
      queryClient.invalidateQueries(['group', cleanedGroupId]);
      navigate('/groups');
      closeSettingsModal();
    } catch (error) {
      toast.error(error.message, { style: { background: '#f87171', color: '#fff' } });
    }
  };

  const handleSendMessage = async (message) => {
    try {
      // Check ban status before sending the message
      const isBanned = groupDataData?.bannedUsers?.some(
        ban => ban.user._id === authUser._id && ban.banType === 'message'
      );

      if (isBanned) {
        toast.error('You are banned from sending messages in this group');
        return;
      }

      if (!channel) {
        toast.error('Cannot access the chat');
        return;
      }

      await channel.sendMessage({
        text: message,
        user: {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('An error occurred while sending the message');
    }
  };

  // Add a listener for ban status changes
  useEffect(() => {
    if (!channel || !authUser) return;

    const handleBanUpdate = async (event) => {
      if (event.type === 'user.banned' && event.user.id === authUser._id) {
        toast.error('You are banned from sending messages in this group');
      }
    };

    channel.on('user.banned', handleBanUpdate);

    return () => {
      channel.off('user.banned', handleBanUpdate);
    };
  }, [channel, authUser]);

  useEffect(() => {
    const initChat = async () => {
      if (!groupDataData) {
        setLoading(false);
        return;
      }
      try {
        const channelId = `group-${cleanedGroupId}`;
        const currChannel = client.channel("messaging", channelId, {
          name: groupDataData.name,
          image: groupDataData.image,
          group: {
            id: groupDataData._id,
            name: groupDataData.name,
            description: groupDataData.description,
            privacy: groupDataData.privacy
          }
        });
        setIsUserMemberOfGroup(groupDataData.isMember || false);
        if (!groupDataData.isMember && groupDataData.privacy === 'public') {
          toast("You can only read messages because you are not a member of this group", {
            icon: 'ℹ️',
            duration: 4000
          });
          await currChannel.watch();
          setChannel(currChannel);
        } else if (tokenData?.token && authUser) {
          await currChannel.watch();
          setChannel(currChannel);
        } else {
          throw new Error('Cannot access this group');
        }
      } catch (error) {
        toast.error("An error occurred while connecting to the chat");
      } finally {
        setLoading(false);
      }
    };
    initChat();
    return () => {
      if (channel) {
        channel.stopWatching();
      }
    };
  }, [tokenData, authUser, cleanedGroupId, groupDataData, navigate]);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await axios.get(`/api/groups/${groupId}`);
        setGroupData(response.data);

        // Check ban status
        if (response.data.isMessageBanned) {
          toast.error('You are banned from sending messages in this group');
        }
      } catch (error) {
        console.error('Error fetching group data:', error);
        toast.error('An error occurred while fetching group data');
      }
    };

    fetchGroupData();
  }, [groupId]);

  if (loading) {
    return <ChatLoader />;
  }

  if (!channel) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg text-gray-500">Cannot access the chat</p>
      </div>
    );
  }

  return (
    <div className='h-[93vh] relative bg-white' data-theme={theme}>
      <Chat client={client}>
        <Channel channel={channel} key={groupDataData.name} className="bg-white">
          <div className='w-full relative bg-white'>
            <Window className="bg-white">
              <div className='flex items-center gap-4 m-2'>
                {/* Group image */}
                {groupDataData?.image ? (
                  <img
                    src={groupDataData.image}
                    alt={groupDataData.name}
                    className="w-14 h-14 rounded-full border-2 border-base-300 object-cover bg-base-200"
                    onError={e => { e.target.onerror = null; e.target.src = '/default-group.png'; }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-base-300 bg-base-200 flex items-center justify-center">
                    <i className="fa fa-users text-xl opacity-40" />
                  </div>
                )}
                {/* Group name */}
                <span className="text-xl font-bold text-base-content">{groupDataData?.name}</span>
                <div className="flex-1" />
                {/* Control buttons */}
                <div className="flex gap-2">
                  {isUserMemberOfGroup ? (
                    <>
                      <button
                        className='btn btn-circle bg-primary hover:bg-primary/80 text-white'
                        onClick={handleSettings}
                        title="Group Settings"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        className='btn btn-circle bg-primary hover:bg-primary/80 text-white'
                        onClick={handleVideoCall}
                        title="Start Video Call"
                        disabled={!(groupDataData.isAdmin || groupDataData.isCreator || groupDataData.allowMemberVideoCall)}
                      >
                        <VideoIcon className="w-5 h-5" />
                      </button>
                      {!groupDataData.isCreator && (
                        <button
                          className='btn btn-circle bg-red-500 hover:bg-red-600 text-white'
                          onClick={handleLeaveGroup}
                          title="Leave Group"
                        >
                          <LogOut className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  ) : groupDataData.privacy === 'public' && (
                    <button
                      className='btn btn-primary'
                      onClick={handleJoinGroup}
                    >
                      Join Group
                    </button>
                  )}
                </div>
              </div>
              <MessageList className="bg-white"
                additionalMessageListProps={{
                  groupStyles: ['single', 'top', 'middle', 'bottom'],
                  renderMessage: (message) => {
                    const isMyMessage = message.user.id === authUser._id;
                    return (
                      <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${isMyMessage
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-white'
                            }`}
                        >
                          <div className="text-sm mb-1">
                            {!isMyMessage && (
                              <span className="font-semibold">{message.user.name}</span>
                            )}
                          </div>
                          <div>{message.text}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {new Date(message.created_at).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }
                }}
              />
              {isUserMemberOfGroup && (
                groupDataData.isAdmin || groupDataData.allowMemberMessages ? (
                  <MessageInput />
                ) : (
                  <div className="p-4 text-center text-gray-500 bg-gray-100">
                    Sending messages is disabled for members by the admins.
                  </div>
                )
              )}
            </Window>
            <Thread className="bg-white" />
          </div>
        </Channel>
      </Chat>

      {showSettings && (
        <div className="fixed inset-0  bg-opacity-60 flex justify-end z-50 animate-fade-in">
          <div className="bg-base-100 w-full max-w-xs h-full p-0 shadow-2xl border-l border-base-300 flex flex-col" dir="rtl">
            <div className="bg-gradient-to-l from-primary to-secondary p-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Settings className="inline-block" size={22} /> Group Settings
              </h2>
              <button onClick={closeSettingsModal} className="btn btn-sm btn-circle btn-ghost text-white">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="bg-base-200 rounded-xl p-4 mb-2">
                <h3 className="font-bold mb-2 text-primary">Group Information</h3>
                <div className="text-base-content text-sm space-y-1">
                  <div><span className="font-semibold">Name:</span> {groupDataData?.name}</div>
                  <div><span className="font-semibold">Description:</span> {groupDataData?.description || 'No description'}</div>
                  <div><span className="font-semibold">Members:</span> {groupDataData?.members?.length}</div>
                </div>
                {(groupDataData.privacy === 'public' || groupDataData.privacy === 'private') && (groupDataData.isCreator || groupDataData.isAdmin || groupDataData.privacy === 'public') && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-base-content">
                      <Link2 size={16} className="text-primary" /> Group Invite Link
                    </h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/groups/join/${cleanedGroupId}`}
                        readOnly
                        className="input input-bordered input-sm flex-1"
                      />
                      <button
                        onClick={copyInviteLink}
                        className="btn btn-primary btn-sm"
                        title="Copy link"
                      >
                        <Info size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {groupDataData.privacy === 'public'
                        ? 'Anyone can join the group using this link'
                        : 'Only admins can invite new members to the group'}
                    </p>
                  </div>
                )}
              </div>
              <div className="bg-base-200 rounded-xl p-4 mb-2">
                <h3 className="font-bold mb-2 text-primary">Members</h3>
                {groupDataData?.members?.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {groupDataData.members.map(member => (
                      <div key={member._id} className="flex items-center gap-2">
                        <img src={member.profilePic || '/default-avatar.png'} alt={member.fullName} className="w-7 h-7 rounded-full" />
                        <span className="text-sm">{member.fullName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No members in this group yet.</p>
                )}
              </div>
              <div className="bg-base-200 rounded-xl p-4">
                <h3 className="font-bold mb-2 text-primary">Group Management</h3>
                {(groupDataData.isCreator || groupDataData.isAdmin) && (
                  <button
                    onClick={() => {
                      navigate(`/groups/${groupId}/edit`);
                      closeSettingsModal();
                    }}
                    className="btn btn-info btn-block mb-2"
                  >
                    Edit Group
                  </button>
                )}
                {!groupDataData.isCreator && isUserMemberOfGroup && (
                  <button
                    onClick={handleLeaveGroup}
                    className="btn btn-error btn-block flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> Leave Group
                  </button>
                )}
                {groupDataData.isCreator && (
                  <button
                    onClick={() => {
                      toast.error("Delete group feature is not available yet");
                      closeSettingsModal();
                    }}
                    className="btn btn-error btn-block flex items-center justify-center gap-2 mt-2"
                  >
                    Delete Group
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};