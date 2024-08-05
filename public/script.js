document.addEventListener('DOMContentLoaded', () => {
    const socket = io('/api');
    const existingRoomNames = [];

    // Hide or show the room form and chat
    function toggleRoomForm(show) {
        document.getElementById('roomForm').style.display = show ? 'block' : 'none';
        document.getElementById('roomInfo').style.display = show ? 'none' : 'block';
    }

    // Show the room name prompt with suggested incremented room name
    function showRoomNamePrompt(existingRoomName) {
        const roomNamePrompt = document.getElementById('roomNamePrompt');
        const newRoomNameInput = document.getElementById('newRoomNameInput');
        if (!roomNamePrompt || !newRoomNameInput) {
            console.error('Room name prompt or input field not found.');
            return;
        }

        let baseName = existingRoomName;
        let number = 1;

        // Generate a new name with an incrementing number if needed
        while (existingRoomNames.includes(`${baseName}_${number}`)) {
            number++;
        }
        newRoomNameInput.value = `${baseName}_${number}`; // Set default new name
        roomNamePrompt.style.display = 'block';

        const confirmButton = document.getElementById('confirmRoomName');
        const cancelButton = document.getElementById('cancelRoomName');

        if (confirmButton && cancelButton) {
            confirmButton.onclick = () => {
                const newRoomName = newRoomNameInput.value.trim();
                if (newRoomName) {
                    socket.emit('createRoom', { username: document.getElementById('usernameInput').value.trim(), roomName: newRoomName });
                    roomNamePrompt.style.display = 'none';
                } else {
                    console.error('New room name is empty.');
                }
            };

            cancelButton.onclick = () => {
                roomNamePrompt.style.display = 'none';
            };
        } else {
            console.error('Confirm or Cancel button not found.');
        }
    }

    // Create a new room
    document.getElementById('createRoomButton').onclick = () => {
        const usernameInput = document.getElementById('usernameInput');
        const roomNameInput = document.getElementById('roomNameInput');

        if (!usernameInput || !roomNameInput) {
            console.error('Username or room name input field not found.');
            return;
        }

        const username = usernameInput.value.trim();
        const roomName = roomNameInput.value.trim();

        if (username && roomName) {
            socket.emit('createRoom', { username, roomName });
        } else {
            console.error('Username or room name is empty.');
        }
    };

    // Function to update the list of participants
    function updateParticipants(participants) {
        const participantsList = document.getElementById('participants');
        if (!participantsList) {
            console.error('Participants list not found.');
            return;
        }

        participantsList.innerHTML = ''; // Clear existing participants

        // Add each participant to the list
        participants.forEach(participant => {
            const participantItem = document.createElement('li');
            participantItem.textContent = participant;
            participantsList.appendChild(participantItem);
        });
    }

    // Handle room name existence
    socket.on('roomNameExists', (data) => {
        showRoomNamePrompt(data.existingRoomName);
    });

    // Handle room creation
    socket.on('roomCreated', (data) => {
        existingRoomNames.push(data.roomName);
        updateParticipants(data.participants);
        toggleRoomForm(false);
        document.getElementById('roomTitle').textContent = `Room: ${data.roomName}`;
    });

    // Handle room not found
    socket.on('roomNotFound', (roomName) => {
        alert(`Room "${roomName}" does not exist.`);
    });

    // Handle room join
    socket.on('roomJoined', (data) => {
        updateParticipants(data.participants);
        toggleRoomForm(false);
        document.getElementById('roomTitle').textContent = `Room: ${data.roomName}`;
    });

    // Handle room left
    socket.on('roomLeft', (data) => {
        updateParticipants(data.participants);
        if (data.username === document.getElementById('usernameInput').value.trim()) {
            toggleRoomForm(true);
            document.getElementById('status').textContent = `You left the room.`;
        } else {
            document.getElementById('status').textContent = `${data.username} left the room.`;
        }

        // Check if the room is now empty
        if (data.participants.length === 0) {
            toggleRoomForm(true); // Show room form if the room is empty
        }
    });

    // Join a room
    document.getElementById('joinRoomButton').onclick = () => {
        const usernameInput = document.getElementById('usernameInput');
        const roomNameInput = document.getElementById('roomNameInput');

        if (!usernameInput || !roomNameInput) {
            console.error('Username or room name input field not found.');
            return;
        }

        const username = usernameInput.value.trim();
        const roomName = roomNameInput.value.trim();

        if (username && roomName) {
            socket.emit('joinRoom', { username, roomName });
        } else {
            console.error('Username or room name is empty.');
        }
    };

    // Leave room button functionality
    document.getElementById('leaveRoomButton').addEventListener('click', () => {
        const usernameInput = document.getElementById('usernameInput');
        const roomTitle = document.getElementById('roomTitle');

        if (!usernameInput || !roomTitle) {
            console.error('Username or room title element not found.');
            return;
        }

        const username = usernameInput.value.trim();
        const roomName = roomTitle.textContent.replace('Room: ', '').trim();

        if (username && roomName) {
            socket.emit('leaveRoom', { username, roomName });
        } else {
            console.error('Username or room name is empty.');
        }
    });

    // Send message functionality
    document.getElementById('sendMessageButton').addEventListener('click', () => {
        const messageInput = document.getElementById('messageInput');
        const usernameInput = document.getElementById('usernameInput');
        const roomTitle = document.getElementById('roomTitle');

        if (!messageInput || !usernameInput || !roomTitle) {
            console.error('Message input, username, or room title element not found.');
            return;
        }

        const message = messageInput.value.trim();
        const username = usernameInput.value.trim();
        const roomName = roomTitle.textContent.replace('Room: ', '').trim();

        if (message) {
            socket.emit('sendMessage', { roomName, username, message });
            messageInput.value = ''; // Clear the input
        } else {
            console.error('Message input is empty.');
        }
    });

    // Listen for chat messages
    socket.on('receiveMessage', (data) => {
        const messages = document.getElementById('messages');
        if (!messages) {
            console.error('Messages element not found.');
            return;
        }

        const messageElement = document.createElement('div');
        messageElement.textContent = `${data.username}: ${data.message}`;
        messages.appendChild(messageElement);
        messages.scrollTop = messages.scrollHeight; // Scroll to the bottom
    });

    // Listen for suggested room name
    socket.on('suggestRoomName', (suggestedRoomName) => {
        showRoomNamePrompt(suggestedRoomName);
    });
});
