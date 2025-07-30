// DOM Elements
const createExerciseBtn = document.getElementById('createExerciseBtn');
const createExerciseModal = document.getElementById('createExerciseModal');
const createExerciseForm = document.getElementById('createExerciseForm');
const exerciseDetailModal = document.getElementById('exerciseDetailModal');
const exerciseDetailContent = document.getElementById('exerciseDetailContent');
const submitSolutionModal = document.getElementById('submitSolutionModal');
const submitSolutionForm = document.getElementById('submitSolutionForm');
const rateSolutionModal = document.getElementById('rateSolutionModal');
const rateSolutionForm = document.getElementById('rateSolutionForm');
const rateSolutionContent = document.getElementById('rateSolutionContent');
const exercisesContainer = document.querySelector('.exercises-container');
const leaderboardBody = document.getElementById('leaderboardBody');
const exerciseSearchInput = document.getElementById('exerciseSearchInput');
const exerciseSearchBtn = document.getElementById('exerciseSearchBtn');
const filterBtns = document.querySelectorAll('.filter-btn');

// Global Variables
let currentUser = null;
let currentExercise = null;
let currentSolution = null;
let exercises = [];
let cloudinaryWidget = null;
let solutionCloudinaryWidget = null;
let chatBgCloudinaryWidget = null;
let currentFilter = 'all';
let currentSubject = 'all';
let searchQuery = '';
let chatUsers = [];
let onlineUsers = [];
let chats = {};
let selectedChatUser = null;
let unreadMessageCount = 0;
let communityChat = {
    id: 'community',
    displayName: 'Cộng đồng Việt',
    isCommunity: true,
    profileImage: 'co.png'
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Cloudinary upload widgets
    initCloudinaryWidgets();
    
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            getCurrentUserData().then(userData => {
                currentUser = userData;
                updateUIForLoggedInUser();
                loadExercises();
                loadLeaderboard();
                initChatFeatures(); // Initialize chat features
            });
        } else {
            // Lấy dữ liệu người dùng khách
            getCurrentUserData().then(guestData => {
                updateUIForLoggedOutUser(guestData);
                loadExercises();
                loadLeaderboard();
            });
            // Hide chat features for logged out users
            document.getElementById('chatMiniButton').style.display = 'none';
        }
    });
    
    // Event listeners for buttons and forms
    if (createExerciseBtn) {
        createExerciseBtn.addEventListener('click', () => {
            if (currentUser) {
                openModal(createExerciseModal);
            } else {
                openModal(loginModal);
                showNotification('Vui lòng đăng nhập để đăng bài tập', 'warning');
            }
        });
    }
    
    if (createExerciseForm) {
        createExerciseForm.addEventListener('submit', handleCreateExercise);
    }
    
    if (submitSolutionForm) {
        submitSolutionForm.addEventListener('submit', handleSubmitSolution);
    }
    
    if (rateSolutionForm) {
        rateSolutionForm.addEventListener('submit', handleRateSolution);
    }
    
    if (exerciseSearchBtn) {
        exerciseSearchBtn.addEventListener('click', () => {
            searchQuery = exerciseSearchInput.value.trim().toLowerCase();
            filterAndDisplayExercises();
        });
    }
    
    if (exerciseSearchInput) {
        exerciseSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchQuery = exerciseSearchInput.value.trim().toLowerCase();
                filterAndDisplayExercises();
            }
        });
    }
    
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            filterAndDisplayExercises();
        });
    });
    
    // Subject filter items
    const subjectItems = document.querySelectorAll('.subject-item');
    subjectItems.forEach(item => {
        item.addEventListener('click', () => {
            subjectItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentSubject = item.getAttribute('data-subject');
            filterAndDisplayExercises();
        });
    });
    
    // Chat Mini Button
    const chatMiniButton = document.getElementById('chatMiniButton');
    const chatMiniPanel = document.getElementById('chatMiniPanel');
    const chatMiniClose = document.getElementById('chatMiniClose');
    
    if (chatMiniButton) {
        chatMiniButton.addEventListener('click', () => {
            if (currentUser) {
                chatMiniPanel.style.display = 'flex';
                // Reset notification badge
                document.getElementById('chatNotificationBadge').textContent = '';
                document.getElementById('chatNotificationBadge').style.display = 'none';
                unreadMessageCount = 0;
            } else {
                openModal(loginModal);
                showNotification('Vui lòng đăng nhập để sử dụng tính năng chat', 'warning');
            }
        });
    }
    
    if (chatMiniClose) {
        chatMiniClose.addEventListener('click', () => {
            chatMiniPanel.style.display = 'none';
        });
    }
    
    // Chat Mini Window Close and Minimize
    const chatMiniWindow = document.getElementById('chatMiniWindow');
    const chatMiniWindowClose = document.getElementById('chatMiniWindowClose');
    const chatMiniWindowMinimize = document.getElementById('chatMiniWindowMinimize');
    
    if (chatMiniWindowClose) {
        chatMiniWindowClose.addEventListener('click', () => {
            chatMiniWindow.style.display = 'none';
            selectedChatUser = null;
        });
    }
    
    if (chatMiniWindowMinimize) {
        chatMiniWindowMinimize.addEventListener('click', () => {
            chatMiniWindow.style.display = 'none';
        });
    }
    
    // Chat Mini Send Message
    const chatMiniMessageInput = document.getElementById('chatMiniMessageInput');
    const chatMiniSendBtn = document.getElementById('chatMiniSendBtn');
    
    if (chatMiniMessageInput && chatMiniSendBtn) {
        chatMiniSendBtn.addEventListener('click', sendMiniChatMessage);
        chatMiniMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMiniChatMessage();
            }
        });
    }
});

// Initialize Cloudinary Upload Widgets
function initCloudinaryWidgets() {
    // Main image upload widget
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', () => {
            if (!cloudinaryWidget) {
                cloudinaryWidget = cloudinary.createUploadWidget(
                    {
                        cloudName: cloudinaryConfig.cloudName,
                        uploadPreset: cloudinaryConfig.uploadPreset,
                        folder: 'exercises',
                        multiple: false,
                        maxFileSize: 5000000, // 5MB
                        resourceType: 'image',
                        sources: ['local', 'url', 'camera'],
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
                            }
                        }
                    },
                    (error, result) => {
                        if (!error && result && result.event === 'success') {
                            const imageUrl = result.info.secure_url;
                            document.getElementById('exerciseImageUrl').value = imageUrl;
                            
                            // Show image preview
                            const imagePreview = document.getElementById('imagePreview');
                            imagePreview.innerHTML = `<img src="${imageUrl}" alt="Hình ảnh bài tập">`;
                        }
                    }
                );
            }
            cloudinaryWidget.open();
        });
    }
    
    // Solution image upload widget
    const uploadSolutionImageBtn = document.getElementById('uploadSolutionImageBtn');
    if (uploadSolutionImageBtn) {
        uploadSolutionImageBtn.addEventListener('click', () => {
            if (!solutionCloudinaryWidget) {
                solutionCloudinaryWidget = cloudinary.createUploadWidget(
                    {
                        cloudName: cloudinaryConfig.cloudName,
                        uploadPreset: cloudinaryConfig.uploadPreset,
                        folder: 'solutions',
                        multiple: false,
                        maxFileSize: 5000000, // 5MB
                        resourceType: 'image',
                        sources: ['local', 'url', 'camera'],
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
                            }
                        }
                    },
                    (error, result) => {
                        if (!error && result && result.event === 'success') {
                            const imageUrl = result.info.secure_url;
                            document.getElementById('solutionImageUrl').value = imageUrl;
                            
                            // Show image preview
                            const imagePreview = document.getElementById('solutionImagePreview');
                            imagePreview.innerHTML = `<img src="${imageUrl}" alt="Hình ảnh lời giải">`;
                        }
                    }
                );
            }
            solutionCloudinaryWidget.open();
        });
    }
    
    // Chat background image upload widget
    const uploadChatBgBtn = document.getElementById('uploadChatBgBtn');
    if (uploadChatBgBtn) {
        uploadChatBgBtn.addEventListener('click', () => {
            if (!chatBgCloudinaryWidget) {
                chatBgCloudinaryWidget = cloudinary.createUploadWidget(
                    {
                        cloudName: cloudinaryConfig.cloudName,
                        uploadPreset: cloudinaryConfig.uploadPreset,
                        folder: 'chat_backgrounds',
                        multiple: false,
                        maxFileSize: 5000000, // 5MB
                        resourceType: 'image',
                        sources: ['local', 'url', 'camera'],
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
                            }
                        }
                    },
                    (error, result) => {
                        if (!error && result && result.event === 'success') {
                            const imageUrl = result.info.secure_url;
                            document.getElementById('chatBgImageUrl').value = imageUrl;
                            
                            // Show image preview
                            const previewContainer = document.getElementById('chatBgPreview');
                            previewContainer.innerHTML = `<img src="${imageUrl}" alt="Hình nền tùy chỉnh">`;
                        }
                    }
                );
            }
            chatBgCloudinaryWidget.open();
        });
    }
}

// Update UI based on authentication state
function updateUIForLoggedInUser() {
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons && currentUser) {
        // Đảm bảo currentUser có photoURL, nếu không thì dùng ảnh mặc định
        const photoURL = currentUser.photoURL || 'https://res.cloudinary.com/dw8rpacnn/image/upload/v1/nguyentiennam/default_avatar.png';
        
        authButtons.innerHTML = `
            <div class="user-profile-mini">
                <img src="${photoURL}" alt="${currentUser.displayName || 'User'}">
                <span>${currentUser.displayName || 'User'}</span>
                <div class="points-badge"><i class="fas fa-star"></i> ${currentUser.learningPoints || 0}</div>
                <button id="logoutBtn" class="btn">Đăng Xuất</button>
            </div>
        `;
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                firebase.auth().signOut();
            });
        }
    }
}

function updateUIForLoggedOutUser(guestData) {
    // Lưu thông tin người dùng khách vào biến toàn cục nếu có
    if (guestData) {
        window.currentUser = guestData;
    }
    
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <button id="loginBtn" class="btn">Đăng Nhập</button>
            <button id="signupBtn" class="btn btn-primary">Đăng Ký</button>
        `;
        
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        
        if (loginBtn) loginBtn.addEventListener('click', () => openModal(loginModal));
        if (signupBtn) signupBtn.addEventListener('click', () => openModal(signupModal));
    }
}

// Load exercises from Firebase Realtime Database
async function loadExercises() {
    showLoading(exercisesContainer);
    
    try {
        const snapshot = await firebase.database().ref('exercises').orderByChild('createdAt').once('value');
        exercises = [];
        
        // Convert snapshot to array and reverse to get newest first
        snapshot.forEach(childSnapshot => {
            const exerciseData = childSnapshot.val();
            exercises.push({
                id: childSnapshot.key,
                ...exerciseData
            });
        });
        
        // Sort by createdAt in descending order (newest first)
        exercises.sort((a, b) => b.createdAt - a.createdAt);
        
        filterAndDisplayExercises();
    } catch (error) {
        console.error('Error loading exercises:', error);
        exercisesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Đã xảy ra lỗi khi tải bài tập. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

// Filter and display exercises based on current filter, subject and search query
function filterAndDisplayExercises() {
    let filteredExercises = [...exercises];
    
    // Apply search filter
    if (searchQuery) {
        filteredExercises = filteredExercises.filter(exercise => 
            exercise.title.toLowerCase().includes(searchQuery) || 
            exercise.content.toLowerCase().includes(searchQuery)
        );
    }
    
    // Apply subject filter
    if (currentSubject !== 'all') {
        filteredExercises = filteredExercises.filter(exercise => 
            exercise.category === currentSubject
        );
    }
    
    // Apply category filter
    if (currentFilter === 'unsolved') {
        filteredExercises = filteredExercises.filter(exercise => 
            !exercise.solutions || exercise.solutions.length === 0
        );
    } else if (currentFilter === 'solved') {
        filteredExercises = filteredExercises.filter(exercise => 
            exercise.solutions && exercise.solutions.length > 0
        );
    } else if (currentFilter === 'my-exercises' && currentUser) {
        filteredExercises = filteredExercises.filter(exercise => 
            exercise.authorId === currentUser.uid
        );
    }
    
    displayExercises(filteredExercises);
}

// Display exercises in the container
function displayExercises(exercisesToDisplay) {
    if (exercisesToDisplay.length === 0) {
        exercisesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <p>Không tìm thấy bài tập nào. Hãy tạo bài tập mới!</p>
                <button id="emptyStateCreateBtn" class="btn btn-primary">Tạo Bài Tập</button>
            </div>
        `;
        
        const emptyStateCreateBtn = document.getElementById('emptyStateCreateBtn');
        if (emptyStateCreateBtn) {
            emptyStateCreateBtn.addEventListener('click', () => {
                if (currentUser) {
                    openModal(createExerciseModal);
                } else {
                    openModal(loginModal);
                    showNotification('Vui lòng đăng nhập để đăng bài tập', 'warning');
                }
            });
        }
        return;
    }
    
    let html = '';
    
    exercisesToDisplay.forEach(exercise => {
        const solutionsCount = exercise.solutions ? exercise.solutions.length : 0;
        const categoryLabel = getCategoryLabel(exercise.category);
        
        html += `
            <div class="exercise-card" data-id="${exercise.id}">
                ${exercise.imageUrl ? `<img src="${exercise.imageUrl}" alt="${exercise.title}" class="exercise-image">` : ''}
                <div class="exercise-card-header">
                    <h3>${exercise.title}</h3>
                </div>
                <div class="exercise-card-body">
                    <p>${exercise.content}</p>
                </div>
                <div class="exercise-card-footer">
                    <span class="category">${categoryLabel}</span>
                    <span class="solutions-count">
                        <i class="fas fa-comment-dots"></i> ${solutionsCount} lời giải
                    </span>
                </div>
            </div>
        `;
    });
    
    exercisesContainer.innerHTML = html;
    
    // Add click event to exercise cards
    const exerciseCards = document.querySelectorAll('.exercise-card');
    exerciseCards.forEach(card => {
        card.addEventListener('click', () => {
            const exerciseId = card.getAttribute('data-id');
            openExerciseDetail(exerciseId);
        });
    });
}

// Get category label
function getCategoryLabel(category) {
    const categories = {
        'math': 'Toán Học',
        'physics': 'Vật Lý',
        'chemistry': 'Hóa Học',
        'biology': 'Sinh Học',
        'literature': 'Văn Học',
        'english': 'Tiếng Anh',
        'history': 'Lịch Sử',
        'geography': 'Địa Lý',
        'informatics': 'Tin Học',
        'other': 'Khác'
    };
    
    return categories[category] || 'Khác';
}

// Open exercise detail modal
async function openExerciseDetail(exerciseId) {
    showLoading(exerciseDetailContent);
    openModal(exerciseDetailModal);
    
    try {
        // Get exercise data from Firebase Realtime Database
        const snapshot = await firebase.database().ref(`exercises/${exerciseId}`).once('value');
        if (!snapshot.exists()) {
            exerciseDetailContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Không tìm thấy bài tập này.</p>
                </div>
            `;
            return;
        }
        
        currentExercise = {
            id: exerciseId,
            ...snapshot.val()
        };
        
        // Get author data
        let authorData = { displayName: 'Người dùng ẩn danh', photoURL: 'https://ui-avatars.com/api/?name=Anonymous' };
        try {
            const authorSnapshot = await firebase.database().ref(`users/${currentExercise.authorId}`).once('value');
            const authorVal = authorSnapshot.val();
            if (authorVal) {
                authorData = {
                    displayName: authorVal.displayName || 'Người dùng ẩn danh',
                    photoURL: authorVal.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorVal.displayName || 'Anonymous')}`
                };
            }
        } catch (error) {
            console.error('Error fetching author data:', error);
        }
        
        // Format date
        const createdDate = new Date(currentExercise.createdAt);
        const formattedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()} ${createdDate.getHours()}:${String(createdDate.getMinutes()).padStart(2, '0')}`;
        
        // Render exercise detail
        let html = `
            <div class="exercise-detail">
                <div class="exercise-detail-header">
                    <h2>${currentExercise.title}</h2>
                    <div class="exercise-detail-meta">
                        <span><i class="fas fa-user"></i> ${authorData.displayName}</span>
                        <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                        <span><i class="fas fa-folder"></i> ${getCategoryLabel(currentExercise.category)}</span>
                    </div>
                </div>
                <div class="exercise-detail-content">
                    <p>${currentExercise.content}</p>
                    ${currentExercise.imageUrl ? `<img src="${currentExercise.imageUrl}" alt="${currentExercise.title}" class="exercise-detail-image">` : ''}
                </div>
        `;
        
        // Solutions section
        html += `<div class="solutions-section">`;
        
        // Add solution button (only for logged in users)
        if (currentUser) {
            // Check if user already submitted a solution
            const userAlreadySubmitted = currentExercise.solutions && 
                currentExercise.solutions.some(solution => solution.authorId === currentUser.uid);
            
            if (!userAlreadySubmitted) {
                html += `<button id="openSubmitSolutionBtn" class="submit-solution-btn"><i class="fas fa-plus"></i> Gửi Lời Giải</button>`;
            }
        } else {
            html += `<p class="login-prompt">Vui lòng <a href="#" id="loginToSubmitBtn">đăng nhập</a> để gửi lời giải.</p>`;
        }
        
        // Display solutions
        const solutions = currentExercise.solutions || [];
        if (solutions.length > 0) {
            html += `<h3>Lời Giải (${solutions.length})</h3>`;
            
            // Sort solutions by createdAt (newest first)
            const sortedSolutions = [...solutions].sort((a, b) => b.createdAt - a.createdAt);
            
            for (const solution of sortedSolutions) {
                // Get solution author data
                let solutionAuthorData = { displayName: 'Người dùng ẩn danh', photoURL: 'https://ui-avatars.com/api/?name=Anonymous' };
                try {
                    const solutionAuthorSnapshot = await firebase.database().ref(`users/${solution.authorId}`).once('value');
                    const solutionAuthorVal = solutionAuthorSnapshot.val();
                    if (solutionAuthorVal) {
                        solutionAuthorData = {
                            displayName: solutionAuthorVal.displayName || 'Người dùng ẩn danh',
                            photoURL: solutionAuthorVal.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(solutionAuthorVal.displayName || 'Anonymous')}`
                        };
                    }
                } catch (error) {
                    console.error('Error fetching solution author data:', error);
                }
                
                // Format solution date
                const solutionDate = new Date(solution.createdAt);
                const formattedSolutionDate = `${solutionDate.getDate()}/${solutionDate.getMonth() + 1}/${solutionDate.getFullYear()} ${solutionDate.getHours()}:${String(solutionDate.getMinutes()).padStart(2, '0')}`;
                
                // Calculate average rating
                const ratings = solution.ratings || [];
                let averageRating = 0;
                if (ratings.length > 0) {
                    const totalRating = ratings.reduce((sum, rating) => sum + rating.value, 0);
                    averageRating = totalRating / ratings.length;
                }
                
                // Check if current user already rated this solution
                const userAlreadyRated = ratings.some(rating => rating.userId === (currentUser?.uid || ''));
                
                // Get solution rank and points
                const solutionRank = solutions.findIndex(s => s.id === solution.id) + 1;
                let pointsAwarded = 0;
                if (solutionRank === 1) pointsAwarded = 5;
                else if (solutionRank === 2) pointsAwarded = 4;
                else if (solutionRank === 3) pointsAwarded = 3;
                else if (solutionRank === 4) pointsAwarded = 2;
                else if (solutionRank === 5) pointsAwarded = 1;
                
                // Add rating points
                if (ratings.length > 0) {
                    pointsAwarded += Math.round(averageRating);
                }
                
                html += `
                    <div class="solution-card" data-solution-id="${solution.id}">
                        <div class="solution-header">
                            <div class="solution-author">
                                <img src="${solutionAuthorData.photoURL}" alt="${solutionAuthorData.displayName}">
                                <span>${solutionAuthorData.displayName}</span>
                                ${solutionRank <= 5 ? `<span class="points-badge"><i class="fas fa-star"></i> +${pointsAwarded}</span>` : ''}
                            </div>
                            <div class="solution-meta">
                                <span><i class="fas fa-calendar"></i> ${formattedSolutionDate}</span>
                            </div>
                        </div>
                        <div class="solution-content">
                            <p>${solution.content}</p>
                            ${solution.imageUrl ? `<img src="${solution.imageUrl}" alt="Hình ảnh lời giải" class="solution-image">` : ''}
                        </div>
                        <div class="solution-footer">
                            <div class="solution-rating">
                                <span class="stars">${getStarsHTML(averageRating)}</span>
                                <span>(${ratings.length} đánh giá)</span>
                            </div>
                            <div class="solution-actions">
                                ${currentUser && !userAlreadyRated && currentUser.uid !== solution.authorId ? 
                                    `<button class="rate-btn" data-solution-id="${solution.id}">Đánh Giá</button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            html += `
                <div class="empty-state">
                    <i class="fas fa-comment-dots"></i>
                    <p>Chưa có lời giải nào cho bài tập này. Hãy là người đầu tiên gửi lời giải!</p>
                </div>
            `;
        }
        
        html += `</div></div>`; // Close solutions-section and exercise-detail
        
        exerciseDetailContent.innerHTML = html;
        
        // Add event listeners
        const openSubmitSolutionBtn = document.getElementById('openSubmitSolutionBtn');
        if (openSubmitSolutionBtn) {
            openSubmitSolutionBtn.addEventListener('click', () => {
                document.getElementById('exerciseId').value = currentExercise.id;
                document.getElementById('solutionContent').value = '';
                document.getElementById('solutionImageUrl').value = '';
                document.getElementById('solutionImagePreview').innerHTML = '';
                openModal(submitSolutionModal);
            });
        }
        
        const loginToSubmitBtn = document.getElementById('loginToSubmitBtn');
        if (loginToSubmitBtn) {
            loginToSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(loginModal);
            });
        }
        
        const rateButtons = document.querySelectorAll('.rate-btn');
        rateButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const solutionId = btn.getAttribute('data-solution-id');
                openRateSolutionModal(solutionId);
            });
        });
        
    } catch (error) {
        console.error('Error opening exercise detail:', error);
        exerciseDetailContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Đã xảy ra lỗi khi tải chi tiết bài tập. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

// Open rate solution modal
function openRateSolutionModal(solutionId) {
    if (!currentExercise || !currentExercise.solutions) return;
    
    const solution = currentExercise.solutions.find(s => s.id === solutionId);
    if (!solution) return;
    
    currentSolution = solution;
    
    // Reset form
    document.getElementById('solutionId').value = solutionId;
    document.getElementById('ratingComment').value = '';
    document.querySelectorAll('input[name="rating"]').forEach(radio => radio.checked = false);
    
    // Display solution content
    rateSolutionContent.innerHTML = `
        <div class="solution-preview">
            <p>${solution.content}</p>
            ${solution.imageUrl ? `<img src="${solution.imageUrl}" alt="Hình ảnh lời giải" class="solution-image">` : ''}
        </div>
    `;
    
    openModal(rateSolutionModal);
}

// Handle create exercise form submission
async function handleCreateExercise(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để đăng bài tập', 'warning');
        return;
    }
    
    const title = document.getElementById('exerciseTitle').value;
    const content = document.getElementById('exerciseContent').value;
    const category = document.getElementById('exerciseCategory').value;
    const imageUrl = document.getElementById('exerciseImageUrl').value;
    
    // Validate form
    if (!title || !content || !category) {
        showNotification('Vui lòng điền đầy đủ thông tin bài tập', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = createExerciseForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng bài tập...';
    
    try {
        // Create exercise in Firebase Realtime Database
        const exerciseData = {
            title,
            content,
            category,
            imageUrl: imageUrl || null,
            authorId: currentUser.uid,
            createdAt: Date.now(),
            solutions: []
        };
        
        // Generate a new key for the exercise
        const newExerciseRef = firebase.database().ref('exercises').push();
        await newExerciseRef.set(exerciseData);
        
        // Close modal and reset form
        closeModal(createExerciseModal);
        createExerciseForm.reset();
        document.getElementById('imagePreview').innerHTML = '';
        
        // Show success notification
        showNotification('Đăng bài tập thành công!', 'success');
        
        // Reload exercises
        loadExercises();
    } catch (error) {
        console.error('Error creating exercise:', error);
        showNotification('Đã xảy ra lỗi khi đăng bài tập. Vui lòng thử lại sau.', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Handle submit solution form submission
async function handleSubmitSolution(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để gửi lời giải', 'warning');
        return;
    }
    
    const exerciseId = document.getElementById('exerciseId').value;
    const content = document.getElementById('solutionContent').value;
    const imageUrl = document.getElementById('solutionImageUrl').value;
    
    // Validate form
    if (!content) {
        showNotification('Vui lòng nhập nội dung lời giải', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = submitSolutionForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi lời giải...';
    
    try {
        // Get exercise data from Firebase Realtime Database
        const exerciseRef = firebase.database().ref(`exercises/${exerciseId}`);
        const snapshot = await exerciseRef.once('value');
        
        if (!snapshot.exists()) {
            showNotification('Không tìm thấy bài tập này', 'error');
            return;
        }
        
        const exerciseData = snapshot.val();
        const solutions = exerciseData.solutions || [];
        
        // Check if user already submitted a solution
        if (solutions.some(solution => solution.authorId === currentUser.uid)) {
            showNotification('Bạn đã gửi lời giải cho bài tập này rồi', 'warning');
            return;
        }
        
        // Create solution object
        const solutionId = generateId(10);
        const newSolution = {
            id: solutionId,
            content,
            imageUrl: imageUrl || null,
            authorId: currentUser.uid,
            createdAt: Date.now(),
            ratings: []
        };
        
        // Add solution to exercise
        solutions.push(newSolution);
        
        // Update exercise document in Firebase Realtime Database
        await exerciseRef.update({
            solutions: solutions
        });
        
        // Calculate points based on solution rank
        let pointsAwarded = 0;
        let miniCoinsAwarded = 0;
        if (solutions.length === 1) {
            pointsAwarded = 5; // First solution
            miniCoinsAwarded = 5; // First solution also gets 5 mini-coins
        }
        else if (solutions.length === 2) {
            pointsAwarded = 4; // Second solution
            miniCoinsAwarded = 4; // Second solution gets 4 mini-coins
        }
        else if (solutions.length === 3) {
            pointsAwarded = 3; // Third solution
            miniCoinsAwarded = 3; // Third solution gets 3 mini-coins
        }
        else if (solutions.length === 4) {
            pointsAwarded = 2; // Fourth solution
            miniCoinsAwarded = 2; // Fourth solution gets 2 mini-coins
        }
        else if (solutions.length === 5) {
            pointsAwarded = 1; // Fifth solution
            miniCoinsAwarded = 1; // Fifth solution gets 1 mini-coin
        }
        
        // Update user's learning points and mini-coins
        if (pointsAwarded > 0) {
            const userRef = firebase.database().ref(`users/${currentUser.uid}`);
            const userSnapshot = await userRef.once('value');
            const userData = userSnapshot.val() || {};
            
            const currentPoints = userData.learningPoints || 0;
            const currentMiniCoins = userData.miniCoins || 0;
            
            await userRef.update({
                learningPoints: currentPoints + pointsAwarded,
                miniCoins: currentMiniCoins + miniCoinsAwarded
            });
            
            // Update current user object
             currentUser.learningPoints = currentPoints + pointsAwarded;
             if (!currentUser.miniCoins) currentUser.miniCoins = 0;
             currentUser.miniCoins = currentMiniCoins + miniCoinsAwarded;
             updateUIForLoggedInUser();
         }
         
         // Close modal and reset form
        closeModal(submitSolutionModal);
        submitSolutionForm.reset();
        document.getElementById('solutionImagePreview').innerHTML = '';
        
        // Show success notification
        showNotification(`Gửi lời giải thành công! ${pointsAwarded > 0 ? `Bạn nhận được ${pointsAwarded} điểm và ${miniCoinsAwarded} mini-coins.` : ''}`, 'success');
        
        // Reload exercise detail
        openExerciseDetail(exerciseId);
        
        // Reload leaderboard
        loadLeaderboard();
    } catch (error) {
        console.error('Error submitting solution:', error);
        showNotification('Đã xảy ra lỗi khi gửi lời giải. Vui lòng thử lại sau.', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Handle rate solution form submission
async function handleRateSolution(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để đánh giá lời giải', 'warning');
        return;
    }
    
    const solutionId = document.getElementById('solutionId').value;
    const ratingValue = document.querySelector('input[name="rating"]:checked')?.value;
    const comment = document.getElementById('ratingComment').value;
    
    // Validate form
    if (!ratingValue) {
        showNotification('Vui lòng chọn số sao đánh giá', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = rateSolutionForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi đánh giá...';
    
    try {
        if (!currentExercise) {
            showNotification('Không tìm thấy bài tập', 'error');
            return;
        }
        
        // Get exercise data from Firebase Realtime Database
        const exerciseRef = firebase.database().ref(`exercises/${currentExercise.id}`);
        const snapshot = await exerciseRef.once('value');
        
        if (!snapshot.exists()) {
            showNotification('Không tìm thấy bài tập này', 'error');
            return;
        }
        
        const exerciseData = snapshot.val();
        const solutions = exerciseData.solutions || [];
        
        // Find the solution
        const solutionIndex = solutions.findIndex(s => s.id === solutionId);
        if (solutionIndex === -1) {
            showNotification('Không tìm thấy lời giải này', 'error');
            return;
        }
        
        const solution = solutions[solutionIndex];
        
        // Check if user already rated this solution
        if (solution.ratings && solution.ratings.some(r => r.userId === currentUser.uid)) {
            showNotification('Bạn đã đánh giá lời giải này rồi', 'warning');
            return;
        }
        
        // Create rating object
        const newRating = {
            userId: currentUser.uid,
            value: parseInt(ratingValue),
            comment: comment || null,
            createdAt: Date.now()
        };
        
        // Add rating to solution
        if (!solution.ratings) solution.ratings = [];
        solution.ratings.push(newRating);
        
        // Update solution in the solutions array
        solutions[solutionIndex] = solution;
        
        // Update exercise document in Firebase Realtime Database
        await exerciseRef.update({
            solutions: solutions
        });
        
        // Calculate average rating
        const totalRating = solution.ratings.reduce((sum, r) => sum + r.value, 0);
        const averageRating = totalRating / solution.ratings.length;
        
        // Award points to solution author based on rating
        const ratingPoints = Math.round(averageRating);
        if (ratingPoints > 0) {
            const userRef = firebase.database().ref(`users/${solution.authorId}`);
            const userSnapshot = await userRef.once('value');
            const userData = userSnapshot.val() || {};
            
            const currentPoints = userData.learningPoints || 0;
            await userRef.update({
                learningPoints: currentPoints + ratingPoints
            });
            
            // Update current user object if it's the solution author
            if (currentUser.uid === solution.authorId) {
                currentUser.learningPoints = currentPoints + ratingPoints;
                updateUIForLoggedInUser();
            }
        }
        
        // Close modal and reset form
        closeModal(rateSolutionModal);
        rateSolutionForm.reset();
        
        // Show success notification
        showNotification('Đánh giá lời giải thành công!', 'success');
        
        // Reload exercise detail
        openExerciseDetail(currentExercise.id);
        
        // Reload leaderboard
        loadLeaderboard();
    } catch (error) {
        console.error('Error rating solution:', error);
        showNotification('Đã xảy ra lỗi khi đánh giá lời giải. Vui lòng thử lại sau.', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Load leaderboard data
async function loadLeaderboard() {
    showLoading(leaderboardBody);
    
    try {
        // Get all users
        const usersSnapshot = await firebase.database().ref('users').once('value');
        const usersData = usersSnapshot.val() || {};
        
        // Convert to array and filter users with learning points
        const users = Object.entries(usersData)
            .map(([uid, data]) => ({
                uid,
                displayName: data.displayName || 'Người dùng ẩn danh',
                photoURL: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'Anonymous')}`,
                learningPoints: data.learningPoints || 0,
                solutionsCount: 0 // Will be calculated below
            }))
            .filter(user => user.learningPoints > 0);
        
        // Get all exercises to count solutions per user
        const exercisesSnapshot = await firebase.database().ref('exercises').once('value');
        exercisesSnapshot.forEach(childSnapshot => {
            const exerciseData = childSnapshot.val();
            const solutions = exerciseData.solutions || [];
            
            solutions.forEach(solution => {
                const userIndex = users.findIndex(user => user.uid === solution.authorId);
                if (userIndex !== -1) {
                    users[userIndex].solutionsCount++;
                }
            });
        });
        
        // Sort users by learning points (descending)
        users.sort((a, b) => b.learningPoints - a.learningPoints);
        
        // Display leaderboard
        if (users.length === 0) {
            leaderboardBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <p>Chưa có dữ liệu bảng xếp hạng.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        users.slice(0, 10).forEach((user, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            
            html += `
                <tr>
                    <td class="rank ${rankClass}">${rank}</td>
                    <td class="user">
                        <img src="${user.photoURL}" alt="${user.displayName}">
                        <span>${user.displayName}</span>
                    </td>
                    <td class="score">${user.learningPoints}</td>
                    <td>${user.solutionsCount}</td>
                </tr>
            `;
        });
        
        leaderboardBody.innerHTML = html;
        
        // Also load chat users for mini-chat feature
        loadChatUsers();
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <p>Đã xảy ra lỗi khi tải bảng xếp hạng. Vui lòng thử lại sau.</p>
                </td>
            </tr>
        `;
    }
}

// Load chat users for mini-chat feature
async function loadChatUsers() {
    if (!currentUser) return;
    
    try {
        const usersSnapshot = await firebase.database().ref('users').once('value');
        chatUsers = [];
        
        usersSnapshot.forEach(childSnapshot => {
            const userData = childSnapshot.val();
            const userId = childSnapshot.key;
            
            // Don't add current user to the chat list
            if (userId !== currentUser.uid) {
                chatUsers.push({
                    id: userId,
                    displayName: userData.displayName || 'Người dùng ẩn danh',
                    profileImage: userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'Anonymous')}`,
                    isOnline: onlineUsers.includes(userId)
                });
            }
        });
        
        // Add community chat at the top
        chatUsers.unshift(communityChat);
        
        // Display chat users in the mini panel
        displayChatUsers();
        
        // Listen for new messages
        listenForNewMessages();
    } catch (error) {
        console.error('Error loading chat users:', error);
    }
}

// Display chat users in the mini panel
function displayChatUsers() {
    const chatUsersList = document.getElementById('chatUsersList');
    if (!chatUsersList) return;
    
    let html = '';
    
    // Filter users based on search input
    const searchInput = document.getElementById('chatMiniSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filteredUsers = chatUsers.filter(user => {
        // Always show community chat and filter others by name
        return user.id === 'community' || user.displayName.toLowerCase().includes(searchTerm);
    });
    
    filteredUsers.forEach(user => {
        const isActive = activeChatWindows.some(chat => chat.userId === user.id);
        const hasUnread = chats[user.id] && chats[user.id].some(msg => !msg.read && msg.senderId !== currentUser.uid);
        
        // Đếm số tin nhắn chưa đọc
        let unreadCount = 0;
        if (chats[user.id]) {
            unreadCount = chats[user.id].filter(msg => !msg.read && msg.senderId !== currentUser.uid).length;
        }
        
        html += `
            <div class="chat-user ${isActive ? 'active' : ''}" data-user-id="${user.id}">
                <img src="${user.profileImage}" alt="${user.displayName}">
                <div class="chat-user-info">
                    <span class="chat-user-name">${user.displayName}</span>
                    <span class="chat-user-status ${user.isOnline || user.id === 'community' ? 'online' : 'offline'}">
                        ${user.id === 'community' ? 'Phòng chat chung' : (user.isOnline ? 'Online' : 'Offline')}
                    </span>
                </div>
                ${unreadCount > 0 ? `<span class="unread-badge" title="${unreadCount} tin nhắn chưa đọc">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
            </div>
        `;
    });
    
    chatUsersList.innerHTML = html;
    
    // Add click event to chat users
    const chatUserElements = document.querySelectorAll('.chat-user');
    chatUserElements.forEach(element => {
        element.addEventListener('click', () => {
            // Mở cửa sổ chat khi nhấp vào người dùng, với tham số forceOpen=true
            const userId = element.getAttribute('data-user-id');
            const user = chatUsers.find(u => u.id === userId);
            if (user) {
                openChatWindow(user, true);
            }
        });
    });}


// Array to track active chat windows
let activeChatWindows = [];

// Open chat window with selected user
function openChatWindow(user, forceOpen = false) {
    // Kiểm tra xem cửa sổ chat đã bị đóng thủ công chưa và không có yêu cầu mở cưỡng bức
    if (closedChatWindows[user.id] && !forceOpen) {
        // Nếu đã đóng thủ công và không có yêu cầu mở cưỡng bức, không mở lại
        return;
    }
    
    // Nếu người dùng nhấp vào danh sách chat, xóa trạng thái đóng
    if (forceOpen) {
        delete closedChatWindows[user.id];
    }
    
    // Check if chat window for this user already exists
    const existingWindow = document.querySelector(`.chat-mini-window[data-user-id="${user.id}"]`);
    if (existingWindow) {
        // If minimized, restore it
        if (existingWindow.classList.contains('minimized')) {
            existingWindow.classList.remove('minimized');
        }
        return;
    }
    
    // Update active state in user list
    const userElement = document.querySelector(`.chat-user[data-user-id="${user.id}"]`);
    if (userElement) {
        userElement.classList.add('active');
        // Remove unread badge
        const badge = userElement.querySelector('.unread-badge');
        if (badge) badge.remove();
    }
    
    // Create new chat window from template
    const template = document.getElementById('chatMiniWindowTemplate');
    if (!template) return;
    
    // Check if we need to close an existing window (limit to 3 windows)
    if (activeChatWindows.length >= 3) {
        // Close the oldest window (first in the array)
        const oldestWindow = activeChatWindows[0];
        const oldestWindowEl = document.querySelector(`.chat-mini-window[data-user-id="${oldestWindow.userId}"]`);
        if (oldestWindowEl) {
            // Remove from active windows array
            activeChatWindows.shift();
            // Remove window from DOM
            oldestWindowEl.remove();
            // Update user list active state
            const oldUserEl = document.querySelector(`.chat-user[data-user-id="${oldestWindow.userId}"]`);
            if (oldUserEl) oldUserEl.classList.remove('active');
        }
    }
    
    const chatWindow = template.content.cloneNode(true).querySelector('.chat-mini-window');
    chatWindow.dataset.userId = user.id;
    chatWindow.classList.add('open');
    document.getElementById('chatMiniWindowsContainer').appendChild(chatWindow);

    
    // Set background class if user has a preference
    const userPrefs = getUserChatPreferences(user.id);
    if (userPrefs && userPrefs.background) {
        chatWindow.classList.add(`bg-${userPrefs.background}`);
        
        // Apply custom background if selected
        if (userPrefs.background === 'custom' && userPrefs.customBgUrl) {
            const messagesContainer = chatWindow.querySelector('.chat-mini-window-messages');
            if (messagesContainer) {
                messagesContainer.style.backgroundImage = `url(${userPrefs.customBgUrl})`;
            }
        }
    } else {
        chatWindow.classList.add('bg-default');
    }
    
    // Update user info in header
    const userInfo = chatWindow.querySelector('.chat-mini-user-info');
    if (userInfo) {
        const img = userInfo.querySelector('img');
        const span = userInfo.querySelector('span');
        if (img) {
            img.src = user.profileImage || 'assets/images/default-avatar.png';
        }
        if (span) {
            span.textContent = user.displayName;
        }
    }
    
    // Add event listeners to buttons
    const settingsBtn = chatWindow.querySelector('.chat-mini-window-settings');
    const minimizeBtn = chatWindow.querySelector('.chat-mini-window-minimize');
    const closeBtn = chatWindow.querySelector('.chat-mini-window-close');
    const sendBtn = chatWindow.querySelector('.chat-mini-send-btn');
    const messageInput = chatWindow.querySelector('.chat-mini-window-input input');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => openChatSettings(user.id));
    }
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            chatWindow.classList.add('minimized');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            // Remove from active windows array
            activeChatWindows = activeChatWindows.filter(chat => chat.userId !== user.id);
            // Remove window from DOM
            chatWindow.remove();
            // Update user list active state
            const userEl = document.querySelector(`.chat-user[data-user-id="${user.id}"]`);
            if (userEl) userEl.classList.remove('active');
            
            // Đánh dấu cửa sổ chat này đã được đóng
            closedChatWindows[user.id] = true;
            
            // Lưu trạng thái đóng cửa sổ chat vào localStorage
            try {
                localStorage.setItem('closedChatWindows', JSON.stringify(closedChatWindows));
            } catch (e) {
                console.error('Error saving closed chat windows state:', e);
            }
            
            // Đánh dấu tất cả tin nhắn là đã đọc
            if (chats[user.id]) {
                chats[user.id].forEach(msg => {
                    if (msg.senderId !== currentUser.uid) {
                        msg.read = true;
                    }
                });
            }
        });
    }
    
    if (sendBtn && messageInput) {
        sendBtn.addEventListener('click', () => {
            sendMiniChatMessage(user.id, messageInput.value, chatWindow);
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && messageInput.value.trim() !== '') {
                sendMiniChatMessage(user.id, messageInput.value, chatWindow);
            }
        });
        
        // Add event listeners for icon buttons
        const imageBtn = chatWindow.querySelector('.chat-mini-icon-btn:nth-child(1)');
        const emojiBtn = chatWindow.querySelector('.chat-mini-icon-btn:nth-child(2)');
        const fileBtn = chatWindow.querySelector('.chat-mini-icon-btn:nth-child(3)');
        
        if (imageBtn) {
            imageBtn.addEventListener('click', () => {
                // Create a file input element
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                
                // Trigger click on the file input
                fileInput.click();
                
                // Handle file selection
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file && file.type.startsWith('image/')) {
                        uploadImageToCloudinary(file, user.id, chatWindow);
                    }
                    // Remove the file input from the DOM
                    document.body.removeChild(fileInput);
                });
            });
        }
        
        if (emojiBtn) {
            emojiBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Emoji picker functionality is now handled by emoji-picker.js
            });
        }
        
        if (fileBtn) {
            fileBtn.addEventListener('click', () => {
                // File attachment functionality can be added here
                alert('Tính năng gửi file sẽ được thêm vào sau!');
            });
        }
    }
    
    // Add to container
    const container = document.getElementById('chatMiniWindowsContainer');
    if (container) {
        // Thêm cửa sổ chat vào đầu container để nó xuất hiện ở bên trái
        container.prepend(chatWindow);
        
        // Add to active windows array
        activeChatWindows.push({
            userId: user.id,
            element: chatWindow
        });
        
        // Load and display chat messages
        loadChatMessages(user.id, chatWindow.querySelector('.chat-mini-window-messages'));
        
        // Initialize emoji picker for the new chat window
        if (typeof initEmojiPickerForNewWindows === 'function') {
            setTimeout(initEmojiPickerForNewWindows, 100);
        }
    }
}

// Load chat messages for selected user
async function loadChatMessages(userId, messagesContainer) {
    // If no container is provided, try to find it
    if (!messagesContainer) {
        const chatWindow = document.querySelector(`.chat-mini-window[data-user-id="${userId}"]`);
        if (chatWindow) {
            messagesContainer = chatWindow.querySelector('.chat-mini-window-messages');
        }
    }
    
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    
    try {
        // Kiểm tra xem có tin nhắn từ trang chat.html không
        let mainChatMessages = [];
        let miniChatMessages = [];
        
        // Tìm kiếm tin nhắn từ trang chat.html
        if (userId !== 'community') {
            // Kiểm tra xem chat đã tồn tại trong hệ thống chat chính chưa
            const userChats = await firebase.database().ref('chats').orderByChild('participants/' + userId).equalTo(true).once('value');
            
            userChats.forEach(chatSnapshot => {
                const chatData = chatSnapshot.val();
                // Kiểm tra xem chat có bao gồm người dùng hiện tại không
                if (chatData.participants && chatData.participants[currentUser.uid]) {
                    // Lưu chat ID để sử dụng sau này
                    if (!chats[userId]) chats[userId] = {};
                    chats[userId].chatId = chatSnapshot.key;
                    
                    // Lấy tin nhắn từ chat này
                    if (chatData.messages) {
                        Object.entries(chatData.messages).forEach(([msgId, msg]) => {
                            mainChatMessages.push({
                                id: msgId,
                                content: msg.text,
                                senderId: msg.senderId,
                                senderName: msg.senderName,
                                timestamp: msg.timestamp,
                                imageUrl: msg.imageURL,
                                read: true
                            });
                        });
                    }
                }
            });
        } else {
            // Lấy tin nhắn từ community chat
            const communityChatSnapshot = await firebase.database().ref('community_chat/messages').once('value');
            communityChatSnapshot.forEach(msgSnapshot => {
                const msg = msgSnapshot.val();
                mainChatMessages.push({
                    id: msgSnapshot.key,
                    content: msg.text,
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    timestamp: msg.timestamp,
                    imageUrl: msg.imageURL,
                    read: true
                });
            });
        }
        
        // Lấy tin nhắn từ chat mini
        let chatRef;
        if (userId === 'community') {
            chatRef = firebase.database().ref('chats/community');
        } else {
            // For private chats, use a consistent chat ID regardless of who initiated
            const chatId = [currentUser.uid, userId].sort().join('_');
            chatRef = firebase.database().ref(`chats/private/${chatId}`);
        }
        
        const snapshot = await chatRef.orderByChild('timestamp').once('value');
        
        snapshot.forEach(childSnapshot => {
            const message = childSnapshot.val();
            miniChatMessages.push({
                id: childSnapshot.key,
                ...message,
                read: true // Mark as read when loaded
            });
        });
        
        // Kết hợp tin nhắn từ cả hai nguồn
        const allMessages = [...mainChatMessages, ...miniChatMessages];
        
        // Loại bỏ các tin nhắn trùng lặp dựa trên timestamp
        const uniqueMessages = [];
        const timestamps = new Set();
        
        allMessages.forEach(msg => {
            if (!timestamps.has(msg.timestamp)) {
                timestamps.add(msg.timestamp);
                uniqueMessages.push(msg);
            }
        });
        
        // Sắp xếp tin nhắn theo thời gian
        uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Store messages in chats object
        if (!chats[userId]) chats[userId] = [];
        chats[userId] = uniqueMessages;
        
        // Mark messages as read in database
        miniChatMessages.forEach(msg => {
            if (!msg.read && msg.senderId !== currentUser.uid) {
                chatRef.child(msg.id).update({ read: true });
            }
        });
        
        // Display messages
        displayChatMessages(userId);
    } catch (error) {
        console.error('Error loading chat messages:', error);
        messagesContainer.innerHTML = '<p class="error-message">Không thể tải tin nhắn. Vui lòng thử lại sau.</p>';
    }
}

// Display chat messages
function displayChatMessages(userId) {
    // Find the correct messages container for this user
    const chatWindow = document.querySelector(`.chat-mini-window[data-user-id="${userId}"]`);
    if (!chatWindow || !chats[userId]) return;
    
    const chatMiniMessages = chatWindow.querySelector('.chat-mini-window-messages');
    if (!chatMiniMessages) return;
    
    let html = '';
    let lastDate = null;
    let lastSenderId = null;
    
    // Chỉ hiển thị ngày tháng một lần duy nhất ở đầu cuộc trò chuyện
    if (chats[userId].length > 0) {
        const firstMessage = chats[userId][0];
        const messageDate = new Date(firstMessage.timestamp);
        const formattedDate = `${messageDate.getDate()}/${messageDate.getMonth() + 1}/${messageDate.getFullYear()}`;
        html += `<div class="date-separator">${formattedDate}</div>`;
        lastDate = formattedDate;
    }
    
    chats[userId].forEach((message, index) => {
        const isCurrentUser = message.senderId === currentUser.uid;
        const messageDate = new Date(message.timestamp);
        const formattedDate = `${messageDate.getDate()}/${messageDate.getMonth() + 1}/${messageDate.getFullYear()}`;
        
        // Đặt lại lastSenderId nếu đây là tin nhắn đầu tiên
        if (index === 0) {
            lastSenderId = null;
        }
        
        // Check if this is a new sender or first message
        const isNewSender = lastSenderId !== message.senderId;
        
        // Start message container
        html += `<div class="chat-message ${isCurrentUser ? 'sent' : 'received'} ${!isNewSender ? 'message-continuation' : ''}">`;
        
        // Add sender avatar and name for received messages, but only for the first message from this sender
        if (!isCurrentUser) {
            const sender = chatUsers.find(user => user.id === message.senderId);
            const senderAvatar = sender?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}`;
            
            // Only show sender name for first message from this sender
            if (isNewSender) {
                html += `<span class="sender-name">${message.senderName || 'User'}</span>`;
            }
            
            html += `<div style="display: flex; flex-direction: row; align-items: flex-start; width: 100%">`;
            
            // Only show avatar for first message from this sender
            if (isNewSender) {
                // Add clickable avatar that links to user profile
                html += `<img src="${senderAvatar}" alt="${message.senderName || 'User'}" class="sender-avatar" data-user-id="${message.senderId}" style="cursor: pointer;">`;
            } else {
                // Add empty space to align messages
                html += `<div style="width: 30px; margin-right: 8px;"></div>`;
            }
        }
        
        // Add message content with link detection
        if (message.content && message.content.trim() !== '') {
            // Convert URLs to clickable links
            const contentWithLinks = message.content.replace(
                /(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            );
            html += `<div class="message-content">${contentWithLinks}</div>`;
        }
        
        // Add image if present
        if (message.imageUrl) {
            html += `<div class="message-image"><img src="${message.imageUrl}" alt="Hình ảnh" class="chat-image"></div>`;
        }
        
        // Add timestamp
        html += `<span class="message-time">${messageDate.getHours()}:${String(messageDate.getMinutes()).padStart(2, '0')}</span>`;
        
        // Close flex container for received messages
        if (!isCurrentUser) {
            html += `</div>`;
        }
        
        // Close message container
        html += `</div>`;
        
        // Update lastSenderId
        lastSenderId = message.senderId;
    });
    
    chatMiniMessages.innerHTML = html;
    
    // Add click event to images for preview
    const chatImages = chatMiniMessages.querySelectorAll('.chat-image');
    chatImages.forEach(img => {
        img.addEventListener('click', () => {
            openImagePreview(img.src);
        });
    });
    
    // Add click event to avatars to go to user profile
    const avatars = chatMiniMessages.querySelectorAll('.sender-avatar[data-user-id]');
    avatars.forEach(avatar => {
        avatar.addEventListener('click', () => {
            const userId = avatar.getAttribute('data-user-id');
            if (userId) {
                window.open(`user-profile.html?id=${userId}`, '_blank');
            }
        });
    });
    
    // Scroll to bottom
    chatMiniMessages.scrollTop = chatMiniMessages.scrollHeight;
}

// Send mini chat message
function sendMiniChatMessage(userId, messageText, chatWindow) {
    if (!currentUser) return;
    
    const messageInput = chatWindow.querySelector('.chat-mini-window-input input');
    const message = messageText || messageInput.value.trim();
    
    if (!message && !chatWindow.dataset.imageUrl) return;
    
    // Clear input
    if (messageInput) messageInput.value = '';
    
    // Determine chat reference for mini chat
    let chatRef;
    if (userId === 'community') {
        chatRef = firebase.database().ref('chats/community');
    } else {
        // For private chats, use a consistent chat ID regardless of who initiated
        const chatId = [currentUser.uid, userId].sort().join('_');
        chatRef = firebase.database().ref(`chats/private/${chatId}`);
    }
    
// Import statements must be at the top level
// Moving serverTimestamp import to top of file

    // Create message object
    const newMessage = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        content: message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),

        read: false
    };

    
    // Add image URL if available
    if (chatWindow.dataset.imageUrl) {
        newMessage.imageUrl = chatWindow.dataset.imageUrl;
        // Clear the stored image URL
        delete chatWindow.dataset.imageUrl;
    }
    
    // Add message to database for mini chat
    chatRef.push(newMessage);
    
    // Đồng bộ với trang chat.html
    // Xác định chat ID cho trang chat.html
    if (userId !== 'community') {
        // Kiểm tra xem chat đã tồn tại trong hệ thống chat chính chưa
        const mainChatId = chats[userId]?.chatId;
        
        if (mainChatId) {
            // Nếu đã có chat, thêm tin nhắn vào chat đó
            const mainChatRef = firebase.database().ref('chats/' + mainChatId + '/messages');
            const mainChatMessage = {
                text: message,
                senderId: currentUser.uid,
                timestamp: newMessage.timestamp,
                senderName: currentUser.displayName || 'User'
            };
            
            // Thêm hình ảnh nếu có
            if (newMessage.imageUrl) {
                mainChatMessage.imageURL = newMessage.imageUrl;
            }
            
            // Thêm tin nhắn vào database chính
            mainChatRef.push(mainChatMessage);
            
            // Cập nhật tin nhắn cuối cùng
            firebase.database().ref('chats/' + mainChatId + '/lastMessage').set(mainChatMessage);
        }
    } else {
        // Đồng bộ với community chat
        const communityChatRef = firebase.database().ref('community_chat/messages');
        const communityChatMessage = {
            text: message,
            senderId: currentUser.uid,
            timestamp: newMessage.timestamp,
            senderName: currentUser.displayName || 'User'
        };
        
        // Thêm hình ảnh nếu có
        if (newMessage.imageUrl) {
            communityChatMessage.imageURL = newMessage.imageUrl;
        }
        
        // Thêm tin nhắn vào community chat
        communityChatRef.push(communityChatMessage);
        
        // Cập nhật tin nhắn cuối cùng
        firebase.database().ref('community_chat/lastMessage').set(communityChatMessage);
    }
    
    // Add message to local chat array and display
    if (!chats[userId]) chats[userId] = [];
    newMessage.id = Date.now().toString(); // Temporary ID until we get the real one from Firebase
    chats[userId].push(newMessage);
    
    // Thêm tin nhắn mới vào giao diện thay vì tải lại tất cả
    const messagesContainer = chatWindow.querySelector('.chat-mini-window-messages');
    if (messagesContainer) {
        // Tạo phần tử tin nhắn mới
        const messageDate = new Date(newMessage.timestamp);
        const formattedDate = `${messageDate.getDate()}/${messageDate.getMonth() + 1}/${messageDate.getFullYear()}`;
        
        // Kiểm tra xem có cần thêm dấu phân cách ngày không
        const lastDateEl = messagesContainer.querySelector('.date-separator:last-child');
        const lastDateText = lastDateEl ? lastDateEl.textContent : null;
        if (lastDateText !== formattedDate) {
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'date-separator';
            dateSeparator.textContent = formattedDate;
            messagesContainer.appendChild(dateSeparator);
        }
        
        // Tạo phần tử tin nhắn
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message sent';
        
        let messageHTML = '';
        
        // Thêm nội dung tin nhắn
        if (newMessage.content && newMessage.content.trim() !== '') {
            // Chuyển đổi URL thành liên kết có thể nhấp
            const contentWithLinks = newMessage.content.replace(
                /(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            );
            messageHTML += `<div class="message-content">${contentWithLinks}</div>`;
        }
        
        // Thêm hình ảnh nếu có
        if (newMessage.imageUrl) {
            messageHTML += `<div class="message-image"><img src="${newMessage.imageUrl}" alt="Hình ảnh" class="chat-image"></div>`;
        }
        
        // Thêm thời gian
        messageHTML += `<span class="message-time">${messageDate.getHours()}:${String(messageDate.getMinutes()).padStart(2, '0')}</span>`;
        
        messageEl.innerHTML = messageHTML;
        messagesContainer.appendChild(messageEl);
        
        // Thêm sự kiện click cho hình ảnh
        const chatImages = messageEl.querySelectorAll('.chat-image');
        chatImages.forEach(img => {
            img.addEventListener('click', () => {
                openImagePreview(img.src);
            });
        });
        
        // Cuộn xuống dưới
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Lưu trạng thái đóng của cửa sổ chat
let closedChatWindows = {};
let pageLoadTimestamp = Date.now(); // Track when the page was loaded

// Listen for new messages
function listenForNewMessages() {
    if (!currentUser) return;
    
    // Khôi phục trạng thái đóng cửa sổ chat từ localStorage
    try {
        const savedClosedWindows = localStorage.getItem('closedChatWindows');
        if (savedClosedWindows) {
            closedChatWindows = JSON.parse(savedClosedWindows);
        }
    } catch (e) {
        console.error('Error loading closed chat windows state:', e);
        closedChatWindows = {};
    }
    
    // Listen for community messages
    const communityRef = firebase.database().ref('chats/community');
    communityRef.on('child_added', snapshot => {
        const message = snapshot.val();
        message.id = snapshot.key;
        
        // Check if this is a new message that we don't already have
        if (!chats['community'] || !chats['community'].some(m => m.id === message.id)) {
            if (!chats['community']) chats['community'] = [];
            chats['community'].push(message);
            
            // Update UI if community chat is currently open
            if (selectedChatUser && selectedChatUser.id === 'community') {
                displayChatMessages('community');
                // Mark as read in database
                if (message.senderId !== currentUser.uid) {
                    communityRef.child(message.id).update({ read: true });
                }
            } else if (message.senderId !== currentUser.uid) {
                // Increment unread count and show notification
                unreadMessageCount++;
                updateChatNotificationBadge();
                // Show unread badge on user in list
                updateUnreadBadge('community');
            }
        }
    });
    
    // Listen for private messages
    chatUsers.forEach(user => {
        if (user.id !== 'community') {
            const chatId = [currentUser.uid, user.id].sort().join('_');
            const privateRef = firebase.database().ref(`chats/private/${chatId}`);
            
            privateRef.on('child_added', snapshot => {
                const message = snapshot.val();
                message.id = snapshot.key;
                
                // Kiểm tra xem tin nhắn này có phải là tin nhắn mới không
                const isNewMessage = !chats[user.id] || !chats[user.id].some(m => m.id === message.id);
                
                // Kiểm tra xem tin nhắn này có phải là tin nhắn mới sau khi trang được tải không
                const isMessageAfterPageLoad = message.timestamp > pageLoadTimestamp;
                
                // Check if this is a new message that we don't already have
                if (isNewMessage) {
                    if (!chats[user.id]) chats[user.id] = [];
                    chats[user.id].push(message);
                    
                    // Update UI if this user's chat is currently open
                    if (selectedChatUser && selectedChatUser.id === user.id) {
                        displayChatMessages(user.id);
                        // Mark as read in database
                        if (message.senderId !== currentUser.uid) {
                            privateRef.child(message.id).update({ read: true });
                        }
                    } else if (message.senderId !== currentUser.uid) {
                        // Increment unread count and show notification
                        unreadMessageCount++;
                        updateChatNotificationBadge();
                        // Show unread badge on user in list
                        updateUnreadBadge(user.id);
                        
                        // Auto-open chat window for private messages ONLY if it's a new message
                        // that arrived after page load and the window wasn't manually closed by the user
                        const existingWindow = document.querySelector(`.chat-mini-window[data-user-id="${user.id}"]`);
                        if (!existingWindow && isMessageAfterPageLoad) {
                            // Luôn mở cửa sổ chat khi có tin nhắn mới, bỏ qua kiểm tra closedChatWindows
                            // để sửa lỗi ô chat mini không tự bật khi có tin nhắn từ người cụ thể
                            const chatUser = chatUsers.find(u => u.id === user.id);
                            if (chatUser) {
                                openChatWindow(chatUser, true); // Force open with new message
                            }
                        }
                    }
                }
            });
        }
    });
}

// Update chat notification badge
function updateChatNotificationBadge() {
    const badge = document.getElementById('chatNotificationBadge');
    if (badge) {
        if (unreadMessageCount > 0) {
            badge.textContent = unreadMessageCount > 9 ? '9+' : unreadMessageCount;
            badge.style.display = 'flex';
        } else {
            badge.textContent = '';
            badge.style.display = 'none';
        }
    }
}

// Update unread badge on user in list
function updateUnreadBadge(userId) {
    const userElement = document.querySelector(`.chat-user[data-user-id="${userId}"]`);
    if (!userElement) return;
    
    // Đếm số tin nhắn chưa đọc
    let unreadCount = 0;
    if (chats[userId]) {
        unreadCount = chats[userId].filter(msg => !msg.read && msg.senderId !== currentUser.uid).length;
    }
    
    // Cập nhật hoặc tạo badge
    let badge = userElement.querySelector('.unread-badge');
    
    if (unreadCount > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'unread-badge';
            userElement.appendChild(badge);
        }
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.title = `${unreadCount} tin nhắn chưa đọc`;
    } else if (badge) {
        // Nếu không có tin nhắn chưa đọc, xóa badge nếu tồn tại
        badge.remove();
    }
}

// Get user chat preferences from localStorage
function getUserChatPreferences(userId) {
    const prefsString = localStorage.getItem(`chat_prefs_${userId}`);
    if (prefsString) {
        try {
            return JSON.parse(prefsString);
        } catch (e) {
            console.error('Error parsing chat preferences:', e);
            return null;
        }
    }
    return null;
}

// Open create room modal
function openCreateRoomModal() {
    const modal = document.getElementById('createChatRoomModal');
    const membersContainer = document.getElementById('roomMembersContainer');
    
    if (!modal || !membersContainer) return;
    
    // Clear previous members
    membersContainer.innerHTML = '';
    
    // Add all users except current user and community
    const usersToAdd = chatUsers.filter(user => user.id !== 'community' && user.id !== currentUser.uid && !user.isRoom);
    
    if (usersToAdd.length === 0) {
        membersContainer.innerHTML = '<p>Không có người dùng khác để thêm vào phòng chat.</p>';
    } else {
        usersToAdd.forEach(user => {
            const memberItem = document.createElement('div');
            memberItem.className = 'room-member-item';
            memberItem.innerHTML = `
                <img src="${user.profileImage}" alt="${user.displayName}">
                <span class="member-name">${user.displayName}</span>
                <input type="checkbox" class="member-checkbox" value="${user.id}" id="member-${user.id}">
            `;
            membersContainer.appendChild(memberItem);
        });
    }
    
    // Show modal
    modal.style.display = 'block';
}

// Handle create room form submission
async function handleCreateRoom(e) {
    e.preventDefault();
    
    const roomNameInput = document.getElementById('roomName');
    const roomDescInput = document.getElementById('roomDescription');
    const memberCheckboxes = document.querySelectorAll('.member-checkbox:checked');
    
    if (!roomNameInput || !roomNameInput.value.trim()) {
        alert('Vui lòng nhập tên phòng chat');
        return;
    }
    
    // Get selected members
    const selectedMembers = Array.from(memberCheckboxes).map(checkbox => checkbox.value);
    
    // Create room object
    const roomId = 'room_' + Date.now();
    const newRoom = {
        id: roomId,
        name: roomNameInput.value.trim(),
        description: roomDescInput ? roomDescInput.value.trim() : '',
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        members: {}
    };
    
    // Add current user as member and admin
    newRoom.members[currentUser.uid] = {
        role: 'admin',
        joinedAt: Date.now()
    };
    
    // Add selected members
    selectedMembers.forEach(memberId => {
        newRoom.members[memberId] = {
            role: 'member',
            joinedAt: Date.now()
        };
    });
    
    try {
        // Save room to database
        await firebase.database().ref(`chat_rooms/${roomId}`).set(newRoom);
        
        // Add room to chat users list
        const roomForList = {
            id: roomId,
            displayName: newRoom.name,
            profileImage: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(newRoom.name) + '&background=random',
            isRoom: true,
            description: newRoom.description
        };
        
        chatUsers.push(roomForList);
        displayChatUsers();
        
        // Close modal
        const modal = document.getElementById('createChatRoomModal');
        if (modal) modal.style.display = 'none';
        
        // Reset form
        document.getElementById('createChatRoomForm').reset();
        
        // Open the new room
        openChatWindow(roomForList);
    } catch (error) {
        console.error('Error creating chat room:', error);
        alert('Không thể tạo phòng chat. Vui lòng thử lại sau.');
    }
}

// Load chat rooms
async function loadChatRooms() {
    if (!currentUser) return;
    
    try {
        // Get all rooms where current user is a member
        const roomsRef = firebase.database().ref('chat_rooms');
        const roomsSnapshot = await roomsRef.orderByChild(`members/${currentUser.uid}/joinedAt`).startAt(1).once('value');
        
        const rooms = [];
        roomsSnapshot.forEach(snapshot => {
            const roomData = snapshot.val();
            rooms.push({
                id: snapshot.key,
                displayName: roomData.name,
                profileImage: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(roomData.name) + '&background=random',
                isRoom: true,
                description: roomData.description || '',
                members: roomData.members || {}
            });
        });
        
        // Add rooms to chat users list
        rooms.forEach(room => {
            // Check if room is already in the list
            const existingRoomIndex = chatUsers.findIndex(user => user.id === room.id);
            if (existingRoomIndex === -1) {
                chatUsers.push(room);
            } else {
                chatUsers[existingRoomIndex] = room;
            }
        });
        
        // Update display
        displayChatUsers();
        
        // Listen for new messages in rooms
        listenForRoomMessages(rooms);
    } catch (error) {
        console.error('Error loading chat rooms:', error);
    }
}

// Listen for messages in chat rooms
function listenForRoomMessages(rooms) {
    if (!currentUser || !rooms || !rooms.length) return;
    
    rooms.forEach(room => {
        const roomId = room.id;
        const roomMessagesRef = firebase.database().ref(`chat_rooms/${roomId}/messages`);
        
        roomMessagesRef.off(); // Remove any existing listeners
        roomMessagesRef.on('child_added', snapshot => {
            const message = snapshot.val();
            message.id = snapshot.key;
            
            // Initialize room messages array if needed
            if (!chats[roomId]) chats[roomId] = [];
            
            // Check if this is a new message that we don't already have
            const isNewMessage = !chats[roomId].some(m => m.id === message.id);
            const isMessageAfterPageLoad = message.timestamp > pageLoadTimestamp;
            
            if (isNewMessage) {
                chats[roomId].push(message);
                
                // Update UI if this room's chat is currently open
                if (selectedChatUser && selectedChatUser.id === roomId) {
                    displayChatMessages(roomId);
                    // Mark as read in database
                    if (message.senderId !== currentUser.uid) {
                        roomMessagesRef.child(message.id).update({ read: true });
                    }
                } else if (message.senderId !== currentUser.uid) {
                    // Increment unread count and show notification
                    unreadMessageCount++;
                    updateChatNotificationBadge();
                    // Show unread badge on room in list
                    updateUnreadBadge(roomId);
                    
                    // Auto-open chat window for room messages if it's a new message
                    // that arrived after page load and the window wasn't manually closed
                    const existingWindow = document.querySelector(`.chat-mini-window[data-user-id="${roomId}"]`);
                    if (!existingWindow && !closedChatWindows[roomId] && isMessageAfterPageLoad) {
                        openChatWindow(room, true); // Force open with new message
                    }
                }
            }
        });
    });
}

// Save user chat preferences to localStorage
function saveUserChatPreferences(userId, prefs) {
    localStorage.setItem(`chat_prefs_${userId}`, JSON.stringify(prefs));
}

// Update background of active chat windows
function updateActiveChatWindowsBackground(userId, prefs) {
    // Find all active chat windows for this user
    const chatWindows = document.querySelectorAll(`.chat-mini-window[data-user-id="${userId}"]`);
    
    chatWindows.forEach(window => {
        // Remove all background classes
        window.classList.remove('bg-default', 'bg-gradient1', 'bg-gradient2', 'bg-pattern1', 'bg-custom');
        
        // Add the selected background class
        window.classList.add(`bg-${prefs.background}`);
        
        // If custom background, set the background image
        if (prefs.background === 'custom' && prefs.customBgUrl) {
            const messagesContainer = window.querySelector('.chat-mini-window-messages');
            if (messagesContainer) {
                messagesContainer.style.backgroundImage = `url(${prefs.customBgUrl})`;
            }
        }
    });
}

// Open chat settings modal
function openChatSettings(userId) {
    const modal = document.getElementById('chatSettingsModal');
    if (!modal) return;
    
    // Store the user ID for the settings
    modal.dataset.userId = userId;
    
    // Get current preferences
    const prefs = getUserChatPreferences(userId) || { background: 'default' };
    
    // Update UI to reflect current settings
    const bgOptions = modal.querySelectorAll('.background-option');
    bgOptions.forEach(option => {
        const bgType = option.dataset.bg;
        if (bgType === prefs.background) {
            option.classList.add('selected');
            
            // Show custom background upload container if custom is selected
            if (bgType === 'custom') {
                document.getElementById('customBgUploadContainer').style.display = 'block';
                
                // Show preview if custom background URL exists
                if (prefs.customBgUrl) {
                    const previewContainer = document.getElementById('chatBgPreview');
                    previewContainer.innerHTML = `<img src="${prefs.customBgUrl}" alt="Hình nền tùy chỉnh">`;
                    document.getElementById('chatBgImageUrl').value = prefs.customBgUrl;
                }
            }
        } else {
            option.classList.remove('selected');
        }
    });
    
    // Show the modal
    modal.style.display = 'block';
}

// Sync messages with main chat system
function syncWithMainChat() {
    if (!currentUser) return;
    
    // Listen for changes in the main chat database
    const mainChatRef = firebase.database().ref('chats');
    mainChatRef.on('child_added', snapshot => {
        const chatData = snapshot.val();
        const chatId = snapshot.key;
        
        // Check if this chat involves the current user
        if (chatId.includes(currentUser.uid)) {
            // Extract the other user's ID
            // Split the chat ID by underscore and find the ID that's not the current user's
            const userIds = chatId.split('_');
            const otherUserId = userIds.find(id => id !== currentUser.uid);
            
            // Check if we have this user in our chat list
            const userExists = chatUsers.some(user => user.id === otherUserId);
            if (!userExists && otherUserId !== 'community') {
                // Fetch user info and add to chat list
                firebase.database().ref(`users/${otherUserId}`).once('value', userSnapshot => {
                    const userData = userSnapshot.val();
                    if (userData) {
                        chatUsers.push({
                            id: otherUserId,
                            displayName: userData.displayName || 'Người dùng ẩn danh',
                            profileImage: userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'Anonymous')}`,
                            isOnline: onlineUsers.includes(otherUserId)
                        });
                        
                        // Update display
                        displayChatUsers();
                    }
                });
            }
            
            // Update messages if chat window is open
            const chatWindow = document.querySelector(`.chat-mini-window[data-user-id="${otherUserId}"]`);
            if (chatWindow) {
                loadChatMessages(otherUserId, chatWindow.querySelector('.chat-mini-window-messages'));
            }
            
            // Check for new messages and update unread count
            const messagesRef = firebase.database().ref(`chats/${chatId}/messages`);
            messagesRef.orderByChild('timestamp').limitToLast(1).on('child_added', messageSnapshot => {
                const message = messageSnapshot.val();
                
                // Skip if message is from current user
                if (message.senderId === currentUser.uid) return;
                
                // Update unread count and notification badge
                if (!chatWindow || chatWindow.style.display === 'none') {
                    // Increment unread count
                    if (!chats[otherUserId]) chats[otherUserId] = [];
                    const existingMsg = chats[otherUserId].find(msg => msg.timestamp === message.timestamp);
                    if (!existingMsg) {
                        // Add message to chats array with proper structure
                        chats[otherUserId].push({
                            senderId: message.senderId,
                            senderName: message.senderName,
                            content: message.text, // Convert from 'text' to 'content'
                            timestamp: message.timestamp,
                            imageUrl: message.imageURL, // Convert from 'imageURL' to 'imageUrl'
                            read: false
                        });
                        
                        // Update unread count and badges
                        unreadMessageCount++;
                        updateChatNotificationBadge();
                        updateUnreadBadge(otherUserId);
                    }
                }
            });
        }
    });
    
    // Also sync community chat
    const communityChatRef = firebase.database().ref('community_chat/messages');
    communityChatRef.on('child_added', messageSnapshot => {
        const message = messageSnapshot.val();
        const communityWindow = document.querySelector('.chat-mini-window[data-user-id="community"]');
        
        // Update community chat if window is open
        if (communityWindow) {
            loadChatMessages('community', communityWindow.querySelector('.chat-mini-window-messages'));
        }
        
        // Skip if message is from current user
        if (message.senderId === currentUser.uid) return;
        
        // Update unread count and notification badge
        if (!communityWindow || communityWindow.style.display === 'none') {
            // Increment unread count
            if (!chats['community']) chats['community'] = [];
            const existingMsg = chats['community'].find(msg => msg.timestamp === message.timestamp);
            if (!existingMsg) {
                // Add message to chats array with proper structure
                chats['community'].push({
                    senderId: message.senderId,
                    senderName: message.senderName,
                    content: message.text, // Convert from 'text' to 'content'
                    timestamp: message.timestamp,
                    imageUrl: message.imageURL, // Convert from 'imageURL' to 'imageUrl'
                    read: false
                });
                
                // Update unread count and badges
                unreadMessageCount++;
                updateChatNotificationBadge();
                updateUnreadBadge('community');
            }
        }
    });
}

// First initChatFeatures definition - will be replaced by the second one
// This function is duplicated later in the code

// Helper Functions
function openModal(modal) {
    if (modal) modal.style.display = 'block';
}

function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Check if notification container exists
    let notificationContainer = document.querySelector('.notification-container');
    
    // Create container if it doesn't exist
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Add close button event
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function showLoading(container) {
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
        `;
    }
}

function getStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let html = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (halfStar) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    return html;
}

// Upload image to Cloudinary
async function uploadImageToCloudinary(file, userId, chatWindow) {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div><span>Đang tải ảnh...</span>';
    chatWindow.appendChild(loadingIndicator);
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', 'chat_images');
        
        // Upload to Cloudinary
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Lỗi khi tải ảnh lên');
        }
        
        const data = await response.json();
        
        // Store image URL in chat window dataset
        chatWindow.dataset.imageUrl = data.secure_url;
        
        // Send message with image
        sendMiniChatMessage(userId, '', chatWindow);
        
        // Remove loading indicator
        chatWindow.removeChild(loadingIndicator);
    } catch (error) {
        console.error('Error uploading image:', error);
        
        // Show error notification
        showNotification('Lỗi khi tải ảnh lên. Vui lòng thử lại sau.', 'error');
        
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
            chatWindow.removeChild(loadingIndicator);
        }
    }
}

// Function to open image preview
function openImagePreview(imageUrl) {
    // Create modal for image preview
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
        <div class="image-preview-content">
            <span class="image-preview-close">&times;</span>
            <img src="${imageUrl}" alt="Xem trước hình ảnh">
        </div>
    `;
    
    // Add to body
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
    
    // Add close event
    const closeBtn = modal.querySelector('.image-preview-close');
    closeBtn.addEventListener('click', () => {
        modal.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    });
    
    // Close on click outside image
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }
    });
}

// Chuyển hướng đến trang hồ sơ người dùng
function navigateToUserProfile(userId) {
    if (!userId) return;
    
    // Chuyển hướng đến trang learning.html với ID người dùng
    window.location.href = `learning.html?id=${userId}`;
}

// Initialize chat features
function initChatFeatures() {
    if (!currentUser) return;
    
    // Show chat mini button
    const chatMiniButton = document.getElementById('chatMiniButton');
    if (chatMiniButton) {
        chatMiniButton.style.display = 'flex';
    }
    
    // Sync with main chat system
    syncWithMainChat();
    
    // Set up presence system to track online users
    const userStatusRef = firebase.database().ref(`status/${currentUser.uid}`);
    
    // Set up connection state change listener
    const connectedRef = firebase.database().ref('.info/connected');
    connectedRef.on('value', snapshot => {
        if (snapshot.val() === true) {
            // User is online
            userStatusRef.set(true);
            userStatusRef.onDisconnect().remove();
        }
    });
    
    // Listen for online users
    const statusRef = firebase.database().ref('status');
    statusRef.on('value', snapshot => {
        onlineUsers = [];
        snapshot.forEach(childSnapshot => {
            onlineUsers.push(childSnapshot.key);
        });
        
        // Update online status in chat users list
        if (chatUsers.length > 0) {
            chatUsers.forEach(user => {
                if (user.id !== 'community' && !user.isRoom) {
                    user.isOnline = onlineUsers.includes(user.id);
                }
            });
            
            // Update display if needed
            const chatUsersList = document.getElementById('chatUsersList');
            if (chatUsersList && chatUsersList.innerHTML !== '') {
                displayChatUsers();
            }
        }
    });
    
    // Add event listener for search input
    const chatMiniSearchInput = document.getElementById('chatMiniSearchInput');
    if (chatMiniSearchInput) {
        chatMiniSearchInput.addEventListener('input', () => {
            displayChatUsers();
        });
    }
    
    // Set up create room button
    const createRoomBtn = document.getElementById('chatMiniCreateRoom');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', openCreateRoomModal);
    }
    
    // Set up create room form
    const createRoomForm = document.getElementById('createChatRoomForm');
    if (createRoomForm) {
        createRoomForm.addEventListener('submit', handleCreateRoom);
    }
    
    // Set up cancel button
    const cancelCreateRoomBtn = document.getElementById('cancelCreateRoom');
    if (cancelCreateRoomBtn) {
        cancelCreateRoomBtn.addEventListener('click', () => {
            const modal = document.getElementById('createChatRoomModal');
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking on X
const closeButtons = document.querySelectorAll('.modal .close');
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        if (modal) modal.style.display = 'none';
    });
});

// Add event listeners for background options in chat settings
const chatSettingsModal = document.getElementById('chatSettingsModal');
if (chatSettingsModal) {
    const bgOptions = chatSettingsModal.querySelectorAll('.background-option');
    bgOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            bgOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Show/hide custom background upload container
            const customBgContainer = document.getElementById('customBgUploadContainer');
            if (option.dataset.bg === 'custom') {
                customBgContainer.style.display = 'block';
            } else {
                customBgContainer.style.display = 'none';
            }
        });
    });
    
    // Add event listener for save settings button
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const userId = chatSettingsModal.dataset.userId;
            if (!userId) return;
            
            // Get selected background
            const selectedBg = chatSettingsModal.querySelector('.background-option.selected');
            if (!selectedBg) return;
            
            const bgType = selectedBg.dataset.bg;
            const prefs = { background: bgType };
            
            // If custom background is selected, add the custom URL
            if (bgType === 'custom') {
                const customBgUrl = document.getElementById('chatBgImageUrl').value;
                if (customBgUrl) {
                    prefs.customBgUrl = customBgUrl;
                } else {
                    // If no custom URL is provided, default to 'default' background
                    prefs.background = 'default';
                }
            }
            
            // Save preferences
            saveUserChatPreferences(userId, prefs);
            
            // Update active chat windows if any
            updateActiveChatWindowsBackground(userId, prefs);
            
            // Close modal
            chatSettingsModal.style.display = 'none';
            
            // Show notification
            showNotification('Cài đặt đã được lưu', 'success');
        });
    }
}
    
    // Load chat users
    loadChatUsers();
    
    // Load chat rooms
    loadChatRooms();
    
    // Sync with main chat system
    syncWithMainChat();
}