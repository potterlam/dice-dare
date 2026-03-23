const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Room storage: roomCode -> { dares, eliminated, rollHistory, gameOver, gmSocket, rollerSocket }
const rooms = new Map();

// Clean up old rooms every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 3 * 60 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000);

io.on('connection', (socket) => {

  // GM creates a room with dares
  socket.on('createRoom', ({ dares }, cb) => {
    if (!Array.isArray(dares) || dares.length < 2) {
      return cb({ success: false, message: '需要至少兩個挑戰' });
    }
    // Sanitize dares
    const cleanDares = dares.map(d => String(d).slice(0, 500));
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      dares: cleanDares,
      eliminated: [],
      rollHistory: [],
      gameOver: false,
      gmSocketId: socket.id,
      rollerSocketId: null,
      createdAt: Date.now()
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    cb({ success: true, roomCode });
  });

  // Anyone joins a room (GM spectator or Roller)
  socket.on('joinRoom', ({ roomCode, role }, cb) => {
    const room = rooms.get(roomCode);
    if (!room) {
      return cb({ success: false, message: '找不到房間 ' + roomCode });
    }
    socket.join(roomCode);
    if (role === 'roller') {
      room.rollerSocketId = socket.id;
      io.to(roomCode).emit('rollerJoined');
    }
    cb({
      success: true,
      state: {
        dares: room.dares,
        eliminated: room.eliminated,
        rollHistory: room.rollHistory,
        gameOver: room.gameOver
      }
    });
  });

  // Roller rolls dice → server picks the eliminated dare
  socket.on('rollDice', ({ roomCode }, cb) => {
    const room = rooms.get(roomCode);
    if (!room) return cb({ success: false, message: '房間不存在' });
    if (room.gameOver) return cb({ success: false, message: '遊戲已結束' });

    const remaining = room.dares.map((_, i) => i).filter(i => !room.eliminated.includes(i));
    if (remaining.length <= 1) return cb({ success: false, message: '只剩一個挑戰' });

    const elimIdx = remaining[Math.floor(Math.random() * remaining.length)];
    room.eliminated.push(elimIdx);

    const record = {
      number: elimIdx + 1,
      dare: room.dares[elimIdx],
      timestamp: Date.now()
    };
    room.rollHistory.push(record);

    const newRemaining = room.dares.map((_, i) => i).filter(i => !room.eliminated.includes(i));

    // If only 1 left, auto-end
    let finalDare = null;
    if (newRemaining.length === 1) {
      room.gameOver = true;
      finalDare = {
        index: newRemaining[0],
        number: newRemaining[0] + 1,
        text: room.dares[newRemaining[0]]
      };
    }

    const result = {
      eliminated: { index: elimIdx, number: elimIdx + 1, dare: room.dares[elimIdx] },
      remaining: newRemaining.length,
      finalDare: finalDare
    };

    // Broadcast to everyone in the room (including GM)
    io.to(roomCode).emit('diceRolled', result);
    cb({ success: true, ...result });
  });

  // Roller stops and accepts punishment
  socket.on('stopGame', ({ roomCode }, cb) => {
    const room = rooms.get(roomCode);
    if (!room) return cb({ success: false, message: '房間不存在' });
    if (room.gameOver) return cb({ success: false, message: '遊戲已結束' });

    const remaining = room.dares.map((_, i) => i).filter(i => !room.eliminated.includes(i));
    if (!remaining.length) return cb({ success: false, message: '沒有剩餘挑戰' });

    const pickedIdx = remaining[Math.floor(Math.random() * remaining.length)];
    room.gameOver = true;

    const finalDare = {
      index: pickedIdx,
      number: pickedIdx + 1,
      text: room.dares[pickedIdx]
    };

    io.to(roomCode).emit('gameOver', { finalDare });
    cb({ success: true, finalDare });
  });

  // GM resets game
  socket.on('resetGame', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.eliminated = [];
    room.rollHistory = [];
    room.gameOver = false;
    io.to(roomCode).emit('gameReset', { dares: room.dares });
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms.entries()) {
      if (room.gmSocketId === socket.id) {
        io.to(code).emit('gmLeft');
      }
      if (room.rollerSocketId === socket.id) {
        io.to(code).emit('rollerLeft');
      }
    }
  });

  // ---- WebRTC Signaling ----
  socket.on('webrtc-offer', ({ roomCode, offer }) => {
    socket.to(roomCode).emit('webrtc-offer', { offer });
  });

  socket.on('webrtc-answer', ({ roomCode, answer }) => {
    socket.to(roomCode).emit('webrtc-answer', { answer });
  });

  socket.on('webrtc-ice-candidate', ({ roomCode, candidate }) => {
    socket.to(roomCode).emit('webrtc-ice-candidate', { candidate });
  });

  socket.on('webrtc-stop', ({ roomCode }) => {
    socket.to(roomCode).emit('webrtc-stop');
  });
});

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
