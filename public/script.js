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
                username = 'You'; // Change username to "You"
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
        const currentUser = document.getElementById('usernameInput').value.trim();
        if (participantsList) {
            participantsList.innerHTML = '';
            participants.forEach(participant => {
                const participantItem = document.createElement('li');
                participantItem.textContent = participant;
                if (participant === currentUser) {
                    participantItem.innerHTML = `${participant}<span class="you-label">(you)</span>`;
                }
                participantsList.appendChild(participantItem);
            });
        }
    }


    document.addEventListener('DOMContentLoaded', () => {
        const socket = io(); // Initialize Socket.IO client

        // Function to update the available rooms list
        function updateRoomList(rooms) {
            const roomListContainer = document.getElementById('roomList');

            if (roomListContainer) {
                roomListContainer.innerHTML = ''; // Clear existing list
                rooms.forEach(room => {
                    const roomElement = document.createElement('div');
                    roomElement.classList.add('room-item');

                    const roomNameElement = document.createElement('span');
                    roomNameElement.textContent = room;
                    roomElement.appendChild(roomNameElement);

                    const joinButton = document.createElement('button');
                    joinButton.textContent = 'Join';
                    joinButton.onclick = () => {
                        const username = document.getElementById('usernameInput').value.trim();
                        if (username) {
                            socket.emit('joinRoom', { username, roomName: room });
                        }
                    };
                    roomElement.appendChild(joinButton);

                    roomListContainer.appendChild(roomElement);
                });
            }
        }

        // Fetch and update available rooms on load
        socket.emit('fetchAvailableRooms');

        // Listen for the availableRooms event from the server
        socket.on('availableRooms', (rooms) => {
            updateRoomList(rooms);
        });

        // Handle user leaving a room
        socket.on('roomLeft', (data) => {
            const { participants, username } = data;
            updateParticipants(participants);
            document.getElementById('status').textContent = username === document.getElementById('usernameInput').value.trim() ?
                'You left the room.' : `${username} left the room.`;

            if (username === document.getElementById('usernameInput').value.trim()) {
                toggleRoomForm(true);

                // Show the available rooms when leaving the room
                const roomListContainer = document.getElementById('roomListContainer');
                if (roomListContainer) {
                    roomListContainer.style.display = 'block';
                }

                // Fetch available rooms again
                socket.emit('requestAvailableRooms');
            }
        });


        // Join room button click handler
        document.getElementById('joinRoomButton').onclick = () => {
            const username = document.getElementById('usernameInput').value.trim();
            const roomName = document.getElementById('roomNameInput').value.trim();
            if (username && roomName) {
                socket.emit('joinRoom', { username, roomName });
            } else {
                showAlert('Enter your nickname and room name');
            }
        };

        // Leave room button click handler
        document.getElementById('leaveRoomButton').addEventListener('click', () => {
            const username = document.getElementById('usernameInput').value.trim();
            const roomName = document.getElementById('roomTitle').textContent.replace('Room: ', '').trim();
            if (username && roomName) {
                socket.emit('leaveRoom', { username, roomName });
                // Optionally hide room information and show the room list container
                document.getElementById('roomInfo').style.display = 'none';
            }
        });
    });


    socket.on('updateRoomList', (rooms) => {
        updateRoomList(rooms);
    });

    socket.on('createRoom', ({ username, roomName }) => {
        if (!existingRoomNames.includes(roomName)) {
            existingRoomNames.push(roomName);
        }

        // Hide the available rooms when a room is created
        const roomListContainer = document.getElementById('roomListContainer');
        if (roomListContainer) {
            roomListContainer.style.display = 'none';
        }

        toggleRoomForm(false); // Hide the roomForm
        document.getElementById('roomTitle').textContent = `Room: ${roomName}`;
    });


    document.getElementById('createRoomButton').onclick = () => {
        const username = document.getElementById('usernameInput').value.trim();
        const roomName = document.getElementById('roomNameInput').value.trim();
        if (username && roomName) {
            socket.emit('createRoom', { username, roomName });
            console.log('Creating room:', roomName); // Debugging line
        } else {
            showAlert('Enter your nickname and room name'); // Show an alert if nickname or room name is missing
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

        // Hide the available rooms when a room is created
        const roomListContainer = document.getElementById('roomListContainer');
        if (roomListContainer) {
            roomListContainer.style.display = 'none';
        }

        // Ensure the available rooms list is updated
        const roomList = document.getElementById('roomList');
        if (roomList) {
            roomList.innerHTML = ''; // Clear the list to avoid duplication
        }
    });


    socket.on('roomNotFound', (roomName) => {
        showAlert(`Room "${roomName}" does not exist.`);
    });

    // Add this handler for the 'roomJoined' event
    socket.on('roomJoined', (data) => {
        updateParticipants(data.participants);
        toggleRoomForm(false); // Hide the roomForm
        document.getElementById('roomInfo').style.display = 'block'; // Show the roomInfo
        document.getElementById('roomTitle').textContent = `Room: ${data.roomName}`;

        // Hide the available rooms when a room is joined
        const roomListContainer = document.getElementById('roomListContainer');
        if (roomListContainer) {
            roomListContainer.style.display = 'none';
        }
    });

    socket.on('usernameTaken', ({ username }) => {
        console.log(`Received usernameTaken event for "${username}"`);
        showAlert(`Username "${username}" is already taken in this room.`);
    });

    socket.on('roomLeft', (data) => {
        const { participants, username } = data;
        updateParticipants(participants);
        document.getElementById('status').textContent = username === document.getElementById('usernameInput').value.trim() ?
            'You left the room.' : `${username} left the room.`;

        if (username === document.getElementById('usernameInput').value.trim()) {
            toggleRoomForm(true);

            // Show the available rooms when leaving the room
            const roomListContainer = document.getElementById('roomListContainer');
            if (roomListContainer) {
                roomListContainer.style.display = 'block';
            }

            // Fetch available rooms again
            socket.emit('fetchAvailableRooms');
        }
    });

    // Remove this
    socket.on('fetchAvailableRooms', () => {
        socket.emit('availableRooms', Object.keys(rooms));
    });



    const roomListContainer = document.getElementById('roomListContainer');
    if (roomListContainer) {
        roomListContainer.style.display = 'block';
    }


    socket.on('updateParticipants', (participants) => {
        updateParticipants(participants);
    });

    document.getElementById('leaveRoomButton').addEventListener('click', () => {
        const username = document.getElementById('usernameInput').value.trim();
        const roomName = document.getElementById('roomTitle').textContent.replace('Room: ', '').trim();

        if (username && roomName) {
            // Emit leaveRoom event
            socket.emit('leaveRoom', { username, roomName });

            // Wait for the server to acknowledge that the room has been left
            socket.once('roomLeftAcknowledged', () => {
                // Refresh the page after successful leave
                location.reload();
            });

            // Optionally handle cases where the server does not respond
            setTimeout(() => {
                console.error('No response from server, refreshing the page.');
                location.reload();
            }, 100); // Timeout after 5 seconds
        } else {
            console.error('Username or room name is missing.');
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
            // Validate file type (e.g., image/png, image/jpeg)
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                console.error('Invalid file type. Please upload an image.');
                return;
            }

            // Validate file size (e.g., max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                console.error('File size exceeds the maximum limit of 5MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const photoDataURL = reader.result;
                // Ensure that the photo data URL is valid
                if (photoDataURL) {
                    socket.emit('sendPhoto', { roomName, username, photo: photoDataURL });
                } else {
                    console.error('Failed to read file.');
                }
            };
            reader.onerror = () => {
                console.error('Error reading file.');
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

    window.addEventListener('beforeunload', () => {
        const username = document.getElementById('usernameInput').value.trim();
        const roomName = document.getElementById('roomTitle').textContent.replace('Room: ', '').trim();
        if (username && roomName) {
            socket.emit('leaveRoom', { username, roomName });
        }
    });

    // Listen for the availableRooms event
    socket.on('availableRooms', (rooms) => {
        const roomListContainer = document.getElementById('roomList');
        roomListContainer.innerHTML = ''; // Clear the existing list
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.classList.add('room-item');

            const roomNameElement = document.createElement('span');
            roomNameElement.textContent = room;
            roomElement.appendChild(roomNameElement);

            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join';
            joinButton.onclick = () => {
                const username = document.getElementById('usernameInput').value.trim();
                if (username) {
                    socket.emit('joinRoom', { username, roomName: room });
                }
            };
            roomElement.appendChild(joinButton);

            roomListContainer.appendChild(roomElement);
        });
    });

    document.getElementById('roomList').addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            const roomName = event.target.previousSibling.textContent.trim();
            const username = document.getElementById('usernameInput').value.trim();

            if (username) {
                socket.emit('joinRoom', { username, roomName });
            } else {
                showAlert(`Please enter your nickname before joining a room.`);
            }
        }
    });

    // Function to show the modal with a message
    function showModal(message) {
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('modal').style.display = 'flex';
    }

    // Function to hide the modal
    function hideModal() {
        document.getElementById('modal').style.display = 'none';
    }

    // Event listener to close the modal
    document.getElementById('modalClose').addEventListener('click', hideModal);

    // Example usage in your existing code
    document.getElementById('joinRoomButton').onclick = () => {
        const username = document.getElementById('usernameInput').value.trim();
        const roomName = document.getElementById('roomNameInput').value.trim();
        if (username && roomName) {
            socket.emit('joinRoom', { username, roomName });
        } else {
            showAlert('Enter your nickname and room name'); // Show an alert if nickname or room name is missing
        }
    };

    function showAlert(message) {
        const alertElement = document.createElement('div');
        alertElement.className = 'alert';
        alertElement.textContent = message;

        // Add styling for the alert box
        alertElement.style.position = 'fixed';
        alertElement.style.bottom = '10px';
        alertElement.style.right = '10px';
        alertElement.style.padding = '10px';
        alertElement.style.backgroundColor = '#f8d7da';
        alertElement.style.color = '#721c24';
        alertElement.style.border = '1px solid #f5c6cb';
        alertElement.style.borderRadius = '4px';

        document.body.appendChild(alertElement);

        // Remove the alert after 3 seconds
        setTimeout(() => {
            alertElement.remove();
        }, 3000);
    }

    checkElements(); // Call function to check elements' existence
});
