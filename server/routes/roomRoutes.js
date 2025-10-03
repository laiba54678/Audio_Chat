const express = require('express');
const {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  updateRoomStatus,
  leaveRoom,
  deleteRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes are protected

router.route('/')
  .post(createRoom)
  .get(getRooms);

router.route('/:id')
  .get(getRoom)
  .delete(deleteRoom);

router.post('/:id/join', joinRoom);
router.put('/:id/status', updateRoomStatus);
router.delete('/:id/leave', leaveRoom);

module.exports = router;