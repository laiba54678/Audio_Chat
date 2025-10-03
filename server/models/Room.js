

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Public', 'Private'],
    default: 'Public',
    required: true
  },
  accessCode: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Inactive', 'Live'],
    default: 'Live'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    socketId: String
  }],
  maxParticipants: {
    type: Number,
    default: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
roomSchema.index({ creator: 1, status: 1 });
roomSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Room', roomSchema);