import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';
import {
    createNotification,
} from './NotificationsController.js';

export async function searchUsers(req, res) {
    try {
        // Start Authentication/Authorization Check
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.JWT) { // Check for JWT cookie as a fallback
            token = req.cookies.JWT
        }

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
        }

        const authUser = await User.findById(decoded.id).select('-password');
        if (!authUser) {
            return res.status(401).json({ message: 'Unauthorized: User not found.' });
        }
        req.user = authUser; // Attach authenticated user to request
        // End Authentication/Authorization Check

        const searchQuery = req.query.q;

        if (!searchQuery) {
            return res.status(400).json({ message: "Query parameter 'q' is required" });
        }

        // Support searching by ID if q matches ObjectId
        let orConditions = [
            { fullName: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
        ];
        // Check if q matches ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(searchQuery)) {
            orConditions.unshift({ _id: searchQuery });
        }

        const users = await User.find({
            $or: orConditions
        }).select("-password"); // Exclude password from results

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getRecommendedUsers(req, res) {
    try {
        // Get current user with required fields
        const currentUser = await User.findById(req.user.id).select('friends receivedRequests');
        const currentUserId = req.user.id;
        const { nativeLang, learningLang, track, q = '', page = 1, limit = 10 } = req.query;
        // Debugging: Count users after each condition
        const notMeCount = await User.countDocuments({ _id: { $ne: currentUserId } });
        const notFriendsCount = await User.countDocuments({ _id: { $ne: currentUserId, $nin: currentUser.friends || [] } });
        const notReceivedReqCount = await User.countDocuments({ _id: { $ne: currentUserId, $nin: currentUser.friends || [], $nin: currentUser.receivedRequests || [] } });
        const onboardedCount = await User.countDocuments({ _id: { $ne: currentUserId, $nin: currentUser.friends || [], $nin: currentUser.receivedRequests || [] }, isOnboarded: true });
        let nativeLangCount = null;
        if (nativeLang) {
            nativeLangCount = await User.countDocuments({ _id: { $ne: currentUserId, $nin: currentUser.friends || [], $nin: currentUser.receivedRequests || [] }, isOnboarded: true, nativeLanguage: nativeLang });
        }

        console.log("4. isOnboarded:", onboardedCount);
        if (nativeLang) console.log("5. nativeLanguage:", nativeLang, nativeLangCount);
        // ...other filters can be added similarly if needed...
        // Final filter
        const andFilters = [
            { _id: { $ne: currentUserId } },
            { _id: { $nin: currentUser.friends || [] } },
            { _id: { $nin: currentUser.receivedRequests || [] } },
            { isOnboarded: true }
        ];
        if (nativeLang) andFilters.push({ nativeLanguage: { $regex: `^${nativeLang}$`, $options: 'i' } });
        if (learningLang) andFilters.push({ learningLanguage: { $regex: `^${learningLang}$`, $options: 'i' } });
        if (track) andFilters.push({ educationalPath: track });
        if (q) andFilters.push({ fullName: { $regex: q, $options: 'i' } });
        const filter = { $and: andFilters };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const recommendedUsers = await User.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .select('fullName profilePic bio nativeLanguage learningLanguage educationalPath');
        // Get total count of users matching the filters (without limit/skip)
        const totalCount = await User.countDocuments(filter);
        res.status(200).json({
            status: 'success',
            data: {
                recommendedUsers,
                hasMore: skip + recommendedUsers.length < totalCount
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function getMyFriends(req, res) {
    try {
        const user = await User.findById(req.user.id)
            .select('friends')
            .populate('friends', 'fullName email profilePic nativeLanguage learningLanguage educationalPath bio');
        res.status(200).json(user.friends);
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export async function sendFriendRequest(req, res) {
    try {
        const myId = req.user.id;
        const { id: recipientId } = req.params;

        // prevent sending req to yourself
        if (myId === recipientId) {
            return res.status(400).json({ message: "You can't send friend request to yourself" });
        }

        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: "Recipient not found" });
        }

        // check if user is already friends
        if (recipient.friends.includes(myId)) {
            return res.status(400).json({ message: "You are already friends with this user" });
        }

        // check if a req already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: myId, recipient: recipientId },
                { sender: recipientId, recipient: myId },
            ],
        });

        if (existingRequest) {
            return res
                .status(400)
                .json({ message: "A friend request already exists between you and this user" });
        }

        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recipientId,
        });
        // Notification for the recipient
        await createNotification(
            recipientId,
            'friend_request',
            `You have a new friend request from ${req.user.fullName}`,
            null,
            friendRequest._id // Add requestId
        );
        // Add sender's id to recipient's receivedRequests
        await User.findByIdAndUpdate(recipientId, {
            $addToSet: { receivedRequests: myId }
        });
        res.status(201).json(friendRequest);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function acceptFriendRequest(req, res) {
    try {
        const { id: requestId } = req.params
        const friendRequest = await FriendRequest.findById(requestId);
        if (!friendRequest) {
            return res.status(404).json({
                message: 'Friend request not found'
            });
        }
        if (friendRequest.recipient.toString() !== req.user.id) {
            return res.status(403).json({
                message: 'You are not authorized to accept this friend request'
            });
        }
        friendRequest.status = 'accepted';
        await friendRequest.save();
        // Add the users to each other's friends list
        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: { friends: req.user.id }
        });
        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet: { friends: friendRequest.sender }
        });
        // Update the friend request notification to friend accepted notification
        await Notification.findOneAndUpdate(
            { requestId: friendRequest._id, type: 'friend_request' },
            {
                $set: {
                    type: 'friend_accept',
                    message: `You are now friends with ${req.user.fullName}!`,
                    read: false, // Reactivate the notification as new
                }
            }
        );
        // Notification for the sender: message contains the name of the requester
        await createNotification(
            friendRequest.sender,
            'friend_accept',
            `${req.user.fullName} accepted your friend request`
        );
        // Notification for the recipient: message contains the name of the new friend
        const senderUser = await User.findById(friendRequest.sender);
        await createNotification(
            friendRequest.recipient,
            'friend_accept',
            `You are now friends with ${senderUser.fullName}`
        );
        // Remove the sender's id from the recipient's receivedRequests after accepting the request
        await User.findByIdAndUpdate(friendRequest.recipient, {
            $pull: { receivedRequests: friendRequest.sender }
        });
        // Send response with updated data
        const updatedRequest = await FriendRequest.findById(requestId)
            .populate('sender', 'fullName profilePic nativeLanguage learningLanguage educationalPath')
            .populate('recipient', 'fullName profilePic nativeLanguage learningLanguage educationalPath');

        res.status(200).json({
            message: 'Friend request accepted successfully',
            request: updatedRequest
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error'
        });
    }
}

export async function getFriendRequests(req, res) {
    try {
        const incomingReqs = await FriendRequest.find({
            recipient: req.user.id,
            status: "pending",
        }).populate("sender", "fullName profilePic nativeLanguage learningLanguage educationalPath");

        const acceptedReqs = await FriendRequest.find({
            sender: req.user.id,
            status: "accepted",
        }).populate("recipient", "fullName profilePic");

        res.status(200).json({ incomingReqs, acceptedReqs });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getOutgoingFriendReqs(req, res) {
    try {
        const outgoingRequests = await FriendRequest.find({
            sender: req.user.id,
            status: "pending",
        }).populate("recipient", "fullName profilePic nativeLanguage learningLanguage");

        res.status(200).json(outgoingRequests);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}