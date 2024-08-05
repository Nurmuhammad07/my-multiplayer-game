document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Initialize Socket.IO client
    const existingRoomNames = [];

    function displayMessage(username, content, isPhoto = false) {
        const messages = document.getElementById('messages');
        const currentUser = document.getElementById('usernameInput').value.trim();
        if (messages) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            if (username === currentUser) {
                messageElement.classList.add('message-right');
            } else {
                messageElement.classList.add('message-left');
            }

            if (isPhoto) {
                messageElement.innerHTML = `<strong>${username}:</strong> <img src="${content}" style="max-width: 100px;">`;
            } else {
                messageElement.innerHTML = `<strong>${username}:</strong> ${content}`;
            }

            messages.appendChild(messageElement);
            messages.scrollTop = messages.scrollHeight; // Auto-scroll to the bottom
        } else {
            console.error('Messages element not found.');
        }
    }

    function toggleRoomForm(show) {
        document.getElementById('roomForm').style.display = show ? 'block' : 'none';
        document.getElementById('roomInfo').style.display = show ? 'none' : 'block';
    }

    function suggestNewRoomName(existingRoomName) {
        let baseName = existingRoomName;
        let match = baseName.match(/(.*)_(\d+)$/);
        let newName;

        if (match) {
            baseName = match[1];
            let number = parseInt(match[2], 10) + 1;
            newName = `${baseName}_${number}`;
        } else {
            newName = `${baseName}_1`;
        }

        while (existingRoomNames.includes(newName)) {
            let match = newName.match(/(.*)_(\d+)$/);
            if (match) {
                baseName = match[1];
                let number = parseInt(match[2], 10) + 1;
                newName = `${baseName}_${number}`;
            } else {
                newName = `${baseName}_1`;
            }
        }

        return newName;
    }

    function showRoomNamePrompt(existingRoomName) {
        const roomNamePrompt = document.getElementById('roomNamePrompt');
        const newRoomNameInput = document.getElementById('newRoomNameInput');
        if (roomNamePrompt && newRoomNameInput) {
            const suggestedName = suggestNewRoomName(existingRoomName);
            newRoomNameInput.value = suggestedName; // Set default new name
            roomNamePrompt.style.display = 'block';

            const confirmButton = document.getElementById('confirmRoomName');
            const cancelButton = document.getElementById('cancelRoomName');

            if (confirmButton && cancelButton) {
                confirmButton.onclick = () => {
                    const newRoomName = newRoomNameInput.value.trim();
                    if (newRoomName) {
                        socket.emit('createRoom', { username: document.getElementById('usernameInput').value.trim(), roomName: newRoomName });
                        roomNamePrompt.style.display = 'none';
                    }
                };

                cancelButton.onclick = () => {
                    roomNamePrompt.style.display = 'none';
                };
            }
        }
    }

    function updateParticipants(participants) {
        const participantsList = document.getElementById('participants');
        if (participantsList) {
            participantsList.innerHTML = '';
            participants.forEach(participant => {
                const participantItem = document.createElement('li');
                participantItem.textContent = participant;
                participantsList.appendChild(participantItem);
            });
        }
    }

    socket.on('createRoom', ({ username, roomName }) => {
        if (!existingRoomNames.includes(roomName)) {
            existingRoomNames.push(roomName);
        }
        updateParticipants(Object.keys(rooms[roomName].participants));
        toggleRoomForm(false);
        document.getElementById('roomTitle').textContent = `Room: ${roomName}`;
    });

    document.getElementById('createRoomButton').onclick = () => {
        const username = document.getElementById('usernameInput').value.trim();
        const roomName = document.getElementById('roomNameInput').value.trim();
        if (username && roomName) {
            socket.emit('createRoom', { username, roomName });
        }
    };

    socket.on('receiveMessage', (data) => {
        console.log('Message received:', data);
        displayMessage(data.username, data.message);
    });

    socket.on('roomNameExists', (data) => {
        showRoomNamePrompt(data.existingRoomName);
    });

    socket.on('roomCreated', (data) => {
        updateParticipants(data.participants);
        toggleRoomForm(false);
        document.getElementById('roomTitle').textContent = `Room: ${data.roomName}`;
    });

    socket.on('roomNotFound', (roomName) => {
        alert(`Room "${roomName}" does not exist.`);
    });

    socket.on('roomJoined', (data) => {
        updateParticipants(data.participants);
        toggleRoomForm(false); // Hide the roomForm
        document.getElementById('roomInfo').style.display = 'block'; // Show the roomInfo
        document.getElementById('roomTitle').textContent = `Room: ${data.roomName}`;
    });
    

    socket.on('usernameTaken', (data) => {
        alert(`Username "${data.username}" is already taken in this room.`);
    });

    socket.on('roomLeft', (data) => {
        const { participants, username } = data;
        updateParticipants(participants);
        document.getElementById('status').textContent = username === document.getElementById('usernameInput').value.trim() ?
            'You left the room.' : `${username} left the room.`;
        if (username === document.getElementById('usernameInput').value.trim()) {
            toggleRoomForm(true);
        }
    });

    socket.on('updateParticipants', (participants) => {
        updateParticipants(participants);
    });

    document.getElementById('leaveRoomButton').addEventListener('click', () => {
        const username = document.getElementById('usernameInput').value.trim();
        const roomName = document.getElementById('roomTitle').textContent.replace('Room: ', '').trim();
        if (username && roomName) {
            socket.emit('leaveRoom', { username, roomName });
            // Client-side immediate UI update
            toggleRoomForm(true);
            updateParticipants([]);
        }
    });

    document.getElementById('sendMessageButton').addEventListener('click', () => {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        const roomName = document.getElementById('roomTitle').textContent.replace('Room: ', '').trim();
        const username = document.getElementById('usernameInput').value.trim();

        if (message && roomName && username) {
            socket.emit('sendMessage', { roomName, username, message });
            messageInput.value = '';
        }
    });

    document.getElementById('photoInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        const username = document.getElementById('usernameInput').value.trim();
        const roomName = document.getElementById('roomTitle').textContent.replace('Room: ', '').trim();

        if (file && username && roomName) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const photoDataURL = reader.result;
                socket.emit('sendPhoto', { roomName, username, photo: photoDataURL });
            };
            reader.readAsDataURL(file);
        } else {
            console.error('File, username, or room name is missing.');
        }
    });

    socket.on('receivePhoto', (data) => {
        console.log('Photo received:', data);
        displayMessage(data.username, data.imageUrl, true);
    });

    function checkElements() {
        ['roomForm', 'roomInfo', 'roomNamePrompt', 'newRoomNameInput', 'confirmRoomName', 'cancelRoomName', 'messages', 'participants', 'usernameInput', 'roomNameInput', 'createRoomButton', 'joinRoomButton', 'leaveRoomButton', 'sendMessageButton', 'messageInput'].forEach(id => {
            if (!document.getElementById(id)) {
                console.error(`Element with id "${id}" not found.`);
            }
        });
    }

    document.getElementById('joinRoomButton').onclick = () => {
        const username = document.getElementById('usernameInput').value.trim();
        const roomName = document.getElementById('roomNameInput').value.trim();
        if (username && roomName) {
            socket.emit('joinRoom', { username, roomName });
        }
    };
    

    checkElements(); // Call function to check elements' existence
});
