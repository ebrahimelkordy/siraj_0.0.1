import React, { useState, useEffect, useRef } from 'react'
import FriendCard from '../components/FriendCard';
import { getUserFriends, getRecommendedUsers, sendFriendRequest, getStreamToken } from '../lib/api';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Search, UserPlus, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';
import { StreamChat } from "stream-chat";
import useAutheUser from '../hooks/useAutheUser';
import { LANGUAGES, EDUCATIONAL_PATHS } from '../constants';
import { toast } from 'react-hot-toast';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const Frindes = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewFriends, setShowNewFriends] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [lastMessages, setLastMessages] = useState({});
    const [filters, setFilters] = useState({ nativeLang: '', learningLang: '', track: '' });
    const [page, setPage] = useState(1);
    const [limit] = useState(10); // عدد النتائج في كل صفحة
    const [idSearch, setIdSearch] = useState("");
    const [idUserResult, setIdUserResult] = useState(null);
    const [idUserError, setIdUserError] = useState("");
    const hasMore = useRef(true);
    const { authUser } = useAutheUser();

    // Get Stream token
    const { data: tokenData } = useQuery({
        queryKey: ['streamToken'],
        queryFn: getStreamToken,
        enabled: !!authUser
    });

    // Initialize Stream Chat client
    useEffect(() => {
        const initStreamChat = async () => {
            if (!tokenData?.token || !authUser) return;

            try {
                const client = StreamChat.getInstance(STREAM_API_KEY);
                await client.connectUser(
                    {
                        id: authUser._id,
                        name: authUser.fullName,
                        image: authUser.profilePic,
                    },
                    tokenData.token
                );

                // Subscribe to presence events
                client.on('presence.changed', (event) => {
                    const onlineSet = new Set(onlineUsers);
                    if (event.online) {
                        onlineSet.add(event.user.id);
                    } else {
                        onlineSet.delete(event.user.id);
                    }
                    setOnlineUsers(onlineSet);
                });

                // Get initial online users
                const response = await client.queryUsers({});
                const onlineSet = new Set(
                    response.users
                        .filter(user => user.online)
                        .map(user => user.id)
                );
                setOnlineUsers(onlineSet);

                return () => {
                    client.disconnectUser();
                };
            } catch (error) {
                console.error('Error initializing Stream Chat:', error);
            }
        };

        initStreamChat();
    }, [tokenData, authUser]);

    // Get friends list
    const { data: friends = [], isLoading: loadingFriends } = useQuery({
        queryKey: ["friends"],
        queryFn: getUserFriends,
    });

    // Filter friends by search query (for friends list view)
    const filteredFriends = friends.filter(friend =>
        friend.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get last messages for each friend
    useEffect(() => {
        const getLastMessages = async () => {
            if (!tokenData?.token || !authUser || !friends.length) return;

            try {
                const client = StreamChat.getInstance(STREAM_API_KEY);
                await client.connectUser(
                    {
                        id: authUser._id,
                        name: authUser.fullName,
                        image: authUser.profilePic,
                    },
                    tokenData.token
                );

                // Get last message for each friend
                for (const friend of friends) {
                    const channelId = [authUser._id, friend._id].sort().join("-");
                    const channel = client.channel("messaging", channelId);

                    try {
                        await channel.watch();
                        const response = await channel.query({
                            messages: { limit: 1 }
                        });

                        if (response.messages && response.messages.length > 0) {
                            const lastMessage = response.messages[0];
                            setLastMessages(prev => ({
                                ...prev,
                                [friend._id]: {
                                    text: lastMessage.text,
                                    createdAt: new Date(lastMessage.created_at).toLocaleTimeString('ar-SA', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                }
                            }));
                        }
                    } catch (error) {
                        console.error(`Error getting messages for channel ${channelId}:`, error);
                    }
                }

                // Subscribe to new messages
                client.on('message.new', (event) => {
                    const channelId = event.channel.id;
                    const userId = channelId.split('-').find(id => id !== authUser._id);

                    if (userId) {
                        setLastMessages(prev => ({
                            ...prev,
                            [userId]: {
                                text: event.message.text,
                                createdAt: new Date(event.message.created_at).toLocaleTimeString('ar-SA', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                            }
                        }));
                    }
                });

                return () => {
                    client.disconnectUser();
                };
            } catch (error) {
                console.error('Error getting last messages:', error);
            }
        };

        getLastMessages();
    }, [tokenData, authUser, friends]);

    // Get recommended users
    const { data: recommendedUsers = [], isLoading: loadingRecommended, refetch: refetchRecommended } = useQuery({
        queryKey: ["recommendedUsers", filters, page, limit, searchQuery],
        queryFn: () => getRecommendedUsers({ ...filters, page, limit, q: searchQuery }),
        enabled: showNewFriends
    });

    // عند تغيير الفلاتر أو البحث، أعد ضبط الصفحة
    useEffect(() => {
        setPage(1);
        hasMore.current = true;
        if (showNewFriends) refetchRecommended();
    }, [filters, showNewFriends, searchQuery]);

    // البحث أو الإضافة عبر ID
    const handleIdSearch = async () => {
        setIdUserError("");
        setIdUserResult(null);
        if (!idSearch) return;
        try {
            const res = await fetch(`/api/users/search?q=${idSearch}`);
            const users = await res.json();
            if (Array.isArray(users) && users.length > 0) {
                setIdUserResult(users[0]);
            } else {
                setIdUserError("No user found with this ID");
            }
        } catch (err) {
            setIdUserError("An error occurred during search");
        }
    };

    // إعادة تعيين نتيجة البحث بالـ ID عند مسح الحقل
    useEffect(() => {
        if (idSearch === "") {
            setIdUserResult(null);
            setIdUserError("");
        }
    }, [idSearch]);

    // إرسال طلب صداقة من نتيجة البحث بالـ ID
    const sendRequest = async (userId) => {
        try {
            await sendFriendRequest(userId);
            toast.success('تم إرسال طلب الصداقة بنجاح');
            setIdUserResult(null);
            setIdSearch("");
            queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
        } catch (err) {
            toast.error('حدث خطأ أثناء إرسال الطلب أو الطلب موجود بالفعل');
        }
    };

    // Infinite scroll: تحميل المزيد عند الوصول لأسفل
    const listRef = useRef();
    // معرفة إذا كان هناك مزيد من النتائج
    const hasMoreResults = recommendedUsers?.data?.hasMore !== undefined ? recommendedUsers.data.hasMore : true;
    useEffect(() => {
        if (!showNewFriends) return;
        const handleScroll = () => {
            if (!listRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = listRef.current;
            // حماية إضافية: لا تحمل إذا انتهت النتائج
            if (!hasMoreResults || loadingRecommended) return;
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                setPage(prev => prev + 1);
            }
        };
        const ref = listRef.current;
        if (ref) ref.addEventListener('scroll', handleScroll);
        return () => {
            if (ref) ref.removeEventListener('scroll', handleScroll);
        };
    }, [showNewFriends, hasMoreResults, loadingRecommended]);

    // حماية إضافية: إذا انتهت النتائج، لا تزد الصفحة أبداً
    useEffect(() => {
        if (!hasMoreResults && page !== 1) {
            // إعادة تعيين الصفحة إلى 1 أو تثبيتها
            setPage(1);
        }
    }, [hasMoreResults]);

    // دمج النتائج عند تحميل المزيد
    const [allRecommended, setAllRecommended] = useState([]);
    // عند تغيير الفلاتر أو البحث أو showNewFriends: إعادة ضبط الصفحة والنتائج
    useEffect(() => {
        setPage(1);
        setAllRecommended([]);
    }, [filters, searchQuery, showNewFriends]);

    // عند تغيير recommendedUsers أو الصفحة: دمج النتائج بشكل آمن
    useEffect(() => {
        if (!showNewFriends) return;
        // دعم كل أشكال الاستجابة: data.recommendedUsers أو data أو مباشرة
        let usersArr = [];
        if (Array.isArray(recommendedUsers)) {
            usersArr = recommendedUsers;
        } else if (recommendedUsers?.data?.recommendedUsers) {
            usersArr = recommendedUsers.data.recommendedUsers;
        } else if (recommendedUsers?.data) {
            usersArr = recommendedUsers.data;
        } else if (recommendedUsers?.recommendedUsers) {
            usersArr = recommendedUsers.recommendedUsers;
        }
        if (page === 1) {
            setAllRecommended(usersArr);
        } else if (usersArr.length) {
            setAllRecommended(prev => {
                const existingIds = new Set(prev.map(u => u._id));
                const newUsers = usersArr.filter(u => !existingIds.has(u._id));
                return [...prev, ...newUsers];
            });
        }
    }, [recommendedUsers, page, showNewFriends]);

    // Helper function to check if user is online
    const isUserOnline = (userId) => onlineUsers.has(userId);

    return (
        <div className="h-screen flex flex-col bg-base-200">
            {/* Header */}
            <div className="bg-primary text-white p-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold">Friends</h1>
                    <button
                        onClick={() => setShowNewFriends(!showNewFriends)}
                        className="btn btn-sm btn-ghost text-white"
                    >
                        <UserPlus size={20} />
                    </button>
                </div>
            </div>

            {/* Search & Filters Bar */}
            <div className="p-4 bg-base-100 flex flex-col gap-2">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={showNewFriends ? "Search for new friends..." : "Search friends..."}
                        className="input input-bordered w-full pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
                {/* البحث أو الإضافة عبر ID */}
                {showNewFriends && (
                    <div className="flex gap-2 mt-2">
                        <input
                            type="text"
                            placeholder="Enter user ID directly..."
                            className="input input-bordered w-full"
                            value={idSearch}
                            onChange={e => setIdSearch(e.target.value)}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleIdSearch}
                            disabled={!idSearch}
                        >Search by ID</button>
                    </div>
                )}
                {showNewFriends && (
                    <div className="flex gap-2 mt-2">
                        <select className="select select-bordered" value={filters.nativeLang} onChange={e => setFilters(f => ({ ...f, nativeLang: e.target.value }))}>
                            <option value="">Native Language</option>
                            {LANGUAGES.filter(l => l).map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                        <select className="select select-bordered" value={filters.learningLang} onChange={e => setFilters(f => ({ ...f, learningLang: e.target.value }))}>
                            <option value="">Learning</option>
                            {LANGUAGES.filter(l => l).map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                        <select className="select select-bordered" value={filters.track} onChange={e => setFilters(f => ({ ...f, track: e.target.value }))}>
                            <option value="">Educational Track</option>
                            {EDUCATIONAL_PATHS.filter(p => p).map(path => (
                                <option key={path} value={path}>{path}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" ref={showNewFriends ? listRef : undefined}>
                {showNewFriends ? (
                    idUserResult ? (
                        // إذا كان هناك نتيجة بحث بالـ ID، اعرضها فقط
                        <div className="flex items-center gap-4 p-4 bg-base-100 rounded-lg mt-2">
                            <div className="avatar">
                                <div className="w-12 h-12 rounded-full">
                                    <img src={idUserResult.profilePic} alt={idUserResult.fullName} />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">{idUserResult.fullName}</h3>
                                <p className="text-sm text-gray-500 truncate">{idUserResult.bio || 'No bio'}</p>
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => sendRequest(idUserResult._id)}
                            >
                                Add Friend
                            </button>
                        </div>
                    ) : (
                        loadingRecommended && page === 1 ? (
                            <div className="flex justify-center py-12">
                                <span className="loading loading-ball" />
                            </div>
                        ) : allRecommended.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                                <div className="bg-base-100 rounded-full p-4 mb-4">
                                    <Search className="text-gray-400" size={40} />
                                </div>
                                <p className="text-lg font-semibold">No users found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-base-300">
                                {allRecommended.map((user) => (
                                    <div key={user._id} className="flex items-center gap-4 p-4 hover:bg-base-300 cursor-pointer transition-colors">
                                        <div className="avatar">
                                            <div className="w-12 h-12 rounded-full">
                                                <img src={user.profilePic} alt={user.fullName} />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{user.fullName}</h3>
                                            <p className="text-sm text-gray-500 truncate">{user.bio || 'No bio'}</p>
                                        </div>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => sendRequest(user._id)}
                                        >
                                            Add Friend
                                        </button>
                                    </div>
                                ))}
                                {loadingRecommended && page > 1 && (
                                    <div className="flex justify-center py-2">
                                        <span className="loading loading-ball" />
                                    </div>
                                )}
                                {/* لا تحميل تلقائي إذا انتهت النتائج */}
                                {!hasMoreResults && !loadingRecommended && (
                                    <div className="flex justify-center py-2 text-gray-400 text-xs">No more users</div>
                                )}
                            </div>
                        )
                    )
                ) : (
                    // Friends List Section
                    loadingFriends ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-ball" />
                        </div>
                    ) : filteredFriends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                            <div className="bg-base-100 rounded-full p-4 mb-4">
                                <Search className="text-gray-400" size={40} />
                            </div>
                            <p className="text-lg font-semibold">No friends found</p>
                            <p className="text-gray-500">Start connecting with your brothers</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-base-300">
                            {filteredFriends.map((friend) => (
                                <Link
                                    to={`/chat/${friend._id}`}
                                    key={friend._id}
                                    className="flex items-center gap-4 p-4 hover:bg-base-300 cursor-pointer transition-colors"
                                >
                                    <div className="avatar">
                                        <div className="w-12 h-12 rounded-full relative">
                                            <img src={friend.profilePic} alt={friend.fullName} />
                                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isUserOnline(friend._id) ? 'bg-success' : 'bg-gray-400'
                                                }`} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{friend.fullName}</h3>
                                        <p className="text-sm text-gray-500 truncate max-w-250px">
                                            {lastMessages[friend._id]?.text || 'No messages yet'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-gray-500">
                                            {lastMessages[friend._id]?.createdAt || (isUserOnline(friend._id) ? 'Online' : 'Offline')}
                                        </span>
                                        <MessageSquare className="text-primary" size={20} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                )}
                {/* عرض نتيجة البحث بالـ ID */}
                {idUserResult && (
                    <div className="flex items-center gap-4 p-4 bg-base-100 rounded-lg mt-2">
                        <div className="avatar">
                            <div className="w-12 h-12 rounded-full">
                                <img src={idUserResult.profilePic} alt={idUserResult.fullName} />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold">{idUserResult.fullName}</h3>
                            <p className="text-sm text-gray-500 truncate">{idUserResult.bio || 'No bio'}</p>
                        </div>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => sendRequest(idUserResult._id)}
                        >
                            Add Friend
                        </button>
                    </div>
                )}
                {idUserError && (
                    <div className="text-error mt-2">{idUserError}</div>
                )}
            </div>
        </div>
    )
}

export default Frindes