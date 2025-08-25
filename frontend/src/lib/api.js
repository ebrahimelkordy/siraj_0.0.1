import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/api/auth/signup", signupData);
  return response.data;
};
export const login = async (loginData) => {
  const response = await axiosInstance.post("/api/auth/login", loginData);
  return response.data;
};
export const getAuthUser = async () => {
  const res = await axiosInstance.get("/api/auth/me");
  return res.data;
};
export const completedOnboarding = async (userData) => {
  const response = await axiosInstance.post("/api/auth/onboarding", userData);
};
export const logout = async () => {
  const response = await axiosInstance.post("/api/auth/logout");
  return response.data;
};
export async function getUserFriends() {
  const response = await axiosInstance.get("/api/users/friends");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/api/users/outgoing-friend-requests");
  return response.data;
}
export async function getRecommendedUsers({ nativeLang = '', learningLang = '', track = '', page = 1, limit = 10, q = '' } = {}) {
  const params = new URLSearchParams();
  if (nativeLang) params.append('nativeLang', nativeLang);
  if (learningLang) params.append('learningLang', learningLang);
  if (track) params.append('track', track);
  if (q) params.append('q', q);
  params.append('page', page);
  params.append('limit', limit);
  const response = await axiosInstance.get(`/api/users?${params.toString()}`);
  return response.data.data.recommendedUsers;
}
export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/api/users/friend-request/${userId}`);
  return response.data;
}
export async function getFriendRequests() {
  const response = await axiosInstance.get("/api/users/friend-requests");
  return response.data;
}
export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/api/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/api/chat/token")
  return response.data
}

// Group related API functions
export async function getGroupById(groupId) {
  const response = await axiosInstance.get(`/api/groups/${groupId}`);
  return response.data;
}

export async function leaveGroup(groupId) {
  const response = await axiosInstance.post(`/api/groups/${groupId}/leave`);
  return response.data;
}

export async function deleteGroup(groupId) {
  const response = await axiosInstance.delete(`/api/groups/${groupId}`);
  return response.data;
}
