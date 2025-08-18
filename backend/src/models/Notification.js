import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['new_message', 'group_invite', 'admin_action', 'join_request', 'friend_request', 'friend_accept']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  message: String,
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FriendRequest',
  }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
