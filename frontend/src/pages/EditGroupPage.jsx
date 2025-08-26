import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAutheUser from '../hooks/useAutheUser';
import { client } from '../lib/stream';
import { axiosInstance } from '../lib/axios';
import { CameraIcon, ShuffleIcon } from 'lucide-react';

const EditGroupPage = () => {
  const { groupId } = useParams();
  const cleanedGroupId = groupId.replace(/group-/g, '');
  const navigate = useNavigate();
  const { authUser, isLoading: authLoading } = useAutheUser();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState('public');
  const [allowMemberMessages, setAllowMemberMessages] = useState(true);
  const [stagedMembers, setStagedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);
  const [stagedAdmins, setStagedAdmins] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banType, setBanType] = useState('message');
  const [banReason, setBanReason] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const { data: groupData, isLoading, isError, error } = useQuery({
    queryKey: ['group', cleanedGroupId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/groups/${cleanedGroupId}`);
      return response.data;
    },
    enabled: !!cleanedGroupId && !!authUser,
  });

  useEffect(() => {
    if (groupData) {
      console.log('DEBUG: EditGroupPage - groupData received:', groupData);
      console.log('DEBUG: EditGroupPage - Raw groupData.admins:', groupData.admins);
      console.log('DEBUG: EditGroupPage - Is groupData.admins an array?', Array.isArray(groupData.admins));
      setGroupName(groupData.name || '');
      setGroupDescription(groupData.description || '');
      setGroupPrivacy(groupData.privacy || 'public');
      setAllowMemberMessages(groupData.allowMemberMessages ?? true);
      setStagedMembers(groupData.members || []);
      setGroupImage(groupData.image || '');
      const initialAdmins = Array.isArray(groupData.admins)
        ? groupData.admins.map(admin => {
          // If admin is an object with _id, use its _id
          if (typeof admin === 'object' && admin !== null && admin._id) {
            return admin._id.toString();
          }
          // If admin is already a string (ID), use it directly
          if (typeof admin === 'string') {
            return admin;
          }
          return null; // Ignore invalid entries
        }).filter(Boolean) // Filter out nulls and undefined
        : [];
      setStagedAdmins(initialAdmins);
      console.log('DEBUG: EditGroupPage - stagedAdmins after useEffect init:', initialAdmins);
    }
  }, [groupData]);

  useEffect(() => {
    const fetchBannedUsers = async () => {
      try {
        const response = await axiosInstance.get(`/groups/${cleanedGroupId}/banned`);
        setBannedUsers(response.data);
      } catch (error) {
        console.error('Error fetching banned users:', error);
        toast.error('An error occurred while fetching the banned users list');
      }
    };

    fetchBannedUsers();
  }, [cleanedGroupId]);

  const handleSearchUsers = async () => {
    if (searchQuery.trim() === '') {
      setFoundUsers([]);
      return;
    }

    try {
      const response = await axiosInstance.get(`/users/search?q=${searchQuery}`);
      const users = response.data;
      const nonMembers = users.filter(user => !stagedMembers.some(member => member._id === user._id));
      setFoundUsers(nonMembers);
    } catch (err) {
      console.error("Error searching users:", err);
      toast.error(err.response?.data?.message || "An error occurred while searching for users.");
    }
  };

  const handleAddMember = (user) => {
    if (!stagedMembers.some(member => member._id === user._id)) {
      setStagedMembers(prev => [...prev, user]);

      setFoundUsers([]);
      setSearchQuery('');
      setSelectedUserToAdd(null);
      toast.success(`${user.fullName} was successfully added to the staged members list.`);
    } else {
      toast.error("User is already in the group.");
    }
  };

  const handleRemoveMember = (memberId) => {
    if (groupData.creator._id === memberId) {
      toast.error("Cannot remove the group creator.");
      return;
    }

    setStagedMembers(prev => prev.filter(member => member._id !== memberId));

    toast.success("Member removed from the staged members list.");
  };

  const handleToggleAdmin = (memberId) => {
    if (!memberId) {
      console.warn("Attempted to toggle admin with null/undefined memberId.", memberId);
      return;
    }
    const memberIdString = memberId.toString(); // Ensure memberId is always a string
    if (groupData.creator._id === memberIdString) {
      toast.error("The group creator is always an admin.");
      return;
    }

    setStagedAdmins(prev => {
      const cleanedPrev = prev.filter(id => id !== null && id !== undefined && typeof id === 'string');
      const isAdmin = cleanedPrev.includes(memberIdString);
      let newState;
      if (isAdmin) {
        newState = cleanedPrev.filter(id => id !== memberIdString);
      } else {
        newState = [...cleanedPrev, memberIdString];
      }
      console.log('DEBUG: EditGroupPage - stagedAdmins after toggle (in setStagedAdmins):', newState);

      return newState;
    });

    toast.success("Admin privileges updated.");
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();

    if (!authUser) {
      toast.error("Please log in first.");
      return;
    }

    try {
      // Use the local stagedAdmins and stagedMembers directly
      const finalAdmins = stagedAdmins.filter(id => id !== null && id !== undefined && typeof id === 'string');
      const finalMembers = stagedMembers.map(member => member._id); // Assuming stagedMembers always contains objects with _id

      console.log('DEBUG: EditGroupPage - finalAdmins before PUT (from local state):', finalAdmins);
      console.log('DEBUG: EditGroupPage - finalMembers before PUT (from local state):', finalMembers);

      const response = await axiosInstance.put(`/groups/${cleanedGroupId}`, {
        name: groupName,
        description: groupDescription,
        privacy: groupPrivacy,
        members: finalMembers,
        admins: finalAdmins,
        allowMemberMessages: allowMemberMessages,
        allowMemberVideoCall: groupData.allowMemberVideoCall ?? true,
        image: groupImage // إضافة صورة الجروب
      });

      const data = response.data;

      // Update Stream Channel name if changed (use current groupData.name for comparison)
      const channel = client.channel('messaging', cleanedGroupId);
      if (groupName !== (groupData.name || '')) {
        await channel.update({
          name: groupName,
          image: data.group.image || '',
        });
        console.log('DEBUG: Stream channel name updated during PUT.');
      }

      queryClient.invalidateQueries(['group', cleanedGroupId]);

      toast.success("Group updated successfully!");
      navigate(`/groups/${cleanedGroupId}`);
    } catch (err) {
      console.error("Error updating group:", err);
      toast.error(err.response?.data?.message || "An error occurred while updating the group.");
    }
  };

  const handleBanUser = async () => {
    try {
      await axiosInstance.post(`/groups/${cleanedGroupId}/ban`, {
        userId: selectedUser._id,
        banType,
        reason: banReason
      });

      toast.success('User banned successfully');
      setShowBanModal(false);
      setSelectedUser(null);
      setBanType('message');
      setBanReason('');

      // تحديث قائمة المحظورين
      const response = await axiosInstance.get(`/groups/${cleanedGroupId}/banned`);
      setBannedUsers(response.data);
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error(error.response?.data?.error || 'An error occurred while banning the user');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await axiosInstance.delete(`/groups/${cleanedGroupId}/ban/${userId}`);

      toast.success('User unbanned successfully');

      // تحديث قائمة المحظورين
      const response = await axiosInstance.get(`/groups/${cleanedGroupId}/banned`);
      setBannedUsers(response.data);
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error(error.response?.data?.error || 'An error occurred while unbanning the user');
    }
  };

  // دالة توليد صورة جروب عشوائية
  const handleRandomGroupAvatar = () => {
    const idx = Math.floor(Math.random() * 1000) + 1;
    const randomGroupAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${idx}`;
    setGroupImage(randomGroupAvatar);
    toast.success('Random group image set!');
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg text-gray-500">Error: {error.message}</p>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg text-gray-500">Group not found or inaccessible.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-10 animate-fade-in">
      <div className="bg-base-100 rounded-3xl shadow-xl border border-base-300 p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white flex items-center gap-4">
          <i className="fa fa-cogs text-3xl" />
          <div>
            <h1 className="text-2xl font-extrabold mb-1">Group Settings</h1>
            <p className="opacity-80 text-sm">Full control over group privacy, permissions, and members</p>
          </div>
        </div>
        <form onSubmit={handleUpdateGroup} className="p-8 space-y-8">
          {/* صورة الجروب */}
          <div className="flex flex-col items-center justify-center space-y-4 mb-6">
            <div className="size-32 rounded-full bg-base-300 overflow-hidden">
              {groupImage ? (
                <img
                  src={groupImage}
                  alt="Group Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <CameraIcon className="size-12 text-base-content opacity-40" />
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-outline"
              onClick={handleRandomGroupAvatar}
            >
              <ShuffleIcon className="size-4 text-base-content" /> Random Group Image
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label font-bold">Group Name</label>
              <input
                type="text"
                className="input input-bordered input-lg w-full"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                required
                placeholder="Group Name"
              />
            </div>
            <div>
              <label className="label font-bold">Privacy</label>
              <select
                className="select select-bordered w-full"
                value={groupPrivacy}
                onChange={e => setGroupPrivacy(e.target.value)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label font-bold">Description</label>
            <textarea
              className="textarea textarea-bordered textarea-lg w-full min-h-[80px]"
              value={groupDescription}
              onChange={e => setGroupDescription(e.target.value)}
              placeholder="About the group or its rules..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control bg-base-200 rounded-xl p-4">
              <label className="cursor-pointer flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allowMemberMessages}
                  onChange={e => setAllowMemberMessages(e.target.checked)}
                  className="toggle toggle-primary"
                />
                <span className="font-semibold">Allow members to send messages</span>
              </label>
            </div>
            <div className="form-control bg-base-200 rounded-xl p-4">
              <label className="cursor-pointer flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={groupData.allowMemberVideoCall ?? true}
                  onChange={e => setGroupData(g => ({ ...g, allowMemberVideoCall: e.target.checked }))}
                  className="toggle toggle-secondary"
                />
                <span className="font-semibold">Allow video calls for members</span>
              </label>
            </div>
          </div>
          <div className="divider">Member Management</div>
          <div className="bg-base-200 rounded-xl p-4 mb-4">
            <h3 className="font-bold mb-2">Current Members <span className="badge badge-info badge-sm">{stagedMembers.length}</span></h3>
            {
              stagedMembers.length === 0 ? (
                <p className="text-gray-500">No current members.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  {stagedMembers.map(member => (
                    <li key={member._id} className="flex justify-between items-center bg-base-200 p-2 rounded">
                      <span>{member.fullName} {groupData.creator._id.toString() === member._id.toString() && '(Creator)'}</span>
                      <div className="flex items-center space-x-2">
                        {groupData.creator._id.toString() !== member._id.toString() && (
                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(member._id)}
                            className={stagedAdmins.includes(member._id.toString()) ? 'btn btn-warning btn-sm' : 'btn btn-info btn-sm'}
                          >
                            {stagedAdmins.includes(member._id.toString()) ? 'Remove Admin' : 'Set Admin'}
                          </button>
                        )}
                        {groupData.creator._id.toString() !== member._id.toString() && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(member);
                                setShowBanModal(true);
                              }}
                              className="btn btn-error btn-sm"
                            >
                              Ban
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member._id)}
                              className="btn btn-error btn-sm"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
          <div className="divider">Add Members</div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search for a user..."
              className="input input-bordered flex-grow"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={handleSearchUsers}>
              Search
            </button>
          </div>
          {
            foundUsers.length > 0 && (
              <div className="bg-base-200 p-3 rounded-lg mt-2">
                <h4 className="text-md font-semibold mb-2">Search Results:</h4>
                <ul className="space-y-1">
                  {foundUsers.map(user => (
                    <li key={user._id} className="flex justify-between items-center p-1 border-b border-base-300 last:border-b-0">
                      <span>{user.fullName}</span>
                      <button
                        type="button"
                        onClick={() => handleAddMember(user)}
                        className="btn btn-success btn-xs"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
          <button type="submit" className="btn btn-primary w-full text-lg font-bold mt-6">
            Save Changes
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Banned Users Management</h2>

        <div className="space-y-4">
          {bannedUsers.map((ban) => (
            <div key={ban._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <img
                  src={ban.user.profilePic || '/default-avatar.png'}
                  alt={ban.user.fullName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-medium">{ban.user.fullName}</h3>
                  <p className="text-sm text-gray-500">
                    Ban Type: {ban.banType === 'message' ? 'Message Ban' : 'Join Ban'}
                  </p>
                  {ban.reason && (
                    <p className="text-sm text-gray-500">Reason: {ban.reason}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Banned by: {ban.bannedBy.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleUnbanUser(ban.user._id)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                Unban
              </button>
            </div>
          ))}

          {bannedUsers.length === 0 && (
            <p className="text-gray-500 text-center py-4">No banned users</p>
          )}
        </div>
      </div>

      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Ban User</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ban Type
              </label>
              <select
                value={banType}
                onChange={(e) => setBanType(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="message">Message ban only</option>
                <option value="join">Join ban</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ban reason
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full p-2 border rounded-lg"
                rows="3"
                placeholder="Enter ban reason (optional)"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowBanModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBanUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditGroupPage;