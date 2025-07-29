// Forum.js - Xử lý logic cho trang diễn đàn

// Biến toàn cục
let currentUser = null;
let currentPostId = null;
let cloudinaryWidget = null;
let editCloudinaryWidget = null;
let videoCloudinaryWidget = null;
let editVideoCloudinaryWidget = null;
let postsData = [];
let currentCategory = 'all';
let currentSort = 'newest';
let searchQuery = '';

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra người dùng đã đăng nhập chưa
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            setupUI(user);
        } else {
            setupUI(null);
        }
        // Tải bài viết sau khi kiểm tra đăng nhập
        loadPosts();
    });

    // Thiết lập Cloudinary widget cho tạo bài viết mới
    setupCloudinaryWidget();
    setupVideoCloudinaryWidget();
    
    // Thiết lập Cloudinary widget cho chỉnh sửa bài viết
    setupEditCloudinaryWidget();
    setupEditVideoCloudinaryWidget();

    // Thiết lập các sự kiện
    setupEventListeners();
});

// Thiết lập giao diện người dùng dựa trên trạng thái đăng nhập
function setupUI(user) {
    const createPostBtn = document.getElementById('createPostBtn');
    const authButtons = document.querySelector('.auth-buttons');
    
    if (user) {
        // Người dùng đã đăng nhập
        createPostBtn.style.display = 'block';
        
        // Lấy dữ liệu người dùng từ database
        firebase.database().ref(`users/${user.uid}`).once('value')
            .then(snapshot => {
                const userData = snapshot.exists() ? snapshot.val() : {};
                
                // Kiểm tra nếu người dùng là admin (email là micovan108@gmail.com)
                const isUserAdmin = userData && userData.email === 'micovan108@gmail.com';
                
                // Hiển thị các nút quản lý bài viết nếu là admin
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = isUserAdmin ? 'block' : 'none';
                });
                
                // Hiển thị thông tin người dùng trong header
                if (authButtons) {
                    // Xóa nội dung cũ
                    authButtons.innerHTML = '';
                    
                    // Tạo phần tử hiển thị thông tin người dùng
                    const userProfile = document.createElement('div');
                    userProfile.className = 'user-profile';
                    userProfile.innerHTML = `
                        <img src="${userData.photoURL || user.photoURL || 'https://via.placeholder.com/150'}" alt="${userData.displayName || user.displayName}">
                        <span>${userData.displayName || user.displayName}</span>
                        <div class="mini-coins">
                            <i class="fas fa-coins"></i> <span id="miniCoins">${userData.miniCoins || 0}</span>
                        </div>
                        <div class="dropdown-content">
                            <a href="#" id="myRoomsBtn">Phòng Của Tôi</a>
                            <a href="#" id="profileBtn">Hồ Sơ</a>
                            ${userData.email === 'micovan108@gmail.com' ? '<a href="admin.html" id="adminBtn">Quản Trị</a>' : ''}
                            <a href="#" id="logoutBtn">Đăng Xuất</a>
                        </div>
                    `;
                    
                    // Thêm vào DOM
                    authButtons.appendChild(userProfile);
                    
                    // Thêm sự kiện đăng xuất
                    document.getElementById('logoutBtn').addEventListener('click', () => {
                        firebase.auth().signOut();
                    });
                }
            });
    } else {
        // Người dùng chưa đăng nhập
        createPostBtn.style.display = 'none';
        
        // Hiển thị nút đăng nhập và đăng ký
        if (authButtons) {
            authButtons.innerHTML = '';
            
            const loginButton = document.createElement('button');
            loginButton.id = 'loginBtn';
            loginButton.className = 'btn';
            loginButton.textContent = 'Đăng Nhập';
            loginButton.addEventListener('click', () => {
                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.style.display = 'block';
            });
            
            const signupButton = document.createElement('button');
            signupButton.id = 'signupBtn';
            signupButton.className = 'btn btn-primary';
            signupButton.textContent = 'Đăng Ký';
            signupButton.addEventListener('click', () => {
                const signupModal = document.getElementById('signupModal');
                if (signupModal) signupModal.style.display = 'block';
            });
            
            // Thêm nút chuyển đổi chế độ sáng/tối
            const darkModeToggle = document.createElement('button');
            darkModeToggle.id = 'darkModeToggle';
            darkModeToggle.className = 'btn btn-icon';
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            darkModeToggle.addEventListener('click', toggleDarkMode);
            
            authButtons.appendChild(loginButton);
            authButtons.appendChild(signupButton);
            authButtons.appendChild(darkModeToggle);
        }
        
        // Ẩn các nút quản lý bài viết
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Thiết lập Cloudinary widget cho tạo bài viết mới
function setupCloudinaryWidget() {
    // Sử dụng cấu hình Cloudinary từ firebase-config.js
    const cloudName = cloudinaryConfig.cloudName || 'demo';
    const uploadPreset = cloudinaryConfig.uploadPreset || 'ml_default';
    
    cloudinaryWidget = cloudinary.createUploadWidget(
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
                document.getElementById('postImageUrl').value = imageUrl;
                document.getElementById('imagePreview').src = imageUrl;
                document.getElementById('imagePreviewContainer').style.display = 'block';
            }
        }
    );

    // Sự kiện nút tải lên hình ảnh
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
        cloudinaryWidget.open();
    });

    // Sự kiện nút xóa hình ảnh
    document.getElementById('removeImageBtn').addEventListener('click', () => {
        document.getElementById('postImageUrl').value = '';
        document.getElementById('imagePreviewContainer').style.display = 'none';
    });
    
    // Thiết lập sự kiện chuyển đổi giữa hình ảnh và video
    document.getElementById('selectImageBtn').addEventListener('click', () => {
        document.getElementById('selectImageBtn').classList.add('active');
        document.getElementById('selectVideoBtn').classList.remove('active');
        document.getElementById('imageUploadContainer').style.display = 'block';
        document.getElementById('videoUploadContainer').style.display = 'none';
    });
    
    document.getElementById('selectVideoBtn').addEventListener('click', () => {
        document.getElementById('selectVideoBtn').classList.add('active');
        document.getElementById('selectImageBtn').classList.remove('active');
        document.getElementById('videoUploadContainer').style.display = 'block';
        document.getElementById('imageUploadContainer').style.display = 'none';
    });
}

// Thiết lập Cloudinary Widget cho video
function setupVideoCloudinaryWidget() {
    // Sử dụng cấu hình Cloudinary từ firebase-config.js
    const cloudName = cloudinaryConfig.cloudName || 'demo';
    const uploadPreset = cloudinaryConfig.uploadPreset || 'ml_default';
    
    videoCloudinaryWidget = cloudinary.createUploadWidget(
        {
            cloudName: cloudName,
            uploadPreset: uploadPreset,
            maxFiles: 1,
            sources: ['local', 'url'],
            resourceType: 'video',
            clientAllowedFormats: ['mp4', 'mov', 'avi', 'webm'],
            maxFileSize: 100000000, // 100MB
            showAdvancedOptions: false,
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
                const videoUrl = result.info.secure_url;
                const videoPublicId = result.info.public_id;
                document.getElementById('postVideoUrl').value = videoUrl;
                document.getElementById('postVideoPublicId').value = videoPublicId;
                document.getElementById('videoPreview').src = videoUrl;
                document.getElementById('videoPreviewContainer').style.display = 'block';
            }
        }
    );

    // Sự kiện nút tải lên video
    document.getElementById('uploadVideoBtn').addEventListener('click', () => {
        videoCloudinaryWidget.open();
    });

    // Sự kiện nút xóa video
    document.getElementById('removeVideoBtn').addEventListener('click', () => {
        document.getElementById('postVideoUrl').value = '';
        document.getElementById('postVideoPublicId').value = '';
        document.getElementById('videoPreviewContainer').style.display = 'none';
    });
}

// Thiết lập Cloudinary widget cho chỉnh sửa bài viết
function setupEditCloudinaryWidget() {
    // Sử dụng cấu hình Cloudinary từ firebase-config.js
    const cloudName = cloudinaryConfig.cloudName || 'demo';
    const uploadPreset = cloudinaryConfig.uploadPreset || 'ml_default';
    
    editCloudinaryWidget = cloudinary.createUploadWidget(
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
                document.getElementById('editPostImageUrl').value = imageUrl;
                document.getElementById('editImagePreview').src = imageUrl;
                document.getElementById('editImagePreviewContainer').style.display = 'block';
            }
        }
    );

    // Sự kiện nút tải lên hình ảnh
    document.getElementById('editUploadImageBtn').addEventListener('click', () => {
        editCloudinaryWidget.open();
    });

    // Sự kiện nút xóa hình ảnh
    document.getElementById('editRemoveImageBtn').addEventListener('click', () => {
        document.getElementById('editPostImageUrl').value = '';
        document.getElementById('editImagePreviewContainer').style.display = 'none';
    });
    
    // Thiết lập sự kiện chuyển đổi giữa hình ảnh và video trong form chỉnh sửa
    document.getElementById('editSelectImageBtn').addEventListener('click', () => {
        document.getElementById('editSelectImageBtn').classList.add('active');
        document.getElementById('editSelectVideoBtn').classList.remove('active');
        document.getElementById('editImageUploadContainer').style.display = 'block';
        document.getElementById('editVideoUploadContainer').style.display = 'none';
    });
    
    document.getElementById('editSelectVideoBtn').addEventListener('click', () => {
        document.getElementById('editSelectVideoBtn').classList.add('active');
        document.getElementById('editSelectImageBtn').classList.remove('active');
        document.getElementById('editVideoUploadContainer').style.display = 'block';
        document.getElementById('editImageUploadContainer').style.display = 'none';
    });
}

// Thiết lập Cloudinary Widget cho video trong form chỉnh sửa
function setupEditVideoCloudinaryWidget() {
    // Sử dụng cấu hình Cloudinary từ firebase-config.js
    const cloudName = cloudinaryConfig.cloudName || 'demo';
    const uploadPreset = cloudinaryConfig.uploadPreset || 'ml_default';
    
    editVideoCloudinaryWidget = cloudinary.createUploadWidget(
        {
            cloudName: cloudName,
            uploadPreset: uploadPreset,
            maxFiles: 1,
            sources: ['local', 'url'],
            resourceType: 'video',
            clientAllowedFormats: ['mp4', 'mov', 'avi', 'webm'],
            maxFileSize: 100000000, // 100MB
            showAdvancedOptions: false,
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
                const videoUrl = result.info.secure_url;
                const videoPublicId = result.info.public_id;
                document.getElementById('editPostVideoUrl').value = videoUrl;
                document.getElementById('editPostVideoPublicId').value = videoPublicId;
                document.getElementById('editVideoPreview').src = videoUrl;
                document.getElementById('editVideoPreviewContainer').style.display = 'block';
            }
        }
    );

    // Sự kiện nút tải lên video
    document.getElementById('editUploadVideoBtn').addEventListener('click', () => {
        editVideoCloudinaryWidget.open();
    });

    // Sự kiện nút xóa video
    document.getElementById('editRemoveVideoBtn').addEventListener('click', () => {
        document.getElementById('editPostVideoUrl').value = '';
        document.getElementById('editPostVideoPublicId').value = '';
        document.getElementById('editVideoPreviewContainer').style.display = 'none';
    });
}

// Thiết lập các sự kiện
function setupEventListeners() {
    // Modal tạo bài viết
    const createPostModal = document.getElementById('createPostModal');
    const createPostBtn = document.getElementById('createPostBtn');
    const closeCreatePostBtn = createPostModal.querySelector('.close');

    createPostBtn.addEventListener('click', () => {
        if (currentUser) {
            createPostModal.style.display = 'block';
        } else {
            showNotification('Vui lòng đăng nhập để tạo bài viết', 'error');
        }

    });
    // Ghi nhận tương tác đầu tiên để bật tiếng video
let userHasInteracted = false;
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting && userHasInteracted) {
            video.muted = false;
            video.play().catch(() => {});
        } else {
            video.pause();
            video.muted = true;
        }
    });
}, {
    threshold: 0.5
});

['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => {
        userHasInteracted = true;
        document.querySelectorAll('video').forEach(video => {
            observer.observe(video);
        });
    }, { once: true });
});


    closeCreatePostBtn.addEventListener('click', () => {
        createPostModal.style.display = 'none';
    });

    // Modal xem bài viết
    const viewPostModal = document.getElementById('viewPostModal');
    const closeViewPostBtn = viewPostModal.querySelector('.close');

    closeViewPostBtn.addEventListener('click', () => {
        viewPostModal.style.display = 'none';
        currentPostId = null;
    });

    // Modal chỉnh sửa bài viết
    const editPostModal = document.getElementById('editPostModal');
    const closeEditPostBtn = editPostModal.querySelector('.close');

    closeEditPostBtn.addEventListener('click', () => {
        editPostModal.style.display = 'none';
    });

    // Modal báo cáo
    const reportModal = document.getElementById('reportModal');
    const closeReportBtn = reportModal.querySelector('.close');

    closeReportBtn.addEventListener('click', () => {
        reportModal.style.display = 'none';
    });

    // Form tạo bài viết
    const createPostForm = document.getElementById('createPostForm');
    createPostForm.addEventListener('submit', handleCreatePost);

    // Form chỉnh sửa bài viết
    const editPostForm = document.getElementById('editPostForm');
    editPostForm.addEventListener('submit', handleEditPost);

    // Form thêm bình luận
    const addCommentForm = document.getElementById('addCommentForm');
    addCommentForm.addEventListener('submit', handleAddComment);

    // Form báo cáo
    const reportForm = document.getElementById('reportForm');
    reportForm.addEventListener('submit', handleReport);

    // Nút danh mục
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            currentCategory = category;
            
            // Cập nhật UI
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Tải lại bài viết
            loadPosts();
        });
    });

    // Tìm kiếm
    const searchInput = document.getElementById('forumSearchInput');
    const searchBtn = document.getElementById('forumSearchBtn');

    searchBtn.addEventListener('click', () => {
        searchQuery = searchInput.value.trim();
        loadPosts();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchQuery = searchInput.value.trim();
            loadPosts();
        }
    });

    // Sắp xếp
    const sortSelect = document.getElementById('sortPosts');
    sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        loadPosts();
    });
    
    // Sự kiện click vào video để phát
    document.addEventListener('click', (e) => {
        // Kiểm tra nếu click vào nút play hoặc container video
        const videoContainer = e.target.closest('.post-video-container');
        const playButton = e.target.closest('.video-play-button') || e.target.classList.contains('video-play-button');
        
        if (videoContainer || playButton) {
            // Tìm thẻ cha .post-card
            const postCard = videoContainer ? videoContainer.closest('.post-card') : 
                             e.target.closest('.post-card');
            
            if (postCard) {
                const postId = postCard.dataset.id;
                if (postId) {
                    // Mở modal chi tiết bài viết
                    loadPostDetail(postId);
                    
                    // Tự động phát video trong modal
                    setTimeout(() => {
                        const detailVideo = document.querySelector('.post-detail-video');
                        if (detailVideo) {
                            detailVideo.play().catch(err => {
                                console.log('Không thể tự động phát video trong modal:', err);
                            });
                        }
                    }, 500);
                }
            }
        }
    });
    
    // Thiết lập Intersection Observer để tự động phát video khi lướt đến
    setupVideoAutoplay();

    // Đóng modal khi click bên ngoài
    window.addEventListener('click', (e) => {
        if (e.target === createPostModal) {
            createPostModal.style.display = 'none';
        }
        if (e.target === viewPostModal) {
            viewPostModal.style.display = 'none';
            currentPostId = null;
        }
        if (e.target === editPostModal) {
            editPostModal.style.display = 'none';
        }
        if (e.target === reportModal) {
            reportModal.style.display = 'none';
        }
    });
}

// Xử lý tạo bài viết mới
async function handleCreatePost(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để tạo bài viết', 'error');
        return;
    }
    
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value.trim();
    const imageUrl = document.getElementById('postImageUrl').value;
    const videoUrl = document.getElementById('postVideoUrl').value;
    const videoPublicId = document.getElementById('postVideoPublicId').value;
    
    if (!title || !category || !content) {
        showNotification('Vui lòng điền đầy đủ thông tin bài viết', 'error');
        return;
    }
    
    try {
        // Lấy thông tin người dùng từ Realtime Database
        const userRef = firebase.database().ref(`users/${currentUser.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val() || {};
        
        // Tạo bài viết mới
        const postData = {
            title,
            category,
            content,
            imageUrl: imageUrl || null,
            videoUrl: videoUrl || null,
            videoPublicId: videoPublicId || null,
            authorId: currentUser.uid,
            authorName: userData.displayName || currentUser.displayName || 'Người dùng ẩn danh',
            authorPhotoURL: userData.photoURL || currentUser.photoURL || null,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            likes: 0,
            comments: 0,
            views: 0,
            likedBy: {}
        };
        
        // Sử dụng Realtime Database thay vì Firestore
        const newPostRef = firebase.database().ref('posts').push();
        await newPostRef.set(postData);
        
        // Đóng modal và reset form
        document.getElementById('createPostModal').style.display = 'none';
        document.getElementById('createPostForm').reset();
        document.getElementById('postImageUrl').value = '';
        document.getElementById('postVideoUrl').value = '';
        document.getElementById('postVideoPublicId').value = '';
        document.getElementById('imagePreviewContainer').style.display = 'none';
        document.getElementById('videoPreviewContainer').style.display = 'none';
        // Reset về tab hình ảnh
        document.getElementById('selectImageBtn').click();
        
        showNotification('Bài viết đã được tạo thành công', 'success');
        
        // Tải lại bài viết
        loadPosts();
    } catch (error) {
        console.error('Lỗi khi tạo bài viết:', error);
        showNotification('Đã xảy ra lỗi khi tạo bài viết', 'error');
    }
}

// Xử lý chỉnh sửa bài viết
async function handleEditPost(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để chỉnh sửa bài viết', 'error');
        return;
    }
    
    const postId = document.getElementById('editPostId').value;
    const title = document.getElementById('editPostTitle').value.trim();
    const category = document.getElementById('editPostCategory').value;
    const content = document.getElementById('editPostContent').value.trim();
    const imageUrl = document.getElementById('editPostImageUrl').value;
    const videoUrl = document.getElementById('editPostVideoUrl').value;
    const videoPublicId = document.getElementById('editPostVideoPublicId').value;
    
    if (!title || !category || !content) {
        showNotification('Vui lòng điền đầy đủ thông tin bài viết', 'error');
        return;
    }
    
    try {
        const postRef = firebase.firestore().collection('posts').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) {
            showNotification('Bài viết không tồn tại', 'error');
            return;
        }
        
        const postData = postDoc.data();
        
        // Kiểm tra quyền chỉnh sửa
        if (postData.authorId !== currentUser.uid && !isAdmin(currentUser.uid)) {
            showNotification('Bạn không có quyền chỉnh sửa bài viết này', 'error');
            return;
        }
        
        // Cập nhật bài viết
        await postRef.update({
            title,
            category,
            content,
            imageUrl: imageUrl || null,
            videoUrl: videoUrl || null,
            videoPublicId: videoPublicId || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        
        // Đóng modal và reset form
        document.getElementById('editPostModal').style.display = 'none';
        
        showNotification('Bài viết đã được cập nhật thành công', 'success');
        
        // Nếu đang xem chi tiết bài viết, cập nhật lại
        if (currentPostId === postId) {
            loadPostDetail(postId);
        }
        
        // Tải lại bài viết
        loadPosts();
    } catch (error) {
        console.error('Lỗi khi chỉnh sửa bài viết:', error);
        showNotification('Đã xảy ra lỗi khi chỉnh sửa bài viết', 'error');
    }
}

// Xử lý thêm bình luận
async function handleAddComment(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để bình luận', 'error');
        return;
    }
    
    if (!currentPostId) {
        showNotification('Không tìm thấy bài viết', 'error');
        return;
    }
    
    const content = document.getElementById('commentContent').value.trim();
    
    if (!content) {
        showNotification('Vui lòng nhập nội dung bình luận', 'error');
        return;
    }
    
    try {
        // Lấy thông tin người dùng từ Realtime Database
        const userRef = firebase.database().ref(`users/${currentUser.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val() || {};
        
        // Tạo bình luận mới
        const commentData = {
            postId: currentPostId,
            content,
            authorId: currentUser.uid,
            authorName: userData.displayName || currentUser.displayName || 'Người dùng ẩn danh',
            authorPhotoURL: userData.photoURL || currentUser.photoURL || null,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            likes: 0,
            likedBy: {}, // Sử dụng object thay vì array cho Realtime Database
        };
        
        // Lưu bình luận vào Realtime Database
        const commentsRef = firebase.database().ref('comments');
        const newCommentRef = commentsRef.push();
        await newCommentRef.set(commentData);
        
        // Cập nhật số lượng bình luận trong bài viết
        const postRef = firebase.database().ref(`posts/${currentPostId}`);
        const postSnapshot = await postRef.once('value');
        const post = postSnapshot.val() || {};
        
        await postRef.update({
            comments: (post.comments || 0) + 1,
        });
        
        // Reset form
        document.getElementById('addCommentForm').reset();
        
        showNotification('Bình luận đã được thêm thành công', 'success');
        
        // Tải lại bình luận
        loadComments(currentPostId);
    } catch (error) {
        console.error('Lỗi khi thêm bình luận:', error);
        showNotification('Đã xảy ra lỗi khi thêm bình luận', 'error');
    }
}

// Xử lý báo cáo
async function handleReport(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để báo cáo', 'error');
        return;
    }
    
    const contentId = document.getElementById('reportContentId').value;
    const contentType = document.getElementById('reportContentType').value;
    const reason = document.getElementById('reportReason').value;
    const description = document.getElementById('reportDescription').value.trim();
    
    if (!reason || !description) {
        showNotification('Vui lòng điền đầy đủ thông tin báo cáo', 'error');
        return;
    }
    
    try {
        // Tạo báo cáo mới
        const reportData = {
            contentId,
            contentType,
            reason,
            description,
            reporterId: currentUser.uid,
            reporterName: currentUser.displayName || 'Người dùng ẩn danh',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
        };
        
        await firebase.firestore().collection('reports').add(reportData);
        
        // Đóng modal và reset form
        document.getElementById('reportModal').style.display = 'none';
        document.getElementById('reportForm').reset();
        
        showNotification('Báo cáo đã được gửi thành công', 'success');
    } catch (error) {
        console.error('Lỗi khi gửi báo cáo:', error);
        showNotification('Đã xảy ra lỗi khi gửi báo cáo', 'error');
    }
}

// Tải danh sách bài viết
async function loadPosts() {
    const postsListElement = document.getElementById('postsList');
    postsListElement.innerHTML = '<div class="loading">Đang tải bài viết...</div>';
    
    try {
        // Kiểm tra xem người dùng đã đăng nhập chưa
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            // Nếu chưa đăng nhập, thử đăng nhập ẩn danh
            try {
                await firebase.auth().signInAnonymously();
                console.log('Đã đăng nhập ẩn danh để đọc bài viết');
            } catch (authError) {
                console.error('Lỗi đăng nhập ẩn danh:', authError);
                postsListElement.innerHTML = '<div class="error">Vui lòng đăng nhập để xem bài viết.</div>';
                return;
            }
        }
        
        // Sử dụng Realtime Database thay vì Firestore
        const postsRef = firebase.database().ref('posts');
        let postsSnapshot;
        
        // Lọc và sắp xếp
        if (currentSort === 'newest') {
            postsSnapshot = await postsRef.orderByChild('createdAt').once('value');
        } else if (currentSort === 'oldest') {
            postsSnapshot = await postsRef.orderByChild('createdAt').once('value');
        } else if (currentSort === 'popular') {
            postsSnapshot = await postsRef.orderByChild('likes').once('value');
        } else {
            postsSnapshot = await postsRef.once('value');
        }
        
        postsData = [];
        
        // Chuyển đổi snapshot thành mảng
        postsSnapshot.forEach(childSnapshot => {
            const post = childSnapshot.val();
            postsData.push({
                id: childSnapshot.key,
                ...post
            });
        });
        
        // Đảo ngược mảng nếu sắp xếp theo mới nhất
        if (currentSort === 'newest') {
            postsData.reverse();
        }
        
        // Lọc theo danh mục
        if (currentCategory !== 'all') {
            postsData = postsData.filter(post => post.category === currentCategory);
        }
        
        // Lọc theo tìm kiếm
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            postsData = postsData.filter(post => 
                post.title.toLowerCase().includes(searchLower) || 
                post.content.toLowerCase().includes(searchLower) ||
                (post.authorName && post.authorName.toLowerCase().includes(searchLower))
            );
        }
        
        // Hiển thị số lượng kết quả tìm kiếm
        if (searchQuery && postsData.length === 0) {
            postsListElement.innerHTML = '<div class="no-posts">Không tìm thấy bài viết nào phù hợp với tìm kiếm.</div>';
            return;
        }
        
        // Hiển thị bài viết
        renderPosts(postsData);
    } catch (error) {
        console.error('Lỗi khi tải bài viết:', error);
        postsListElement.innerHTML = '<div class="error">Đã xảy ra lỗi khi tải bài viết. Vui lòng thử lại sau.</div>';
    }
}

// Hiển thị danh sách bài viết
function renderPosts(posts) {
    const postsListElement = document.getElementById('postsList');
    
    if (posts.length === 0) {
        postsListElement.innerHTML = '<div class="no-posts">Không có bài viết nào.</div>';
        return;
    }
    
    postsListElement.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.dataset.id = post.id;
        
        // Tạo excerpt từ nội dung
        const excerpt = post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content;
        
        // Format thời gian
        const createdAt = post.createdAt ? formatTimestamp(post.createdAt) : 'Vừa xong';
        
        // Kiểm tra người dùng đã thích bài viết chưa
        const isLiked = currentUser && post.likedBy && post.likedBy[currentUser.uid] === true;
        
        postElement.innerHTML = `
            <div class="post-media ${!post.imageUrl && !post.videoUrl ? 'no-media-container' : ''}">
                ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}">` : ''}
                ${post.videoUrl ? `
                    <div class="post-video-container">
                        <video class="post-video" src="${post.videoUrl}" poster="${post.videoUrl.replace(/\.[^/.]+$/, '.jpg')}" preload="metadata" muted loop playsinline></video>
                        <div class="video-play-button"><i class="fas fa-play"></i></div>
                    </div>
                ` : ''}
                <div class="post-category">${getCategoryLabel(post.category)}</div>
            </div>
            <div class="post-content">
                <h3 class="post-title">${post.title}</h3>
                <p class="post-excerpt">${excerpt}</p>
                <div class="post-meta">
                    <div class="post-author">
                        ${post.authorPhotoURL ? `<img src="${post.authorPhotoURL}" alt="${post.authorName}">` : '<i class="fas fa-user"></i>'}
                        <span>${post.authorName}</span>
                    </div>
                    <div class="post-stats">
                        <div class="post-stat"><i class="fas fa-heart" ${isLiked ? 'class="liked"' : ''}></i> ${post.likes || 0}</div>
                        <div class="post-stat"><i class="fas fa-comment"></i> ${post.comments || 0}</div>
                        <div class="post-stat"><i class="fas fa-eye"></i> ${post.views || 0}</div>
                        <div class="post-stat"><i class="fas fa-clock"></i> ${createdAt}</div>
                    </div>
                </div>
            </div>
            <div class="post-actions">
                <button class="action-btn like-btn ${isLiked ? 'active' : ''}" data-action="like">
                    <i class="fas fa-heart"></i> Thích
                </button>
                <button class="action-btn" data-action="comment">
                    <i class="fas fa-comment"></i> Bình luận
                </button>
                <button class="action-btn" data-action="share">
                    <i class="fas fa-share"></i> Chia sẻ
                </button>
                <button class="action-btn" data-action="report">
                    <i class="fas fa-flag"></i> Báo cáo
                </button>
            </div>
        `;
        
        // Sự kiện click vào bài viết
        postElement.addEventListener('click', (e) => {
            // Nếu click vào nút, không mở chi tiết bài viết
            if (e.target.closest('button')) return;
            loadPostDetail(post.id);
        });
        
        // Thiết lập sự kiện cho các nút
        const likeBtn = postElement.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => handleLikePost(post.id));
        }
        
        const commentBtn = postElement.querySelector('[data-action="comment"]');
        if (commentBtn) {
            commentBtn.addEventListener('click', () => {
                loadPostDetail(post.id);
                setTimeout(() => document.getElementById('commentContent').focus(), 500);
            });
        }
        
        postsListElement.appendChild(postElement);
    });
    
    // Thiết lập tự động phát video cho các bài viết mới
    setupVideoAutoplay();
}

// Thiết lập tự động phát video khi lướt đến
function setupVideoAutoplay() {
    // Tạo Intersection Observer
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Lấy video element và container
            const container = entry.target;
            const video = container.querySelector('video');
            if (!video) return;
            
            if (entry.isIntersecting) {
                // Video đang trong viewport, phát video
                video.play().then(() => {
                    // Thêm class playing khi video đang phát
                    container.classList.add('playing');
                }).catch(error => {
                    // Xử lý lỗi khi phát video (thường do chính sách tự động phát của trình duyệt)
                    console.log('Không thể tự động phát video:', error);
                    container.classList.remove('playing');
                });
                
                // Thêm sự kiện khi video kết thúc
                video.onended = () => {
                    // Phát lại video khi kết thúc (loop)
                    video.play().catch(() => {});
                };
            } else {
                // Video không còn trong viewport, dừng video
                video.pause();
                // Xóa class playing
                container.classList.remove('playing');
            }
        });
    }, {
        threshold: 0.5, // Video phải hiển thị ít nhất 50% mới phát
        rootMargin: '0px' // Không có margin
    });
    
    // Quan sát tất cả các container video
    document.querySelectorAll('.post-video-container').forEach(container => {
        videoObserver.observe(container);
        
        // Thêm sự kiện click vào nút play
        const playButton = container.querySelector('.video-play-button');
        const video = container.querySelector('video');
        
        if (playButton && video) {
            playButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện nổi bọt
                
                if (video.paused) {
                    video.play().then(() => {
                        container.classList.add('playing');
                    }).catch(() => {});
                } else {
                    video.pause();
                    container.classList.remove('playing');
                }
            });
        }
    });
}

// Tải chi tiết bài viết
async function loadPostDetail(postId) {
    currentPostId = postId;
    const postDetailElement = document.getElementById('postDetailContent');
    postDetailElement.innerHTML = '<div class="loading">Đang tải bài viết...</div>';
    
    const viewPostModal = document.getElementById('viewPostModal');
    viewPostModal.style.display = 'block';
    
    try {
        // Lấy thông tin bài viết từ Realtime Database
        const postRef = firebase.database().ref(`posts/${postId}`);
        const postSnapshot = await postRef.once('value');
        
        if (!postSnapshot.exists()) {
            postDetailElement.innerHTML = '<div class="error">Không tìm thấy bài viết.</div>';
            return;
        }
        
        const post = {
            id: postId,
            ...postSnapshot.val(),
        };
        
        // Cập nhật số lượt xem
        await postRef.update({
            views: (post.views || 0) + 1,
        });
        
        // Format thời gian
        const createdAt = post.createdAt ? formatTimestamp(post.createdAt) : 'Vừa xong';
        const updatedAt = post.updatedAt && post.updatedAt !== post.createdAt ? 
            `Đã chỉnh sửa: ${formatTimestamp(post.updatedAt)}` : '';
        
        // Kiểm tra quyền chỉnh sửa và xóa
        const canEdit = currentUser && (post.authorId === currentUser.uid || isAdmin(currentUser.uid));
        
        // Kiểm tra đã thích bài viết chưa
        const isLiked = currentUser && post.likedBy && post.likedBy[currentUser.uid] === true;
        
        postDetailElement.innerHTML = `
            <div class="post-detail">
                <div class="post-detail-header">
                    <div class="post-detail-author">
                        ${post.authorPhotoURL ? `<img src="${post.authorPhotoURL}" alt="${post.authorName}">` : '<i class="fas fa-user"></i>'}
                        <div class="post-detail-author-info">
                            <span class="post-detail-author-name">${post.authorName}</span>
                            <span class="post-detail-time"><i class="fas fa-clock"></i> ${createdAt} ${updatedAt ? `· ${updatedAt}` : ''}</span>
                        </div>
                    </div>
                </div>
                <div class="post-detail-content">
                    <h2 class="post-detail-title">${post.title}</h2>
                    <div class="post-detail-category"><span>${getCategoryLabel(post.category)}</span></div>
                    <div class="post-detail-text">${post.content}</div>
                    ${post.imageUrl ? `<div class="post-detail-image-container"><img src="${post.imageUrl}" alt="${post.title}" class="post-detail-image"></div>` : ''}
                    ${post.videoUrl ? `
                    <div class="post-detail-video-container">
                        <video src="${post.videoUrl}" controls class="post-detail-video" autoplay></video>
                    </div>
                    ` : ''}
                <div class="post-actions">
                    <div class="post-reactions">
                        <div>
                            <i class="fas fa-heart"></i> <span>${post.likes || 0}</span> lượt thích
                            <span class="reaction-separator">•</span>
                            <span>${post.comments || 0}</span> bình luận
                        </div>
                        <div>
                            <span>${post.views || 0}</span> lượt xem
                        </div>
                    </div>
                    <div class="post-reactions-buttons">
                        <button class="reaction-btn ${isLiked ? 'active' : ''}" data-action="like">
                            <i class="fas fa-heart"></i> Thích
                        </button>
                        <button class="reaction-btn" data-action="comment">
                            <i class="fas fa-comment"></i> Bình luận
                        </button>
                        <button class="reaction-btn" data-action="share">
                            <i class="fas fa-share"></i> Chia sẻ
                        </button>
                    ${canEdit ? `
                        <div class="post-options">
                            <button class="options-btn"><i class="fas fa-ellipsis-v"></i></button>
                            <div class="options-menu">
                                <button data-action="edit"><i class="fas fa-edit"></i> Chỉnh sửa</button>
                                <button data-action="delete" class="delete-btn"><i class="fas fa-trash"></i> Xóa</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Thiết lập sự kiện cho các nút tương tác
        setupPostDetailEvents(post);
        
        // Tải bình luận
        loadComments(postId);
    } catch (error) {
        console.error('Lỗi khi tải chi tiết bài viết:', error);
        postDetailElement.innerHTML = '<div class="error">Đã xảy ra lỗi khi tải bài viết. Vui lòng thử lại sau.</div>';
    }
}

// Thiết lập sự kiện cho chi tiết bài viết
function setupPostDetailEvents(post) {
    const postDetailElement = document.getElementById('postDetailContent');
    
    // Nút thích
    const likeBtn = postDetailElement.querySelector('.reaction-btn[data-action="like"]');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => handleLikePost(post.id));
    }
    
    // Nút bình luận
    const commentBtn = postDetailElement.querySelector('.reaction-btn[data-action="comment"]');
    if (commentBtn) {
        commentBtn.addEventListener('click', () => {
            document.getElementById('commentContent').focus();
        });
    }
    
    // Nút chia sẻ
    const shareBtn = postDetailElement.querySelector('.reaction-btn[data-action="share"]');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const url = `${window.location.origin}${window.location.pathname}?post=${post.id}`;
            navigator.clipboard.writeText(url)
                .then(() => showNotification('Đã sao chép liên kết bài viết vào clipboard', 'success'))
                .catch(() => showNotification('Không thể sao chép liên kết', 'error'));
        });
    }
    
    // Nút báo cáo
    const reportBtn = postDetailElement.querySelector('.reaction-btn[data-action="report"]');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            if (!currentUser) {
                showNotification('Vui lòng đăng nhập để báo cáo', 'error');
                return;
            }
            
            document.getElementById('reportContentId').value = post.id;
            document.getElementById('reportContentType').value = 'post';
            document.getElementById('reportModal').style.display = 'block';
        });
    }
    
    // Nút tùy chọn
    const optionsBtn = postDetailElement.querySelector('.options-btn');
    const optionsMenu = postDetailElement.querySelector('.options-menu');
    
    if (optionsBtn && optionsMenu) {
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            optionsMenu.classList.toggle('show');
        });
        
        // Đóng menu khi click bên ngoài
        document.addEventListener('click', () => {
            optionsMenu.classList.remove('show');
        });
        
        // Nút chỉnh sửa
        const editBtn = optionsMenu.querySelector('[data-action="edit"]');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                openEditPostModal(post);
            });
        }
        
        // Nút xóa
        const deleteBtn = optionsMenu.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) {
                    deletePost(post.id);
                }
            });
        }
    }
}

// Tải bình luận
async function loadComments(postId) {
    const commentsListElement = document.getElementById('commentsList');
    commentsListElement.innerHTML = '<div class="loading">Đang tải bình luận...</div>';
    
    try {
        // Sử dụng Realtime Database thay vì Firestore
        const commentsRef = firebase.database().ref('comments');
        const snapshot = await commentsRef.orderByChild('postId').equalTo(postId).once('value');
        
        if (!snapshot.exists()) {
            commentsListElement.innerHTML = '<div class="no-comments">Chưa có bình luận nào.</div>';
            return;
        }
        
        commentsListElement.innerHTML = '';
        
        // Tạo mảng bình luận để sắp xếp theo thời gian
        const comments = [];
        snapshot.forEach(childSnapshot => {
            comments.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Sắp xếp bình luận theo thời gian giảm dần (mới nhất lên đầu)
        comments.sort((a, b) => b.createdAt - a.createdAt);
        
        // Hiển thị bình luận
        comments.forEach(comment => {
            
            // Format thời gian
            const createdAt = comment.createdAt ? formatTimestamp(comment.createdAt) : 'Vừa xong';
            
            // Kiểm tra quyền xóa
            const canDelete = currentUser && (comment.authorId === currentUser.uid || isAdmin(currentUser.uid));
            
            // Kiểm tra đã thích bình luận chưa
            const isLiked = currentUser && comment.likedBy && (typeof comment.likedBy === 'object' ? comment.likedBy[currentUser.uid] === true : Array.isArray(comment.likedBy) && comment.likedBy.includes(currentUser.uid));
            
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-item';
            commentElement.dataset.id = comment.id;
            
            commentElement.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author">
                        ${comment.authorPhotoURL ? `<img src="${comment.authorPhotoURL}" alt="${comment.authorName}">` : '<i class="fas fa-user"></i>'}
                        <span class="comment-author-name">${comment.authorName}</span>
                    </div>
                    <div class="comment-date">${createdAt}</div>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button class="comment-action ${isLiked ? 'active' : ''}" data-action="like">
                        <i class="fas fa-heart"></i> <span>${comment.likes || 0}</span>
                    </button>
                    <button class="comment-action" data-action="reply">
                        <i class="fas fa-reply"></i> Trả lời
                    </button>
                    <button class="comment-action" data-action="report">
                        <i class="fas fa-flag"></i> Báo cáo
                    </button>
                    ${canDelete ? `
                        <button class="comment-action delete-btn" data-action="delete">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    ` : ''}
                </div>
            `;
            
            // Thiết lập sự kiện cho bình luận
            setupCommentEvents(commentElement, comment);
            
            commentsListElement.appendChild(commentElement);
        });
    } catch (error) {
        console.error('Lỗi khi tải bình luận:', error);
        commentsListElement.innerHTML = '<div class="error">Đã xảy ra lỗi khi tải bình luận. Vui lòng thử lại sau.</div>';
    }
}

// Thiết lập sự kiện cho bình luận
function setupCommentEvents(commentElement, comment) {
    // Nút thích
    const likeBtn = commentElement.querySelector('.comment-action[data-action="like"]');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => handleLikeComment(comment.id));
    }
    
    // Nút trả lời
    const replyBtn = commentElement.querySelector('.comment-action[data-action="reply"]');
    if (replyBtn) {
        replyBtn.addEventListener('click', () => {
            const commentContent = document.getElementById('commentContent');
            commentContent.value = `@${comment.authorName} `;
            commentContent.focus();
        });
    }
    
    // Nút báo cáo
    const reportBtn = commentElement.querySelector('.comment-action[data-action="report"]');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            if (!currentUser) {
                showNotification('Vui lòng đăng nhập để báo cáo', 'error');
                return;
            }
            
            document.getElementById('reportContentId').value = comment.id;
            document.getElementById('reportContentType').value = 'comment';
            document.getElementById('reportModal').style.display = 'block';
        });
    }
    
    // Nút xóa
    const deleteBtn = commentElement.querySelector('.comment-action[data-action="delete"]');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) {
                deleteComment(comment.id);
            }
        });
    }
}

// Xử lý thích bài viết
async function handleLikePost(postId) {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để thích bài viết', 'error');
        return;
    }
    
    try {
        const postRef = firebase.database().ref(`posts/${postId}`);
        const postSnapshot = await postRef.once('value');
        
        if (!postSnapshot.exists()) {
            showNotification('Bài viết không tồn tại', 'error');
            return;
        }
        
        const post = postSnapshot.val();
        const likedBy = post.likedBy || {};
        const isLiked = likedBy[currentUser.uid] === true;
        
        // Tạo bản cập nhật
        const updates = {};
        
        if (isLiked) {
            // Bỏ thích
            updates.likes = Math.max(0, (post.likes || 1) - 1); // Đảm bảo không âm
            updates[`likedBy/${currentUser.uid}`] = null; // Xóa user khỏi likedBy
            
            await postRef.update(updates);
            showNotification('Đã bỏ thích bài viết', 'info');
        } else {
            // Thích
            updates.likes = (post.likes || 0) + 1;
            updates[`likedBy/${currentUser.uid}`] = true;
            
            await postRef.update(updates);
            showNotification('Đã thích bài viết', 'success');
        }
        
        // Cập nhật UI
        const likeBtn = document.querySelector(`.reaction-btn[data-action="like"]`);
        if (likeBtn) {
            const likeCount = likeBtn.querySelector('span');
            if (likeCount) {
                const newCount = parseInt(likeCount.textContent) + (isLiked ? -1 : 1);
                likeCount.textContent = newCount;
            }
            
            if (isLiked) {
                likeBtn.classList.remove('active');
            } else {
                likeBtn.classList.add('active');
            }
        }
        
        // Cập nhật UI trong danh sách bài viết
        const postCard = document.querySelector(`.post-card[data-id="${postId}"]`);
        if (postCard) {
            const cardLikeBtn = postCard.querySelector('.like-btn');
            if (cardLikeBtn) {
                if (isLiked) {
                    cardLikeBtn.classList.remove('active');
                } else {
                    cardLikeBtn.classList.add('active');
                }
            }
        }
        
        // Cập nhật danh sách bài viết
        loadPosts();
    } catch (error) {
        console.error('Lỗi khi thích bài viết:', error);
        showNotification('Đã xảy ra lỗi khi thích bài viết', 'error');
    }
}

// Xử lý thích bình luận
async function handleLikeComment(commentId) {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để thích bình luận', 'error');
        return;
    }
    
    try {
        const commentRef = firebase.database().ref(`comments/${commentId}`);
        const commentSnapshot = await commentRef.once('value');
        
        if (!commentSnapshot.exists()) {
            showNotification('Bình luận không tồn tại', 'error');
            return;
        }
        
        const comment = commentSnapshot.val();
        const likedBy = comment.likedBy || {};
        const isLiked = likedBy[currentUser.uid] === true;
        
        // Tạo bản cập nhật
        const updates = {};
        
        if (isLiked) {
            // Bỏ thích
            updates.likes = Math.max(0, (comment.likes || 1) - 1); // Đảm bảo không âm
            updates[`likedBy/${currentUser.uid}`] = null; // Xóa user khỏi likedBy
        } else {
            // Thích
            updates.likes = (comment.likes || 0) + 1;
            updates[`likedBy/${currentUser.uid}`] = true;
        }
        
        // Cập nhật bình luận
        await commentRef.update(updates);
        
        // Cập nhật UI
        const commentElement = document.querySelector(`.comment-item[data-id="${commentId}"]`);
        if (commentElement) {
            const likeBtn = commentElement.querySelector('.comment-action[data-action="like"]');
            if (likeBtn) {
                const likeCount = likeBtn.querySelector('span');
                if (likeCount) {
                    const newCount = parseInt(likeCount.textContent) + (isLiked ? -1 : 1);
                    likeCount.textContent = newCount;
                }
                
                if (isLiked) {
                    likeBtn.classList.remove('active');
                } else {
                    likeBtn.classList.add('active');
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi thích bình luận:', error);
        showNotification('Đã xảy ra lỗi khi thích bình luận', 'error');
    }
}

// Mở modal chỉnh sửa bài viết
function openEditPostModal(post) {
    document.getElementById('editPostId').value = post.id;
    document.getElementById('editPostTitle').value = post.title;
    document.getElementById('editPostCategory').value = post.category;
    document.getElementById('editPostContent').value = post.content;
    document.getElementById('editPostImageUrl').value = post.imageUrl || '';
    document.getElementById('editPostVideoUrl').value = post.videoUrl || '';
    document.getElementById('editPostVideoPublicId').value = post.videoPublicId || '';
    
    // Hiển thị phương tiện phù hợp
    if (post.videoUrl) {
        // Nếu có video, hiển thị tab video
        document.getElementById('editSelectVideoBtn').click();
        document.getElementById('editVideoPreview').src = post.videoUrl;
        document.getElementById('editVideoPreviewContainer').style.display = 'block';
        document.getElementById('editImagePreviewContainer').style.display = 'none';
    } else if (post.imageUrl) {
        // Nếu có hình ảnh, hiển thị tab hình ảnh
        document.getElementById('editSelectImageBtn').click();
        document.getElementById('editImagePreview').src = post.imageUrl;
        document.getElementById('editImagePreviewContainer').style.display = 'block';
        document.getElementById('editVideoPreviewContainer').style.display = 'none';
    } else {
        // Nếu không có phương tiện nào, ẩn cả hai
        document.getElementById('editSelectImageBtn').click();
        document.getElementById('editImagePreviewContainer').style.display = 'none';
        document.getElementById('editVideoPreviewContainer').style.display = 'none';
    }
    
    document.getElementById('editPostModal').style.display = 'block';
}

// Xóa bài viết
async function deletePost(postId) {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để xóa bài viết', 'error');
        return;
    }
    
    try {
        // Xóa bài viết
        await firebase.database().ref(`posts/${postId}`).remove();
        
        // Xóa tất cả bình luận của bài viết
        const commentsRef = firebase.database().ref('comments');
        const commentsSnapshot = await commentsRef.orderByChild('postId').equalTo(postId).once('value');
        
        // Xóa từng bình luận
        const updates = {};
        commentsSnapshot.forEach(childSnapshot => {
            updates[`comments/${childSnapshot.key}`] = null;
        });
        
        if (Object.keys(updates).length > 0) {
            await firebase.database().ref().update(updates);
        }
        
        // Đóng modal và thông báo
        document.getElementById('viewPostModal').style.display = 'none';
        currentPostId = null;
        
        showNotification('Bài viết đã được xóa thành công', 'success');
        
        // Tải lại bài viết
        loadPosts();
    } catch (error) {
        console.error('Lỗi khi xóa bài viết:', error);
        showNotification('Đã xảy ra lỗi khi xóa bài viết', 'error');
    }
}

// Xóa bình luận
async function deleteComment(commentId) {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để xóa bình luận', 'error');
        return;
    }
    
    try {
        // Lấy thông tin bình luận
        const commentRef = firebase.database().ref(`comments/${commentId}`);
        const commentSnapshot = await commentRef.once('value');
        
        if (!commentSnapshot.exists()) {
            showNotification('Bình luận không tồn tại', 'error');
            return;
        }
        
        const comment = commentSnapshot.val();
        
        // Xóa bình luận
        await commentRef.remove();
        
        // Cập nhật số lượng bình luận trong bài viết
        const postRef = firebase.database().ref(`posts/${comment.postId}`);
        const postSnapshot = await postRef.once('value');
        
        if (postSnapshot.exists()) {
            const post = postSnapshot.val();
            const commentCount = (post.comments || 0) - 1;
            await postRef.update({
                comments: commentCount >= 0 ? commentCount : 0
            });
        }
        
        showNotification('Bình luận đã được xóa thành công', 'success');
        
        // Tải lại bình luận
        loadComments(comment.postId);
    } catch (error) {
        console.error('Lỗi khi xóa bình luận:', error);
        showNotification('Đã xảy ra lỗi khi xóa bình luận', 'error');
    }
}

// Kiểm tra người dùng có phải admin không
function isAdmin(userId) {
    // Thay thế bằng logic kiểm tra admin thực tế
    const adminIds = ['admin1', 'admin2'];
    return adminIds.includes(userId);
}

// Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Vừa xong';
    
    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
}

// Lấy nhãn danh mục
function getCategoryLabel(category) {
    const categories = {
        'review': 'Đánh Giá Phim',
        'discussion': 'Thảo Luận',
        'recommendation': 'Gợi Ý Phim',
        'news': 'Tin Tức',
    };
    
    return categories[category] || category;
}

// Hiển thị thông báo
function showNotification(message, type = 'info') {
    // Kiểm tra xem hàm showNotification đã được định nghĩa trong main.js chưa
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback nếu hàm chưa được định nghĩa
        alert(message);
    }
}

// Kiểm tra URL để xem có tham số post không
function checkUrlForPostId() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    
    if (postId) {
        loadPostDetail(postId);
    }
}

// Gọi hàm kiểm tra URL khi trang đã tải xong
window.addEventListener('load', checkUrlForPostId);

// Chuyển đổi chế độ sáng/tối
function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.toggle('dark-theme');
    
    // Cập nhật icon của nút
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    
    // Lưu trạng thái vào localStorage
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
}

// Kiểm tra và áp dụng chế độ sáng/tối khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    // Tải bảng xếp hạng người dùng
    loadUserRanking();
});

// Hàm tải bảng xếp hạng người dùng
async function loadUserRanking() {
    try {
        const userRankingContainer = document.querySelector('.user-ranking');
        if (!userRankingContainer) return;
        
        // Xóa dữ liệu mẫu
        userRankingContainer.innerHTML = '<div class="loading">Đang tải xếp hạng...</div>';
        
        // Lấy dữ liệu người dùng từ Firebase
        const usersSnapshot = await firebase.database().ref('users').once('value');
        const users = [];
        
        usersSnapshot.forEach(userSnapshot => {
            const userData = userSnapshot.val();
            if (userData) {
                userData.uid = userSnapshot.key;
                // Sử dụng miniCoins thay vì coins vì dữ liệu người dùng được lưu trong trường miniCoins
                userData.coins = userData.miniCoins || 0;
                users.push(userData);
            }
        });
        
        // Sắp xếp người dùng theo số coins (lấy từ miniCoins) giảm dần
        users.sort((a, b) => (b.coins || 0) - (a.coins || 0));
        
        // Chỉ lấy top 5 người dùng có nhiều coins nhất
        const topUsers = users.slice(0, 5);
        
        // Hiển thị bảng xếp hạng
        if (users.length === 0) {
            userRankingContainer.innerHTML = '<p>Chưa có dữ liệu xếp hạng</p>';
            return;
        }
        
        userRankingContainer.innerHTML = '';
        
        // Thêm thông báo về tổng số người dùng
        const totalUsersInfo = document.createElement('div');
        totalUsersInfo.className = 'total-users-info';
        totalUsersInfo.innerHTML = `<p>Hiển thị top 5 người dùng có nhiều coins nhất (trong tổng số ${users.length} người dùng)</p>`;
        userRankingContainer.appendChild(totalUsersInfo);
        
        topUsers.forEach((user, index) => {
            const userRankItem = document.createElement('div');
            userRankItem.className = 'user-rank-item';
            
            const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`;
            
            userRankItem.innerHTML = `
                <div class="rank-number">${index + 1}</div>
                <img src="${photoURL}" alt="${user.displayName || 'User'}">
                <div class="user-rank-info">
                    <h4>${user.displayName || 'Người dùng ẩn danh'}</h4>
                    <p><span class="coin-amount">${user.coins || 0}</span> coins</p>
                </div>
            `;
            
            userRankingContainer.appendChild(userRankItem);
        });
    } catch (error) {
        console.error('Lỗi khi tải bảng xếp hạng:', error);
        const userRankingContainer = document.querySelector('.user-ranking');
        if (userRankingContainer) {
            userRankingContainer.innerHTML = '<p>Không thể tải bảng xếp hạng</p>';
        }
    }
}