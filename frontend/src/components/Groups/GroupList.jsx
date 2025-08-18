import { useEffect, useState, useCallback, useRef } from 'react';
// import { Chat, ChannelList } from 'stream-chat-react'; // Removed as we will render groups directly
import { client, initializeStream } from '../../lib/stream';
import useAutheUser from '../../hooks/useAutheUser';
import toast from 'react-hot-toast';
import { CreateGroup } from './CreateGroup.jsx';
import { useNavigate } from 'react-router';
import { useThemeStore } from '../../hooks/useThemestore.js';

export const GroupList = () => {
  const [groups, setGroups] = useState([]); // Removed channels state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showingPublicSearch, setShowingPublicSearch] = useState(false);
  const [publicFieldType, setPublicFieldType] = useState('');
  const [publicField, setPublicField] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(null); // Added state for tracking selected group
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [allPublicGroups, setAllPublicGroups] = useState([]);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const listRef = useRef();
  const { authUser } = useAutheUser();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  // Memoize the fetchGroups function to prevent unnecessary recreations
  const fetchGroups = useCallback(async () => {
    if (!authUser) return;

    try {
      setLoading(true);

      // Fetch groups from the backend
      const response = await fetch('/api/groups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const groupsData = await response.json();
      if (!Array.isArray(groupsData)) {
        throw new Error('Invalid response format');
      }

      // Directly set groups from backend data. No Stream channel creation/watching here.
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Error loading groups');
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  // Initialize Stream client only once when authUser is available
  useEffect(() => {
    let isMounted = true;

    const initStream = async () => {
      if (authUser && !client.userID && isMounted) {
        try {
          await initializeStream(authUser);
        } catch (error) {
          console.error('Error initializing Stream:', error);
          toast.error('Error initializing chat');
        }
      }
    };

    initStream();
    fetchGroups(); // Call fetchGroups once on mount and authUser change

    return () => {
      isMounted = false;
    };
  }, [authUser, fetchGroups]);

  const handleGroupClick = (group) => {
    // Allow navigation to public groups even for non-member users
    if (!group.isMember && group.privacy !== 'public') {
      toast.error('You are not a member of this group');
      return;
    }
    navigate(`/groups/${group._id}`);
  };

  // Filter public groups by search query
  const filteredPublicGroups = groups.filter(
    (group) =>
      group.privacy === "public" &&
      (
        group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // تحديث الفلترة والبحث يعيد الصفحة ويصفر النتائج
  useEffect(() => {
    setPage(1);
    setAllPublicGroups([]);
    setHasMoreResults(true);
  }, [searchQuery, publicFieldType, publicField]);

  // Loading more public groups when page changes
  useEffect(() => {
    if (!showingPublicSearch) return;
    const fetchMoreGroups = async () => {
      setLoading(true);
      try {
        // هنا يجب أن يكون لديك API يدعم pagination (page, limit, search, fieldType, field)
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (searchQuery) params.append('q', searchQuery);
        if (publicFieldType) params.append('fieldType', publicFieldType);
        if (publicField) params.append('field', publicField);
        const response = await fetch(`/api/groups/public?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch public groups');
        const data = await response.json();
        // data.groups: array, data.hasMore: boolean
        if (page === 1) {
          setAllPublicGroups(data.groups);
        } else {
          setAllPublicGroups(prev => {
            const existingIds = new Set(prev.map(g => g._id));
            const newGroups = data.groups.filter(g => !existingIds.has(g._id));
            return [...prev, ...newGroups];
          });
        }
        setHasMoreResults(data.hasMore);
      } catch (err) {
        setHasMoreResults(false);
      } finally {
        setLoading(false);
      }
    };
    fetchMoreGroups();
  }, [page, searchQuery, publicFieldType, publicField, showingPublicSearch]);

  // تفعيل infinite scroll
  useEffect(() => {
    if (!showingPublicSearch) return;
    const handleScroll = () => {
      if (!listRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (!hasMoreResults || loading) return;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setPage(prev => prev + 1);
      }
    };
    const ref = listRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => {
      if (ref) ref.removeEventListener('scroll', handleScroll);
    };
  }, [showingPublicSearch, hasMoreResults, loading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-theme={theme}>
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Groups</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm"
          >
            Create New Group
          </button>
        </div>
        {/* Search field for public groups */}
        <div className="mt-4 flex gap-2 items-center">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search for a public, private, or restricted group..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowingPublicSearch(e.target.value.length > 0);
            }}
          />
          {showingPublicSearch && (
            <button className="btn btn-sm btn-ghost" onClick={() => { setSearchQuery(""); setShowingPublicSearch(false); }}>Clear</button>
          )}
        </div>
        {/* Field type filter for public groups */}
        {showingPublicSearch && (
          <div className="mt-2 flex gap-2">
            <select
              className="select select-bordered"
              value={publicFieldType || ''}
              onChange={e => { setPublicFieldType(e.target.value); setPublicField(''); }}
            >
              <option value="">Field Type</option>
              <option value="language">Language</option>
              <option value="track">Educational Track</option>
            </select>
            {publicFieldType === 'language' && (
              <select
                className="select select-bordered"
                value={publicField || ''}
                onChange={e => setPublicField(e.target.value)}
              >
                <option value="">Choose Language</option>
                {LANGUAGES.filter(l => l && l !== 'other').map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            )}
            {publicFieldType === 'track' && (
              <select
                className="select select-bordered"
                value={publicField || ''}
                onChange={e => setPublicField(e.target.value)}
              >
                <option value="">Choose Track</option>
                {EDUCATIONAL_PATHS.filter(t => t && t !== 'other').map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" ref={showingPublicSearch ? listRef : undefined}>
        {showingPublicSearch ? (
          allPublicGroups.length > 0 ? (
            <div className="flex flex-col gap-2 p-2">
              {allPublicGroups.map(group => (
                <div
                  key={group._id}
                  className={`card bg-base-100 shadow-md hover:shadow-xl transition-shadow p-2 mb-2 cursor-pointer border border-base-200 group-card ${selectedGroupId === group._id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => { setSelectedGroupId(group._id); handleGroupClick(group); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center">
                        <img
                          src={group.image || '/default-group.png'}
                          alt={group.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/default-group.png';
                            e.target.classList.add('opacity-50');
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base-content flex items-center gap-1">
                          {group.privacy === 'restricted' && <span className="badge badge-error badge-xs">Restricted</span>}
                          {group.name}
                        </h3>
                        {group.field && (
                          <span className="badge badge-info badge-sm">
                            {group.fieldType === 'language' ? `Language: ${group.field}` : group.fieldType === 'track' ? `Track: ${group.field}` : group.field}
                          </span>
                        )}
                        {group.isCreator && (
                          <span className="badge badge-primary badge-sm">Creator</span>
                        )}
                        {group.isAdmin && !group.isCreator && (
                          <span className="badge badge-secondary badge-sm">Admin</span>
                        )}
                        {group.isMember && !group.isAdmin && !group.isCreator && (
                          <span className="badge badge-accent badge-sm">Member</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 mb-1 line-clamp-2">
                        {group.description || 'No description'}
                      </p>
                      <div className="flex gap-2 items-center text-xs text-gray-400">
                        <span>Members: {group.members?.length || 0}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="badge badge-outline badge-sm">
                        {group.privacy === 'public' ? 'Public' : group.privacy === 'private' ? 'Private' : group.privacy === 'restricted' ? 'Restricted' : ''}
                      </span>
                      {group.privacy === 'public' && !group.isMember && (
                        <button
                          className="btn btn-xs btn-success mt-1"
                          onClick={e => { e.stopPropagation(); handleGroupClick(group); }}
                        >Join</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && page > 1 && (
                <div className="flex justify-center py-2">
                  <span className="loading loading-ball" />
                </div>
              )}
              {!hasMoreResults && !loading && (
                <div className="flex justify-center py-2 text-gray-400 text-xs">No more groups</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-lg mb-4">No matching public groups</p>
            </div>
          )
        ) : (
          groups.length > 0 ? (
            <div className="flex flex-col gap-2 p-2"> {/* Added a div for styling list items */}
              {groups.map(group => (
                <div
                  key={group._id}
                  className={`card bg-base-100 shadow-md hover:shadow-xl transition-shadow p-2 mb-2 cursor-pointer border border-base-200 group-card ${selectedGroupId === group._id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => { setSelectedGroupId(group._id); handleGroupClick(group); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center">
                        <img
                          src={group.image || '/default-group.png'}
                          alt={group.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/default-group.png';
                            e.target.classList.add('opacity-50');
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{group.name}</h3>
                        {/* Label for the group's field type */}
                        {group.field && (
                          <span className="badge badge-info badge-sm">
                            {group.fieldType === 'language' ? `Language: ${group.field}` : group.fieldType === 'track' ? `Track: ${group.field}` : group.field}
                          </span>
                        )}
                        {group.isCreator && (
                          <span className="badge badge-primary badge-sm">Creator</span>
                        )}
                        {group.isAdmin && !group.isCreator && (
                          <span className="badge badge-secondary badge-sm">Admin</span>
                        )}
                        {group.isMember && !group.isAdmin && !group.isCreator && (
                          <span className="badge badge-accent badge-sm">Member</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {group.description || 'No description'}
                      </p>
                    </div>
                    <div className="badge badge-sm">
                      {group.privacy === 'public' ? 'Public' : group.privacy === 'private' ? 'Private' : group.privacy === 'restricted' ? 'Restricted' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-lg mb-4">No groups available</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary btn-lg mt-2"
              >
                <i className="fa fa-plus mr-2"></i>Create the first group
              </button>
            </div>
          )
        )}
      </div>

      {showCreateModal && (
        <CreateGroup
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onGroupCreated={() => {
            setShowCreateModal(false);
            fetchGroups();
          }}
        />
      )}

      <button
        className="btn btn-primary btn-circle fixed bottom-8 end-8 z-50 shadow-lg"
        onClick={() => setShowCreateModal(true)}
        title="Create New Group"
      >
        <i className="fa fa-plus"></i>
      </button>
    </div>
  );
};
