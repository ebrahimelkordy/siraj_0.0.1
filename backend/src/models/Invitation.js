import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  inviteLink: {
    type: String,
    unique: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // Expires after 7 days
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate a unique invite link
invitationSchema.pre('save', async function (next) {
  if (!this.inviteLink) {
    this.inviteLink = Math.random().toString(36).substring(2, 15);
  }
  next();
});

const Invitation = mongoose.model('Invitation', invitationSchema);

export default Invitation;

