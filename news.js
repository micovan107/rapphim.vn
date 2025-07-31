// News.js - Xử lý logic cho trang tin tức

// Biến toàn cục
let currentUser = null;
let currentCategory = 'latest';

// RSS Feed URLs
const RSS_FEEDS = {
    // VnExpress RSS feeds
    latest: 'https://vnexpress.net/rss/tin-moi-nhat.rss',
    sports: 'https://vnexpress.net/rss/the-thao.rss',
    entertainment: 'https://vnexpress.net/rss/giai-tri.rss',
    business: 'https://vnexpress.net/rss/kinh-doanh.rss',
    technology: 'https://vnexpress.net/rss/so-hoa.rss',
    health: 'https://vnexpress.net/rss/suc-khoe.rss',
    
    // Zing News RSS feeds
    zing_latest: 'https://zingnews.vn/rss/trang-chinh.rss',
    zing_sports: 'https://zingnews.vn/rss/the-thao.rss',
    zing_entertainment: 'https://zingnews.vn/rss/giai-tri.rss',
    zing_business: 'https://zingnews.vn/rss/kinh-doanh-tai-chinh.rss',
    zing_technology: 'https://zingnews.vn/rss/cong-nghe.rss',
    zing_health: 'https://zingnews.vn/rss/suc-khoe.rss'
};

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
    });

    // Thiết lập các sự kiện
    setupEventListeners();

    // Tải tin tức cho danh mục mặc định (tin mới nhất)
    loadNewsByCategory('latest');
});

// Thiết lập giao diện người dùng dựa trên trạng thái đăng nhập
function setupUI(user) {
    const authButtons = document.querySelector('.auth-buttons');
    
    if (user && !user.isAnonymous) {
        // Người dùng đã đăng nhập và không phải người dùng ẩn danh
        
        // Lấy dữ liệu người dùng từ database
        firebase.database().ref(`users/${user.uid}`).once('value')
            .then(snapshot => {
                const userData = snapshot.exists() ? snapshot.val() : {};
                
                // Kiểm tra nếu người dùng là admin (email là micovan108@gmail.com)
                const isUserAdmin = userData && userData.email === 'micovan108@gmail.com';
                
                // Hiển thị các nút quản lý nếu là admin
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
    }
}

// Thiết lập các sự kiện
function setupEventListeners() {
    // Sự kiện chuyển đổi danh mục tin tức
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            
            // Cập nhật UI
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Cập nhật danh mục hiện tại
            currentCategory = category;
            
            // Hiển thị nội dung danh mục
            document.querySelectorAll('.news-category-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(category).classList.add('active');
            
            // Luôn tải lại tin tức khi chuyển danh mục để có tin mới nhất từ cả hai nguồn
            loadNewsByCategory(category);
        });
    });
    
    // Sự kiện đóng modal
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
    
    // Sự kiện chuyển đổi giữa đăng nhập và đăng ký
    document.getElementById('switchToSignup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('signupModal').style.display = 'block';
    });
    
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupModal').style.display = 'none';
        document.getElementById('loginModal').style.display = 'block';
    });
    
    // Đóng modal khi click bên ngoài
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Tải tin tức theo danh mục
async function loadNewsByCategory(category) {
    const newsListElement = document.querySelector(`#${category} .news-list`);
    const loadingElement = document.querySelector(`#${category} .loading-spinner`);
    
    // Hiển thị loading
    loadingElement.style.display = 'flex';
    newsListElement.innerHTML = '';
    
    try {
        // Lấy RSS feed URL từ VnExpress
        const vnExpressRssUrl = RSS_FEEDS[category];
        
        // Lấy RSS feed URL tương ứng từ Zing News
        const zingRssUrl = RSS_FEEDS[`zing_${category}`] || null;
        
        // Mảng chứa tất cả các tin tức
        let allNewsItems = [];
        
        // Tải tin tức từ VnExpress
        const vnExpressApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(vnExpressRssUrl)}`;
        const vnExpressResponse = await fetch(vnExpressApiUrl);
        const vnExpressData = await vnExpressResponse.json();
        
        if (vnExpressData.status === 'ok') {
            allNewsItems = [...vnExpressData.items];
        }
        
        // Tải tin tức từ Zing News nếu có
        if (zingRssUrl) {
            const zingApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(zingRssUrl)}`;
            const zingResponse = await fetch(zingApiUrl);
            const zingData = await zingResponse.json();
            
            if (zingData.status === 'ok') {
                allNewsItems = [...allNewsItems, ...zingData.items];
            }
        }
        
        // Sắp xếp tin tức theo thời gian (mới nhất lên đầu)
        allNewsItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        
        // Hiển thị tin tức
        if (allNewsItems.length > 0) {
            renderNews(allNewsItems, newsListElement);
        } else {
            throw new Error('Không thể tải tin tức');
        }
    } catch (error) {
        console.error(`Lỗi khi tải tin tức ${category}:`, error);
        newsListElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Không thể tải tin tức. Vui lòng thử lại sau.</p>
            </div>
        `;
    } finally {
        // Ẩn loading
        loadingElement.style.display = 'none';
    }
}

// Hiển thị tin tức
function renderNews(items, container) {
    // Xóa nội dung cũ
    container.innerHTML = '';
    
    // Kiểm tra nếu không có tin tức
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="no-news">
                <i class="fas fa-newspaper"></i>
                <p>Không có tin tức nào.</p>
            </div>
        `;
        return;
    }
    
    // Hiển thị tin tức
    items.forEach(item => {
        // Trích xuất hình ảnh từ nội dung nếu không có thumbnail
        let imageUrl = item.thumbnail || extractImageFromContent(item.content);
        if (!imageUrl) {
            imageUrl = 'https://via.placeholder.com/300x180?text=Không+có+hình+ảnh';
        }
        
        // Tạo phần tử tin tức
        const newsElement = document.createElement('div');
        newsElement.className = 'news-card';
        
        // Format thời gian
        const pubDate = new Date(item.pubDate);
        const formattedDate = formatDate(pubDate);
        
        // Trích xuất mô tả
        const description = extractDescription(item.content) || 'Không có mô tả';
        
        newsElement.innerHTML = `
            <a href="${item.link}" class="news-card-link" target="_blank">
                <div class="news-card-image">
                    <img src="${imageUrl}" alt="${item.title}">
                </div>
                <div class="news-card-content">
                    <h3 class="news-card-title">${item.title}</h3>
                    <p class="news-card-description">${description}</p>
                    <div class="news-card-meta">
                        <div class="news-card-source">
                            <img src="${item.link.includes('vnexpress.net') ? 'https://s1.vnecdn.net/vnexpress/restruct/i/v630/v2_2019/pc/graphics/logo.svg' : 'https://static.znews.vn/images/logo-znews-light-2.svg'}" alt="${item.link.includes('vnexpress.net') ? 'VnExpress' : 'Zing News'}">
                            <span>${item.link.includes('vnexpress.net') ? 'VnExpress' : 'Zing News'}</span>
                        </div>
                        <div class="news-card-date">
                            <i class="far fa-clock"></i>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                </div>
            </a>
        `;
        
        // Thêm vào container
        container.appendChild(newsElement);
    });
}

// Trích xuất hình ảnh từ nội dung
function extractImageFromContent(content) {
    if (!content) return null;
    
    // Tạo một phần tử div tạm thời để phân tích nội dung HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Tìm thẻ img đầu tiên
    const imgElement = tempDiv.querySelector('img');
    
    return imgElement ? imgElement.src : null;
}

// Trích xuất mô tả từ nội dung
function extractDescription(content) {
    if (!content) return null;
    
    // Tạo một phần tử div tạm thời để phân tích nội dung HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Lấy văn bản từ phần tử đầu tiên (thường là mô tả)
    const firstParagraph = tempDiv.querySelector('p');
    
    if (firstParagraph) {
        return firstParagraph.textContent.trim();
    }
    
    // Nếu không tìm thấy thẻ p, lấy văn bản từ nội dung
    return tempDiv.textContent.trim().substring(0, 150) + '...';
}

// Format thời gian
function formatDate(date) {
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
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

// Chuyển đổi chế độ sáng/tối
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    // Lưu trạng thái chế độ vào localStorage
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    
    // Cập nhật icon
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}

// Hiển thị thông báo
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = notification.querySelector('.notification-message');
    const notificationIcon = notification.querySelector('.notification-icon');
    
    // Đặt nội dung và loại thông báo
    notificationMessage.textContent = message;
    
    // Đặt icon dựa trên loại thông báo
    switch (type) {
        case 'success':
            notificationIcon.className = 'notification-icon fas fa-check-circle';
            notification.className = 'notification notification-success';
            break;
        case 'error':
            notificationIcon.className = 'notification-icon fas fa-exclamation-circle';
            notification.className = 'notification notification-error';
            break;
        case 'warning':
            notificationIcon.className = 'notification-icon fas fa-exclamation-triangle';
            notification.className = 'notification notification-warning';
            break;
        default:
            notificationIcon.className = 'notification-icon fas fa-info-circle';
            notification.className = 'notification notification-info';
    }
    
    // Hiển thị thông báo
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}