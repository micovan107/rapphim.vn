// DOM Elements
const createRoomBtn = document.getElementById('createRoomBtn');
const createRoomModal = document.getElementById('createRoomModal');
const createRoomForm = document.getElementById('createRoomForm');
const roomsContainer = document.querySelector('.rooms-container');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add modal HTML if not already in the document
    if (!document.getElementById('createRoomModal')) {
        addCreateRoomModal();
    }
    
    // Add ticket request modal
    if (!document.getElementById('ticketRequestModal')) {
        addTicketRequestModal();
    }
    
    // Initialize room creation form
    initCreateRoomForm();
    
    // Load rooms
    loadRooms();
    
    // Add filter functionality
    addFilterFunctionality();
    
    // Add search functionality
    addSearchFunctionality();
});

// Add Create Room Modal to the document
function addCreateRoomModal() {
    const modalHTML = `
        <div id="createRoomModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Tạo Phòng Chiếu Phim</h2>
                <form id="createRoomForm">
                    <div class="form-group">
                        <label for="roomName">Tên Phòng</label>
                        <input type="text" id="roomName" placeholder="Nhập tên phòng" required>
                    </div>
                    <div class="form-group">
                        <label for="roomDescription">Mô Tả</label>
                        <textarea id="roomDescription" placeholder="Mô tả ngắn về phòng chiếu" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="videoUrl">URL Video YouTube</label>
                        <input type="url" id="videoUrl" placeholder="https://www.youtube.com/watch?v=..." required>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="isPrivate">
                            Phòng Riêng Tư
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="requiresTicket">
                            Yêu Cầu Vé Để Vào
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Tạo Phòng</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners for the modal
    const modal = document.getElementById('createRoomModal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Add Ticket Request Modal to the document
function addTicketRequestModal() {
    const modalHTML = `
        <div id="ticketRequestModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Yêu Cầu Vé Xem Phim</h2>
                <p>Phòng này yêu cầu vé để vào xem. Bạn có muốn gửi yêu cầu vé không?</p>
                <div class="modal-buttons">
                    <button id="requestTicketBtn" class="btn btn-primary">Yêu Cầu Vé</button>
                    <button id="cancelTicketRequestBtn" class="btn">Hủy</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners for the modal
    const modal = document.getElementById('ticketRequestModal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelTicketRequestBtn');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Initialize Create Room Form
function initCreateRoomForm() {
    const createRoomForm = document.getElementById('createRoomForm');
    
    // Add upload video button
    const videoUrlField = document.getElementById('videoUrl');
    if (videoUrlField) {
        const uploadButtonHTML = `
            <button type="button" id="uploadVideoBtn" class="btn btn-secondary">
                <i class="fas fa-cloud-upload-alt"></i> Tải Video Lên
            </button>
        `;
        videoUrlField.insertAdjacentHTML('afterend', uploadButtonHTML);
        
        // Initialize Cloudinary upload widget
        document.getElementById('uploadVideoBtn').addEventListener('click', function() {
            const myWidget = cloudinary.createUploadWidget({
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
                    // Set the video URL to the Cloudinary URL
                    videoUrlField.value = result.info.secure_url;
                    // Store the public_id for later deletion if needed
                    videoUrlField.dataset.publicId = result.info.public_id;
                    showNotification('Video đã được tải lên thành công!', 'success');
                }
                if (error) {
                    console.error('Upload error:', error);
                    showNotification('Lỗi khi tải video lên!', 'error');
                }
            });
            myWidget.open();
        });
    }
    
    if (createRoomForm) {
        createRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('roomName').value;
            const description = document.getElementById('roomDescription').value;
            const videoUrl = document.getElementById('videoUrl').value;
            const videoPublicId = document.getElementById('videoUrl').dataset.publicId || null;
            const isPrivate = document.getElementById('isPrivate').checked;
            const requiresTicket = document.getElementById('requiresTicket').checked;
            
            // Get current user
            const user = auth.currentUser;
            if (!user) {
                showNotification('Vui lòng đăng nhập để tạo phòng!', 'error');
                return;
            }
            
            try {
                // Show loading state
                const submitBtn = createRoomForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Đang tạo phòng...';
                submitBtn.disabled = true;
                
                // Extract video ID from URL
                const videoId = extractVideoId(videoUrl);
                if (!videoId) {
                    showNotification('URL video không hợp lệ!', 'error');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }
                
                // Generate room ID
                const roomId = generateId();
                
                // Get user data
                const userData = await getCurrentUserData();
                
                // Create room in database
                await database.ref(`rooms/${roomId}`).set({
                    id: roomId,
                    name: name,
                    description: description,
                    videoId: videoId,
                    videoUrl: videoUrl,
                    videoPublicId: videoPublicId, // Cloudinary public_id for later deletion
                    isPrivate: isPrivate,
                    requiresTicket: requiresTicket,
                    host: {
                        uid: user.uid,
                        displayName: userData.displayName,
                        photoURL: userData.photoURL
                    },
                    participants: {
                        [user.uid]: {
                            uid: user.uid,
                            displayName: userData.displayName,
                            photoURL: userData.photoURL,
                            isHost: true,
                            hasTicket: true // Host always has a ticket
                        }
                    },
                    ticketRequests: {},
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    status: 'waiting' // waiting, playing, ended
                });
                
                // Close modal and reset form
                document.getElementById('createRoomModal').style.display = 'none';
                createRoomForm.reset();
                
                // Show success message
                showNotification('Phòng đã được tạo thành công!', 'success');
                
                // Redirect to room page
                window.location.href = `room.html?id=${roomId}`;
            } catch (error) {
                console.error('Create room error:', error);
                showNotification(`Lỗi tạo phòng: ${error.message}`, 'error');
            } finally {
                // Reset button state
                const submitBtn = createRoomForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Tạo Phòng';
                submitBtn.disabled = false;
            }
        });
    }
}

// Load Rooms
function loadRooms() {
    if (!roomsContainer) return;
    
    // Show loading
    roomsContainer.innerHTML = '<div class="loading">Đang tải phòng...</div>';
    
    // Get rooms from database
    const roomsRef = database.ref('rooms');
    
    roomsRef.on('value', (snapshot) => {
        // Clear rooms container
        roomsContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            roomsContainer.innerHTML = '<p>Không có phòng nào.</p>';
            return;
        }
        
        const rooms = [];
        snapshot.forEach((roomSnapshot) => {
            const room = roomSnapshot.val();
            rooms.push(room);
        });
        
        // Sort rooms by creation time (newest first)
        rooms.sort((a, b) => b.createdAt - a.createdAt);
        
        // Render rooms
        rooms.forEach((room) => {
            renderRoomCard(room);
        });
        
        // Apply current filter
        const activeFilter = document.querySelector('.filter-btn.active');
        if (activeFilter) {
            filterRooms(activeFilter.getAttribute('data-filter'));
        }
    });
}

// Render Room Card
function renderRoomCard(room) {
    if (!roomsContainer) return;
    
    // Create room card element
    const roomCard = document.createElement('div');
    roomCard.className = 'room-card';
    roomCard.setAttribute('data-room-id', room.id);
    roomCard.setAttribute('data-is-private', room.isPrivate);
    
    // Check if current user is the host
    const currentUser = auth.currentUser;
    const isHost = currentUser && room.host.uid === currentUser.uid;
    
    // Check if current user has a ticket (if required)
    const hasTicket = currentUser && room.participants && room.participants[currentUser.uid] && 
                     room.participants[currentUser.uid].hasTicket;
    
    // Set room card HTML
    roomCard.innerHTML = `
        <div class="room-thumbnail">
            <img src="https://img.youtube.com/vi/${room.videoId}/mqdefault.jpg" alt="${room.name}">
            <div class="room-badge ${room.isPrivate ? 'badge-private' : 'badge-public'}">
                ${room.isPrivate ? 'Riêng Tư' : 'Công Khai'}
            </div>
            ${room.requiresTicket ? '<div class="room-badge badge-ticket"><i class="fas fa-ticket-alt"></i> Yêu Cầu Vé</div>' : ''}
        </div>
        <div class="room-info">
            <h3>${room.name}</h3>
            <p>${room.description}</p>
            <div class="room-meta">
                <div class="room-host">
                    <img src="${room.host.photoURL}" alt="${room.host.displayName}">
                    <span>${room.host.displayName}</span>
                </div>
                <div class="room-time">
                    <i class="far fa-clock"></i> ${formatTimeAgo(room.createdAt)}
                </div>
            </div>
        </div>
        <a href="${isHost || !room.requiresTicket || hasTicket ? `room.html?id=${room.id}` : '#'}" class="${isHost || !room.requiresTicket || hasTicket ? 'join-room' : 'request-ticket'}" data-room-id="${room.id}">
            ${isHost ? 'Vào Phòng Của Bạn' : (room.requiresTicket && !hasTicket ? 'Đặt Vé' : 'Tham Gia')}
        </a>
    `;
    
    // Add room card to container
    roomsContainer.appendChild(roomCard);
    
    // Add event listener for ticket request button
    if (room.requiresTicket && !isHost && !hasTicket) {
        const requestTicketBtn = roomCard.querySelector('.request-ticket');
        requestTicketBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openTicketRequestModal(room.id);
        });
    }
}

// Open Ticket Request Modal
function openTicketRequestModal(roomId) {
    const modal = document.getElementById('ticketRequestModal');
    const requestBtn = document.getElementById('requestTicketBtn');
    
    // Set up request button
    requestBtn.onclick = () => {
        requestTicket(roomId);
        modal.style.display = 'none';
    };
    
    // Show modal
    modal.style.display = 'block';
}

// Request Ticket
async function requestTicket(roomId) {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Vui lòng đăng nhập để yêu cầu vé!', 'error');
        return;
    }
    
    try {
        // Get user data
        const userData = await getCurrentUserData();
        
        // Add ticket request to database
        await database.ref(`rooms/${roomId}/ticketRequests/${user.uid}`).set({
            uid: user.uid,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            requestedAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'pending' // pending, approved, rejected
        });
        
        showNotification('Yêu cầu vé đã được gửi!', 'success');
    } catch (error) {
        console.error('Request ticket error:', error);
        showNotification(`Lỗi yêu cầu vé: ${error.message}`, 'error');
    }
}

// Add Filter Functionality
function addFilterFunctionality() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Filter rooms
            const filter = btn.getAttribute('data-filter');
            filterRooms(filter);
        });
    });
}

// Filter Rooms
function filterRooms(filter) {
    const roomCards = document.querySelectorAll('.room-card');
    const currentUser = auth.currentUser;
    const searchInput = document.getElementById('roomSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    roomCards.forEach(card => {
        const roomId = card.getAttribute('data-room-id');
        const isPrivate = card.getAttribute('data-is-private') === 'true';
        const roomName = card.querySelector('h3').textContent.toLowerCase();
        const roomDescription = card.querySelector('p').textContent.toLowerCase();
        const matchesSearch = searchTerm === '' || 
                            roomName.includes(searchTerm) || 
                            roomDescription.includes(searchTerm);
        
        // Get room host from database
        database.ref(`rooms/${roomId}/host`).once('value', (snapshot) => {
            const host = snapshot.val();
            const isUserHost = currentUser && host && host.uid === currentUser.uid;
            
            let matchesFilter = false;
            switch (filter) {
                case 'all':
                    matchesFilter = true;
                    break;
                case 'public':
                    matchesFilter = !isPrivate;
                    break;
                case 'private':
                    matchesFilter = isPrivate;
                    break;
                case 'my':
                    matchesFilter = isUserHost;
                    break;
                default:
                    matchesFilter = true;
            }
            
            // Show card only if it matches both search and filter criteria
            card.style.display = (matchesSearch && matchesFilter) ? 'block' : 'none';
        });
    });
}

// Add Search Functionality
function addSearchFunctionality() {
    const searchInput = document.getElementById('roomSearchInput');
    const searchBtn = document.getElementById('roomSearchBtn');
    
    if (searchInput && searchBtn) {
        // Search when button is clicked
        searchBtn.addEventListener('click', () => {
            const activeFilter = document.querySelector('.filter-btn.active');
            if (activeFilter) {
                filterRooms(activeFilter.getAttribute('data-filter'));
            }
        });
        
        // Search when Enter key is pressed
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const activeFilter = document.querySelector('.filter-btn.active');
                if (activeFilter) {
                    filterRooms(activeFilter.getAttribute('data-filter'));
                }
            }
        });
    }
}

// Helper function to extract YouTube video ID from URL
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Helper function to format time ago
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

// Export functions for use in room.js
window.requestTicket = requestTicket;