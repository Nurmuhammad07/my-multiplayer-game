const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;
const upload = multer({ dest: 'public/uploads/' });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

// Helper function to save chat history to a file
const saveChatHistory = (roomName, username, message) => {
    const chatHistoryPath = path.join(__dirname, 'chatHistory.json');
    let chatHistory = {};

    if (fs.existsSync(chatHistoryPath)) {
        chatHistory = JSON.parse(fs.readFileSync(chatHistoryPath));
    }

    if (!chatHistory[roomName]) {
        chatHistory[roomName] = [];
    }

    chatHistory[roomName].push({ username, message, timestamp: new Date() });

    fs.writeFileSync(chatHistoryPath, JSON.stringify(chatHistory, null, 2));
};

io.on('connection', (socket) => {
    console.log('A user connected.');

    socket.on('createRoom', ({ username, roomName }) => {
        if (!rooms[roomName]) {
            rooms[roomName] = {
                participants: {},
                hosts: [username]
            };
            rooms[roomName].participants[username] = socket.id;
            socket.join(roomName);

            socket.emit('roomCreated', {
                roomName,
                participants: Object.keys(rooms[roomName].participants)
            });
        } else {
            socket.emit('roomNameExists', { existingRoomName: roomName });
        }
    });

    socket.on('joinRoom', ({ username, roomName }) => {
        if (rooms[roomName]) {
            if (!rooms[roomName].participants[username]) {
                rooms[roomName].participants[username] = socket.id;
                socket.join(roomName);

                io.to(roomName).emit('updateParticipants', Object.keys(rooms[roomName].participants));

                socket.emit('roomJoined', {
                    roomName,
                    participants: Object.keys(rooms[roomName].participants)
                });

                io.to(roomName).emit('roomJoined', {
                    roomName,
                    participants: Object.keys(rooms[roomName].participants)
                });
            } else {
                socket.emit('usernameTaken', { username });
            }
        } else {
            socket.emit('roomNotFound', roomName);
        }
    });

    socket.on('sendMessage', ({ roomName, username, message }) => {
        if (rooms[roomName]) {
            saveChatHistory(roomName, username, message);

            io.to(roomName).emit('receiveMessage', { username, message });
        }
    });

    socket.on('sendPhoto', ({ roomName, username, photo }) => {
        const photoBuffer = Buffer.from(photo.split(',')[1], 'base64');
        const photoPath = path.join(__dirname, 'public', 'uploads', `photo_${Date.now()}.png`);

        sharp(photoBuffer)
            .resize({ width: 300 })
            .toFile(photoPath, (err, info) => {
                if (err) {
                    console.error('Error processing image:', err);
                    return;
                }

                const imageUrl = `/uploads/${path.basename(photoPath)}`;
                io.to(roomName).emit('receivePhoto', { username, imageUrl });
            });
    });

    socket.on('leaveRoom', ({ username, roomName }) => {
        if (rooms[roomName]) {
            delete rooms[roomName].participants[username];
            socket.leave(roomName);

            if (Object.keys(rooms[roomName].participants).length === 0) {
                delete rooms[roomName];
            } else {
                io.to(roomName).emit('updateParticipants', Object.keys(rooms[roomName].participants));
            }

            io.to(roomName).emit('roomLeft', {
                participants: Object.keys(rooms[roomName]?.participants || []),
                username
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected.');
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
