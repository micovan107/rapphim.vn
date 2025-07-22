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
let playerType; // 'youtube' or 'cloudinary'

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Get room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get('id');
    
    if (!roomId) {
        showError('Không tìm thấy phòng!');
        return;
    }
    
    // Check for saved theme preference and apply it
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Initialize room
    initRoom();
    
    // Thêm xử lý sự kiện cảm ứng cho thiết bị di động
    setupTouchEvents();
    
    // Add resize event listener to reposition video overlay
    window.addEventListener('resize', positionVideoOverlay);
    
    // Add keyboard shortcuts for video seeking (host only)
    document.addEventListener('keydown', handleKeyboardShortcuts);
});

// Initialize Room
async function initRoom() {
    try {
        // Kiểm tra và cập nhật nhiệm vụ hàng ngày
        checkDailyTask();
        
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
                        // Check if this is an auto ticket room
                        if (roomData.ticketType === 'auto' && roomData.ticketPrice > 0) {
                            // Get user data to check mini coins using the helper function
                            const userData = await getCurrentUserData();
                            
                            if (!userData) {
                                showError('Không tìm thấy thông tin người dùng.');
                                window.location.href = 'index.html';
                                return;
                            }
                            
                            const miniCoins = userData.miniCoins;
                            
                            // Check if user has enough mini coins
                            if (Number(miniCoins) < Number(roomData.ticketPrice)) {
                                showError(`Bạn không đủ Mini Coin để mua vé. Bạn có ${miniCoins} Mini Coin, cần ${roomData.ticketPrice} Mini Coin.`);
                                window.location.href = 'index.html';
                                return;
                            }
                            
                            // Ask for confirmation
                            if (confirm(`Bạn có muốn mua vé tự động với giá ${roomData.ticketPrice} Mini Coin không? (Bạn hiện có ${miniCoins} Mini Coin)`)) {
                                // Deduct mini coins from user
                                const newMiniCoins = miniCoins - roomData.ticketPrice;
                                await database.ref(`users/${user.uid}/miniCoins`).set(newMiniCoins);
                                
                                // Add user to room participants with ticket
                                await database.ref(`rooms/${roomId}/participants/${user.uid}`).set({
                                    uid: user.uid,
                                    displayName: userData.displayName,
                                    photoURL: userData.photoURL,
                                    isHost: false,
                                    hasTicket: true,
                                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                                });
                                
                                // Add system message to room chat
                                const roomChatRef = database.ref(`roomChats/${roomId}`);
                                await roomChatRef.push({
                                    type: 'system',
                                    message: `${userData.displayName} đã mua vé và tham gia phòng.`,
                                    timestamp: firebase.database.ServerValue.TIMESTAMP
                                });
                                
                                showNotification(`Đã mua vé thành công với giá ${roomData.ticketPrice} Mini Coin.`, 'success');
                            } else {
                                // User canceled
                                window.location.href = 'index.html';
                                return;
                            }
                        } else {
                            // For manual tickets
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
                <div class="video-overlay"></div>
                <div class="participants-counter">
                    <i class="fas fa-users"></i> <span id="participantsCount">1</span>
                </div>
                <div class="video-controls">
                    <div class="control-buttons">
                        ${isHost ? `
                        <button class="control-btn" id="rewindBtn" title="Tua lùi 10 giây">
                            <i class="fas fa-backward"></i>
                        </button>
                        ` : ''}
                        <button class="control-btn" id="playPauseBtn" title="Play/Pause">
                            <i class="fas fa-play"></i>
                        </button>
                        ${isHost ? `
                        <button class="control-btn" id="forwardBtn" title="Tua tới 10 giây">
                            <i class="fas fa-forward"></i>
                        </button>
                        ` : ''}
                        <button class="control-btn" id="fullscreenBtn" title="Toàn màn hình">
                            <i class="fas fa-expand"></i>
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
                            <button class="btn" id="keyboardShortcutsBtn" title="Phím tắt">
                                <i class="fas fa-keyboard"></i>
                            </button>
                            <button class="btn delete-btn" id="deleteRoomBtn">Xóa Phòng</button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="video-info">
                <h2>${roomData.name}</h2>
                <p>${roomData.description}</p>
                <div class="host-info">
                    <img src="${roomData.host.photoURL}" alt="${roomData.host.displayName}">
                    <div>
                        <span>${roomData.host.displayName}</span>
                        <span class="host-badge">Chủ phòng</span>
                    </div>
                </div>
                ${roomData.requiresTicket ? `
                    <div class="ticket-info">
                        <i class="fas fa-ticket-alt"></i> 
                        ${roomData.ticketType === 'auto' && roomData.ticketPrice > 0 ? 
                            `Vé tự động: <strong>${roomData.ticketPrice} Mini Coin</strong>` : 
                            'Phòng yêu cầu vé thủ công'}
                    </div>
                ` : ''}
            </div>
            
            <div class="room-sidebar">
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
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    // Add event listeners
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Add fullscreen button event listener
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Add fullscreenchange event listener
    document.addEventListener('fullscreenchange', updateFullscreenButtonState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButtonState);
    document.addEventListener('mozfullscreenchange', updateFullscreenButtonState);
    document.addEventListener('MSFullscreenChange', updateFullscreenButtonState);
    
    // Add host control event listeners
    if (isHost) {
        const startBtn = document.getElementById('startBtn');
        const changeVideoBtn = document.getElementById('changeVideoBtn');
        const deleteRoomBtn = document.getElementById('deleteRoomBtn');
        const keyboardShortcutsBtn = document.getElementById('keyboardShortcutsBtn');
        
        startBtn.addEventListener('click', startVideo);
        changeVideoBtn.addEventListener('click', () => openModal(document.getElementById('changeVideoModal')));
        deleteRoomBtn.addEventListener('click', deleteRoom);
        keyboardShortcutsBtn.addEventListener('click', showKeyboardShortcuts);
        
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
        // Hide YouTube watermark when room updates
        setTimeout(hideYouTubeWatermark, 1000);
        // Reposition video overlay
        setTimeout(positionVideoOverlay, 1000);
        roomData = snapshot.val();
        
        if (!roomData) {
            showError('Phòng đã bị xóa!');
            return;
        }
        
        // Update room status
        if (roomData.status === 'playing' && player) {
            if (playerType === 'cloudinary') {
                // For Cloudinary video
                if (player.paused) {
                    player.play();
                    updatePlayPauseButton(true);
                }
            } else {
                // For YouTube video
                if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                    player.playVideo();
                    updatePlayPauseButton(true);
                }
            }
        } else if (roomData.status === 'paused' && player) {
            if (playerType === 'cloudinary') {
                // For Cloudinary video
                if (!player.paused) {
                    player.pause();
                    updatePlayPauseButton(false);
                }
            } else {
                // For YouTube video
                if (player.getPlayerState() !== YT.PlayerState.PAUSED) {
                    player.pauseVideo();
                    updatePlayPauseButton(false);
                }
            }
        }
        
        // Update video if changed
        if (roomData.videoUrl && roomData.videoUrl.includes('cloudinary')) {
            // Handle Cloudinary video
            if (player && (!playerType || playerType !== 'cloudinary')) {
                // Remove YouTube player
                if (player) {
                    player.destroy();
                }
                
                // Create Cloudinary video player
                const playerContainer = document.getElementById('player');
                playerContainer.innerHTML = `
                    <video id="cloudinaryPlayer" controls style="width:100%;height:100%;">
                        <source src="${roomData.videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;
                
                player = document.getElementById('cloudinaryPlayer');
                playerType = 'cloudinary';
                
                // Add event listeners for Cloudinary video
                player.addEventListener('play', function() {
                    if (isHost) {
                        database.ref(`rooms/${roomId}`).update({
                            status: 'playing',
                            currentTime: player.currentTime
                        });
                    }
                    updatePlayPauseButton(true);
                });
                
                player.addEventListener('pause', function() {
                    if (isHost) {
                        database.ref(`rooms/${roomId}`).update({
                            status: 'paused',
                            currentTime: player.currentTime
                        });
                    }
                    updatePlayPauseButton(false);
                });
                
                player.addEventListener('timeupdate', function() {
                    if (isHost) {
                        // Update time every 5 seconds to avoid too many database writes
                        const currentTime = Math.floor(player.currentTime);
                        if (currentTime % 5 === 0 && currentTime !== lastTimeUpdate) {
                            lastTimeUpdate = currentTime;
                            database.ref(`rooms/${roomId}`).update({
                                currentTime: player.currentTime
                            });
                        }
                    }
                    
                    // Update time display
                    updateTimeDisplay(player.currentTime, player.duration);
                });
            }
        } else if (roomData.videoId) {
            // Handle YouTube video
            if (player && (!playerType || playerType !== 'youtube')) {
                // Remove Cloudinary player if exists
                if (playerType === 'cloudinary') {
                    const playerContainer = document.getElementById('player');
                    playerContainer.innerHTML = '';
                    loadYouTubeAPI(); // Reload YouTube player
                    return; // Exit function as loadYouTubeAPI will handle the rest
                }
            }
            
            if (player && player.getVideoData && player.getVideoData().video_id !== roomData.videoId) {
                player.loadVideoById(roomData.videoId);
                playerType = 'youtube';
            }
        }
        
        // Sync video time if host updated it
        if (roomData.currentTime && !isHost && player) {
            if (playerType === 'cloudinary') {
                // For Cloudinary video
                const currentPlayerTime = player.currentTime;
                // Only seek if the difference is more than 3 seconds
                if (Math.abs(currentPlayerTime - roomData.currentTime) > 3) {
                    player.currentTime = roomData.currentTime;
                }
            } else {
                // For YouTube video
                const currentPlayerTime = player.getCurrentTime();
                // Only seek if the difference is more than 3 seconds
                if (Math.abs(currentPlayerTime - roomData.currentTime) > 3) {
                    player.seekTo(roomData.currentTime);
                }
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
        
        // Không hiển thị nút tặng minicoin cho chính mình
        const isSelf = participant.uid === currentUser.uid;
        
        participantElement.innerHTML = `
            <img src="${participant.photoURL}" alt="${participant.displayName}">
            <span class="name">${participant.displayName}</span>
            ${participant.isHost ? '<span class="host-badge">Chủ phòng</span>' : ''}
            ${participant.hasTicket && !participant.isHost ? '<span class="ticket-badge"><i class="fas fa-ticket-alt"></i></span>' : ''}
            ${!isSelf ? '<button class="btn-small gift-coin-btn" title="Tặng MiniCoin"><i class="fas fa-coins"></i></button>' : ''}
        `;
        
        // Thêm sự kiện cho nút tặng minicoin
        const giftCoinBtn = participantElement.querySelector('.gift-coin-btn');
        if (giftCoinBtn) {
            giftCoinBtn.addEventListener('click', () => giftMiniCoin(participant.uid, participant.displayName));
        }
        
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

// Kiểm tra và cập nhật nhiệm vụ hàng ngày
async function checkDailyTask() {
    try {
        if (!currentUser) {
            // Đợi cho đến khi người dùng đăng nhập
            await new Promise(resolve => {
                const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                    if (user) {
                        currentUser = user;
                        unsubscribe();
                        resolve();
                    }
                });
            });
        }
        
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (!userDoc.exists) {
            console.log('Không tìm thấy thông tin người dùng!');
            return;
        }
        
        const userData = userDoc.data();
        const lastDailyTask = userData.lastDailyTask ? new Date(userData.lastDailyTask.toDate()) : null;
        const today = new Date();
        
        // Kiểm tra xem người dùng đã nhận thưởng hôm nay chưa
        if (!lastDailyTask || !isSameDay(lastDailyTask, today)) {
            // Cập nhật MiniCoin và thời gian nhận thưởng
            await db.collection('users').doc(currentUser.uid).update({
                miniCoins: firebase.firestore.FieldValue.increment(50),
                lastDailyTask: firebase.firestore.Timestamp.fromDate(today)
            });
            
            showNotification('Chúc mừng! Bạn đã nhận 50 MiniCoin từ nhiệm vụ hàng ngày!', 'success');
        }
    } catch (error) {
        console.error('Daily task error:', error);
    }
}

// Kiểm tra xem hai ngày có phải là cùng một ngày không
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Tặng MiniCoin cho người dùng khác
async function giftMiniCoin(recipientUid, recipientName) {
    console.log('=== BẮT ĐẦU QUÁ TRÌNH TẶNG MINICOIN ===');
    console.log('Người nhận:', recipientUid, recipientName);
    console.log('Người gửi:', currentUser.uid, currentUser.displayName);
    try {
        // Hiển thị hộp thoại để nhập số lượng coin muốn tặng
        const coinAmount = prompt(`Nhập số lượng MiniCoin bạn muốn tặng cho ${recipientName}:`, "5");
        
        // Kiểm tra nếu người dùng hủy hoặc không nhập gì
        if (coinAmount === null || coinAmount.trim() === "") {
            return;
        }
        
        // Chuyển đổi sang số và kiểm tra tính hợp lệ
        const amount = parseInt(coinAmount);
        if (isNaN(amount) || amount <= 0) {
            showNotification('Vui lòng nhập số lượng MiniCoin hợp lệ!', 'error');
            return;
        }
        
        // Lấy thông tin người dùng hiện tại
        const userData = await getCurrentUserData();
        
        if (!userData) {
            showNotification('Không tìm thấy thông tin người dùng!', 'error');
            return;
        }
        
        const currentMiniCoins = userData.miniCoins || 0;
        
        // Kiểm tra xem người dùng có đủ MiniCoin không
        if (currentMiniCoins < amount) {
            showNotification(`Bạn không đủ MiniCoin để tặng! Bạn có ${currentMiniCoins} MiniCoin.`, 'error');
            return;
        }
        
        // Thay vì sử dụng transaction, sử dụng update trực tiếp với giá trị đã kiểm tra
        console.log('Bắt đầu trừ MiniCoin từ người gửi:', currentUser.uid, 'Số dư hiện tại:', currentMiniCoins, 'Số lượng cần trừ:', amount);
        
        // Đã kiểm tra đủ coin ở trên, giờ trừ trực tiếp
        try {
            // Cập nhật số dư của người gửi
            await database.ref(`users/${currentUser.uid}/miniCoins`).set(currentMiniCoins - amount);
            console.log('Đã trừ thành công:', amount, 'MiniCoin từ người gửi. Số dư mới:', currentMiniCoins - amount);
            
            // Cập nhật số dư của người nhận
            // Lấy số dư hiện tại của người nhận
            const recipientSnapshot = await database.ref(`users/${recipientUid}/miniCoins`).get();
            const recipientCoins = recipientSnapshot.val() || 0;
            console.log('Số dư hiện tại của người nhận:', recipientCoins);
            
            // Cộng MiniCoin cho người nhận
            await database.ref(`users/${recipientUid}/miniCoins`).set(recipientCoins + amount);
            console.log('Đã cộng thành công:', amount, 'MiniCoin cho người nhận. Số dư mới:', recipientCoins + amount);
        } catch (error) {
            console.error('Lỗi khi cập nhật MiniCoin:', error);
            showNotification(`Lỗi khi cập nhật MiniCoin: ${error.message}`, 'error');
            return;
        }
        
        // Phần cộng MiniCoin cho người nhận đã được xử lý ở trên
        
        // Thêm thông báo vào phòng chat
        await database.ref(`rooms/${roomId}/messages`).push({
            type: 'system',
            content: `${currentUser.displayName} đã tặng ${amount} MiniCoin cho ${recipientName}!`,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Cập nhật số dư MiniCoin hiển thị trên giao diện
        console.log('Đang cập nhật giao diện với dữ liệu mới...');
        const newUserData = await getCurrentUserData();
        console.log('Dữ liệu người dùng mới:', newUserData);
        const miniCoinsElement = document.getElementById('miniCoins');
        console.log('Element miniCoins:', miniCoinsElement);
        if (miniCoinsElement && newUserData) {
            console.log('Cập nhật số dư hiển thị từ', miniCoinsElement.textContent, 'thành', newUserData.miniCoins || 0);
            miniCoinsElement.textContent = newUserData.miniCoins || 0;
        } else {
            console.log('Không thể cập nhật giao diện: miniCoinsElement hoặc newUserData không tồn tại');
        }
        
        showNotification(`Đã tặng ${amount} MiniCoin cho ${recipientName}!`, 'success');
    } catch (error) {
        console.error('Gift MiniCoin error:', error);
        showNotification(`Lỗi khi tặng MiniCoin: ${error.message}`, 'error');
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
    
    // Make sure to hide YouTube watermark when changing videos
    setTimeout(hideYouTubeWatermark, 1500);
    // Reposition video overlay
    setTimeout(positionVideoOverlay, 1500);
    
    // Ask user if they want to upload a video or use YouTube
    const choice = confirm('Bạn muốn tải lên video mới? Chọn OK để tải lên, hoặc Cancel để nhập URL YouTube');
    
    let videoId = null;
    let videoUrl = null;
    let videoPublicId = null;
    
    if (choice) {
        // Upload video to Cloudinary
        try {
            // Create and open Cloudinary upload widget
            const uploadWidget = cloudinary.createUploadWidget({
                cloudName: cloudinaryConfig.cloudName,
                uploadPreset: cloudinaryConfig.uploadPreset,
                folder: cloudinaryConfig.folder,
                sources: ['local', 'url', 'camera'],
                resourceType: 'video',
                multiple: false,
                maxFileSize: 100000000, // 100MB
                styles: {
                    palette: {
                        window: "#FFFFFF",
                        windowBorder: "#90A0B3",
                        tabIcon: "#0078FF",
                        menuIcons: "#5A616A",
                        textDark: "#000000",
                        textLight: "#FFFFFF",
                        link: "#0078FF",
                        action: "#FF620C",
                        inactiveTabIcon: "#0E2F5A",
                        error: "#F44235",
                        inProgress: "#0078FF",
                        complete: "#20B832",
                        sourceBg: "#E4EBF1"
                    }
                }
            }, (error, result) => {
                if (!error && result && result.event === "success") {
                    console.log('Upload success:', result.info);
                    // Use the Cloudinary URL
                    videoUrl = result.info.secure_url;
                    videoPublicId = result.info.public_id;
                    
                    // Update video in database
                    updateVideoInDatabase(null, videoUrl, videoPublicId);
                }
                if (error) {
                    console.error('Upload error:', error);
                    showNotification('Lỗi khi tải video lên!', 'error');
                }
            });
            
            uploadWidget.open();
            return; // Exit function as the widget callback will handle the update
        } catch (error) {
            console.error('Cloudinary widget error:', error);
            showNotification(`Lỗi mở widget tải lên: ${error.message}`, 'error');
            return;
        }
    } else {
        // Use YouTube URL
        const newVideoUrl = document.getElementById('newVideoUrl').value;
        videoId = extractVideoId(newVideoUrl);
        
        if (!videoId) {
            showNotification('URL video không hợp lệ!', 'error');
            return;
        }
        
        // Update video in database
        updateVideoInDatabase(videoId);
    }
}

// Helper function to update video in database
async function updateVideoInDatabase(videoId = null, videoUrl = null, videoPublicId = null) {
    try {
        const updateData = {
            status: 'waiting'
        };
        
        // Add appropriate video data
        if (videoId) {
            updateData.videoId = videoId;
        }
        
        if (videoUrl) {
            updateData.videoUrl = videoUrl;
        }
        
        if (videoPublicId) {
            updateData.videoPublicId = videoPublicId;
        }
        
        // Update room video
        await database.ref(`rooms/${roomId}`).update(updateData);
        
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
        // Check if room has a Cloudinary video to delete
        if (roomData.videoPublicId) {
            try {
                // Create a form to send to Cloudinary API for deletion
                const formData = new FormData();
                formData.append('public_id', roomData.videoPublicId);
                formData.append('api_key', '123456789012345'); // Thay thế bằng API key của bạn
                formData.append('timestamp', Math.round(new Date().getTime() / 1000));
                
                // Note: In a production environment, you should generate a secure signature on your server
                // For demo purposes, we're just showing the concept
                // formData.append('signature', signature);
                
                // Send deletion request to Cloudinary
                // In a real implementation, this should be done through a secure backend
                console.log('Deleting Cloudinary video:', roomData.videoPublicId);
                
                // For demo purposes, we'll just log the deletion
                // In production, you would use fetch or XMLHttpRequest to send the deletion request
                /*
                const response = await fetch('https://api.cloudinary.com/v1_1/' + cloudinaryConfig.cloudName + '/video/destroy', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                console.log('Cloudinary deletion response:', data);
                */
            } catch (cloudinaryError) {
                console.error('Error deleting Cloudinary video:', cloudinaryError);
                // Continue with room deletion even if video deletion fails
            }
        }
        
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
                'playsinline': 1, // Quan trọng cho iOS
                'controls': 0,
                'disablekb': 1,
                'rel': 0,
                'modestbranding': 1,
                'fs': 0, // Tắt nút toàn màn hình
                'iv_load_policy': 3 // Ẩn chú thích
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
    // Hide YouTube watermark and logo
    hideYouTubeWatermark();
    
    // Make sure video overlay is positioned correctly
    positionVideoOverlay();
    
    // Update play/pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    // Add event listeners for seek buttons if user is host
    if (isHost) {
        const rewindBtn = document.getElementById('rewindBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        
        if (rewindBtn) {
            rewindBtn.addEventListener('click', () => {
                if (playerType !== 'cloudinary') { // YouTube player
                    const currentTime = player.getCurrentTime();
                    const newTime = Math.max(0, currentTime - 10); // Tua lùi 10 giây, không nhỏ hơn 0
                    player.seekTo(newTime, true);
                    
                    // Cập nhật thời gian hiện tại lên database
                    database.ref(`rooms/${roomId}`).update({
                        currentTime: newTime
                    });
                    
                    // Hiển thị thông báo
                    showNotification('Đã tua lùi 10 giây', 'info');
                } else if (playerType === 'cloudinary') {
                    const currentTime = player.currentTime;
                    const newTime = Math.max(0, currentTime - 10);
                    player.currentTime = newTime;
                    
                    // Cập nhật thời gian hiện tại lên database
                    database.ref(`rooms/${roomId}`).update({
                        currentTime: newTime
                    });
                    
                    // Hiển thị thông báo
                    showNotification('Đã tua lùi 10 giây', 'info');
                }
            });
        }
        
        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => {
                if (playerType !== 'cloudinary') { // YouTube player
                    const currentTime = player.getCurrentTime();
                    const duration = player.getDuration();
                    const newTime = Math.min(duration, currentTime + 10); // Tua tới 10 giây, không vượt quá thời lượng
                    player.seekTo(newTime, true);
                    
                    // Cập nhật thời gian hiện tại lên database
                    database.ref(`rooms/${roomId}`).update({
                        currentTime: newTime
                    });
                    
                    // Hiển thị thông báo
                    showNotification('Đã tua tới 10 giây', 'info');
                } else if (playerType === 'cloudinary') {
                    const currentTime = player.currentTime;
                    const duration = player.duration;
                    const newTime = Math.min(duration, currentTime + 10);
                    player.currentTime = newTime;
                    
                    // Cập nhật thời gian hiện tại lên database
                    database.ref(`rooms/${roomId}`).update({
                        currentTime: newTime
                    });
                    
                    // Hiển thị thông báo
                    showNotification('Đã tua tới 10 giây', 'info');
                }
            });
        }
    }
    
    playPauseBtn.addEventListener('click', () => {
        if (isHost) {
            if (playerType === 'cloudinary') {
                // Cloudinary video player
                if (player.paused) {
                    // Update room status
                    database.ref(`rooms/${roomId}`).update({
                        status: 'playing',
                        currentTime: player.currentTime
                    });
                    player.play();
                } else {
                    // Update room status
                    database.ref(`rooms/${roomId}`).update({
                        status: 'paused',
                        currentTime: player.currentTime
                    });
                    player.pause();
                }
            } else {
                // YouTube player
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
            }
        } else {
            showNotification('Chỉ chủ phòng mới có thể điều khiển video!', 'error');
        }
    });
    
    // Update time display
    setInterval(updateTimeDisplay, 1000);
}

// Update Play/Pause Button
function updatePlayPauseButton(isPlaying) {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.innerHTML = isPlaying ? 
            '<i class="fas fa-pause"></i>' : 
            '<i class="fas fa-play"></i>';
    }
}

// YouTube Player State Change Event
function onPlayerStateChange(event) {
    // Hide YouTube watermark again when state changes
    hideYouTubeWatermark();
    
    if (event.data === YT.PlayerState.PLAYING) {
        updatePlayPauseButton(true);
        
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
        updatePlayPauseButton(false);
        
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
function updateTimeDisplay(currentTimeParam, durationParam) {
    if (!player) return;
    
    const timeDisplay = document.querySelector('.time-display');
    if (!timeDisplay) return;
    
    let currentTime, duration;
    
    if (playerType === 'cloudinary') {
        // Use parameters if provided (for Cloudinary player)
        currentTime = currentTimeParam !== undefined ? currentTimeParam : player.currentTime;
        duration = durationParam !== undefined ? durationParam : player.duration;
    } else {
        // YouTube player
        currentTime = player.getCurrentTime();
        duration = player.getDuration();
        
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
    
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

// Format Time (seconds to MM:SS)
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Thiết lập sự kiện cảm ứng cho thiết bị di động
function setupTouchEvents() {
    // Kiểm tra nếu đang sử dụng thiết bị di động
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        const playerElement = document.getElementById('player');
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        
        // Xử lý sự kiện chạm vào màn hình
        playerElement.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });
        
        // Xử lý sự kiện kết thúc chạm
        playerElement.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            
            // Tính toán khoảng cách và thời gian
            const distanceX = Math.abs(touchEndX - touchStartX);
            const distanceY = Math.abs(touchEndY - touchStartY);
            const timeDiff = touchEndTime - touchStartTime;
            
            // Nếu là tap (chạm nhanh và không di chuyển nhiều)
            if (timeDiff < 300 && distanceX < 20 && distanceY < 20) {
                // Xử lý tương tự như click vào nút play/pause
                const playPauseBtn = document.getElementById('playPauseBtn');
                if (playPauseBtn) {
                    playPauseBtn.click();
                }
            }
            
            // Xử lý vuốt ngang để tua video (chỉ cho host)
            if (isHost && distanceX > 50 && timeDiff < 500) {
                const direction = touchEndX > touchStartX ? 1 : -1; // 1 là tua tới, -1 là tua lùi
                const currentTime = player.getCurrentTime();
                const newTime = currentTime + (direction * 10); // Tua 10 giây
                
                player.seekTo(newTime, true);
                
                // Cập nhật thời gian hiện tại lên database
                if (roomData.status === 'playing' || roomData.status === 'paused') {
                    database.ref(`rooms/${roomId}`).update({
                        currentTime: newTime
                    });
                }
            }
        }, { passive: true });
        
        // Tối ưu hóa giao diện cho thiết bị di động
        optimizeForMobile();
    }
}

// Xử lý phím tắt bàn phím
function handleKeyboardShortcuts(event) {
    // Chỉ xử lý phím tắt nếu là chủ phòng và trình phát đã được khởi tạo
    if (!isHost || !player) return;
    
    // Phím mũi tên trái: Tua lùi 10 giây
    if (event.key === 'ArrowLeft') {
        if (playerType !== 'cloudinary') { // YouTube player
            const currentTime = player.getCurrentTime();
            const newTime = Math.max(0, currentTime - 10);
            player.seekTo(newTime, true);
            
            // Cập nhật thời gian hiện tại lên database
            database.ref(`rooms/${roomId}`).update({
                currentTime: newTime
            });
            
            // Hiển thị thông báo
            showNotification('Đã tua lùi 10 giây', 'info');
        } else { // Cloudinary player
            const currentTime = player.currentTime;
            const newTime = Math.max(0, currentTime - 10);
            player.currentTime = newTime;
            
            // Cập nhật thời gian hiện tại lên database
            database.ref(`rooms/${roomId}`).update({
                currentTime: newTime
            });
            
            // Hiển thị thông báo
            showNotification('Đã tua lùi 10 giây', 'info');
        }
    }
    
    // Phím mũi tên phải: Tua tới 10 giây
    if (event.key === 'ArrowRight') {
        if (playerType !== 'cloudinary') { // YouTube player
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            const newTime = Math.min(duration, currentTime + 10);
            player.seekTo(newTime, true);
            
            // Cập nhật thời gian hiện tại lên database
            database.ref(`rooms/${roomId}`).update({
                currentTime: newTime
            });
            
            // Hiển thị thông báo
            showNotification('Đã tua tới 10 giây', 'info');
        } else { // Cloudinary player
            const currentTime = player.currentTime;
            const duration = player.duration;
            const newTime = Math.min(duration, currentTime + 10);
            player.currentTime = newTime;
            
            // Cập nhật thời gian hiện tại lên database
            database.ref(`rooms/${roomId}`).update({
                currentTime: newTime
            });
            
            // Hiển thị thông báo
            showNotification('Đã tua tới 10 giây', 'info');
        }
    }
    
    // Phím Space: Play/Pause
    if (event.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        event.preventDefault(); // Ngăn không cho trang cuộn xuống
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.click();
        }
    }
}

// Tối ưu hóa giao diện cho thiết bị di động
function optimizeForMobile() {
    // Tăng kích thước các nút điều khiển
    const controlButtons = document.querySelectorAll('.control-btn');
    controlButtons.forEach(button => {
        button.style.padding = '10px 15px';
    });
    
    // Điều chỉnh kích thước font chữ cho dễ đọc
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.style.fontSize = '16px';
    }
    
    // Đảm bảo các phần tử có thể cuộn mượt mà
    document.querySelectorAll('.chat-messages, .participant-list').forEach(element => {
        element.style.webkitOverflowScrolling = 'touch';
    });
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

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-btn"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(notification);
    
    // Add close button event listener
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('hide');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Hide YouTube Watermark
function hideYouTubeWatermark() {
    // Try to hide watermark using CSS
    const style = document.createElement('style');
    style.textContent = `
        .ytp-watermark, 
        .ytp-youtube-button, 
        .ytp-small-redirect,
        .ytp-chrome-top-buttons {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(style);
    
    // Try to hide watermark using direct DOM manipulation
    setTimeout(() => {
        try {
            // Try to access the iframe content if possible
            const playerElement = document.getElementById('player');
            if (playerElement) {
                // Try to find and hide watermark elements
                const watermarks = document.querySelectorAll('.ytp-watermark, .ytp-youtube-button, .ytp-small-redirect');
                watermarks.forEach(watermark => {
                    watermark.style.display = 'none';
                    watermark.style.opacity = '0';
                    watermark.style.visibility = 'hidden';
                });
                
                // If player has an iframe, try to access its content
                const iframe = playerElement.querySelector('iframe');
                if (iframe && iframe.contentWindow) {
                    try {
                        // This might fail due to same-origin policy
                        const iframeDoc = iframe.contentWindow.document;
                        const iframeWatermarks = iframeDoc.querySelectorAll('.ytp-watermark, .ytp-youtube-button');
                        iframeWatermarks.forEach(watermark => {
                            watermark.style.display = 'none';
                        });
                    } catch (e) {
                        // Silent fail - expected due to cross-origin restrictions
                    }
                }
            }
        } catch (e) {
            console.log('Error hiding YouTube watermark:', e);
        }
    }, 1000);
}

// Note: Using showNotification function from auth.js

// Position video overlay to cover the player but not controls
function positionVideoOverlay() {
    const overlay = document.querySelector('.video-overlay');
    const player = document.getElementById('player');
    
    if (overlay && player) {
        // Set the overlay to match the player dimensions
        const playerRect = player.getBoundingClientRect();
        overlay.style.width = playerRect.width + 'px';
        overlay.style.height = playerRect.height + 'px';
        overlay.style.top = '0';
        overlay.style.left = '0';
    }
}

// Helper function to open modal
function openModal(modal) {
    // Close all modals first
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
    });
    
    // Open the requested modal
    modal.style.display = 'block';
}

// Function to show keyboard shortcuts modal
function showKeyboardShortcuts() {
    const modal = document.getElementById('keyboardShortcutsModal');
    openModal(modal);
}

// Function to toggle fullscreen mode
function toggleFullscreen() {
    const videoContainer = document.querySelector('.video-container');
    
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
        // Enter fullscreen
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) { /* Safari */
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.mozRequestFullScreen) { /* Firefox */
            videoContainer.mozRequestFullScreen();
        } else if (videoContainer.msRequestFullscreen) { /* IE/Edge */
            videoContainer.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    }
}

// Function to update fullscreen button state
function updateFullscreenButtonState() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement || 
        document.msFullscreenElement) {
        // In fullscreen mode
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        fullscreenBtn.title = 'Thoát toàn màn hình';
    } else {
        // Not in fullscreen mode
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.title = 'Toàn màn hình';
    }
}