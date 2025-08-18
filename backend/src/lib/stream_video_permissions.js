import axios from 'axios';
import jwt from 'jsonwebtoken';
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;
const appId = process.env.STREAM_APP_ID;

if (!apiKey || !apiSecret || !appId) {
  throw new Error('Missing STREAM_API_KEY, STREAM_API_SECRET, or STREAM_APP_ID in .env');
}

// Generate JWT admin token
function generateAdminToken() {
  const payload = {
    user_id: apiKey,
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  };
  return jwt.sign(payload, apiSecret);
}

// Add JoinCall permission to member and channel_member roles in video:default
export async function addJoinCallPermission() {
  const adminToken = generateAdminToken();
  const url = `https://video.stream-io-api.com/video/v1/apps/${appId}/permissions`;
  const body = {
    action: 'Allow',
    permission: 'JoinCall',
    roles: ['member', 'channel_member'],
    scope: 'video:default',
  };
  const headers = {
    'Authorization': adminToken,
    'Content-Type': 'application/json',
    'stream-auth-type': 'jwt',
  };
  try {
    const res = await axios.post(url, body, { headers });
    console.log('JoinCall permission added successfully:', res.data);
    return res.data;
  } catch (err) {
    console.error('Failed to add permission:', err.response?.data || err.message);
    throw err;
  }
}

// Usage: import { addJoinCallPermission } from this file and execute it from backend code only
