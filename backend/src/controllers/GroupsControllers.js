import Group from '../models/Group.js';
import GroupPermission from '../models/GroupsPermission.js';
import { createGroupChannel, streamClient } from '../lib/stream.js';
import Invitation from '../models/Invitation.js';
import { upsertStreamUser, generateStreamToken } from '../lib/stream.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Check user permission
const checkUserPermission = async (groupId, userId, requiredPermission) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  // Group creator has all permissions
  if (group.creator.toString() === userId.toString()) {
    return true;
  }

  // Check if the user is an admin
  const isAdmin = group.admins.some(admin => admin.toString() === userId.toString());
  if (!isAdmin) {
    throw new Error('You are not authorized to perform this action');
  }

  // Check specific permissions
  const permission = await GroupPermission.findOne({
    group: groupId,
    admin: userId
  });

  if (!permission || !permission.permissions[requiredPermission]) {
    throw new Error('You are not authorized to perform this action');
  }

  return permission;
};

// Check if group exists
const checkGroupExists = async (groupId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  return group;
};

export const createGroup = async (req, res) => {
  try {
    const { name, description, privacy, field, fieldType } = req.body;
    const creator = req.user._id;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: 'Group name must be at least 3 characters long' });
    }

    const group = await Group.create({
      name,
      description,
      creator,
      admins: [creator],
      members: [creator],
      privacy,
      field: field || '',
      fieldType: fieldType || ''
    });

    try {
      // Create GetStream channel for the group
      const channel = await createGroupChannel(
        group._id.toString(),
        name,
        creator.toString()
      );

      // Set up initial admin permissions
      await GroupPermission.create({
        group: group._id,
        admin: creator,
        permissions: {
          canManageAdmins: true,
          canAddMembers: true,
          canRemoveMembers: true,
          canEditGroupInfo: true
        }
      });

      res.status(201).json(group);
    } catch (error) {
      // If Stream channel creation fails, delete the group
      await group.deleteOne();
      throw new Error(error.message || 'Failed to create group channel in Stream');
    }
  } catch (error) {
    res.status(500).json({ error: error.message || 'An error occurred while creating the group' });
  }
};

export const updateGroupPrivacy = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { privacy } = req.body;

    const group = await checkGroupExists(groupId);
    await checkUserPermission(groupId, req.user._id, 'canEditGroupInfo');

    if (!['public', 'private', 'restricted'].includes(privacy)) {
      return res.status(400).json({ error: 'Invalid privacy value' });
    }

    group.privacy = privacy;
    await group.save();

    res.json(group);
  } catch (error) {
    res.status(error.message.includes('غير مصرح') ? 403 : 500)
      .json({ error: error.message || 'An error occurred while updating group privacy' });
  }
};

export const getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const rawGroupId = groupId.startsWith('group-') ? groupId.replace('group-', '') : groupId;

    const group = await Group.findById(rawGroupId)
      .populate('creator', 'fullName email profilePic')
      .populate('admins', 'fullName email profilePic')
      .populate('members', 'fullName email profilePic');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if the user is banned from joining
    if (req.user?._id) {
      const isBanned = group.bannedUsers.some(
        ban => ban.user.toString() === req.user._id.toString() && ban.banType === 'join'
      );
      if (isBanned) {
        return res.status(403).json({ error: 'You have been banned from joining this group by the admins' });
      }
    }

    // Check group access validity
    if (group.privacy === 'private' || group.privacy === 'restricted') {
      if (!req.user?._id) {
        return res.status(401).json({ error: 'You must be logged in to access this group' });
      }

      if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
        return res.status(403).json({ error: 'You are not authorized to access this group' });
      }
    }

    // Add membership and ban information for the user
    const isMember = req.user?._id ? group.members.some(member => member._id.toString() === req.user._id.toString()) : false;
    const isAdmin = req.user?._id ? group.admins.some(admin => admin._id.toString() === req.user._id.toString()) : false;
    const isCreator = req.user?._id ? group.creator._id.toString() === req.user._id.toString() : false;
    const isMessageBanned = req.user?._id ? group.bannedUsers.some(
      ban => ban.user.toString() === req.user._id.toString() && ban.banType === 'message'
    ) : false;

    const groupWithMembership = {
      ...group.toObject(),
      isMember,
      isAdmin,
      isCreator,
      isMessageBanned,
      allowMemberVideoCall: group.allowMemberVideoCall ?? true
    };

    res.json(groupWithMembership);
  } catch (error) {
    res.status(500).json({ error: error.message || 'An error occurred while fetching group information' });
  }
};

export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await checkGroupExists(groupId);
    await checkUserPermission(groupId, req.user._id, 'canAddMembers');

    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'The member is already in the group' });
    }

    group.members.push(userId);
    await group.save();

    // Ensure the user exists in Stream Chat before adding to channel
    const newMemberUser = await User.findById(userId);
    if (newMemberUser) {
      await upsertStreamUser({
        id: newMemberUser._id.toString(),
        name: newMemberUser.fullName || '',
        image: newMemberUser.profilePic || '',
        role: 'member' // Changed from 'user' to 'member' for consistency
      });
    }

    // Add member to Stream channel with role 'channel_member'
    const channel = streamClient.channel('messaging', groupId.toString());
    await channel.addMembers([{ user_id: userId, channel_role: 'channel_member' }]);

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    res.status(error.message.includes('غير مصرح') ? 403 : 500)
      .json({ error: error.message || 'An error occurred while adding the member' });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    const group = await checkGroupExists(groupId);
    await checkUserPermission(groupId, req.user._id, 'canRemoveMembers');

    // Prevent removing the group creator
    if (group.creator.toString() === memberId) {
      return res.status(400).json({ error: 'Cannot remove the group creator' });
    }

    // Prevent removing admin by non-admin
    if (group.admins.includes(memberId) && !group.admins.includes(req.user._id)) {
      return res.status(403).json({ error: 'Cannot remove an admin by a non-admin' });
    }

    group.members = group.members.filter(member => member.toString() !== memberId);
    group.admins = group.admins.filter(admin => admin.toString() !== memberId);
    await group.save();

    // Remove member from Stream channel
    const channel = streamClient.channel('messaging', groupId.toString());
    await channel.removeMembers([memberId]);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(error.message.includes('غير مصرح') ? 403 : 500)
      .json({ error: error.message || 'An error occurred while removing the member' });
  }
};

export const manageAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, action } = req.body;

    const group = await checkGroupExists(groupId);
    await checkUserPermission(groupId, req.user._id, 'canManageAdmins');

    if (action === 'add') {
      if (!group.members.includes(userId)) {
        return res.status(400).json({ error: 'The member must be in the group first' });
      }
      if (group.admins.includes(userId)) {
        return res.status(400).json({ error: 'The member is already an admin' });
      }
      group.admins.push(userId);
    } else if (action === 'remove') {
      if (group.creator.toString() === userId) {
        return res.status(400).json({ error: 'Cannot remove the group creator from admins' });
      }
      group.admins = group.admins.filter(admin => admin.toString() !== userId);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(error.message.includes('غير مصرح') ? 403 : 500)
      .json({ error: error.message || 'An error occurred while managing admins' });
  }
};

export const createInvitation = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { inviteeId } = req.body;
    const inviter = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check permissions
    const permission = await GroupPermission.findOne({
      group: groupId,
      admin: inviter
    });

    if (!permission || !permission.permissions.canAddMembers) {
      return res.status(403).json({ error: 'You are not authorized to send invitations' });
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      group: groupId,
      invitee: inviteeId,
      status: 'pending'
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'A pending invitation already exists' });
    }

    const invitation = await Invitation.create({
      group: groupId,
      inviter,
      invitee: inviteeId
    });

    res.status(201).json(invitation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const respondToInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { response } = req.body; // 'accept' or 'reject'
    const userId = req.user._id;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.invitee.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You are not authorized to respond to this invitation' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'This invitation has already been responded to' });
    }

    if (response === 'accept') {
      invitation.status = 'accepted';
      // Add member to the group
      const group = await Group.findById(invitation.group);
      group.members.push(userId);
      await group.save();
    } else if (response === 'reject') {
      invitation.status = 'rejected';
    } else {
      return res.status(400).json({ error: 'Invalid response' });
    }

    await invitation.save();
    res.json(invitation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserInvitations = async (req, res) => {
  try {
    const userId = req.user._id;

    const invitations = await Invitation.find({
      invitee: userId,
      status: 'pending'
    })
      .populate('group', 'name description')
      .populate('inviter', 'name');

    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all groups that are either public or the user is a member of
    const groups = await Group.find({
      $or: [
        { privacy: 'public' },
        { members: userId }
      ],
      name: { $exists: true, $ne: '' } // Only get groups with valid names
    })
      .populate('creator', 'fullName email profilePic')
      .populate('admins', 'fullName email profilePic')
      .populate('members', 'fullName email profilePic')
      .lean(); // Use lean() for better performance

    // Remove duplicates based on _id
    const uniqueGroups = Array.from(new Map(groups.map(group => [group._id.toString(), group])).values());

    // Sort groups: user's groups first, then others
    const sortedGroups = uniqueGroups.sort((a, b) => {
      const aIsMember = a.members.some(member => member._id.toString() === userId.toString());
      const bIsMember = b.members.some(member => member._id.toString() === userId.toString());

      if (aIsMember && !bIsMember) return -1;
      if (!aIsMember && bIsMember) return 1;

      // If both are member or non-member, sort by creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Add membership status to each group
    const groupsWithStatus = sortedGroups.map(group => ({
      ...group,
      isMember: group.members.some(member => member._id.toString() === userId.toString()),
      isAdmin: group.admins.some(admin => admin._id.toString() === userId.toString()),
      isCreator: group.creator._id.toString() === userId.toString()
    }));

    res.json(groupsWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message || 'An error occurred while fetching groups' });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, privacy, members, admins, allowMemberMessages, allowMemberVideoCall, image } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if the user is the group creator or an admin
    const isCreator = group.creator.toString() === req.user._id.toString();
    const isAdmin = group.admins.some(admin => admin.toString() === req.user._id.toString());

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to update the group' });
    }

    // Update basic information
    if (name) group.name = name;
    if (description) group.description = description;
    if (privacy) group.privacy = privacy;
    if (typeof allowMemberMessages === 'boolean') group.allowMemberMessages = allowMemberMessages;
    if (typeof allowMemberVideoCall === 'boolean') group.allowMemberVideoCall = allowMemberVideoCall;
    if (image !== undefined) group.image = image;

    // Update members and admins
    if (members) {
      // Check if the group creator is included in members
      if (!members.includes(group.creator.toString())) {
        return res.status(400).json({ error: 'Cannot remove the group creator from members' });
      }
      group.members = members;
    }

    if (admins) {
      // Check if the group creator is included in admins
      if (!admins.includes(group.creator.toString())) {
        return res.status(400).json({ error: 'Cannot remove the group creator from admins' });
      }
      group.admins = admins;
    }

    await group.save();

    // Update Stream channel
    const channel = streamClient.channel('messaging', groupId.toString());
    await channel.update({
      name: group.name,
      image: group.image || '',
    });

    res.json(group);
  } catch (error) {
    res.status(error.message.includes('غير مصرح') ? 403 : 500)
      .json({ error: error.message || 'An error occurred while updating the group' });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await checkGroupExists(groupId);

    // Check if the user is the group creator
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the group creator can delete the group' });
    }

    // Delete all permissions associated with the group
    await GroupPermission.deleteMany({ group: groupId });

    // Delete all invitations associated with the group
    await Invitation.deleteMany({ group: groupId });

    // Delete Stream channel
    const channel = streamClient.channel('messaging', groupId.toString());
    await channel.delete();

    // Delete the group
    await group.deleteOne();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(error.message.includes('غير مصرح') ? 403 : 500)
      .json({ error: error.message || 'An error occurred while deleting the group' });
  }
};

export const getStreamToken = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'You must be logged in first' });
    }

    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    let role = 'user'; // Default role for users not in any group

    if (user && user.groups && user.groups.length > 0) {
      role = 'channel_member'; // If user is part of any group, assign 'channel_member' role
    }

    // Ensure the user is upserted in Stream Chat with the correct role and permissions
    await upsertStreamUser({
      id: userId,
      name: user.fullName || '',
      image: user.profilePic || '',
      role: role,
      permissions: ['read', 'write', 'add-links', 'create-message']
    });

    // Create token with appropriate permissions
    const token = streamClient.createToken(userId, {
      role,
      permissions: ['read', 'write', 'add-links', 'create-message']
    });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Stream token' });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if the group is public
    if (group.privacy !== 'public') {
      return res.status(403).json({ error: 'Cannot join this group' });
    }

    // Check if the user is not already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Add the user to members
    group.members.push(userId);
    await group.save();

    // Update user permissions in Stream
    await streamClient.upsertUser({
      id: userId.toString(),
      role: 'channel_member',
      permissions: ['read', 'write', 'add-links', 'create-message']
    });

    // Add member to Stream channel with appropriate permissions
    const channel = streamClient.channel('messaging', groupId.toString());
    await channel.addMembers([{
      user_id: userId.toString(),
      channel_role: 'channel_member',
      permissions: ['read', 'write', 'add-links', 'create-message']
    }]);

    res.json({ message: 'تم الانضمام إلى المجموعة بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'حدث خطأ في الانضمام إلى المجموعة' });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if the user is a member of the group
    if (!group.members.includes(userId)) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    // Prevent the group creator from leaving
    if (group.creator.toString() === userId.toString()) {
      return res.status(400).json({ error: 'The group creator cannot leave the group' });
    }

    // Remove the user from members and admins
    group.members = group.members.filter(member => member.toString() !== userId.toString());
    group.admins = group.admins.filter(admin => admin.toString() !== userId.toString());
    await group.save();

    // Remove member from Stream channel
    const channel = streamClient.channel('messaging', groupId.toString());
    await channel.removeMembers([userId]);

    res.json({ message: 'تم مغادرة المجموعة بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'حدث خطأ في مغادرة المجموعة' });
  }
};

export const getBannedUsers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate('bannedUsers.user', 'fullName email profilePic')
      .populate('bannedUsers.bannedBy', 'fullName email profilePic');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check user permissions
    const isAdmin = group.admins.some(admin => admin.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to access the banned users list' });
    }

    res.json(group.bannedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message || 'An error occurred while fetching the banned users list' });
  }
};

export const banUser = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, banType, reason } = req.body;
    const bannedBy = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check user permissions
    const isAdmin = group.admins.some(admin => admin.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to ban users' });
    }

    // Check if the user to be banned is not the group creator
    if (group.creator.toString() === userId) {
      return res.status(400).json({ error: 'Cannot ban the group creator' });
    }

    // Check if the user is not an admin
    if (group.admins.some(admin => admin.toString() === userId)) {
      return res.status(400).json({ error: 'Cannot ban an admin' });
    }

    // Add the user to the banned users list
    group.bannedUsers.push({
      user: userId,
      banType,
      bannedBy,
      reason
    });

    // If the ban type is 'join', remove the user from members
    if (banType === 'join' && group.members.includes(userId)) {
      group.members = group.members.filter(member => member.toString() !== userId);
    }

    // If the ban type is 'message', update Stream Chat
    if (banType === 'message') {
      const channel = streamClient.channel('messaging', groupId.toString());
      await channel.banUser(userId, {
        banned_by_id: bannedBy,
        reason: reason || 'User banned from sending messages'
      });
    }

    await group.save();

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'An error occurred while banning the user' });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check user permissions
    const isAdmin = group.admins.some(admin => admin.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to unban users' });
    }

    // Find the ban before removing it
    const ban = group.bannedUsers.find(ban => ban.user.toString() === userId);
    if (ban && ban.banType === 'message') {
      // Unban in Stream Chat
      const channel = streamClient.channel('messaging', groupId.toString());
      await channel.unbanUser(userId);
    }

    // Remove the user from the banned users list
    group.bannedUsers = group.bannedUsers.filter(
      ban => ban.user.toString() !== userId
    );

    await group.save();

    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'An error occurred while unbanning the user' });
  }
};
