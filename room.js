// DOM Elements
let videoContainer;
let roomDetails;
let chatMessages;
let chatInput;
let participantList;
let videoControls;
let player;

// Room data
let roomId;
let roomData;
let currentUser;
let isHost = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Get room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get('id');
    
    if (!roomId) {
        showError('Không tìm thấy phòng!');
        return;
    }
    
    // Initialize room
    initRoom();
});

// Initialize Room
async function initRoom() {
    try {
        // Get room data
        const roomSnapshot = await database.ref(`rooms/${roomId}`).once('value');
        roomData = roomSnapshot.val();
        
        if (!roomData) {
            showError('Phòng không tồn tại!');
            return;
        }
        
        // Check if user is authenticated
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                
                // Check if user is the host
                isHost = roomData.host.uid === user.uid;
                
                // Check if room requires ticket
                if (roomData.requiresTicket && !isHost) {
                    // Check if user has a ticket
                    const participantSnapshot = await database.ref(`rooms/${roomId}/participants/${user.uid}`).once('value');
                    const participantData = participantSnapshot.val();
                    
                    if (!participantData || !participantData.hasTicket) {
                        // Check if user has a pending ticket request
                        const ticketRequestSnapshot = await database.ref(`rooms/${roomId}/ticketRequests/${user.uid}`).once('value');
                        const ticketRequestData = ticketRequestSnapshot.val();
                        
                        if (!ticketRequestData) {
                            // Redirect to home page
                            window.location.href = 'index.html';
                            return;
                        } else if (ticketRequestData.status === 'pending') {
                            showError('Yêu cầu vé của bạn đang chờ xử lý. Vui lòng đợi chủ phòng phê duyệt.');
                            return;
                        } else if (ticketRequestData.status === 'rejected') {
                            showError('Yêu cầu vé của bạn đã bị từ chối.');
                            return;
                        }
                    }
                }
                
                // Set up room
                setupRoom();
                
                // Join room
                joinRoom();
            } else {
                // Redirect to login
                window.location.href = 'index.html';
            }
        });
    } catch (error) {
        console.error('Init room error:', error);
        showError(`Lỗi khởi tạo phòng: ${error.message}`);
    }
}

// Setup Room
function setupRoom() {
    // Create room layout
    const main = document.querySelector('main');
    main.innerHTML = `
        <div class="room-page">
            <div class="video-container">
                <div id="player"></div>
                <div class="participants-counter">
                    <i class="fas fa-users"></i> <span id="participantsCount">1</span>
                </div>
                <div class="video-controls">
                    <div class="control-buttons">
                        <button class="control-btn" id="playPauseBtn" title="Play/Pause">
                            <i class="fas fa-play"></i>
                        </button>
                        <div class="time-display">00:00 / 00:00</div>
                    </div>
                    <div class="host-controls">
                        ${isHost ? `
                            <button class="btn start-btn" id="startBtn">Bắt Đầu</button>
                            <button class="btn" id="changeVideoBtn">Đổi Video</button>
                            ${roomData.requiresTicket ? `
                                <button class="btn" id="ticketRequestsBtn">
                                    <i class="fas fa-ticket-alt"></i> Yêu Cầu Vé
                                    <span class="ticket-badge" id="ticketBadge">0</span>
                                </button>
                            ` : ''}
                            <button class="btn delete-btn" id="deleteRoomBtn">Xóa Phòng</button>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="room-sidebar">
                <div class="room-details">
                    <h2>${roomData.name}</h2>
                    <p>${roomData.description}</p>
                    <div class="host-info">
                        <img src="${roomData.host.photoURL}" alt="${roomData.host.displayName}">
                        <div>
                            <span>${roomData.host.displayName}</span>
                            <span class="host-badge">Chủ phòng</span>
                        </div>
                    </div>
                    ${roomData.requiresTicket ? `<div class="ticket-info"><i class="fas fa-ticket-alt"></i> Phòng yêu cầu vé để vào</div>` : ''}
                </div>
                <div class="chat-container">
                    <div class="chat-messages" id="chatMessages"></div>
                    <div class="chat-input">
                        <input type="text" id="messageInput" placeholder="Nhập tin nhắn...">
                        <button id="sendMessageBtn"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
                <div class="participants">
                    <h3>Người Xem</h3>
                    <div class="participant-list" id="participantList"></div>
                </div>
            </div>
        </div>
    `;
    
    // Get DOM elements
    videoContainer = document.querySelector('.video-container');
    roomDetails = document.querySelector('.room-details');
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.querySelector('.chat-input');
    participantList = document.getElementById('participantList');
    videoControls = document.querySelector('.video-controls');
    
    // Add event listeners
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Add host control event listeners
    if (isHost) {
        const startBtn = document.getElementById('startBtn');
        const changeVideoBtn = document.getElementById('changeVideoBtn');
        const deleteRoomBtn = document.getElementById('deleteRoomBtn');
        
        startBtn.addEventListener('click', startVideo);
        changeVideoBtn.addEventListener('click', () => openModal(document.getElementById('changeVideoModal')));
        deleteRoomBtn.addEventListener('click', deleteRoom);
        
        // Add ticket requests button event listener
        if (roomData.requiresTicket) {
            const ticketRequestsBtn = document.getElementById('ticketRequestsBtn');
            ticketRequestsBtn.addEventListener('click', openTicketRequestsModal);
        }
        
        // Initialize change video form
        const changeVideoForm = document.getElementById('changeVideoForm');
        changeVideoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            changeVideo();
        });
    }
    
    // Initialize YouTube player
    loadYouTubeAPI();
    
    // Listen for room updates
    listenForRoomUpdates();
    
    // Listen for chat messages
    listenForChatMessages();
    
    // Listen for participants
    listenForParticipants();
    
    // Listen for ticket requests if host
    if (isHost && roomData.requiresTicket) {
        listenForTicketRequests();
    }
}

// Join Room
async function joinRoom() {
    try {
        // Get user data
        const userData = await getCurrentUserData();
        
        // Add user to participants
        await database.ref(`rooms/${roomId}/participants/${currentUser.uid}`).update({
            uid: currentUser.uid,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            isHost: isHost,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            hasTicket: isHost ? true : (roomData.participants && roomData.participants[currentUser.uid] ? 
                     roomData.participants[currentUser.uid].hasTicket : false)
        });
        
        // Add system message
        await database.ref(`rooms/${roomId}/messages`).push({
            type: 'system',
            content: `${userData.displayName} đã tham gia phòng.`,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error('Join room error:', error);
        showNotification(`Lỗi tham gia phòng: ${error.message}`, 'error');
    }
}

// Listen for Room Updates
function listenForRoomUpdates() {
    const roomRef = database.ref(`rooms/${roomId}`);
    
    roomRef.on('value', (snapshot) => {
        roomData = snapshot.val();
        
        if (!roomData) {
            showError('Phòng đã bị xóa!');
            return;
        }
        
        // Update room status
        if (roomData.status === 'playing' && player) {
            // Start video if not already playing
            if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                player.playVideo();
            }
        } else if (roomData.status === 'paused' && player) {
            // Pause video if not already paused
            if (player.getPlayerState() !== YT.PlayerState.PAUSED) {
                player.pauseVideo();
            }
        }
        
        // Update video if changed
        if (player && player.getVideoData().video_id !== roomData.videoId) {
            player.loadVideoById(roomData.videoId);
        }
        
        // Sync video time if host updated it
        if (roomData.currentTime && !isHost && player) {
            const currentPlayerTime = player.getCurrentTime();
            // Only seek if the difference is more than 3 seconds
            if (Math.abs(currentPlayerTime - roomData.currentTime) > 3) {
                player.seekTo(roomData.currentTime);
            }
        }
    });
}

// Listen for Chat Messages
function listenForChatMessages() {
    const messagesRef = database.ref(`rooms/${roomId}/messages`);
    
    messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        addMessageToChat(message);
    });
}

// Listen for Participants
function listenForParticipants() {
    const participantsRef = database.ref(`rooms/${roomId}/participants`);
    
    participantsRef.on('value', (snapshot) => {
        const participants = snapshot.val() || {};
        updateParticipantsList(participants);
    });
}

// Listen for Ticket Requests
function listenForTicketRequests() {
    const ticketRequestsRef = database.ref(`rooms/${roomId}/ticketRequests`);
    
    ticketRequestsRef.on('value', (snapshot) => {
        const ticketRequests = snapshot.val() || {};
        updateTicketRequestsBadge(ticketRequests);
    });
}

// Update Ticket Requests Badge
function updateTicketRequestsBadge(ticketRequests) {
    const ticketBadge = document.getElementById('ticketBadge');
    if (!ticketBadge) return;
    
    // Count pending requests
    const pendingRequests = Object.values(ticketRequests).filter(request => request.status === 'pending');
    const count = pendingRequests.length;
    
    ticketBadge.textContent = count;
    ticketBadge.style.display = count > 0 ? 'inline-block' : 'none';
}

// Open Ticket Requests Modal
function openTicketRequestsModal() {
    const modal = document.getElementById('ticketRequestsModal');
    const ticketRequestsList = document.getElementById('ticketRequestsList');
    
    // Clear previous requests
    ticketRequestsList.innerHTML = '<div class="loading">Đang tải yêu cầu vé...</div>';
    
    // Get ticket requests
    database.ref(`rooms/${roomId}/ticketRequests`).once('value', (snapshot) => {
        const ticketRequests = snapshot.val() || {};
        
        // Clear loading
        ticketRequestsList.innerHTML = '';
        
        // Check if there are any requests
        if (Object.keys(ticketRequests).length === 0) {
            ticketRequestsList.innerHTML = '<p>Không có yêu cầu vé nào.</p>';
            return;
        }
        
        // Sort requests by timestamp (newest first)
        const sortedRequests = Object.values(ticketRequests).sort((a, b) => b.requestedAt - a.requestedAt);
        
        // Render requests
        sortedRequests.forEach(request => {
            const requestElement = document.createElement('div');
            requestElement.className = `ticket-request ${request.status}`;
            requestElement.innerHTML = `
                <div class="request-user">
                    <img src="${request.photoURL}" alt="${request.displayName}">
                    <div>
                        <span class="name">${request.displayName}</span>
                        <span class="time">${formatTimeAgo(request.requestedAt)}</span>
                    </div>
                </div>
                <div class="request-status">
                    ${request.status === 'pending' ? `
                        <button class="btn btn-small approve-btn" data-uid="${request.uid}">Cấp Vé</button>
                        <button class="btn btn-small reject-btn" data-uid="${request.uid}">Từ Chối</button>
                    ` : `
                        <span class="status-badge ${request.status}">
                            ${request.status === 'approved' ? 'Đã cấp vé' : 'Đã từ chối'}
                        </span>
                    `}
                </div>
            `;
            
            ticketRequestsList.appendChild(requestElement);
            
            // Add event listeners for approve/reject buttons
            if (request.status === 'pending') {
                const approveBtn = requestElement.querySelector('.approve-btn');
                const rejectBtn = requestElement.querySelector('.reject-btn');
                
                approveBtn.addEventListener('click', () => approveTicketRequest(request.uid));
                rejectBtn.addEventListener('click', () => rejectTicketRequest(request.uid));
            }
        });
    });
    
    // Show modal
    modal.style.display = 'block';
}

// Approve Ticket Request
async function approveTicketRequest(uid) {
    try {
        // Update ticket request status
        await database.ref(`rooms/${roomId}/ticketRequests/${uid}`).update({
            status: 'approved',
            approvedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Add user to participants with ticket
        await database.ref(`rooms/${roomId}/participants/${uid}`).update({
            hasTicket: true
        });
        
        // Add system message
        const userSnapshot = await database.ref(`users/${uid}`).once('value');
        const userData = userSnapshot.val();
        
        await database.ref(`rooms/${roomId}/messages`).push({
            type: 'system',
            content: `${userData.displayName} đã được cấp vé vào phòng.`,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        showNotification('Đã cấp vé thành công!', 'success');
    } catch (error) {
        console.error('Approve ticket request error:', error);
        showNotification(`Lỗi cấp vé: ${error.message}`, 'error');
    }
}

// Reject Ticket Request
async function rejectTicketRequest(uid) {
    try {
        // Update ticket request status
        await database.ref(`rooms/${roomId}/ticketRequests/${uid}`).update({
            status: 'rejected',
            rejectedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        showNotification('Đã từ chối yêu cầu vé!', 'success');
    } catch (error) {
        console.error('Reject ticket request error:', error);
        showNotification(`Lỗi từ chối vé: ${error.message}`, 'error');
    }
}

// Add Message to Chat
function addMessageToChat(message) {
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    
    if (message.type === 'system') {
        messageElement.className = 'system-message';
        messageElement.textContent = message.content;
    } else {
        const isOwnMessage = message.uid === currentUser.uid;
        
        messageElement.className = `message ${isOwnMessage ? 'own' : ''}`;
        messageElement.innerHTML = `
            <div class="message-info">
                <img src="${message.photoURL}" alt="${message.displayName}">
                <span class="name">${message.displayName}</span>
                <span class="time">${formatTimestamp(message.timestamp)}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update Participants List
function updateParticipantsList(participants) {
    if (!participantList) return;
    
    // Clear participants list
    participantList.innerHTML = '';
    
    // Update participants count
    const participantsCount = document.getElementById('participantsCount');
    if (participantsCount) {
        participantsCount.textContent = Object.keys(participants).length;
    }
    
    // Add participants to list
    Object.values(participants).forEach(participant => {
        const participantElement = document.createElement('div');
        participantElement.className = 'participant';
        participantElement.innerHTML = `
            <img src="${participant.photoURL}" alt="${participant.displayName}">
            <span class="name">${participant.displayName}</span>
            ${participant.isHost ? '<span class="host-badge">Chủ phòng</span>' : ''}
            ${participant.hasTicket && !participant.isHost ? '<span class="ticket-badge"><i class="fas fa-ticket-alt"></i></span>' : ''}
        `;
        
        participantList.appendChild(participantElement);
    });
}

// Send Message
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    try {
        // Get user data
        const userData = await getCurrentUserData();
        
        // Add message to database
        await database.ref(`rooms/${roomId}/messages`).push({
            uid: currentUser.uid,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            content: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Clear input
        messageInput.value = '';
    } catch (error) {
        console.error('Send message error:', error);
        showNotification(`Lỗi gửi tin nhắn: ${error.message}`, 'error');
    }
}

// Start Video
async function startVideo() {
    if (!isHost) return;
    
    try {
        // Update room status
        await database.ref(`rooms/${roomId}`).update({
            status: 'playing'
        });
        
        // Add system message
        await database.ref(`rooms/${roomId}/messages`).push({
            type: 'system',
            content: 'Phim đã bắt đầu.',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Update button
        const startBtn = document.getElementById('startBtn');
        startBtn.textContent = 'Đang Phát';
        startBtn.disabled = true;
    } catch (error) {
        console.error('Start video error:', error);
        showNotification(`Lỗi bắt đầu video: ${error.message}`, 'error');
    }
}

// Change Video
async function changeVideo() {
    if (!isHost) return;
    
    const newVideoUrl = document.getElementById('newVideoUrl').value;
    const videoId = extractVideoId(newVideoUrl);
    
    if (!videoId) {
        showNotification('URL video không hợp lệ!', 'error');
        return;
    }
    
    try {
        // Update room video
        await database.ref(`rooms/${roomId}`).update({
            videoId: videoId,
            status: 'waiting'
        });
        
        // Add system message
        await database.ref(`rooms/${roomId}/messages`).push({
            type: 'system',
            content: 'Video đã được thay đổi.',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Close modal
        document.getElementById('changeVideoModal').style.display = 'none';
        
        // Reset form
        document.getElementById('changeVideoForm').reset();
        
        // Update button
        const startBtn = document.getElementById('startBtn');
        startBtn.textContent = 'Bắt Đầu';
        startBtn.disabled = false;
        
        showNotification('Video đã được thay đổi!', 'success');
    } catch (error) {
        console.error('Change video error:', error);
        showNotification(`Lỗi thay đổi video: ${error.message}`, 'error');
    }
}

// Delete Room
async function deleteRoom() {
    if (!isHost) return;
    
    if (!confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
    
    try {
        // Delete room
        await database.ref(`rooms/${roomId}`).remove();
        
        // Redirect to home
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Delete room error:', error);
        showNotification(`Lỗi xóa phòng: ${error.message}`, 'error');
    }
}

// Load YouTube API
function loadYouTubeAPI() {
    // Create script element
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    
    // Insert script before first script tag
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    // Set up YouTube player when API is ready
    window.onYouTubeIframeAPIReady = () => {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: roomData.videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'disablekb': 1,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    };
}

// YouTube Player Ready Event
function onPlayerReady(event) {
    // Update play/pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    playPauseBtn.addEventListener('click', () => {
        if (isHost) {
            if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                // Update room status
                database.ref(`rooms/${roomId}`).update({
                    status: 'paused'
                });
                player.pauseVideo();
            } else {
                // Update room status
                database.ref(`rooms/${roomId}`).update({
                    status: 'playing'
                });
                player.playVideo();
            }
        } else {
            showNotification('Chỉ chủ phòng mới có thể điều khiển video!', 'error');
        }
    });
    
    // Update time display
    setInterval(updateTimeDisplay, 1000);
}

// YouTube Player State Change Event
function onPlayerStateChange(event) {
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    if (event.data === YT.PlayerState.PLAYING) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        // If not host and room status is paused, pause the video
        if (!isHost && roomData.status === 'paused') {
            player.pauseVideo();
            showNotification('Chỉ chủ phòng mới có thể điều khiển video!', 'error');
            return;
        }
        
        // If host, update room status
        if (isHost) {
            database.ref(`rooms/${roomId}`).update({
                status: 'playing',
                currentTime: player.getCurrentTime()
            });
        }
    } else if (event.data === YT.PlayerState.PAUSED) {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        
        // If not host and room status is playing, resume the video
        if (!isHost && roomData.status === 'playing') {
            player.playVideo();
            showNotification('Chỉ chủ phòng mới có thể điều khiển video!', 'error');
            return;
        }
        
        // If host, update room status
        if (isHost) {
            database.ref(`rooms/${roomId}`).update({
                status: 'paused',
                currentTime: player.getCurrentTime()
            });
        }
    }
}

// Update Time Display
function updateTimeDisplay() {
    if (!player) return;
    
    const timeDisplay = document.querySelector('.time-display');
    if (!timeDisplay) return;
    
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    
    // If host, update current time in database every 5 seconds
    if (isHost && player.getPlayerState() === YT.PlayerState.PLAYING) {
        const now = Math.floor(Date.now() / 1000);
        // Update every 5 seconds to avoid excessive database writes
        if (!window.lastTimeUpdate || now - window.lastTimeUpdate >= 5) {
            database.ref(`rooms/${roomId}`).update({
                currentTime: currentTime
            });
            window.lastTimeUpdate = now;
        }
    }
}

// Format Time (seconds to MM:SS)
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Format Time Ago
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    // Convert to seconds, minutes, hours, days
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} ngày trước`;
    } else if (hours > 0) {
        return `${hours} giờ trước`;
    } else if (minutes > 0) {
        return `${minutes} phút trước`;
    } else {
        return 'Vừa xong';
    }
}

// Helper function to extract YouTube video ID from URL
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Show Error
function showError(message) {
    const main = document.querySelector('main');
    main.innerHTML = `
        <div class="error-container">
            <h2>Lỗi</h2>
            <p>${message}</p>
            <a href="index.html" class="btn btn-primary">Quay Lại Trang Chủ</a>
        </div>
    `;
}

// Note: Using showNotification function from auth.js

// Helper function to open modal
function openModal(modal) {
    // Close all modals first
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
    });
    
    // Open the requested modal
    modal.style.display = 'block';
}