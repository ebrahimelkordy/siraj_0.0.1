import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import toast from 'react-hot-toast';

export const GroupMembers = ({ isOpen, onClose, groupId, groupInfo }) => {
  const [members, setMembers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch group and member information
  const fetchGroupInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      setMembers(data.members);
      setAdmins(data.admins);

      // Check if the current user is an admin
      const currentUserId = localStorage.getItem('userId');
      setIsAdmin(data.admins.some(admin => admin._id === currentUserId));

    } catch (error) {
      toast.error('Error fetching group information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGroupInfo();
    }
  }, [isOpen, groupId]);

  // Add a new member
  const handleAddMember = async (userId) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        toast.success('Member added successfully');
        await fetchGroupInfo(); // Update member list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add member');
      }
    } catch (error) {
      toast.error('Error adding member');
    }
  };

  // Remove a member
  const handleRemoveMember = async (memberId) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Member removed successfully');
        await fetchGroupInfo(); // Update member list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove member');
      }
    } catch (error) {
      toast.error('Error removing member');
    }
  };

  // Add an admin
  const handleAddAdmin = async (userId) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId, action: 'add' })
      });

      if (response.ok) {
        toast.success('Admin added successfully');
        await fetchGroupInfo();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add admin');
      }
    } catch (error) {
      toast.error('Error adding admin');
    }
  };

  // Remove an admin
  const handleRemoveAdmin = async (adminId) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId: adminId, action: 'remove' })
      });

      if (response.ok) {
        toast.success('Admin removed successfully');
        await fetchGroupInfo();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove admin');
      }
    } catch (error) {
      toast.error('Error removing admin');
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Manage Members</h3>

        <div className="mb-6">
          <h4 className="font-semibold mb-2">Group Admins</h4>
          <div className="space-y-2">
            {admins.map(admin => (
              <div key={admin._id} className="flex items-center justify-between bg-base-200 p-2 rounded">
                <div className="flex items-center gap-2">
                  <img
                    src={admin.avatar || '/default-avatar.png'}
                    alt={admin.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{admin.name}</span>
                </div>
                {isAdmin && admin._id !== localStorage.getItem('userId') && (
                  <button
                    onClick={() => handleRemoveAdmin(admin._id)}
                    className="btn btn-sm btn-error"
                  >
                    Remove Admin
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Group Members</h4>
          <div className="space-y-2">
            {members.map(member => (
              <div key={member._id} className="flex items-center justify-between bg-base-200 p-2 rounded">
                <div className="flex items-center gap-2">
                  <img
                    src={member.avatar || '/default-avatar.png'}
                    alt={member.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{member.name}</span>
                </div>
                {isAdmin && !admins.some(admin => admin._id === member._id) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddAdmin(member._id)}
                      className="btn btn-sm btn-primary"
                    >
                      Promote to Admin
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      className="btn btn-sm btn-error"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
