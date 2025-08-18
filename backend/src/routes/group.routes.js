// backend/src/routes/group.routes.js
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import {
    createGroup,
    getGroups,
    getGroup,
    updateGroupPrivacy,
    deleteGroup,
    addMember,
    removeMember,
    manageAdmin,
    getStreamToken,
    createInvitation,
    respondToInvitation,
    getUserInvitations,
    updateGroup,
    joinGroup,
    leaveGroup,
    getBannedUsers,
    banUser,
    unbanUser
} from '../controllers/GroupsControllers.js';

const router = express.Router();

// Protect all routes
router.use(protectRoute);

// Private routes (should be before public routes)
router.get('/stream-token', getStreamToken);
router.get('/invitations', getUserInvitations);
router.put('/invitations/:invitationId', respondToInvitation);

// Public group routes
router.post('/', createGroup);
router.get('/', getGroups);

// Private group routes
router.get('/:groupId', getGroup);
router.put('/:groupId/privacy', updateGroupPrivacy);
router.delete('/:groupId', deleteGroup);

// Member routes
router.post('/:groupId/members', addMember);
router.delete('/:groupId/members/:memberId', removeMember);

// Admin routes
router.post('/:groupId/admin', manageAdmin);

// Group invitation routes
router.post('/:groupId/invitations', createInvitation);

// New route for updating a group
router.put('/:groupId', updateGroup);

// Join and leave routes
router.post('/:groupId/join', joinGroup);
router.post('/:groupId/leave', leaveGroup);

// Ban management routes
router.get('/:groupId/banned', getBannedUsers);
router.post('/:groupId/ban', banUser);
router.delete('/:groupId/ban/:userId', unbanUser);

export default router;