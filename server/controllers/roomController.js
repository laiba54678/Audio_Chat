const Room = require('../models/Room');
const crypto = require('crypto');

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res) => {
  try {
    const { name, type, maxParticipants } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Room name is required'
      });
    }

    // Generate access code for private rooms
    let accessCode = null;
    if (type === 'Private') {
      accessCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      console.log(`Generated access code for private room: ${accessCode}`);
    }

    const room = await Room.create({
      name,
      creator: req.user.id,
      type: type || 'Public',
      accessCode,
      maxParticipants: maxParticipants || 10,
      participants: [] // Empty - users only join when they explicitly join
    });

    const populatedRoom = await Room.findById(room._id).populate('creator', 'username');

    res.status(201).json({
      success: true,
      data: populatedRoom
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating room',
      error: error.message
    });
  }
};

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
const getRooms = async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;

    const rooms = await Room.find(query)
      .populate('creator', 'username')
      .populate('participants.user', 'username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching rooms',
      error: error.message
    });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('creator', 'username')
      .populate('participants.user', 'username');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching room',
      error: error.message
    });
  }
};

// @desc    Join a room
// @route   POST /api/rooms/:id/join
// @access  Private
const joinRoom = async (req, res) => {
  try {
    const { accessCode } = req.body;
    console.log(`Join room request - Room ID: ${req.params.id}, Access Code: ${accessCode}`);
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    console.log(`Room found - Type: ${room.type}, Stored Access Code: ${room.accessCode}`);

    // Check if room is private and validate access code
    if (room.type === 'Private') {
      if (!accessCode) {
        return res.status(403).json({
          success: false,
          message: 'Access code is required for private rooms'
        });
      }
      if (room.accessCode !== accessCode.toUpperCase()) {
        console.log(`Access code mismatch: expected ${room.accessCode}, got ${accessCode}`);
        return res.status(403).json({
          success: false,
          message: 'Invalid access code'
        });
      }
    }

    // Check if user is already in the room
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (isParticipant) {
      // User is already a participant, just return success (they can join via WebSocket)
      return res.status(200).json({
        success: true,
        message: 'Already a participant, joining room...',
        data: room
      });
    }

    // Check max participants
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    // Add user to participants
    room.participants.push({
      user: req.user.id,
      socketId: null
    });

    await room.save();

    const updatedRoom = await Room.findById(room._id)
      .populate('creator', 'username')
      .populate('participants.user', 'username');

    res.status(200).json({
      success: true,
      data: updatedRoom
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error joining room',
      error: error.message
    });
  }
};

// @desc    Update room status (Inactive/Live)
// @route   PUT /api/rooms/:id/status
// @access  Private
const updateRoomStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Only creator can update status
    if (room.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only room creator can update status'
      });
    }

    if (!['Inactive', 'Live'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    room.status = status;
    await room.save();

    const updatedRoom = await Room.findById(room._id)
      .populate('creator', 'username')
      .populate('participants.user', 'username');

    res.status(200).json({
      success: true,
      data: updatedRoom
    });
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating room status',
      error: error.message
    });
  }
};

// @desc    Leave a room
// @route   DELETE /api/rooms/:id/leave
// @access  Private
const leaveRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Remove user from participants
    room.participants = room.participants.filter(
      p => p.user.toString() !== req.user.id
    );

    await room.save();

    res.status(200).json({
      success: true,
      message: 'Successfully left the room'
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error leaving room',
      error: error.message
    });
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private (only room creator can delete)
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is the creator of the room
    if (room.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the room creator can delete this room'
      });
    }

    // Delete the room
    await Room.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting room',
      error: error.message
    });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  updateRoomStatus,
  leaveRoom,
  deleteRoom
};