import mongoose from 'mongoose';

const groupPermissionSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: {
    canAddMembers: { type: Boolean, default: true },
    canRemoveMembers: { type: Boolean, default: true },
    canPinMessages: { type: Boolean, default: true },
    canDeleteMessages: { type: Boolean, default: true },
    canEditGroupInfo: { type: Boolean, default: true },
    canManageAdmins: { type: Boolean, default: false }
  }
});

const GroupPermission = mongoose.model('GroupPermission', groupPermissionSchema);

export default GroupPermission; 
