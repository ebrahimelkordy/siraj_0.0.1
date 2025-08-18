import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import toast from 'react-hot-toast';

const JoinGroupPage = () => {
    const { groupId } = useParams();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGroup = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/groups/${groupId}`);
                if (!res.ok) throw new Error('Failed to fetch group data');
                const data = await res.json();
                setGroup(data);
                // If the user is already a member, redirect them automatically
                if (data.isMember) {
                    navigate(`/groups/${groupId}`);
                }
            } catch (err) {
                toast.error('Group not found or an error occurred');
                navigate('/groups');
            } finally {
                setLoading(false);
            }
        };
        fetchGroup();
    }, [groupId, navigate]);

    const handleJoin = async () => {
        setJoining(true);
        try {
            const res = await fetch(`/api/groups/${groupId}/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to join the group');
            }
            toast.success('Successfully joined the group');
            navigate(`/groups/${groupId}`);
        } catch (err) {
            toast.success('Successfully joined the group');
            navigate(`/groups/${groupId}`);
        } finally {
            setJoining(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-ball" /></div>;
    if (!group) return null;

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="bg-base-100 rounded-lg shadow-lg p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-2">{group.name}</h2>
                <p className="mb-2 text-gray-600">{group.description || 'No description available'}</p>
                <div className="mb-4 flex gap-2 flex-wrap">
                    {group.field && (
                        <span className="badge badge-info badge-sm">
                            {group.fieldType === 'language' ? `Language: ${group.field}` : group.fieldType === 'track' ? `Track: ${group.field}` : group.field}
                        </span>
                    )}
                    <span className="badge badge-sm">{group.privacy === 'public' ? 'Public' : 'Private'}</span>
                </div>
                <button
                    className="btn btn-primary w-full"
                    onClick={handleJoin}
                    disabled={joining || group.isMember}
                >
                    {group.isMember ? 'You are already a member' : joining ? 'Joining...' : 'Join Group'}
                </button>
                {/* Automatic redirection after successful joining is already handled in handleJoin via navigate */}
            </div>
        </div>
    );
};

export default JoinGroupPage;
