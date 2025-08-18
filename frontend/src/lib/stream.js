// src/lib/stream.js
import { StreamChat } from 'stream-chat';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;
if (!STREAM_API_KEY) {
  throw new Error('مفتاح Stream API غير معرف في متغيرات البيئة');
}

export const client = StreamChat.getInstance(STREAM_API_KEY);
let isInitialized = false;
let initializationPromise = null;

export const initializeStream = async (user) => {
  if (!user) {
    return null;
  }

  // If already initialized for this user, return existing client
  if (isInitialized && client?.userID === user._id) {
    return client;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  try {
    initializationPromise = (async () => {
      // Disconnect existing user if different user or not initialized
      if (client.userID && client.userID !== user._id) {
        await client.disconnectUser();
        isInitialized = false;
      }

      // Get token from backend
      const response = await fetch('/api/chat/token', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get Stream token');
      }

      const { token } = await response.json();

      if (!token) {
        throw new Error('No token received from server');
      }

      // Connect user
      await client.connectUser(
        {
          id: user._id,
          name: user.fullName || 'مجهول',
          image: user.profilePic || '',
        },
        token
      );

      isInitialized = true;
      return client;
    })();

    return await initializationPromise;
  } catch (error) {
    isInitialized = false;
    throw error;
  } finally {
    initializationPromise = null;
  }
};

export const disconnectStream = async () => {
  if (client) {
    try {
      await client.disconnectUser();
      isInitialized = false;
    } catch (error) {
      // Handle error if needed
    }
  }
};