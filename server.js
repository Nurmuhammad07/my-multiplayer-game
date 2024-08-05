const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = new Map(); // Map to store room data
const chatHistoryPath = path.join(__dirname, 'chatHistory.json');
app.use(express.static(path.join(__dirname, 'public')));

// Load existing chat history
let chatHistory = {};
if (fs.existsSync(chatHistoryPath)) {
    chatHistory = JSON.parse(fs.readFileSync(chatHistoryPath, 'utf8'));
}

// Save chat history to file
function saveChatHistory() {
    fs.writeFileSync(chatHistoryPath, JSON.stringify(chatHistory, null, 2), 'utf8');
}

// Function to generate a unique room name
function generateUniqueRoomName(baseName) {
    let index = 1;
    let newName = baseName;
    while (rooms.has(newName)) {
        newName = `${baseName}_${index}`;
        index++;
    }
    return newName;
}

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('checkRoomName', (data, callback) => {
        const { roomName } = data;
        const exists = rooms.has(roomName);
        if (typeof callback === 'function') {
            callback({ exists });
        }
    });

    socket.on('createRoom', (data) => {
        const { username, roomName } = data;
        let suggestedRoomName = roomName;

        if (rooms.has(roomName)) {
            suggestedRoomName = generateUniqueRoomName(roomName);
            socket.emit('suggestRoomName', suggestedRoomName); // Emit event with suggested name
        } else {
            rooms.set(roomName, new Set());
            const room = rooms.get(roomName);
            room.add(username);
            socket.join(roomName);
            io.to(roomName).emit('roomCreated', { roomName, participants: Array.from(room) });
            console.log(`Room ${roomName} created by ${username}`);
        }
    });

    socket.on('joinRoom', (data) => {
        const { username, roomName } = data;
        if (rooms.has(roomName)) {
            const room = rooms.get(roomName);
            if (room.has(username)) {
                socket.emit('usernameTaken', roomName);
            } else {
                room.add(username);
                socket.join(roomName);
                io.to(roomName).emit('roomJoined', { roomName, participants: Array.from(room) });
                console.log(`User ${username} joined room ${roomName}`);
            }
        } else {
            socket.emit('roomNotFound', roomName);
        }
    });

    socket.on('leaveRoom', (data) => {
        const { username, roomName } = data;
        if (rooms.has(roomName)) {
            const room = rooms.get(roomName);
            room.delete(username);

            // Notify all remaining participants
            io.to(roomName).emit('roomLeft', {
                username,
                roomName,
                participants: Array.from(room)
            });

            // Leave the room
            socket.leave(roomName);

            // Remove the room if it's empty
            if (room.size === 0) {
                rooms.delete(roomName);
            }

            console.log(`User ${username} left room ${roomName}`);
        }
    });

    socket.on('sendMessage', (data) => {
        const { roomName, username, message } = data;
        const chatMessage = { username, message, timestamp: new Date().toISOString() };

        // Save message to chat history
        if (!chatHistory[roomName]) {
            chatHistory[roomName] = [];
        }
        chatHistory[roomName].push(chatMessage);
        saveChatHistory();

        io.to(roomName).emit('receiveMessage', chatMessage);
        console.log(`Message from ${username} in room ${roomName}: ${message}`);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
