import { StreamChat } from 'stream-chat';
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error('Missing STREAM_API_KEY or STREAM_API_SECRET environment variables. Please check your .env file.');
}

// Increase the default timeout for Stream API connection to 10 seconds
export const streamClient = StreamChat.getInstance(apiKey, apiSecret, { timeout: 10000 });

// New function to ensure public read permissions for messaging channel type
const ensurePublicReadPermissions = async () => {
  try {
    await streamClient.updateChannelType('messaging', {
      commands: ['giphy'],
      permissions: [
        {
          name: 'Channel member permissions',
          priority: 100,
          resources: ['ReadChannel', 'CreateMessage', 'UpdateMessage', 'DeleteMessage', 'AddLinks'],
          roles: ['channel_member', 'user'],
          action: 'Allow'
        },
        {
          name: 'Public read',
          priority: 90,
          resources: ['ReadChannel'],
          roles: ['guest', 'anonymous'],
          action: 'Allow'
        },
        {
          name: 'Block everything else',
          priority: 1,
          resources: ['*'],
          roles: ['*'],
          action: 'Deny'
        }
      ]
    });
  } catch (error) {
    // Handle error silently
  }
};

// Call this function once when the backend starts
ensurePublicReadPermissions();

export const upsertStreamUser = async (userData) => {
  try {
    if (!userData || !userData.id) {
      throw new Error('User data is required');
    }

    const result = await streamClient.upsertUser({
      id: userData.id,
      name: userData.name || 'User',
      image: userData.image || '',
      role: 'member', // Force all new users to always be member
    });
    return result;
  } catch (error) {
    // Print all error details from Stream
    throw new Error(error.message || 'Failed to update user data in Stream');
  }
};

export const generateStreamToken = (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const userIdStr = userId.toString();
    return streamClient.createToken(userIdStr);
  } catch (error) {
    throw new Error('Failed to generate Stream token');
  }
};

export const createGroupChannel = async (groupId, groupName, creatorId) => {
  try {
    if (!groupId || !groupName || !creatorId) {
      throw new Error('Group ID, name, and creator ID are required');
    }

    // Ensure the user exists in Stream before creating the channel
    await upsertStreamUser({
      id: creatorId,
      name: 'Creator',
      role: 'user' // Role must be one of the defined roles in Stream: user, admin, guest, anonymous
    });

    // Create the channel with the creator as an owner
    const channel = streamClient.channel('messaging', groupId.toString(), {
      name: groupName,
      members: [{
        user_id: creatorId,
        channel_role: 'channel_member',
        permissions: ['read', 'write', 'add-links', 'create-message']
      }],
      created_by_id: creatorId,
      image: '', // Optional: Add group image if available
      extra_data: {
        type: 'group'
      }
    });

    // Create the channel (members are added during creation with roles)
    await channel.create();

    // No need to call updateChannelType here
    return channel;
  } catch (error) {
    throw new Error(error.message || 'Failed to create group channel in Stream');
  }
};