// DOM Elements
const profileAvatar = document.getElementById('profileAvatar');
const avatarUpload = document.getElementById('avatarUpload');
const profileName = document.getElementById('profileName');
const watchedMovies = document.getElementById('watchedMovies');
const totalMessages = document.getElementById('totalMessages');
const userCoins = document.getElementById('userCoins');
const profileMenuItems = document.querySelectorAll('.profile-menu-item');
const profileTabs = document.querySelectorAll('.profile-tab');
const profileInfoForm = document.getElementById('profileInfoForm');
const changePasswordForm = document.getElementById('changePasswordForm');
const darkModePreference = document.getElementById('darkModePreference');
const twoFactorAuth = document.getElementById('twoFactorAuth');
const activityList = document.getElementById('activityList');
// Sử dụng biến đã được khai báo trong auth.js
// const loginBtn = document.getElementById('loginBtn');
// const signupBtn = document.getElementById('signupBtn');
const userProfileElement = document.querySelector('.user-profile');

// Global variables
let currentUser = null;
let userProfileData = null;

// Initialize profile page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserProfile();
            setupEventListeners();
            
            // Hide login/signup buttons and show user profile
            const loginBtnElement = document.getElementById('loginBtn');
            const signupBtnElement = document.getElementById('signupBtn');
            if (loginBtnElement) loginBtnElement.style.display = 'none';
            if (signupBtnElement) signupBtnElement.style.display = 'none';
            if (userProfileElement) userProfileElement.style.display = 'flex';
        } else {
            // Redirect to home page if not logged in
            window.location.href = 'index.html';
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
    
    // Setup dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
        
        // Check if dark mode is enabled
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            if (darkModePreference) darkModePreference.checked = true;
        }
    }
});

// Load user profile data
async function loadUserProfile() {
    try {
        const userRef = firebase.database().ref('users/' + currentUser.uid);
        const snapshot = await userRef.once('value');
        userProfileData = snapshot.val() || {};
        
        // Update UI with user data
        updateProfileUI();
        
        // Load user stats
        loadUserStats();
        
        // Load user activity
        loadUserActivity();
    } catch (error) {
        console.error('Error loading user profile:', error);
        showNotification('Lỗi khi tải thông tin người dùng', 'error');
    }
}

// Update profile UI with user data
function updateProfileUI() {
    // Update profile avatar
    if (userProfileData.photoURL) {
        profileAvatar.src = userProfileData.photoURL;
    } else if (userProfileData.profileImage) {
        profileAvatar.src = userProfileData.profileImage;
    } else {
        profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfileData.displayName || 'User')}`;
    }
    
    // Update profile name
    profileName.textContent = userProfileData.displayName || 'Người dùng';
    
    // Update user coins
    userCoins.textContent = userProfileData.miniCoins || 0;
    
    // Update form fields
    document.getElementById('displayName').value = userProfileData.displayName || '';
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('bio').value = userProfileData.bio || '';
    document.getElementById('location').value = userProfileData.location || '';
    
    // Update favorite genres
    if (userProfileData.favoriteGenres) {
        const genreSelect = document.getElementById('favoriteGenres');
        for (const option of genreSelect.options) {
            if (userProfileData.favoriteGenres.includes(option.value)) {
                option.selected = true;
            }
        }
    }
    
    // Update notification preferences
    if (userProfileData.preferences) {
        document.getElementById('messageNotifications').checked = 
            userProfileData.preferences.messageNotifications !== false;
        document.getElementById('roomNotifications').checked = 
            userProfileData.preferences.roomNotifications !== false;
        document.getElementById('forumNotifications').checked = 
            userProfileData.preferences.forumNotifications === true;
        document.getElementById('loginNotifications').checked = 
            userProfileData.preferences.loginNotifications !== false;
    }
    
    // Update language preference
    if (userProfileData.language) {
        document.getElementById('language').value = userProfileData.language;
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        // Count watched movies
        const watchHistoryRef = firebase.database().ref('watchHistory').orderByChild('userId').equalTo(currentUser.uid);
        const watchHistorySnapshot = await watchHistoryRef.once('value');
        const watchedMoviesCount = watchHistorySnapshot.exists() ? Object.keys(watchHistorySnapshot.val()).length : 0;
        watchedMovies.textContent = watchedMoviesCount;
        
        // Count total messages
        const messagesRef = firebase.database().ref('chats');
        const messagesSnapshot = await messagesRef.once('value');
        let messageCount = 0;
        
        if (messagesSnapshot.exists()) {
            const chats = messagesSnapshot.val();
            for (const chatId in chats) {
                if (chats[chatId].participants && chats[chatId].participants[currentUser.uid]) {
                    const chatMessages = chats[chatId].messages || {};
                    for (const messageId in chatMessages) {
                        if (chatMessages[messageId].senderId === currentUser.uid) {
                            messageCount++;
                        }
                    }
                }
            }
        }
        
        // Add community messages
        const communityMessagesRef = firebase.database().ref('community_chat/messages');
        const communityMessagesSnapshot = await communityMessagesRef.orderByChild('senderId').equalTo(currentUser.uid).once('value');
        if (communityMessagesSnapshot.exists()) {
            messageCount += Object.keys(communityMessagesSnapshot.val()).length;
        }
        
        totalMessages.textContent = messageCount;
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Load user activity
async function loadUserActivity() {
    try {
        const activitiesRef = firebase.database().ref('userActivities/' + currentUser.uid);
        const snapshot = await activitiesRef.orderByChild('timestamp').limitToLast(10).once('value');
        
        if (snapshot.exists()) {
            // Clear activity list
            activityList.innerHTML = '';
            
            // Convert to array and sort by timestamp (newest first)
            const activities = [];
            snapshot.forEach(childSnapshot => {
                activities.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            activities.sort((a, b) => b.timestamp - a.timestamp);
            
            // Render activities
            activities.forEach(activity => {
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';
                
                let icon = 'fas fa-circle';
                switch (activity.type) {
                    case 'login':
                        icon = 'fas fa-sign-in-alt';
                        break;
                    case 'message':
                        icon = 'fas fa-comment';
                        break;
                    case 'room':
                        icon = 'fas fa-film';
                        break;
                    case 'profile':
                        icon = 'fas fa-user-edit';
                        break;
                }
                
                activityItem.innerHTML = `
                    <div class="activity-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.description}</div>
                        <div class="activity-time">${formatTimestamp(activity.timestamp)}</div>
                    </div>
                `;
                
                activityList.appendChild(activityItem);
            });
        } else {
            // Show empty state
            activityList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Chưa có hoạt động nào gần đây</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading user activity:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Avatar upload
    const avatarContainer = document.querySelector('.profile-avatar');
    if (avatarContainer) {
        avatarContainer.addEventListener('click', () => {
            // Sử dụng Cloudinary Widget nếu có sẵn, nếu không thì sử dụng input file thông thường
            if (window.cloudinary) {
                openCloudinaryUploader();
            } else {
                avatarUpload.click();
            }
        });
    }
    
    // Handle avatar file selection (fallback method)
    if (avatarUpload) {
        avatarUpload.addEventListener('change', uploadAvatar);
    }
    
    // Tab switching
    profileMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            console.log('Tab clicked:', tabId);
            
            // Update active menu item
            profileMenuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });
            item.classList.add('active');
            
            // Show selected tab
            profileTabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
                console.log('Tab activated:', tabId);
            } else {
                console.error('Tab not found:', tabId);
            }
        });
    });
    
    // Profile info form submission
    if (profileInfoForm) {
        profileInfoForm.addEventListener('submit', updateProfileInfo);
    }
    
    // Change password form submission
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', changePassword);
    }
    
    // Dark mode preference
    if (darkModePreference) {
        darkModePreference.addEventListener('change', () => {
            if (darkModePreference.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
                const darkModeToggle = document.getElementById('darkModeToggle');
                if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
                const darkModeToggle = document.getElementById('darkModeToggle');
                if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
            
            // Save preference to user profile
            savePreference('darkMode', darkModePreference.checked);
        });
    }
    
    // Other preference toggles
    const preferenceToggles = [
        { id: 'messageNotifications', key: 'messageNotifications' },
        { id: 'roomNotifications', key: 'roomNotifications' },
        { id: 'forumNotifications', key: 'forumNotifications' },
        { id: 'loginNotifications', key: 'loginNotifications' }
    ];
    
    preferenceToggles.forEach(toggle => {
        const element = document.getElementById(toggle.id);
        if (element) {
            element.addEventListener('change', () => {
                savePreference(toggle.key, element.checked);
            });
        }
    });
    
    // Language preference
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            savePreference('language', languageSelect.value);
        });
    }
}

// Open Cloudinary Upload Widget
function openCloudinaryUploader() {
    // Show loading state
    profileAvatar.style.opacity = '0.5';
    const loadingIcon = document.createElement('div');
    loadingIcon.className = 'avatar-loading';
    loadingIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    profileAvatar.parentNode.appendChild(loadingIcon);
    
    const uploadOptions = {
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset,
        folder: `cinesync/avatars/${currentUser.uid}`,
        cropping: true,
        croppingAspectRatio: 1,
        resourceType: 'image',
        maxFileSize: 2 * 1024 * 1024, // 2MB
        sources: ['local', 'url', 'camera'],
        styles: {
            palette: {
                window: '#ffffff',
                sourceBg: '#f4f4f5',
                windowBorder: '#90a0b3',
                tabIcon: '#ff5e62',
                inactiveTabIcon: '#69778A',
                menuIcons: '#ff5e62',
                link: '#ff5e62',
                action: '#ff5e62',
                inProgress: '#ff5e62',
                complete: '#20B832',
                error: '#EA2727',
                textDark: '#000000',
                textLight: '#FFFFFF'
            },
            fonts: {
                default: null,
                "'Montserrat', sans-serif": {
                    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
                    active: true
                }
            }
        }
    };
    
    cloudinary.createUploadWidget(uploadOptions, (error, result) => {
        // Remove loading state
        profileAvatar.style.opacity = '1';
        const loadingIcon = document.querySelector('.avatar-loading');
        if (loadingIcon) loadingIcon.remove();
        
        if (error) {
            console.error('Cloudinary upload error:', error);
            showNotification('Lỗi khi tải lên ảnh đại diện', 'error');
            return;
        }
        
        if (result && result.event === 'success') {
            const downloadURL = result.info.secure_url;
            updateProfileAvatar(downloadURL);
        }
    }).open();
}

// Update profile avatar with the provided URL
async function updateProfileAvatar(downloadURL) {
    try {
        // Update user profile
        await currentUser.updateProfile({
            photoURL: downloadURL
        });
        
        // Update database
        await firebase.database().ref(`users/${currentUser.uid}`).update({
            photoURL: downloadURL
        });
        
        // Update UI
        profileAvatar.src = downloadURL;
        const userProfileImg = document.getElementById('userProfileImg');
        if (userProfileImg) userProfileImg.src = downloadURL;
        
        // Log activity
        logUserActivity('profile', 'Đã cập nhật ảnh đại diện');
        
        showNotification('Cập nhật ảnh đại diện thành công', 'success');
    } catch (error) {
        console.error('Error updating avatar:', error);
        showNotification(`Lỗi khi cập nhật ảnh đại diện: ${error.message}`, 'error');
    }
}

// Upload avatar using Cloudinary API (fallback method)
async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        showNotification('Vui lòng chọn file hình ảnh (JPEG, PNG, GIF)', 'error');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Kích thước file không được vượt quá 2MB', 'error');
        return;
    }
    
    try {
        // Show loading state
        profileAvatar.style.opacity = '0.5';
        const loadingIcon = document.createElement('div');
        loadingIcon.className = 'avatar-loading';
        loadingIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        profileAvatar.parentNode.appendChild(loadingIcon);
        
        // Create form data for Cloudinary upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', `cinesync/avatars/${currentUser.uid}`);
        
        // Upload to Cloudinary
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Lỗi khi tải lên Cloudinary');
        }
        
        const data = await response.json();
        const downloadURL = data.secure_url;
        
        // Update profile with the new avatar URL
        await updateProfileAvatar(downloadURL);
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showNotification(`Lỗi khi tải lên ảnh đại diện: ${error.message}`, 'error');
    } finally {
        // Remove loading state
        profileAvatar.style.opacity = '1';
        const loadingIcon = document.querySelector('.avatar-loading');
        if (loadingIcon) loadingIcon.remove();
    }
}

// Update profile information
async function updateProfileInfo(event) {
    event.preventDefault();
    
    const displayName = document.getElementById('displayName').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const location = document.getElementById('location').value.trim();
    
    // Get selected genres
    const genreSelect = document.getElementById('favoriteGenres');
    const selectedGenres = Array.from(genreSelect.selectedOptions).map(option => option.value);
    
    try {
        // Show loading state
        const submitBtn = profileInfoForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Đang lưu...';
        submitBtn.disabled = true;
        
        // Update user profile in Firebase Auth
        if (displayName) {
            await currentUser.updateProfile({
                displayName: displayName
            });
        }
        
        // Update user data in database
        await firebase.database().ref(`users/${currentUser.uid}`).update({
            displayName: displayName || userProfileData.displayName,
            bio: bio,
            location: location,
            favoriteGenres: selectedGenres
        });
        
        // Update local user profile
        userProfileData.displayName = displayName || userProfileData.displayName;
        userProfileData.bio = bio;
        userProfileData.location = location;
        userProfileData.favoriteGenres = selectedGenres;
        
        // Update UI
        profileName.textContent = displayName || userProfileData.displayName;
        document.getElementById('userProfileImg').parentNode.querySelector('span').textContent = displayName || userProfileData.displayName;
        
        // Log activity
        logUserActivity('profile', 'Đã cập nhật thông tin cá nhân');
        
        showNotification('Cập nhật thông tin thành công', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Lỗi khi cập nhật thông tin', 'error');
    } finally {
        // Reset button state
        const submitBtn = profileInfoForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Lưu thay đổi';
        submitBtn.disabled = false;
    }
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
        showNotification('Mật khẩu mới không khớp', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Đang cập nhật...';
        submitBtn.disabled = true;
        
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Change password
        await currentUser.updatePassword(newPassword);
        
        // Reset form
        changePasswordForm.reset();
        
        // Log activity
        logUserActivity('profile', 'Đã thay đổi mật khẩu');
        
        showNotification('Cập nhật mật khẩu thành công', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        
        if (error.code === 'auth/wrong-password') {
            showNotification('Mật khẩu hiện tại không đúng', 'error');
        } else {
            showNotification(`Lỗi: ${error.message}`, 'error');
        }
    } finally {
        // Reset button state
        const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Cập nhật mật khẩu';
        submitBtn.disabled = false;
    }
}

// Save user preference
async function savePreference(key, value) {
    try {
        // Initialize preferences object if it doesn't exist
        if (!userProfileData.preferences) {
            userProfileData.preferences = {};
        }
        
        // Update preference
        userProfileData.preferences[key] = value;
        
        // Special case for language
        if (key === 'language') {
            await firebase.database().ref(`users/${currentUser.uid}`).update({
                language: value,
                preferences: userProfileData.preferences
            });
        } else {
            // Update database
            await firebase.database().ref(`users/${currentUser.uid}/preferences`).update({
                [key]: value
            });
        }
        
        showNotification('Cài đặt đã được lưu', 'success');
    } catch (error) {
        console.error('Error saving preference:', error);
        showNotification('Lỗi khi lưu cài đặt', 'error');
    }
}

// Log user activity
async function logUserActivity(type, description) {
    try {
        const activityRef = firebase.database().ref(`userActivities/${currentUser.uid}`).push();
        await activityRef.set({
            type: type,
            description: description,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Reload activities
        setTimeout(() => {
            loadUserActivity();
        }, 1000);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Format timestamp to readable time
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return 'Vừa xong';
    } else if (diffMin < 60) {
        return `${diffMin} phút trước`;
    } else if (diffHour < 24) {
        return `${diffHour} giờ trước`;
    } else if (diffDay < 7) {
        return `${diffDay} ngày trước`;
    } else {
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}