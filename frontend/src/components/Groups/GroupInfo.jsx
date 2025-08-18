import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import useAutheUser from '../../hooks/useAutheUser';
import { useGroups } from '../../hooks/useGroups';
import { toast } from 'react-hot-toast';
import { Copy, Crown, Link2, UserMinus, UserPlus } from 'lucide-react';

const GroupInfo = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAutheUser();
  const { getGroupById, leaveGroup, deleteGroup } = useGroups();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const groupData = await getGroupById(groupId);
        setGroup(groupData);
        // Create invite link
        setInviteLink(`${window.location.origin}/groups/join/${groupData._id}`);
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('An error occurred while fetching group information');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, getGroupById]);

  const handleLeaveGroup = async () => {
    try {
      await leaveGroup(groupId);
      toast.success('Left the group successfully');
      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('An error occurred while leaving the group');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(groupId);
      toast.success('Group deleted successfully');
      navigate('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('An error occurred while deleting the group');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Group not found</p>
      </div>
    );
  }

  const isAdmin = group.admin === authUser._id;
  const isModerator = group.moderators?.includes(authUser._id);
  const canSeeInviteLink = group.type === 'public' || isAdmin || isModerator;

  return (
    <div className="container mx-auto max-w-2xl py-10 animate-fade-in">
      <div className="bg-base-100 rounded-3xl shadow-xl border border-base-300 p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white flex items-center gap-4">
          {group.image ? (
            <img
              src={group.image}
              alt={group.name}
              className="w-20 h-20 rounded-full border-4 border-white object-cover bg-base-200"
              onError={e => { e.target.onerror = null; e.target.src = '/default-group.png'; }}
            />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-white bg-base-200 flex items-center justify-center">
              <i className="fa fa-users text-3xl opacity-40" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold mb-1">Group Information</h1>
            <p className="opacity-80 text-sm">All details about the group and your permissions</p>
          </div>
        </div>
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-primary flex-1">{group.name}</h2>
            {isAdmin && (
              <button
                onClick={handleDeleteGroup}
                className="btn btn-error btn-sm"
              >
                Delete Group
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-base-200 rounded-xl p-4">
              <h3 className="font-bold mb-2">Description</h3>
              <p className="text-base-content">{group.description}</p>
            </div>
            <div className="bg-base-200 rounded-xl p-4">
              <h3 className="font-bold mb-2">Group Type</h3>
              <p className="text-base-content">
                {group.type === 'public' ? 'Public' : group.type === 'private' ? 'Private' : 'Restricted'}
              </p>
            </div>
          </div>
          {canSeeInviteLink && (
            <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="text-primary" />
                <span className="font-bold">Group Invite Link</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="input input-bordered flex-1"
                />
                <button
                  onClick={copyInviteLink}
                  className="btn btn-primary btn-sm"
                  title="Copy link"
                >
                  <Copy />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {group.type === 'public'
                  ? 'Anyone can join the group using this link'
                  : 'Only admins can invite new members to the group'}
              </p>
            </div>
          )}
          <div className="bg-base-200 rounded-xl p-4">
            <h3 className="font-bold mb-2">Admins</h3>
            <div className="flex flex-wrap gap-2">
              {group.admin && (
                <span className="badge badge-warning flex items-center gap-1"><Crown className="text-yellow-500" />Main Admin</span>
              )}
              {group.moderators?.map(modId => (
                <span key={modId} className="badge badge-success flex items-center gap-1"><UserPlus className="text-green-500" />Moderator</span>
              ))}
            </div>
          </div>
          {!isAdmin && (
            <button
              onClick={handleLeaveGroup}
              className="btn btn-error w-full flex items-center justify-center gap-2 mt-4"
            >
              <UserMinus />
              Leave Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupInfo;