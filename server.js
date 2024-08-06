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
const cors = require('cors');
app.use(cors()); // Add this to your server configuration


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
    socket.emit('availableRooms', Object.keys(rooms));

    // When a room is created
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

            // Notify all clients of the updated room list
            io.emit('availableRooms', Object.keys(rooms));
        } else {
            socket.emit('roomNameExists', { existingRoomName: roomName });
        }
    });

    socket.on('joinRoom', ({ username, roomName }) => {
        const normalizedUsername = username.trim().toLowerCase();
        console.log(`Join request: ${username} (${normalizedUsername}) in room ${roomName}`);
        if (rooms[roomName]) {
            console.log(`Participants in room ${roomName}:`, rooms[roomName].participants);
            if (!rooms[roomName].participants[normalizedUsername]) {
                rooms[roomName].participants[normalizedUsername] = socket.id;
                socket.join(roomName);
                console.log(`User ${normalizedUsername} added to room ${roomName}`);
    
                io.to(roomName).emit('updateParticipants', Object.keys(rooms[roomName].participants));
                socket.emit('roomJoined', {
                    roomName,
                    participants: Object.keys(rooms[roomName].participants)
                });
            } else {
                console.log(`Username "${normalizedUsername}" is already taken in room ${roomName}`);
                socket.emit('usernameTaken', { username });
            }
        } else {
            console.log(`Room ${roomName} not found`);
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
        if (rooms[roomName]) {
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
        }
    });

    socket.on('leaveRoom', ({ username, roomName }) => {
        const normalizedUsername = username.trim().toLowerCase();
        if (rooms[roomName]) {
            delete rooms[roomName].participants[normalizedUsername];
            socket.leave(roomName);

            if (Object.keys(rooms[roomName].participants).length === 0) {
                delete rooms[roomName];
            } else {
                io.to(roomName).emit('updateParticipants', Object.keys(rooms[roomName].participants));
            }

            io.emit('availableRooms', Object.keys(rooms));
            socket.emit('roomLeftAcknowledged');
        }
    });


    socket.on('disconnect', () => {
        // Handle user disconnection
        for (let roomName in rooms) {
            if (rooms[roomName] && rooms[roomName].participants) {
                for (let participant in rooms[roomName].participants) {
                    if (rooms[roomName].participants[participant] === socket.id) {
                        delete rooms[roomName].participants[participant];
                        if (Object.keys(rooms[roomName].participants).length === 0) {
                            delete rooms[roomName];
                        } else {
                            io.to(roomName).emit('updateParticipants', Object.keys(rooms[roomName].participants));
                        }
                        break;
                    }
                }
            }
        }

        // Notify all clients about the updated available rooms
        io.emit('availableRooms', Object.keys(rooms));
    });

});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});