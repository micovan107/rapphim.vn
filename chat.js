// Firebase configuration is loaded from firebase-config.js

// Global variables
let currentUser = null;
let selectedChatUser = null;
let chatUsers = [];
let onlineUsers = [];
let chats = {};
let communityChat = {
    id: 'community',
    displayName: 'Cộng đồng Việt',
    isCommunity: true,
    profileImage: 'co.png'
};

// DOM Elements
const chatListElement = document.getElementById('chatList');
const onlineUsersListElement = document.getElementById('onlineUsersList');
const chatMessagesElement = document.getElementById('chatMessages');
const messageInputElement = document.getElementById('messageInput');
const sendMessageBtnElement = document.getElementById('sendMessageBtn');
const chatUserImgElement = document.getElementById('chatUserImg');
const chatUserNameElement = document.getElementById('chatUserName');
const userSearchInputElement = document.getElementById('userSearchInput');
const newChatBtnElement = document.getElementById('newChatBtn');

// Initialize chat functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            setupUI(user);
            loadChatUsers();
            setupOnlineUsersListener();
            setupChatListeners();
        } else {
            // If not logged in, redirect to login modal
            currentUser = null;
            setupUI();
            showLoginRequiredMessage();
        }
    });
    
    // Setup menu toggle for mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});

// Setup UI based on authentication state
function setupUI(user) {
    const adminLink = document.querySelector('.admin-link');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userProfile = document.querySelector('.user-profile');
    const userProfileImg = document.getElementById('userProfileImg');
    
    if (user) {
        // User is logged in
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        userProfile.style.display = 'block';
        
        // Check if user is admin
        const userRef = firebase.database().ref('users/' + user.uid);
        userRef.once('value').then(snapshot => {
            const userData = snapshot.val();
            if (userData && userData.isAdmin) {
                adminLink.style.display = 'block';
            } else {
                adminLink.style.display = 'none';
            }
            
            // Set user profile image
        if (userData) {
            userProfileImg.src = userData.photoURL || userData.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userData.displayName || 'User');
        } else {
            userProfileImg.src = 'https://via.placeholder.com/40';
        }
        });
    } else {
        // User is not logged in
        loginBtn.style.display = 'block';
        signupBtn.style.display = 'block';
        userProfile.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

// Show message when login is required
function showLoginRequiredMessage() {
    chatMessagesElement.innerHTML = `
        <div class="chat-welcome-message">
            <i class="fas fa-lock chat-welcome-icon"></i>
            <h3>Đăng nhập để sử dụng tính năng chat</h3>
            <p>Vui lòng đăng nhập hoặc đăng ký để bắt đầu trò chuyện với người dùng khác</p>
            <button id="loginPromptBtn" class="btn btn-primary">Đăng nhập ngay</button>
        </div>
    `;
    
    // Add event listener to login button
    document.getElementById('loginPromptBtn').addEventListener('click', () => {
        document.getElementById('loginModal').style.display = 'block';
    });
    
    // Disable chat input
    messageInputElement.disabled = true;
    sendMessageBtnElement.disabled = true;
}

// Load chat users from database
function loadChatUsers() {
    const usersRef = firebase.database().ref('users');
    
    usersRef.on('value', snapshot => {
        const users = snapshot.val();
        chatUsers = [];
        
        // Add community chat first
        chatUsers.push(communityChat);
        
        for (const userId in users) {
            if (userId !== currentUser.uid) {
                chatUsers.push({
                    id: userId,
                    ...users[userId]
                });
            }
        }
        
        // Load existing chats
        loadExistingChats();
    });
    
    // Setup search functionality
    setupSearchFunctionality();
}

// Load existing chats from database
function loadExistingChats() {
    const chatsRef = firebase.database().ref('chats');
    
    chatsRef.orderByChild('participants/' + currentUser.uid).equalTo(true).on('value', snapshot => {
        const chatData = snapshot.val();
        chats = {};
        
        if (chatData) {
            for (const chatId in chatData) {
                const chat = chatData[chatId];
                const participants = Object.keys(chat.participants);
                const otherUserId = participants.find(id => id !== currentUser.uid);
                
                if (otherUserId) {
                    chats[otherUserId] = {
                        chatId: chatId,
                        lastMessage: chat.lastMessage || null,
                        unreadCount: chat.unreadCount?.[currentUser.uid] || 0
                    };
                }
            }
        }
        
        renderChatList();
    });
}

// Setup online users listener
function setupOnlineUsersListener() {
    const onlineUsersRef = firebase.database().ref('online');
    
    onlineUsersRef.on('value', snapshot => {
        const onlineData = snapshot.val();
        onlineUsers = [];
        
        if (onlineData) {
            for (const userId in onlineData) {
                if (userId !== currentUser.uid && onlineData[userId] === true) {
                    onlineUsers.push(userId);
                }
            }
        }
        
        renderOnlineUsers();
    });
    
    // Set current user as online
    const userOnlineRef = firebase.database().ref('online/' + currentUser.uid);
    userOnlineRef.set(true);
    
    // Remove user from online list when disconnected
    userOnlineRef.onDisconnect().remove();
}

// Render chat list
function renderChatList() {
    chatListElement.innerHTML = '';
    
    // Sort users by last message time (if available)
    const sortedUsers = [...chatUsers].sort((a, b) => {
        // Always keep community chat at the top
        if (a.isCommunity) return -1;
        if (b.isCommunity) return 1;
        
        const aLastMessage = chats[a.id]?.lastMessage;
        const bLastMessage = chats[b.id]?.lastMessage;
        
        if (!aLastMessage && !bLastMessage) return 0;
        if (!aLastMessage) return 1;
        if (!bLastMessage) return -1;
        
        return bLastMessage.timestamp - aLastMessage.timestamp;
    });
    
    // Create chat items
    sortedUsers.forEach(user => {
        const isOnline = onlineUsers.includes(user.id);
        const chatInfo = chats[user.id] || {};
        const lastMessage = chatInfo.lastMessage;
        const unreadCount = chatInfo.unreadCount || 0;
        
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${selectedChatUser === user.id ? 'active' : ''}`;
        chatItem.dataset.userId = user.id;
        
        chatItem.innerHTML = `
            <div class="chat-item-avatar">
                <img src="${user.photoURL || user.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User')}" alt="${user.displayName || 'User'}">
                <div class="chat-item-status ${isOnline || user.isCommunity ? 'online' : 'offline'}"></div>
            </div>
            <div class="chat-item-info">
                <div class="chat-item-name">${user.displayName || 'User'}</div>
                <div class="chat-item-last-message">${user.isCommunity ? 'Nhóm chat chung' : (lastMessage ? lastMessage.text : 'Bắt đầu trò chuyện')}</div>
            </div>
            <div class="chat-item-meta">
                ${lastMessage ? `<div class="chat-item-time">${formatTimestamp(lastMessage.timestamp)}</div>` : ''}
                ${unreadCount > 0 ? `<div class="chat-item-badge">${unreadCount}</div>` : ''}
            </div>
        `;
        
        chatItem.addEventListener('click', () => selectChatUser(user.id));
        chatListElement.appendChild(chatItem);
    });
}

// Render online users
function renderOnlineUsers() {
    onlineUsersListElement.innerHTML = '';
    
    // Add community chat to online users list
    const communityUser = chatUsers.find(user => user.isCommunity);
    
    // Filter online users
    const onlineUsersList = chatUsers.filter(user => onlineUsers.includes(user.id) && !user.isCommunity);
    
    // Combine community chat with online users
    const combinedList = communityUser ? [communityUser, ...onlineUsersList] : onlineUsersList;
    
    if (combinedList.length === 0) {
        onlineUsersListElement.innerHTML = '<div class="empty-list">Không có người dùng trực tuyến</div>';
        return;
    }
    
    combinedList.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'chat-item';
        userItem.dataset.userId = user.id;
        
        userItem.innerHTML = `
            <div class="chat-item-avatar">
                <img src="${user.photoURL || user.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User')}" alt="${user.displayName || 'User'}">
                <div class="chat-item-status online"></div>
            </div>
            <div class="chat-item-info">
                <div class="chat-item-name">${user.displayName || 'User'}</div>
                ${user.isCommunity ? '<div class="chat-item-last-message">Nhóm chat chung</div>' : ''}
            </div>
        `;
        
        userItem.addEventListener('click', () => selectChatUser(user.id));
        onlineUsersListElement.appendChild(userItem);
    });
}

// Select a chat user
function selectChatUser(userId) {
    selectedChatUser = userId;
    
    // Update UI
    const selectedUser = chatUsers.find(user => user.id === userId);
    
    if (selectedUser) {
        chatUserImgElement.src = selectedUser.photoURL || selectedUser.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedUser.displayName || 'User');
        chatUserNameElement.textContent = selectedUser.displayName || 'User';
        
        // Enable chat input
        messageInputElement.disabled = false;
        sendMessageBtnElement.disabled = false;
        
        // Check if community chat
        if (selectedUser.isCommunity) {
            loadCommunityMessages();
        } else {
            // Load messages
            loadMessages(userId);
            
            // Mark messages as read
            markMessagesAsRead(userId);
        }
        
        // Update active chat item
        document.querySelectorAll('.chat-item').forEach(item => {
            if (item.dataset.userId === userId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Load community messages
function loadCommunityMessages() {
    // Clear messages container
    chatMessagesElement.innerHTML = '';
    
    // Get or create community chat ID
    let chatId = chats['community']?.chatId;
    
    if (!chatId) {
        // Create new community chat
        chatId = 'community';
        
        // Update local chats object
        chats['community'] = { chatId: chatId, lastMessage: null, unreadCount: 0 };
    }
    
    // Listen for messages
    const messagesRef = firebase.database().ref('community_chat/messages');
    
    messagesRef.orderByChild('timestamp').on('value', snapshot => {

        const messages = snapshot.val();
        
        // Clear messages container
        chatMessagesElement.innerHTML = '';
        
        if (messages) {
            // Convert messages object to array and sort by timestamp
            const messageArray = Object.entries(messages).map(([id, message]) => ({
                id,
                ...message
            })).sort((a, b) => a.timestamp - b.timestamp);
            
            // Render messages
            messageArray.forEach(message => {
                renderMessage(message);
            });
            
            // Scroll to bottom
            chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
        } else {
            // Show empty chat message
            chatMessagesElement.innerHTML = `
                <div class="chat-welcome-message">
                    <i class="fas fa-users chat-welcome-icon"></i>
                    <h3>Chào mừng đến với Cộng đồng Việt</h3>
                    <p>Đây là nơi trò chuyện chung cho tất cả mọi người</p>
                </div>
            `;
        }
    });
}

// Load messages for selected chat
function loadMessages(userId) {
    // Clear messages container
    chatMessagesElement.innerHTML = '';
    
    // Get or create chat ID
    let chatId = chats[userId]?.chatId;
    
    if (!chatId) {
        // Create new chat
        chatId = firebase.database().ref('chats').push().key;
        
        // Set participants
        const participants = {};
        participants[currentUser.uid] = true;
        participants[userId] = true;
        
        firebase.database().ref('chats/' + chatId + '/participants').set(participants);
        
        // Update local chats object
        chats[userId] = { chatId: chatId, lastMessage: null, unreadCount: 0 };
    }
    
    // Listen for messages
    const messagesRef = firebase.database().ref('chats/' + chatId + '/messages');
    
    messagesRef.orderByChild('timestamp').on('value', snapshot => {

        const messages = snapshot.val();
        
        // Clear messages container
        chatMessagesElement.innerHTML = '';
        
        if (messages) {
            // Convert messages object to array and sort by timestamp
            const messageArray = Object.entries(messages).map(([id, message]) => ({
                id,
                ...message
            })).sort((a, b) => a.timestamp - b.timestamp);
            
            // Render messages
            messageArray.forEach(message => {
                renderMessage(message);
            });
            
            // Scroll to bottom
            chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
        } else {
            // Show empty chat message
            chatMessagesElement.innerHTML = `
                <div class="chat-welcome-message">
                    <i class="fas fa-comment chat-welcome-icon"></i>
                    <h3>Bắt đầu trò chuyện</h3>
                    <p>Gửi tin nhắn đầu tiên của bạn đến ${chatUsers.find(user => user.id === userId)?.displayName || 'User'}</p>
                </div>
            `;
        }
    });
}

// Render a message
function renderMessage(message) {
    const isOutgoing = message.senderId === currentUser.uid;
    const sender = isOutgoing ? currentUser : chatUsers.find(user => user.id === message.senderId);
    
    // Kiểm tra xem tin nhắn trước đó có phải của cùng người gửi không
    const previousMessage = chatMessagesElement.lastElementChild;
    const isPreviousMessageFromSameSender = previousMessage && 
        previousMessage.classList.contains(isOutgoing ? 'outgoing' : 'incoming') &&
        !previousMessage.classList.contains('message-break');
        
    // Đánh dấu tin nhắn trước đó là tin nhắn giữa nếu nó là tin nhắn đầu tiên
    // và tin nhắn hiện tại là từ cùng người gửi
    if (isPreviousMessageFromSameSender && previousMessage.classList.contains('message-first')) {
        previousMessage.classList.remove('message-first');
        previousMessage.classList.add('message-middle');
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    
    // Thêm class để nhóm tin nhắn nếu từ cùng người gửi
    if (isPreviousMessageFromSameSender) {
        messageElement.classList.add('message-continuation');
    } else {
        messageElement.classList.add('message-first');
    }
    
    // Chỉ hiển thị avatar cho tin nhắn đầu tiên hoặc khi có sự ngắt quãng
    if (!isPreviousMessageFromSameSender) {
        messageElement.innerHTML = `
            <div class="message-avatar">
                <img src="${sender?.photoURL || sender?.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(sender?.displayName || 'User')}" alt="${sender?.displayName || 'User'}">
            </div>
            <div class="message-bubble">
                <div class="message-sender-name">${isOutgoing ? 'Bạn' : sender?.displayName || 'Người dùng'}</div>
                <div class="message-content">${message.text}</div>
                <div class="message-time">${formatTimestamp(message.timestamp)}</div>
            </div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="message-avatar empty-avatar"></div>
            <div class="message-bubble">
                <div class="message-content">${message.text}</div>
                <div class="message-time">${formatTimestamp(message.timestamp)}</div>
            </div>
        `;
    }
    
    chatMessagesElement.appendChild(messageElement);
}

// Mark messages as read
function markMessagesAsRead(userId) {
    const chatId = chats[userId]?.chatId;
    
    if (chatId) {
        firebase.database().ref('chats/' + chatId + '/unreadCount/' + currentUser.uid).set(0);
    }
}

// Send a message
function sendMessage() {
    const messageText = messageInputElement.value.trim();
    
    if (messageText && selectedChatUser) {
        const selectedUser = chatUsers.find(user => user.id === selectedChatUser);
        const timestamp = firebase.database.ServerValue.TIMESTAMP;

        
        // Create message object
        const message = {
            text: messageText,
            senderId: currentUser.uid,
            timestamp: timestamp,
            senderName: currentUser.displayName || 'User'
        };
        
        if (selectedUser && selectedUser.isCommunity) {
            // Add message to community chat
            const newMessageRef = firebase.database().ref('community_chat/messages').push();
            newMessageRef.set(message);
            
            // Update last message for community
            firebase.database().ref('community_chat/lastMessage').set(message);
        } else {
            const chatId = chats[selectedChatUser].chatId;
            
            // Add message to database
            const newMessageRef = firebase.database().ref('chats/' + chatId + '/messages').push();
            newMessageRef.set(message);
            
            // Update last message
            firebase.database().ref('chats/' + chatId + '/lastMessage').set(message);
            
            // Increment unread count for recipient
            firebase.database().ref('chats/' + chatId + '/unreadCount/' + selectedChatUser).transaction(count => {
                return (count || 0) + 1;
            });
        }
        
        // Clear input
        messageInputElement.value = '';
    }
}

// Setup search functionality
function setupSearchFunctionality() {
    userSearchInputElement.addEventListener('input', event => {
        const searchTerm = event.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            // If search is empty, show all chats
            renderChatList();
            return;
        }
        
        // Filter users based on search term
        const filteredUsers = chatUsers.filter(user => {
            const displayName = user.displayName || 'User';
            return displayName.toLowerCase().includes(searchTerm);
        });
        
        // Render filtered chat list
        renderFilteredChatList(filteredUsers);
    });
    
    // Setup new chat button
    newChatBtnElement.addEventListener('click', () => {
        // Show all users for new chat
        renderFilteredChatList(chatUsers);
    });
}

// Render filtered chat list
function renderFilteredChatList(filteredUsers) {
    chatListElement.innerHTML = '';
    
    if (filteredUsers.length === 0) {
        chatListElement.innerHTML = '<div class="empty-list">Không tìm thấy người dùng</div>';
        return;
    }
    
    filteredUsers.forEach(user => {
        const isOnline = onlineUsers.includes(user.id);
        const chatInfo = chats[user.id] || {};
        
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${selectedChatUser === user.id ? 'active' : ''}`;
        chatItem.dataset.userId = user.id;
        
        chatItem.innerHTML = `
            <div class="chat-item-avatar">
                <img src="${user.photoURL || user.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User')}" alt="${user.displayName || 'User'}">
                <div class="chat-item-status ${isOnline || user.isCommunity ? 'online' : 'offline'}"></div>
            </div>
            <div class="chat-item-info">
                <div class="chat-item-name">${user.displayName || 'User'}</div>
                <div class="chat-item-last-message">${user.isCommunity ? 'Nhóm chat chung' : (chatInfo.lastMessage ? chatInfo.lastMessage.text : 'Bắt đầu trò chuyện')}</div>
            </div>
        `;
        
        chatItem.addEventListener('click', () => selectChatUser(user.id));
        chatListElement.appendChild(chatItem);
    });
}

// Setup chat event listeners
function setupChatListeners() {
    // Send message on button click
    sendMessageBtnElement.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    messageInputElement.addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });
}

// Format timestamp to readable time
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const timeOpts = { hour: '2-digit', minute: '2-digit' };

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], timeOpts);
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], timeOpts);
}
