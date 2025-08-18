import mongoose from 'mongoose';

const groupSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    privacy: {
        type: String,
        enum: ['public', 'private', 'secret', 'restricted'],
        default: 'public'
    },
    allowMemberMessages: {
        type: Boolean,
        default: true
    },
    allowMemberVideoCall: {
        type: Boolean,
        default: true
    },
    bannedUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        banType: {
            type: String,
            enum: ['message', 'join'],
            required: true
        },
        bannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        bannedAt: {
            type: Date,
            default: Date.now
        },
        reason: String
    }],
    inviteLink: String,
    joinRequests: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    // إضافة حقل المجال المتناول ونوعه
    field: {
        type: String,
        default: ''
    },
    fieldType: {
        type: String,
        enum: ['', 'language', 'track'],
        default: ''
    },
    image: {
        type: String,
        default: ''
    }
});

const Group = mongoose.model('Group', groupSchema);

export default Group;
