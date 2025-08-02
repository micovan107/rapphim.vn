// DOM Elements
const viewProfileAvatar = document.getElementById('viewProfileAvatar');
const viewProfileName = document.getElementById('viewProfileName');
const viewProfileBio = document.getElementById('viewProfileBio');
const viewWatchedMovies = document.getElementById('viewWatchedMovies');
const viewTotalMessages = document.getElementById('viewTotalMessages');
const viewUserCoins = document.getElementById('viewUserCoins');
const viewFollowers = document.getElementById('viewFollowers');
const followBtn = document.getElementById('followBtn');
const messageBtn = document.getElementById('messageBtn');
const viewMyProfileBtn = document.getElementById('viewMyProfileBtn');
const userRating = document.getElementById('userRating');
const ratingCount = document.getElementById('ratingCount');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const createWallPostBtn = document.getElementById('createWallPostBtn');
const currentUserAvatar = document.getElementById('currentUserAvatar');
const userPosts = document.getElementById('userPosts');
const userMovies = document.getElementById('userMovies');
const userReviews = document.getElementById('userReviews');
const viewLocation = document.getElementById('viewLocation');
const viewJoinDate = document.getElementById('viewJoinDate');
const viewFavoriteGenres = document.getElementById('viewFavoriteGenres');
const viewRecentActivity = document.getElementById('viewRecentActivity');

// Global variables
let currentUser = null;
let viewedUserId = null;
let viewedUserData = null;
let isFollowing = false;
let userRatingValue = 0;
let wallCloudinaryWidget = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Get user ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    viewedUserId = urlParams.get('id');
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            
            // Nếu không có ID trong URL, sử dụng ID của người dùng hiện tại
            if (!viewedUserId) {
                viewedUserId = user.uid;
                // Cập nhật URL để phản ánh ID người dùng hiện tại
                const newUrl = `${window.location.pathname}?id=${viewedUserId}`;
                window.history.pushState({}, '', newUrl);
            }
            
            setupUI(user);
            
            // Load current user avatar
            loadCurrentUserAvatar();
            
            // Check if following
            checkFollowStatus();
            
            // Check if rated
            checkRatingStatus();
        } else {
            // Nếu chưa đăng nhập và không có ID trong URL
            if (!viewedUserId) {
                showNotification('Vui lòng đăng nhập để xem trang cá nhân', 'info');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return;
            }
            setupUI(null);
        }
        
        // Load user profile data
        loadUserProfile();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup Cloudinary widget
        setupWallCloudinaryWidget();
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
        }
    }
});

// Setup UI based on login status
function setupUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userProfileElement = document.querySelector('.user-profile');
    
    if (user) {
        // User is logged in
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (userProfileElement) userProfileElement.style.display = 'flex';
        
        // Show create post button only if not viewing own profile
        if (user.uid !== viewedUserId) {
            if (createWallPostBtn) createWallPostBtn.style.display = 'block';
            // Hiển thị nút "Xem trang cá nhân của tôi" khi xem trang cá nhân của người khác
            if (viewMyProfileBtn) viewMyProfileBtn.style.display = 'block';
        } else {
            // Hide follow and message buttons if viewing own profile
            if (followBtn) followBtn.style.display = 'none';
            if (messageBtn) messageBtn.style.display = 'none';
            if (viewMyProfileBtn) viewMyProfileBtn.style.display = 'none';
            if (createWallPostBtn) createWallPostBtn.textContent = 'Viết gì đó trên tường của bạn...';
        }
    } else {
        // User is not logged in
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
        if (userProfileElement) userProfileElement.style.display = 'none';
        
        // Hide action buttons for non-logged in users
        if (followBtn) followBtn.style.display = 'none';
        if (messageBtn) messageBtn.style.display = 'none';
        if (viewMyProfileBtn) viewMyProfileBtn.style.display = 'none';
        if (createWallPostBtn) createWallPostBtn.parentElement.style.display = 'none';
    }
}

// Load current user avatar
async function loadCurrentUserAvatar() {
    if (!currentUser) return;
    
    try {
        const userRef = firebase.database().ref(`users/${currentUser.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};
        
        if (userData.photoURL) {
            currentUserAvatar.src = userData.photoURL;
        } else if (currentUser.photoURL) {
            currentUserAvatar.src = currentUser.photoURL;
        } else {
            currentUserAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || currentUser.displayName || 'User')}`;
        }
    } catch (error) {
        console.error('Error loading current user avatar:', error);
    }
}

// Load user profile data
async function loadUserProfile() {
    try {
        // Kiểm tra xem ID người dùng có hợp lệ không
        if (!viewedUserId || viewedUserId.trim() === '') {
            if (currentUser) {
                // Nếu đã đăng nhập nhưng không có ID, sử dụng ID của người dùng hiện tại
                viewedUserId = currentUser.uid;
                // Cập nhật URL để phản ánh ID người dùng hiện tại
                const newUrl = `${window.location.pathname}?id=${viewedUserId}`;
                window.history.pushState({}, '', newUrl);
            } else {
                // Nếu chưa đăng nhập và không có ID, hiển thị thông báo lỗi
                showNotification('Vui lòng đăng nhập để xem trang cá nhân', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return;
            }
        }
        
        const userRef = firebase.database().ref(`users/${viewedUserId}`);
        const snapshot = await userRef.once('value');
        viewedUserData = snapshot.val();
        
        if (!viewedUserData) {
            // Nếu không tìm thấy thông tin người dùng và đó là người dùng hiện tại
            if (currentUser && viewedUserId === currentUser.uid) {
                // Tạo hồ sơ mới cho người dùng hiện tại
                viewedUserData = {
                    displayName: currentUser.displayName || 'Người dùng',
                    email: currentUser.email,
                    photoURL: currentUser.photoURL,
                    bio: 'Chưa có thông tin giới thiệu',
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Lưu thông tin người dùng mới vào database
                await userRef.set(viewedUserData);
                showNotification('Đã tạo hồ sơ người dùng mới', 'success');
            } else {
                // Nếu không tìm thấy thông tin người dùng khác
                showNotification('Không tìm thấy thông tin người dùng', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return;
            }
        }
        
        // Update UI with user data
        updateProfileUI();
        
        // Load user stats
        loadUserStats();
        
        // Load user posts
        loadUserPosts();
        
        // Load watched movies
        loadWatchedMovies();
        
        // Load user reviews
        loadUserReviews();
        
        // Load recent activity
        loadRecentActivity();
        
        // Load user achievements
        loadUserAchievements();
        
        // Update document title
        document.title = `${viewedUserData.displayName || 'Người dùng'} - CineSync`;
    } catch (error) {
        console.error('Error loading user profile:', error);
        showNotification('Lỗi khi tải thông tin người dùng', 'error');
    }
}

// Update profile UI with user data
function updateProfileUI() {
    // Update profile avatar
    if (viewedUserData.photoURL) {
        viewProfileAvatar.src = viewedUserData.photoURL;
    } else {
        viewProfileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(viewedUserData.displayName || 'User')}`;
    }
    
    // Update profile name
    viewProfileName.textContent = viewedUserData.displayName || 'Người dùng';
    
    // Update bio
    viewProfileBio.textContent = viewedUserData.bio || 'Chưa có thông tin giới thiệu';
    
    // Update location
    viewLocation.textContent = viewedUserData.location || 'Chưa cập nhật địa điểm';
    
    // Update join date
    if (viewedUserData.createdAt) {
        const joinDate = new Date(viewedUserData.createdAt);
        viewJoinDate.textContent = `Tham gia từ: ${joinDate.toLocaleDateString('vi-VN')}`;
    } else {
        viewJoinDate.textContent = 'Tham gia từ: Chưa có thông tin';
    }
    
    // Update favorite genres
    if (viewedUserData.favoriteGenres && viewedUserData.favoriteGenres.length > 0) {
        viewFavoriteGenres.innerHTML = '';
        
        const genreLabels = {
            'action': 'Hành động',
            'comedy': 'Hài',
            'drama': 'Chính kịch',
            'horror': 'Kinh dị',
            'scifi': 'Khoa học viễn tưởng',
            'romance': 'Lãng mạn',
            'animation': 'Hoạt hình'
        };
        
        viewedUserData.favoriteGenres.forEach(genre => {
            const genreTag = document.createElement('span');
            genreTag.className = 'genre-tag';
            genreTag.textContent = genreLabels[genre] || genre;
            viewFavoriteGenres.appendChild(genreTag);
        });
    } else {
        viewFavoriteGenres.innerHTML = '<span class="empty-state">Chưa có thông tin</span>';
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        // Count watched movies
        const watchHistoryRef = firebase.database().ref('watchHistory').orderByChild('userId').equalTo(viewedUserId);
        const watchHistorySnapshot = await watchHistoryRef.once('value');
        const watchedMoviesCount = watchHistorySnapshot.exists() ? Object.keys(watchHistorySnapshot.val()).length : 0;
        viewWatchedMovies.textContent = watchedMoviesCount;
        
        // Count total messages
        const messagesRef = firebase.database().ref('chats');
        const messagesSnapshot = await messagesRef.once('value');
        let messageCount = 0;
        
        if (messagesSnapshot.exists()) {
            const chats = messagesSnapshot.val();
            for (const chatId in chats) {
                if (chats[chatId].participants && chats[chatId].participants[viewedUserId]) {
                    const chatMessages = chats[chatId].messages || {};
                    for (const messageId in chatMessages) {
                        if (chatMessages[messageId].senderId === viewedUserId) {
                            messageCount++;
                        }
                    }
                }
            }
        }
        
        // Add community messages
        const communityMessagesRef = firebase.database().ref('community_chat/messages');
        const communityMessagesSnapshot = await communityMessagesRef.orderByChild('senderId').equalTo(viewedUserId).once('value');
        if (communityMessagesSnapshot.exists()) {
            messageCount += Object.keys(communityMessagesSnapshot.val()).length;
        }
        
        viewTotalMessages.textContent = messageCount;
        
        // Update user coins
        viewUserCoins.textContent = viewedUserData.miniCoins || 0;
        
        // Count followers
        const followersRef = firebase.database().ref(`followers/${viewedUserId}`);
        const followersSnapshot = await followersRef.once('value');
        const followersCount = followersSnapshot.exists() ? Object.keys(followersSnapshot.val()).length : 0;
        viewFollowers.textContent = followersCount;
        
        // Update rating count
        const ratingsRef = firebase.database().ref(`ratings/${viewedUserId}`);
        const ratingsSnapshot = await ratingsRef.once('value');
        let totalRating = 0;
        let ratingCount = 0;
        
        if (ratingsSnapshot.exists()) {
            const ratings = ratingsSnapshot.val();
            for (const userId in ratings) {
                totalRating += ratings[userId].rating;
                ratingCount++;
            }
        }
        
        // Update rating stars
        const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
        updateRatingStars(averageRating);
        document.getElementById('ratingCount').textContent = `(${ratingCount} đánh giá)`;
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Check if current user is following the viewed user
async function checkFollowStatus() {
    if (!currentUser || currentUser.uid === viewedUserId) return;
    
    try {
        const followRef = firebase.database().ref(`followers/${viewedUserId}/${currentUser.uid}`);
        const snapshot = await followRef.once('value');
        
        isFollowing = snapshot.exists();
        
        // Update follow button
        if (isFollowing) {
            followBtn.innerHTML = '<i class="fas fa-user-check"></i> Đang theo dõi';
            followBtn.classList.add('following');
        } else {
            followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Theo dõi';
            followBtn.classList.remove('following');
        }
    } catch (error) {
        console.error('Error checking follow status:', error);
    }
}

// Check if current user has rated the viewed user
async function checkRatingStatus() {
    if (!currentUser || currentUser.uid === viewedUserId) return;
    
    try {
        const ratingRef = firebase.database().ref(`ratings/${viewedUserId}/${currentUser.uid}`);
        const snapshot = await ratingRef.once('value');
        
        if (snapshot.exists()) {
            userRatingValue = snapshot.val().rating;
            highlightUserRating(userRatingValue);
        }
    } catch (error) {
        console.error('Error checking rating status:', error);
    }
}

// Update rating stars display
function updateRatingStars(rating) {
    const stars = userRating.querySelectorAll('i');
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    stars.forEach((star, index) => {
        if (index < fullStars) {
            star.className = 'fas fa-star';
        } else if (index === fullStars && hasHalfStar) {
            star.className = 'fas fa-star-half-alt';
        } else {
            star.className = 'far fa-star';
        }
    });
}

// Highlight user's own rating
function highlightUserRating(rating) {
    const stars = userRating.querySelectorAll('i');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('user-rated');
        } else {
            star.classList.remove('user-rated');
        }
    });
}

// Load user posts
async function loadUserPosts() {
    userPosts.innerHTML = '<div class="loading">Đang tải bài viết...</div>';
    
    try {
        // Get wall posts
        const wallPostsRef = firebase.database().ref('wallPosts').orderByChild('recipientId').equalTo(viewedUserId);
        const wallPostsSnapshot = await wallPostsRef.once('value');
        
        // Get forum posts
        const forumPostsRef = firebase.database().ref('posts').orderByChild('authorId').equalTo(viewedUserId);
        const forumPostsSnapshot = await forumPostsRef.once('value');
        
        const posts = [];
        
        // Process wall posts
        if (wallPostsSnapshot.exists()) {
            wallPostsSnapshot.forEach(childSnapshot => {
                posts.push({
                    id: childSnapshot.key,
                    type: 'wall',
                    ...childSnapshot.val()
                });
            });
        }
        
        // Process forum posts
        if (forumPostsSnapshot.exists()) {
            forumPostsSnapshot.forEach(childSnapshot => {
                posts.push({
                    id: childSnapshot.key,
                    type: 'forum',
                    ...childSnapshot.val()
                });
            });
        }
        
        // Sort posts by creation time (newest first)
        posts.sort((a, b) => b.createdAt - a.createdAt);
        
        // Render posts
        if (posts.length > 0) {
            userPosts.innerHTML = '';
            
            posts.forEach(post => {
                renderPost(post);
            });
        } else {
            userPosts.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <p>Chưa có bài viết nào</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading user posts:', error);
        userPosts.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Đã xảy ra lỗi khi tải bài viết</p>
            </div>
        `;
    }
}

// Render a single post
async function renderPost(post) {
    const postElement = document.createElement('div');
    postElement.className = 'wall-post';
    postElement.dataset.id = post.id;
    postElement.dataset.type = post.type;
    
    // Format time
    const createdAt = post.createdAt ? formatTimestamp(post.createdAt) : 'Vừa xong';
    
    // Get author info
    let authorName = 'Người dùng';
    let authorPhoto = 'https://ui-avatars.com/api/?name=User';
    
    if (post.authorId) {
        try {
            const authorRef = firebase.database().ref(`users/${post.authorId}`);
            const authorSnapshot = await authorRef.once('value');
            const authorData = authorSnapshot.val();
            
            if (authorData) {
                authorName = authorData.displayName || 'Người dùng';
                authorPhoto = authorData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}`;
            }
        } catch (error) {
            console.error('Error getting author info:', error);
        }
    }
    
    // Create post HTML
    let postContent = '';
    
    if (post.type === 'wall') {
        postContent = `
            <div class="post-header">
                <img src="${authorPhoto}" alt="${authorName}" class="post-avatar">
                <div class="post-info">
                    <h3 class="post-author">${authorName}</h3>
                    <span class="post-time">${createdAt}</span>
                </div>
                ${post.authorId === currentUser?.uid ? `
                    <div class="post-actions">
                        <button class="btn-icon delete-post" data-id="${post.id}" data-type="${post.type}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
            <div class="post-content">
                <p>${formatPostContent(post.content)}</p>
                ${post.imageUrl ? `<div class="post-image"><img src="${post.imageUrl}" alt="Post image"></div>` : ''}
            </div>
            <div class="post-footer">
                <button class="post-action like-action ${post.likedBy && post.likedBy[currentUser?.uid] ? 'active' : ''}" data-id="${post.id}" data-type="${post.type}">
                    <i class="${post.likedBy && post.likedBy[currentUser?.uid] ? 'fas' : 'far'} fa-heart"></i>
                    <span>${Object.keys(post.likedBy || {}).length || 0}</span>
                </button>
                <button class="post-action comment-action" data-id="${post.id}" data-type="${post.type}">
                    <i class="far fa-comment"></i>
                    <span>${Object.keys(post.comments || {}).length || 0}</span>
                </button>
            </div>
        `;
    } else if (post.type === 'forum') {
        postContent = `
            <div class="post-header">
                <img src="${authorPhoto}" alt="${authorName}" class="post-avatar">
                <div class="post-info">
                    <h3 class="post-author">${authorName}</h3>
                    <span class="post-time">${createdAt}</span>
                </div>
            </div>
            <div class="post-content">
                <h3 class="forum-post-title">${post.title}</h3>
                <p>${post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}</p>
                ${post.imageUrl ? `<div class="post-image"><img src="${post.imageUrl}" alt="Post image"></div>` : ''}
            </div>
            <div class="post-footer">
                <div class="post-stats">
                    <span><i class="fas fa-heart"></i> ${post.likes || 0}</span>
                    <span><i class="fas fa-comment"></i> ${post.comments || 0}</span>
                    <span><i class="fas fa-eye"></i> ${post.views || 0}</span>
                </div>
                <a href="forum.html" class="view-in-forum">Xem trong diễn đàn</a>
            </div>
        `;
    }
    
    postElement.innerHTML = postContent;
    
    // Add event listeners
    if (post.type === 'wall') {
        const likeBtn = postElement.querySelector('.like-action');
        if (likeBtn && currentUser) {
            likeBtn.addEventListener('click', () => handleLikePost(post.id, post.type));
        }
        
        const deleteBtn = postElement.querySelector('.delete-post');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => handleDeletePost(post.id, post.type));
        }
    }
    
    userPosts.appendChild(postElement);
}

// Format post content with line breaks
function formatPostContent(content) {
    if (!content) return '';
    return content.replace(/\n/g, '<br>');
}

// Handle like post
async function handleLikePost(postId, postType) {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để thích bài viết', 'error');
        return;
    }
    
    try {
        const postRef = firebase.database().ref(`${postType === 'wall' ? 'wallPosts' : 'posts'}/${postId}/likedBy/${currentUser.uid}`);
        const snapshot = await postRef.once('value');
        
        if (snapshot.exists()) {
            // Unlike
            await postRef.remove();
        } else {
            // Like
            await postRef.set(true);
        }
        
        // Reload posts
        loadUserPosts();
    } catch (error) {
        console.error('Error liking post:', error);
        showNotification('Đã xảy ra lỗi khi thích bài viết', 'error');
    }
}

// Handle delete post
async function handleDeletePost(postId, postType) {
    if (!currentUser) return;
    
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
        try {
            const postRef = firebase.database().ref(`${postType === 'wall' ? 'wallPosts' : 'posts'}/${postId}`);
            await postRef.remove();
            
            showNotification('Đã xóa bài viết thành công', 'success');
            
            // Reload posts
            loadUserPosts();
        } catch (error) {
            console.error('Error deleting post:', error);
            showNotification('Đã xảy ra lỗi khi xóa bài viết', 'error');
        }
    }
}

// Load watched movies
async function loadWatchedMovies() {
    userMovies.innerHTML = '<div class="loading">Đang tải danh sách phim...</div>';
    
    try {
        const watchHistoryRef = firebase.database().ref('watchHistory').orderByChild('userId').equalTo(viewedUserId);
        const watchHistorySnapshot = await watchHistoryRef.once('value');
        
        if (watchHistorySnapshot.exists()) {
            const watchHistory = [];
            
            watchHistorySnapshot.forEach(childSnapshot => {
                watchHistory.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by watch date (newest first)
            watchHistory.sort((a, b) => b.watchedAt - a.watchedAt);
            
            // Render movies
            userMovies.innerHTML = '';
            
            const moviesGrid = document.createElement('div');
            moviesGrid.className = 'movies-grid';
            
            for (const item of watchHistory) {
                // Get movie details
                try {
                    const movieRef = firebase.database().ref(`movies/${item.movieId}`);
                    const movieSnapshot = await movieRef.once('value');
                    const movieData = movieSnapshot.val();
                    
                    if (movieData) {
                        const movieElement = document.createElement('div');
                        movieElement.className = 'movie-card';
                        
                        movieElement.innerHTML = `
                            <div class="movie-poster">
                                <img src="${movieData.poster || 'https://via.placeholder.com/150x225?text=No+Poster'}" alt="${movieData.title}">
                            </div>
                            <div class="movie-info">
                                <h3>${movieData.title}</h3>
                                <p>${formatTimestamp(item.watchedAt)}</p>
                            </div>
                        `;
                        
                        moviesGrid.appendChild(movieElement);
                    }
                } catch (error) {
                    console.error('Error getting movie details:', error);
                }
            }
            
            userMovies.appendChild(moviesGrid);
            
            if (moviesGrid.children.length === 0) {
                userMovies.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-film"></i>
                        <p>Chưa có phim nào được xem</p>
                    </div>
                `;
            }
        } else {
            userMovies.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-film"></i>
                    <p>Chưa có phim nào được xem</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading watched movies:', error);
        userMovies.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Đã xảy ra lỗi khi tải danh sách phim</p>
            </div>
        `;
    }
}

// Load user reviews
async function loadUserReviews() {
    userReviews.innerHTML = '<div class="loading">Đang tải đánh giá...</div>';
    
    try {
        const reviewsRef = firebase.database().ref('reviews').orderByChild('userId').equalTo(viewedUserId);
        const reviewsSnapshot = await reviewsRef.once('value');
        
        if (reviewsSnapshot.exists()) {
            const reviews = [];
            
            reviewsSnapshot.forEach(childSnapshot => {
                reviews.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by creation date (newest first)
            reviews.sort((a, b) => b.createdAt - a.createdAt);
            
            // Render reviews
            userReviews.innerHTML = '';
            
            for (const review of reviews) {
                // Get movie details
                try {
                    const movieRef = firebase.database().ref(`movies/${review.movieId}`);
                    const movieSnapshot = await movieRef.once('value');
                    const movieData = movieSnapshot.val();
                    
                    if (movieData) {
                        const reviewElement = document.createElement('div');
                        reviewElement.className = 'review-card';
                        
                        reviewElement.innerHTML = `
                            <div class="review-header">
                                <div class="review-movie">
                                    <img src="${movieData.poster || 'https://via.placeholder.com/50x75?text=No+Poster'}" alt="${movieData.title}">
                                    <div>
                                        <h3>${movieData.title}</h3>
                                        <div class="review-rating">
                                            ${generateStarRating(review.rating)}
                                        </div>
                                    </div>
                                </div>
                                <div class="review-date">${formatTimestamp(review.createdAt)}</div>
                            </div>
                            <div class="review-content">
                                <p>${review.content}</p>
                            </div>
                        `;
                        
                        userReviews.appendChild(reviewElement);
                    }
                } catch (error) {
                    console.error('Error getting movie details for review:', error);
                }
            }
            
            if (userReviews.children.length === 0) {
                userReviews.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-star"></i>
                        <p>Chưa có đánh giá nào</p>
                    </div>
                `;
            }
        } else {
            userReviews.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <p>Chưa có đánh giá nào</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading user reviews:', error);
        userReviews.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Đã xảy ra lỗi khi tải đánh giá</p>
            </div>
        `;
    }
}

// Generate star rating HTML
function generateStarRating(rating) {
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            starsHtml += '<i class="fas fa-star"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            starsHtml += '<i class="fas fa-star-half-alt"></i>';
        } else {
            starsHtml += '<i class="far fa-star"></i>';
        }
    }
    
    return starsHtml;
}

// Load user achievements
async function loadUserAchievements() {
    const userAchievementsGrid = document.getElementById('userAchievementsGrid');
    userAchievementsGrid.innerHTML = '<div class="loading">Đang tải thành tựu...</div>';
    
    try {
        // Tải dữ liệu người dùng từ mini-game trồng cây
        const plantGameRef = firebase.database().ref(`plantGame/${viewedUserId}`);
        const snapshot = await plantGameRef.once('value');
        const plantGameData = snapshot.val();
        
        if (!plantGameData) {
            userAchievementsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <p>Chưa có thành tựu nào từ mini-game trồng cây</p>
                </div>
            `;
            return;
        }
        
        // Tải danh sách thành tựu từ mini-game
        const achievements = await loadAchievementDefinitions();
        
        // Lấy thành tựu đã mở khóa của người dùng
        const userAchievements = plantGameData.achievements || [];
        
        // Tạo dữ liệu người dùng để tính toán tiến trình
        const userData = {
            plants: plantGameData.plants || [],
            stats: plantGameData.stats || {},
            resources: plantGameData.resources || {},
            gardenSize: plantGameData.gardenSize || 9
        };
        
        // Render thành tựu
        userAchievementsGrid.innerHTML = '';
        
        if (achievements.length > 0) {
            achievements.forEach(achievement => {
                const achievementCard = document.createElement('div');
                achievementCard.className = 'achievement-card';
                
                // Kiểm tra xem thành tựu đã mở khóa chưa
                const isUnlocked = userAchievements.some(a => a.id === achievement.id);
                if (!isUnlocked) {
                    achievementCard.classList.add('locked');
                }
                
                // Tính toán tiến trình
                const progress = achievement.progress(userData);
                const progressPercent = Math.min(100, (progress / achievement.total) * 100);
                
                achievementCard.innerHTML = `
                    <div class="achievement-icon">
                        <i class="fas ${achievement.icon}"></i>
                    </div>
                    <div class="achievement-info">
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-progress">
                            <div class="achievement-progress-bar" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="achievement-progress-text">${progress}/${achievement.total}</div>
                        ${isUnlocked ? `<div class="achievement-reward">Phần thưởng: ${achievement.reward.coins} xu</div>` : ''}
                    </div>
                `;
                
                userAchievementsGrid.appendChild(achievementCard);
            });
        } else {
            userAchievementsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <p>Chưa có thành tựu nào từ mini-game trồng cây</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading user achievements:', error);
        userAchievementsGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Đã xảy ra lỗi khi tải thành tựu</p>
            </div>
        `;
    }
}

// Load achievement definitions
async function loadAchievementDefinitions() {
    // Định nghĩa thành tựu từ mini-game trồng cây
    return [
        {
            id: 'first_plant',
            title: 'Người Trồng Cây Đầu Tiên',
            description: 'Trồng cây đầu tiên của bạn',
            icon: 'fa-seedling',
            reward: { coins: 10 },
            condition: (userData) => userData.plants && userData.plants.length >= 1,
            progress: (userData) => userData.plants ? Math.min(userData.plants.length, 1) : 0,
            total: 1
        },
        {
            id: 'plant_collector',
            title: 'Sưu Tầm Cây',
            description: 'Trồng 5 loại cây khác nhau',
            icon: 'fa-leaf',
            reward: { coins: 50 },
            condition: (userData) => {
                if (!userData.plants) return false;
                const uniquePlantTypes = new Set(userData.plants.map(plant => plant.typeId));
                return uniquePlantTypes.size >= 5;
            },
            progress: (userData) => {
                if (!userData.plants) return 0;
                const uniquePlantTypes = new Set(userData.plants.map(plant => plant.typeId));
                return Math.min(uniquePlantTypes.size, 5);
            },
            total: 5
        },
        {
            id: 'water_master',
            title: 'Bậc Thầy Tưới Nước',
            description: 'Tưới nước cho cây 20 lần',
            icon: 'fa-tint',
            reward: { coins: 30 },
            condition: (userData) => userData.stats && userData.stats.wateringCount >= 20,
            progress: (userData) => userData.stats ? Math.min(userData.stats.wateringCount || 0, 20) : 0,
            total: 20
        },
        {
            id: 'harvest_king',
            title: 'Vua Thu Hoạch',
            description: 'Thu hoạch 10 cây trưởng thành',
            icon: 'fa-hand-holding-heart',
            reward: { coins: 100 },
            condition: (userData) => userData.stats && userData.stats.harvestCount >= 10,
            progress: (userData) => userData.stats ? Math.min(userData.stats.harvestCount || 0, 10) : 0,
            total: 10
        },
        {
            id: 'garden_expander',
            title: 'Mở Rộng Vườn',
            description: 'Mở rộng vườn của bạn đến kích thước tối đa',
            icon: 'fa-expand',
            reward: { coins: 200 },
            condition: (userData) => userData.gardenSize >= 16,
            progress: (userData) => Math.min((userData.gardenSize || 9) - 9, 7),
            total: 7
        },
        {
            id: 'rich_gardener',
            title: 'Nhà Vườn Giàu Có',
            description: 'Sở hữu 500 xu',
            icon: 'fa-coins',
            reward: { coins: 50 },
            condition: (userData) => userData.resources && userData.resources.coins >= 500,
            progress: (userData) => userData.resources ? Math.min(userData.resources.coins || 0, 500) : 0,
            total: 500
        },
        {
            id: 'legendary_collector',
            title: 'Sưu Tầm Huyền Thoại',
            description: 'Sở hữu một cây huyền thoại',
            icon: 'fa-crown',
            reward: { coins: 300 },
            condition: (userData) => {
                if (!userData.plants) return false;
                return userData.plants.some(plant => {
                    // Giả định rằng cây huyền thoại có id bắt đầu bằng 'legendary_'
                    return plant.typeId && plant.typeId.startsWith('legendary_');
                });
            },
            progress: (userData) => {
                if (!userData.plants) return 0;
                return userData.plants.some(plant => plant.typeId && plant.typeId.startsWith('legendary_')) ? 1 : 0;
            },
            total: 1
        },
        {
            id: 'social_gardener',
            title: 'Nhà Vườn Xã Hội',
            description: 'Thăm vườn của 5 người bạn',
            icon: 'fa-users',
            reward: { coins: 50 },
            condition: (userData) => userData.stats && userData.stats.friendGardensVisited >= 5,
            progress: (userData) => userData.stats ? Math.min(userData.stats.friendGardensVisited || 0, 5) : 0,
            total: 5
        }
    ];
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const activitiesRef = firebase.database().ref(`userActivities/${viewedUserId}`);
        const snapshot = await activitiesRef.orderByChild('timestamp').limitToLast(10).once('value');
        
        if (snapshot.exists()) {
            // Clear activity list
            viewRecentActivity.innerHTML = '';
            
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
                    case 'forum':
                        icon = 'fas fa-comments';
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
                
                viewRecentActivity.appendChild(activityItem);
            });
        } else {
            // Show empty state
            viewRecentActivity.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Chưa có hoạt động nào gần đây</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading user activity:', error);
        viewRecentActivity.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Đã xảy ra lỗi khi tải hoạt động</p>
            </div>
        `;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Follow button
    if (followBtn && currentUser && currentUser.uid !== viewedUserId) {
        followBtn.addEventListener('click', handleFollow);
    }
    
    // Message button
    if (messageBtn && currentUser && currentUser.uid !== viewedUserId) {
        messageBtn.addEventListener('click', openMessageModal);
    }
    
    // View my profile button
    if (viewMyProfileBtn && currentUser) {
        viewMyProfileBtn.addEventListener('click', () => {
            window.location.href = `user-profile.html?id=${currentUser.uid}`;
        });
    }
    
    // Rating stars
    const stars = userRating.querySelectorAll('i');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            if (!currentUser) {
                showNotification('Vui lòng đăng nhập để đánh giá', 'error');
                return;
            }
            
            if (currentUser.uid === viewedUserId) {
                showNotification('Bạn không thể đánh giá chính mình', 'error');
                return;
            }
            
            const rating = parseInt(star.getAttribute('data-rating'));
            rateUser(rating);
        });
        
        // Hover effect
        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.className = 'fas fa-star hover';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
        
        star.addEventListener('mouseout', () => {
            updateRatingStars(userRatingValue);
        });
    });
    
    // Create wall post button
    if (createWallPostBtn && currentUser) {
        createWallPostBtn.addEventListener('click', openCreateWallPostModal);
    }
    
    // Create wall post form
    const createWallPostForm = document.getElementById('createWallPostForm');
    if (createWallPostForm) {
        createWallPostForm.addEventListener('submit', handleCreateWallPost);
    }
    
    // Send message form
    const sendMessageForm = document.getElementById('sendMessageForm');
    if (sendMessageForm) {
        sendMessageForm.addEventListener('submit', handleSendMessage);
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.modal .close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Handle follow/unfollow
async function handleFollow() {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để theo dõi', 'error');
        return;
    }
    
    if (currentUser.uid === viewedUserId) {
        showNotification('Bạn không thể theo dõi chính mình', 'error');
        return;
    }
    
    try {
        const followRef = firebase.database().ref(`followers/${viewedUserId}/${currentUser.uid}`);
        
        if (isFollowing) {
            // Unfollow
            await followRef.remove();
            isFollowing = false;
            followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Theo dõi';
            followBtn.classList.remove('following');
            showNotification('Đã hủy theo dõi', 'success');
        } else {
            // Follow
            await followRef.set({
                followerId: currentUser.uid,
                followerName: currentUser.displayName || 'Người dùng',
                followedAt: firebase.database.ServerValue.TIMESTAMP
            });
            isFollowing = true;
            followBtn.innerHTML = '<i class="fas fa-user-check"></i> Đang theo dõi';
            followBtn.classList.add('following');
            showNotification('Đã theo dõi thành công', 'success');
            
            // Update followers count
            const followersRef = firebase.database().ref(`followers/${viewedUserId}`);
            const followersSnapshot = await followersRef.once('value');
            const followersCount = followersSnapshot.exists() ? Object.keys(followersSnapshot.val()).length : 0;
            viewFollowers.textContent = followersCount;
        }
    } catch (error) {
        console.error('Error following/unfollowing user:', error);
        showNotification('Đã xảy ra lỗi', 'error');
    }
}

// Rate user
async function rateUser(rating) {
    if (!currentUser || currentUser.uid === viewedUserId) return;
    
    try {
        const ratingRef = firebase.database().ref(`ratings/${viewedUserId}/${currentUser.uid}`);
        
        await ratingRef.set({
            rating: rating,
            raterId: currentUser.uid,
            raterName: currentUser.displayName || 'Người dùng',
            ratedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        userRatingValue = rating;
        highlightUserRating(rating);
        showNotification('Đã đánh giá thành công', 'success');
        
        // Reload user stats to update average rating
        loadUserStats();
    } catch (error) {
        console.error('Error rating user:', error);
        showNotification('Đã xảy ra lỗi khi đánh giá', 'error');
    }
}

// Open create wall post modal
function openCreateWallPostModal() {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để đăng bài', 'error');
        return;
    }
    
    const createWallPostModal = document.getElementById('createWallPostModal');
    createWallPostModal.style.display = 'block';
}

// Open message modal
function openMessageModal() {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để gửi tin nhắn', 'error');
        return;
    }
    
    if (currentUser.uid === viewedUserId) {
        showNotification('Bạn không thể gửi tin nhắn cho chính mình', 'error');
        return;
    }
    
    const messageModal = document.getElementById('messageModal');
    messageModal.style.display = 'block';
    document.getElementById('messageContent').focus();
}

// Setup Cloudinary widget for wall posts
function setupWallCloudinaryWidget() {
    // Use Cloudinary config from firebase-config.js
    const cloudName = cloudinaryConfig.cloudName || 'demo';
    const uploadPreset = cloudinaryConfig.uploadPreset || 'ml_default';
    
    wallCloudinaryWidget = cloudinary.createUploadWidget(
        {
            cloudName: cloudName,
            uploadPreset: uploadPreset,
            maxFiles: 1,
            sources: ['local', 'url', 'camera'],
            resourceType: 'image',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
            maxFileSize: 5000000, // 5MB
            showAdvancedOptions: false,
            cropping: false,
            multiple: false,
            defaultSource: 'local',
            styles: {
                palette: {
                    window: '#FFFFFF',
                    windowBorder: '#90A0B3',
                    tabIcon: '#0078FF',
                    menuIcons: '#5A616A',
                    textDark: '#000000',
                    textLight: '#FFFFFF',
                    link: '#0078FF',
                    action: '#FF620C',
                    inactiveTabIcon: '#0E2F5A',
                    error: '#F44235',
                    inProgress: '#0078FF',
                    complete: '#20B832',
                    sourceBg: '#E4EBF1'
                },
                fonts: {
                    default: null,
                    "'Poppins', sans-serif": {
                        url: 'https://fonts.googleapis.com/css?family=Poppins',
                        active: true
                    }
                }
            }
        },
        (error, result) => {
            if (!error && result && result.event === 'success') {
                const imageUrl = result.info.secure_url;
                document.getElementById('wallPostImageUrl').value = imageUrl;
                document.getElementById('wallImagePreview').src = imageUrl;
                document.getElementById('wallImagePreviewContainer').style.display = 'block';
            }
        }
    );

    // Upload image button
    document.getElementById('wallUploadImageBtn').addEventListener('click', () => {
        wallCloudinaryWidget.open();
    });

    // Remove image button
    document.getElementById('wallRemoveImageBtn').addEventListener('click', () => {
        document.getElementById('wallPostImageUrl').value = '';
        document.getElementById('wallImagePreviewContainer').style.display = 'none';
    });
}

// Handle create wall post
async function handleCreateWallPost(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để đăng bài', 'error');
        return;
    }
    
    const content = document.getElementById('wallPostContent').value.trim();
    const imageUrl = document.getElementById('wallPostImageUrl').value;
    
    if (!content && !imageUrl) {
        showNotification('Vui lòng nhập nội dung hoặc thêm ảnh', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Đang đăng...';
        submitBtn.disabled = true;
        
        // Create wall post
        const wallPostRef = firebase.database().ref('wallPosts').push();
        
        await wallPostRef.set({
            content: content,
            imageUrl: imageUrl || null,
            authorId: currentUser.uid,
            recipientId: viewedUserId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            likedBy: {}
        });
        
        // Reset form
        document.getElementById('wallPostContent').value = '';
        document.getElementById('wallPostImageUrl').value = '';
        document.getElementById('wallImagePreviewContainer').style.display = 'none';
        
        // Close modal
        document.getElementById('createWallPostModal').style.display = 'none';
        
        // Show success message
        showNotification('Đã đăng bài thành công', 'success');
        
        // Reload posts
        loadUserPosts();
    } catch (error) {
        console.error('Error creating wall post:', error);
        showNotification('Đã xảy ra lỗi khi đăng bài', 'error');
    } finally {
        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Đăng bài';
        submitBtn.disabled = false;
    }
}

// Handle send message
async function handleSendMessage(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để gửi tin nhắn', 'error');
        return;
    }
    
    if (currentUser.uid === viewedUserId) {
        showNotification('Bạn không thể gửi tin nhắn cho chính mình', 'error');
        return;
    }
    
    const content = document.getElementById('messageContent').value.trim();
    
    if (!content) {
        showNotification('Vui lòng nhập nội dung tin nhắn', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Đang gửi...';
        submitBtn.disabled = true;
        
        // Check if chat exists
        const chatsRef = firebase.database().ref('chats');
        const chatsSnapshot = await chatsRef.once('value');
        let chatId = null;
        
        if (chatsSnapshot.exists()) {
            // Find existing chat
            chatsSnapshot.forEach(childSnapshot => {
                const chat = childSnapshot.val();
                if (chat.participants && 
                    chat.participants[currentUser.uid] && 
                    chat.participants[viewedUserId]) {
                    chatId = childSnapshot.key;
                    return true; // Break forEach loop
                }
            });
        }
        
        if (!chatId) {
            // Create new chat
            const newChatRef = chatsRef.push();
            chatId = newChatRef.key;
            
            await newChatRef.set({
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                participants: {
                    [currentUser.uid]: true,
                    [viewedUserId]: true
                },
                lastMessage: {
                    content: content,
                    senderId: currentUser.uid,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }
            });
        } else {
            // Update last message
            await firebase.database().ref(`chats/${chatId}/lastMessage`).set({
                content: content,
                senderId: currentUser.uid,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        // Add message to chat
        const messageRef = firebase.database().ref(`chats/${chatId}/messages`).push();
        
        await messageRef.set({
            content: content,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'Người dùng',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: {
                [currentUser.uid]: true
            }
        });
        
        // Reset form
        document.getElementById('messageContent').value = '';
        
        // Close modal
        document.getElementById('messageModal').style.display = 'none';
        
        // Show success message
        showNotification('Đã gửi tin nhắn thành công', 'success');
        
        // Redirect to chat page
        setTimeout(() => {
            window.location.href = `chat.html?chat=${chatId}`;
        }, 1000);
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Đã xảy ra lỗi khi gửi tin nhắn', 'error');
    } finally {
        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Gửi';
        submitBtn.disabled = false;
    }
}

// Format timestamp to readable time
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Vừa xong';
    
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

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(notification);
    
    // Add active class after a small delay to trigger animation
    setTimeout(() => {
        notification.classList.add('active');
    }, 10);
    
    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('active');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('active');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

// Toggle dark mode
function toggleDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}