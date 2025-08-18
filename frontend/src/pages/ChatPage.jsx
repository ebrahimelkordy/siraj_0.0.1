import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import useAutheUser from '../hooks/useAutheUser';
import { useQuery } from '@tanstack/react-query';
import { getStreamToken } from '../lib/api';
import { toast } from 'react-hot-toast';
import "stream-chat-react/dist/css/v2/index.css";
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
} from "stream-chat-react";
import { client } from '../lib/stream';
import ChatLoader from '../components/ChatLoader';
import { useThemeStore } from '../hooks/useThemestore.js';
import { VideoIcon } from 'lucide-react';

function ChatPage() {
  const { id: targetUserId } = useParams()
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useThemeStore()
  const { authUser } = useAutheUser()

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`
      channel.sendMessage({
        text: `join me in thise video call${callUrl}`,
      }),
        toast.success("video call started")
    }
  }

  const { data: tokenData } = useQuery({
    queryKey: ['streamToken'],
    queryFn: getStreamToken,
    enabled: !!authUser
  })

  useEffect(() => {
    const initChat = async () => {
      if (!tokenData?.token || !authUser || !client.userID) {
        setLoading(false);
        return;
      }

      try {
        // إنشاء معرف القناة
        const channelId = [authUser._id, targetUserId].sort().join("-");

        // إنشاء القناة
        const currChannel = client.channel("messaging", channelId, {
          created_by_id: authUser._id,
          created_by: {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic
          },
          members: [authUser._id, targetUserId]
        });

        // محاولة إنشاء القناة
        try {
          // التأكد من وجود المستخدمين في Stream
          const response = await fetch(`/api/chat/users/${targetUserId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (!response.ok) {
            throw new Error('فشل في إنشاء المستخدم في Stream');
          }

          await currChannel.create();
        } catch (error) {
          if (error.message.includes("don't exist")) {
            toast.error("المستخدم الآخر غير موجود في النظام");
            setLoading(false);
            return;
          }
          throw error;
        }

        // مشاهدة القناة
        await currChannel.watch();
        setChannel(currChannel);
      } catch (error) {
        toast.error("حدث خطأ في الاتصال بالمحادثة");
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
  }, [tokenData, authUser, targetUserId]);

  if (loading) {
    return <ChatLoader />;
  }

  if (!channel) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg text-gray-500">Unable to access the chat</p>
      </div>
    );
  }

  return (
    <div className='h-[93vh]' data-theme={theme}>
      <Chat client={client}>
        <Channel channel={channel}>
          <div className='w-full relative'>
            <Window>
              <div className='flex justify-between m-2'>
                <ChannelHeader />
                <button className='btn bg-primary rounded-s-field ' onClick={handleVideoCall}>
                  <VideoIcon />
                </button>
              </div>
              <MessageList
                additionalMessageListProps={{
                  groupStyles: ['single', 'top', 'middle', 'bottom'],
                  renderMessage: (message) => {
                    const isMyMessage = message.user.id === authUser._id;
                    return (
                      <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${isMyMessage
                              ? 'bg-blue-500 text-white rounded-br-none'
                              : 'bg-gray-200 text-gray-800 rounded-bl-none'
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
              <div className="relative">
                <MessageInput focus className="absolute bottom-2 right-2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors" />
              </div>
            </Window>
          </div>
        </Channel>
      </Chat>
    </div>
  )
}

export default ChatPage