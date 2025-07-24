// Admin page script

// DOM Elements
const adminContent = document.getElementById('adminContent');
const editUserModal = document.getElementById('editUserModal');
const editRoomModal = document.getElementById('editRoomModal');
const editUserForm = document.getElementById('editUserForm');
const editRoomForm = document.getElementById('editRoomForm');

// Admin email
const ADMIN_EMAIL = 'micovan108@gmail.com';

// Current user
let currentUser = null;

// Initialize admin page
function initAdminPage() {
    // Check if user is logged in and is admin
    firebase.auth().onAuthStateChanged(user => {
        if (user && user.email === ADMIN_EMAIL) {
            currentUser = user;
            loadAdminDashboard();
        } else {
            showAccessDenied();
        }
    });

    // Set up event listeners
    setupEventListeners();
}

// Load admin dashboard
function loadAdminDashboard() {
    adminContent.innerHTML = `
        <div class="admin-container">
            <div class="admin-header">
                <h1 class="admin-title">Bảng Điều Khiển Quản Trị</h1>
                <div class="user-info">
                    <span>Xin chào, ${currentUser.displayName || currentUser.email}</span>
                </div>
            </div>
            
            <div class="admin-stats">
                <div class="stat-card">
                    <div class="stat-title">Tổng Người Dùng</div>
                    <div class="stat-value" id="totalUsers">...</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Tổng Phòng</div>
                    <div class="stat-value" id="totalRooms">...</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Phòng Đang Hoạt Động</div>
                    <div class="stat-value" id="activeRooms">...</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">Tổng Vé Đã Bán</div>
                    <div class="stat-value" id="totalTickets">...</div>
                </div>
            </div>
            
            <div class="admin-tabs">
                <div class="admin-tab active" data-tab="users">Người Dùng</div>
                <div class="admin-tab" data-tab="rooms">Phòng Chiếu</div>
                <div class="admin-tab" data-tab="tickets">Vé</div>
                <div class="admin-tab" data-tab="settings">Cài Đặt</div>
            </div>
            
            <div id="usersTab" class="tab-content active">
                <div class="search-bar">
                    <input type="text" id="userSearchInput" placeholder="Tìm kiếm người dùng...">
                    <button id="userSearchBtn"><i class="fas fa-search"></i></button>
                </div>
                
                <table class="data-table" id="usersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên</th>
                            <th>Email</th>
                            <th>Mini Coins</th>
                            <th>Vai Trò</th>
                            <th>Ngày Tạo</th>
                            <th>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" class="loading-data">Đang tải dữ liệu...</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="pagination" id="usersPagination"></div>
            </div>
            
            <div id="roomsTab" class="tab-content">
                <div class="search-bar">
                    <input type="text" id="roomSearchInput" placeholder="Tìm kiếm phòng...">
                    <button id="roomSearchBtn"><i class="fas fa-search"></i></button>
                </div>
                
                <table class="data-table" id="roomsTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên Phòng</th>
                            <th>Chủ Phòng</th>
                            <th>Trạng Thái</th>
                            <th>Riêng Tư</th>
                            <th>Yêu Cầu Vé</th>
                            <th>Ngày Tạo</th>
                            <th>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="8" class="loading-data">Đang tải dữ liệu...</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="pagination" id="roomsPagination"></div>
            </div>
            
            <div id="ticketsTab" class="tab-content">
                <div class="search-bar">
                    <input type="text" id="ticketSearchInput" placeholder="Tìm kiếm vé...">
                    <button id="ticketSearchBtn"><i class="fas fa-search"></i></button>
                </div>
                
                <table class="data-table" id="ticketsTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Phòng</th>
                            <th>Người Dùng</th>
                            <th>Giá</th>
                            <th>Trạng Thái</th>
                            <th>Ngày Tạo</th>
                            <th>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" class="loading-data">Đang tải dữ liệu...</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="pagination" id="ticketsPagination"></div>
            </div>
            
            <div id="settingsTab" class="tab-content">
                <h2>Cài Đặt Hệ Thống</h2>
                <form id="settingsForm" class="modal-form">
                    <div class="form-group">
                        <label for="defaultMiniCoins">Mini Coins Mặc Định Cho Người Dùng Mới</label>
                        <input type="number" id="defaultMiniCoins" min="0" value="100">
                    </div>
                    <div class="form-group">
                        <label for="ticketPrice">Giá Vé Mặc Định (Mini Coins)</label>
                        <input type="number" id="ticketPrice" min="0" value="10">
                    </div>
                    <button type="submit" class="btn btn-primary">Lưu Cài Đặt</button>
                </form>
            </div>
        </div>
    `;
    
    // Load data
    loadStats();
    loadUsers();
    
    // Set up tab switching
    setupTabs();
}

// Show access denied message
function showAccessDenied() {
    adminContent.innerHTML = `
        <div class="access-denied">
            <i class="fas fa-exclamation-circle"></i>
            <h2>Truy Cập Bị Từ Chối</h2>
            <p>Bạn không có quyền truy cập trang quản trị. Chỉ quản trị viên mới có thể xem trang này.</p>
            <a href="index.html" class="btn btn-primary">Quay Lại Trang Chủ</a>
        </div>
    `;
}

// Set up event listeners
function setupEventListeners() {
    // Close modals when clicking on X or outside the modal
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', event => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Edit user form submission
    editUserForm.addEventListener('submit', event => {
        event.preventDefault();
        updateUser();
    });
    
    // Edit room form submission
    editRoomForm.addEventListener('submit', event => {
        event.preventDefault();
        updateRoom();
    });
    
    // Settings form submission
    document.addEventListener('click', event => {
        if (event.target && event.target.id === 'settingsForm') {
            event.preventDefault();
            saveSettings();
        }
    });
}

// Set up tab switching
function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(`${tabName}Tab`).classList.add('active');
            
            // Load data for the selected tab
            if (tabName === 'users') {
                loadUsers();
            } else if (tabName === 'rooms') {
                loadRooms();
            } else if (tabName === 'tickets') {
                loadTickets();
            }
        });
    });
}

// Load statistics
function loadStats() {
    const totalUsersElement = document.getElementById('totalUsers');
    const totalRoomsElement = document.getElementById('totalRooms');
    const activeRoomsElement = document.getElementById('activeRooms');
    const totalTicketsElement = document.getElementById('totalTickets');
    
    // Count total users
    firebase.database().ref('users').once('value', snapshot => {
        const usersCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        totalUsersElement.textContent = usersCount;
    });
    
    // Count total rooms
    firebase.database().ref('rooms').once('value', snapshot => {
        if (snapshot.exists()) {
            const rooms = snapshot.val();
            const roomsCount = Object.keys(rooms).length;
            totalRoomsElement.textContent = roomsCount;
            
            // Count active rooms (rooms with at least one viewer)
            let activeCount = 0;
            Object.values(rooms).forEach(room => {
                if (room.viewers && Object.keys(room.viewers).length > 0) {
                    activeCount++;
                }
            });
            activeRoomsElement.textContent = activeCount;
        } else {
            totalRoomsElement.textContent = 0;
            activeRoomsElement.textContent = 0;
        }
    });
    
    // Count total tickets
    firebase.database().ref('tickets').once('value', snapshot => {
        const ticketsCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        totalTicketsElement.textContent = ticketsCount;
    });
}

// Load users data
function loadUsers(searchTerm = '') {
    const usersTableBody = document.querySelector('#usersTable tbody');
    usersTableBody.innerHTML = '<tr><td colspan="7" class="loading-data">Đang tải dữ liệu...</td></tr>';
    
    firebase.database().ref('users').once('value', snapshot => {
        if (snapshot.exists()) {
            const users = snapshot.val();
            let usersArray = Object.entries(users).map(([id, user]) => {
                return {
                    id,
                    ...user
                };
            });
            
            // Filter by search term if provided
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                usersArray = usersArray.filter(user => 
                    (user.displayName && user.displayName.toLowerCase().includes(term)) ||
                    (user.email && user.email.toLowerCase().includes(term))
                );
            }
            
            // Sort by creation date (newest first)
            usersArray.sort((a, b) => {
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
            
            if (usersArray.length > 0) {
                usersTableBody.innerHTML = '';
                usersArray.forEach(user => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${user.id.substring(0, 8)}...</td>
                        <td>${user.displayName || 'N/A'}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td>${user.miniCoins || 0}</td>
                        <td>${user.email === ADMIN_EMAIL ? 'Admin' : 'User'}</td>
                        <td>${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</td>
                        <td>
                            <button class="action-btn edit-btn" data-id="${user.id}">Sửa</button>
                            <button class="action-btn delete-btn" data-id="${user.id}">Xóa</button>
                        </td>
                    `;
                    usersTableBody.appendChild(row);
                });
                
                // Add event listeners to edit and delete buttons
                addUserActionListeners();
            } else {
                usersTableBody.innerHTML = '<tr><td colspan="7" class="no-data">Không tìm thấy người dùng nào</td></tr>';
            }
        } else {
            usersTableBody.innerHTML = '<tr><td colspan="7" class="no-data">Không có dữ liệu người dùng</td></tr>';
        }
    }).catch(error => {
        console.error('Error loading users:', error);
        usersTableBody.innerHTML = `<tr><td colspan="7" class="error-data">Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
    });
}

// Load rooms data
function loadRooms(searchTerm = '') {
    const roomsTableBody = document.querySelector('#roomsTable tbody');
    roomsTableBody.innerHTML = '<tr><td colspan="8" class="loading-data">Đang tải dữ liệu...</td></tr>';
    
    firebase.database().ref('rooms').once('value', snapshot => {
        if (snapshot.exists()) {
            const rooms = snapshot.val();
            let roomsArray = Object.entries(rooms).map(([id, room]) => {
                return {
                    id,
                    ...room
                };
            });
            
            // Filter by search term if provided
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                roomsArray = roomsArray.filter(room => 
                    (room.name && room.name.toLowerCase().includes(term)) ||
                    (room.description && room.description.toLowerCase().includes(term))
                );
            }
            
            // Sort by creation date (newest first)
            roomsArray.sort((a, b) => {
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
            
            if (roomsArray.length > 0) {
                roomsTableBody.innerHTML = '';
                
                // Get user data to display host names
                firebase.database().ref('users').once('value', userSnapshot => {
                    const users = userSnapshot.exists() ? userSnapshot.val() : {};
                    
                    roomsArray.forEach(room => {
                        const hostUser = users[room.hostId] || {};
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${room.id.substring(0, 8)}...</td>
                            <td>${room.name || 'N/A'}</td>
                            <td>${hostUser.displayName || hostUser.email || 'N/A'}</td>
                            <td>${room.status || 'inactive'}</td>
                            <td>${room.isPrivate ? 'Có' : 'Không'}</td>
                            <td>${room.requiresTicket ? 'Có' : 'Không'}</td>
                            <td>${room.createdAt ? new Date(room.createdAt).toLocaleString() : 'N/A'}</td>
                            <td>
                                <button class="action-btn edit-btn" data-id="${room.id}">Sửa</button>
                                <button class="action-btn delete-btn" data-id="${room.id}">Xóa</button>
                            </td>
                        `;
                        roomsTableBody.appendChild(row);
                    });
                    
                    // Add event listeners to edit and delete buttons
                    addRoomActionListeners();
                });
            } else {
                roomsTableBody.innerHTML = '<tr><td colspan="8" class="no-data">Không tìm thấy phòng nào</td></tr>';
            }
        } else {
            roomsTableBody.innerHTML = '<tr><td colspan="8" class="no-data">Không có dữ liệu phòng</td></tr>';
        }
    }).catch(error => {
        console.error('Error loading rooms:', error);
        roomsTableBody.innerHTML = `<tr><td colspan="8" class="error-data">Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
    });
}

// Load tickets data
function loadTickets(searchTerm = '') {
    const ticketsTableBody = document.querySelector('#ticketsTable tbody');
    ticketsTableBody.innerHTML = '<tr><td colspan="7" class="loading-data">Đang tải dữ liệu...</td></tr>';
    
    firebase.database().ref('tickets').once('value', snapshot => {
        if (snapshot.exists()) {
            const tickets = snapshot.val();
            let ticketsArray = Object.entries(tickets).map(([id, ticket]) => {
                return {
                    id,
                    ...ticket
                };
            });
            
            // Filter by search term if provided
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                ticketsArray = ticketsArray.filter(ticket => 
                    ticket.roomId.toLowerCase().includes(term) ||
                    ticket.userId.toLowerCase().includes(term)
                );
            }
            
            // Sort by creation date (newest first)
            ticketsArray.sort((a, b) => {
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
            
            if (ticketsArray.length > 0) {
                ticketsTableBody.innerHTML = '';
                
                // Get user and room data to display names
                Promise.all([
                    firebase.database().ref('users').once('value'),
                    firebase.database().ref('rooms').once('value')
                ]).then(([userSnapshot, roomSnapshot]) => {
                    const users = userSnapshot.exists() ? userSnapshot.val() : {};
                    const rooms = roomSnapshot.exists() ? roomSnapshot.val() : {};
                    
                    ticketsArray.forEach(ticket => {
                        const user = users[ticket.userId] || {};
                        const room = rooms[ticket.roomId] || {};
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${ticket.id.substring(0, 8)}...</td>
                            <td>${room.name || 'N/A'}</td>
                            <td>${user.displayName || user.email || 'N/A'}</td>
                            <td>${ticket.price || 0} Mini Coins</td>
                            <td>${ticket.status || 'pending'}</td>
                            <td>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}</td>
                            <td>
                                <button class="action-btn delete-btn" data-id="${ticket.id}">Xóa</button>
                            </td>
                        `;
                        ticketsTableBody.appendChild(row);
                    });
                    
                    // Add event listeners to delete buttons
                    addTicketActionListeners();
                });
            } else {
                ticketsTableBody.innerHTML = '<tr><td colspan="7" class="no-data">Không tìm thấy vé nào</td></tr>';
            }
        } else {
            ticketsTableBody.innerHTML = '<tr><td colspan="7" class="no-data">Không có dữ liệu vé</td></tr>';
        }
    }).catch(error => {
        console.error('Error loading tickets:', error);
        ticketsTableBody.innerHTML = `<tr><td colspan="7" class="error-data">Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
    });
}

// Add event listeners to user action buttons
function addUserActionListeners() {
    // Edit user buttons
    document.querySelectorAll('#usersTable .edit-btn').forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.getAttribute('data-id');
            openEditUserModal(userId);
        });
    });
    
    // Delete user buttons
    document.querySelectorAll('#usersTable .delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.getAttribute('data-id');
            if (confirm('Bạn có chắc chắn muốn xóa người dùng này không?')) {
                deleteUser(userId);
            }
        });
    });
    
    // Search button
    document.getElementById('userSearchBtn').addEventListener('click', () => {
        const searchTerm = document.getElementById('userSearchInput').value.trim();
        loadUsers(searchTerm);
    });
    
    // Search input (search on Enter key)
    document.getElementById('userSearchInput').addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            const searchTerm = event.target.value.trim();
            loadUsers(searchTerm);
        }
    });
}

// Add event listeners to room action buttons
function addRoomActionListeners() {
    // Edit room buttons
    document.querySelectorAll('#roomsTable .edit-btn').forEach(button => {
        button.addEventListener('click', () => {
            const roomId = button.getAttribute('data-id');
            openEditRoomModal(roomId);
        });
    });
    
    // Delete room buttons
    document.querySelectorAll('#roomsTable .delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const roomId = button.getAttribute('data-id');
            if (confirm('Bạn có chắc chắn muốn xóa phòng này không?')) {
                deleteRoom(roomId);
            }
        });
    });
    
    // Search button
    document.getElementById('roomSearchBtn').addEventListener('click', () => {
        const searchTerm = document.getElementById('roomSearchInput').value.trim();
        loadRooms(searchTerm);
    });
    
    // Search input (search on Enter key)
    document.getElementById('roomSearchInput').addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            const searchTerm = event.target.value.trim();
            loadRooms(searchTerm);
        }
    });
}

// Add event listeners to ticket action buttons
function addTicketActionListeners() {
    // Delete ticket buttons
    document.querySelectorAll('#ticketsTable .delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const ticketId = button.getAttribute('data-id');
            if (confirm('Bạn có chắc chắn muốn xóa vé này không?')) {
                deleteTicket(ticketId);
            }
        });
    });
    
    // Search button
    document.getElementById('ticketSearchBtn').addEventListener('click', () => {
        const searchTerm = document.getElementById('ticketSearchInput').value.trim();
        loadTickets(searchTerm);
    });
    
    // Search input (search on Enter key)
    document.getElementById('ticketSearchInput').addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            const searchTerm = event.target.value.trim();
            loadTickets(searchTerm);
        }
    });
}

// Open edit user modal
function openEditUserModal(userId) {
    firebase.database().ref(`users/${userId}`).once('value', snapshot => {
        if (snapshot.exists()) {
            const user = snapshot.val();
            
            // Fill form fields
            document.getElementById('editUserId').value = userId;
            document.getElementById('editDisplayName').value = user.displayName || '';
            document.getElementById('editEmail').value = user.email || '';
            document.getElementById('editMiniCoins').value = user.miniCoins || 0;
            document.getElementById('editRole').value = user.email === ADMIN_EMAIL ? 'admin' : 'user';
            
            // Show modal
            editUserModal.style.display = 'block';
        } else {
            alert('Không tìm thấy thông tin người dùng!');
        }
    }).catch(error => {
        console.error('Error getting user data:', error);
        alert(`Lỗi khi lấy thông tin người dùng: ${error.message}`);
    });
}

// Open edit room modal
function openEditRoomModal(roomId) {
    firebase.database().ref(`rooms/${roomId}`).once('value', snapshot => {
        if (snapshot.exists()) {
            const room = snapshot.val();
            
            // Fill form fields
            document.getElementById('editRoomId').value = roomId;
            document.getElementById('editRoomName').value = room.name || '';
            document.getElementById('editRoomDescription').value = room.description || '';
            document.getElementById('editVideoUrl').value = room.videoUrl || '';
            document.getElementById('editIsPrivate').checked = room.isPrivate || false;
            document.getElementById('editRequiresTicket').checked = room.requiresTicket || false;
            
            // Show modal
            editRoomModal.style.display = 'block';
        } else {
            alert('Không tìm thấy thông tin phòng!');
        }
    }).catch(error => {
        console.error('Error getting room data:', error);
        alert(`Lỗi khi lấy thông tin phòng: ${error.message}`);
    });
}

// Update user
function updateUser() {
    const userId = document.getElementById('editUserId').value;
    const displayName = document.getElementById('editDisplayName').value;
    const miniCoins = parseInt(document.getElementById('editMiniCoins').value) || 0;
    const role = document.getElementById('editRole').value;
    
    // Update user data
    firebase.database().ref(`users/${userId}`).update({
        displayName,
        miniCoins,
        updatedAt: Date.now()
    }).then(() => {
        // Close modal
        editUserModal.style.display = 'none';
        
        // Show success message
        showNotification('Cập nhật thông tin người dùng thành công!', 'success');
        
        // Reload users data
        loadUsers();
        loadStats();
    }).catch(error => {
        console.error('Error updating user:', error);
        alert(`Lỗi khi cập nhật thông tin người dùng: ${error.message}`);
    });
}

// Update room
function updateRoom() {
    const roomId = document.getElementById('editRoomId').value;
    const name = document.getElementById('editRoomName').value;
    const description = document.getElementById('editRoomDescription').value;
    const videoUrl = document.getElementById('editVideoUrl').value;
    const isPrivate = document.getElementById('editIsPrivate').checked;
    const requiresTicket = document.getElementById('editRequiresTicket').checked;
    
    // Update room data
    firebase.database().ref(`rooms/${roomId}`).update({
        name,
        description,
        videoUrl,
        isPrivate,
        requiresTicket,
        updatedAt: Date.now()
    }).then(() => {
        // Close modal
        editRoomModal.style.display = 'none';
        
        // Show success message
        showNotification('Cập nhật thông tin phòng thành công!', 'success');
        
        // Reload rooms data
        loadRooms();
        loadStats();
    }).catch(error => {
        console.error('Error updating room:', error);
        alert(`Lỗi khi cập nhật thông tin phòng: ${error.message}`);
    });
}

// Delete user
function deleteUser(userId) {
    // Check if user is admin
    firebase.database().ref(`users/${userId}`).once('value', snapshot => {
        if (snapshot.exists()) {
            const user = snapshot.val();
            
            if (user.email === ADMIN_EMAIL) {
                alert('Không thể xóa tài khoản quản trị viên!');
                return;
            }
            
            // Delete user data
            firebase.database().ref(`users/${userId}`).remove()
                .then(() => {
                    // Show success message
                    showNotification('Xóa người dùng thành công!', 'success');
                    
                    // Reload users data
                    loadUsers();
                    loadStats();
                })
                .catch(error => {
                    console.error('Error deleting user:', error);
                    alert(`Lỗi khi xóa người dùng: ${error.message}`);
                });
        } else {
            alert('Không tìm thấy thông tin người dùng!');
        }
    }).catch(error => {
        console.error('Error checking user:', error);
        alert(`Lỗi khi kiểm tra thông tin người dùng: ${error.message}`);
    });
}

// Delete room
function deleteRoom(roomId) {
    // Delete room data
    firebase.database().ref(`rooms/${roomId}`).remove()
        .then(() => {
            // Show success message
            showNotification('Xóa phòng thành công!', 'success');
            
            // Reload rooms data
            loadRooms();
            loadStats();
        })
        .catch(error => {
            console.error('Error deleting room:', error);
            alert(`Lỗi khi xóa phòng: ${error.message}`);
        });
}

// Delete ticket
function deleteTicket(ticketId) {
    // Delete ticket data
    firebase.database().ref(`tickets/${ticketId}`).remove()
        .then(() => {
            // Show success message
            showNotification('Xóa vé thành công!', 'success');
            
            // Reload tickets data
            loadTickets();
            loadStats();
        })
        .catch(error => {
            console.error('Error deleting ticket:', error);
            alert(`Lỗi khi xóa vé: ${error.message}`);
        });
}

// Save settings
function saveSettings() {
    const defaultMiniCoins = parseInt(document.getElementById('defaultMiniCoins').value) || 100;
    const ticketPrice = parseInt(document.getElementById('ticketPrice').value) || 10;
    
    // Update settings in database
    firebase.database().ref('settings').update({
        defaultMiniCoins,
        ticketPrice,
        updatedAt: Date.now(),
        updatedBy: currentUser.uid
    }).then(() => {
        // Show success message
        showNotification('Lưu cài đặt thành công!', 'success');
    }).catch(error => {
        console.error('Error saving settings:', error);
        alert(`Lỗi khi lưu cài đặt: ${error.message}`);
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if showNotification function exists in global scope (defined in auth.js)
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback notification if the global function is not available
        alert(message);
    }
}

// Initialize the admin page when the DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminPage);