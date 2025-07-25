// DOM Elements
// Sử dụng biến createRoomBtn đã được khai báo trong rooms.js

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tooltips if any
    initTooltips();
    
    // Add smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
            
            // Đóng menu trên thiết bị di động sau khi click
            const navMenu = document.querySelector('nav ul');
            if (window.innerWidth <= 768 && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
        });
    });
    
    // Add animation on scroll
    animateOnScroll();
    
    // Check if user is coming from a shared link
    checkSharedLink();
    
    // Kiểm tra và tối ưu cho thiết bị di động
    checkMobileDevice();
});

// Initialize tooltips
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        const tooltipText = element.getAttribute('data-tooltip');
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = tooltipText;
        
        // Add tooltip to element
        element.appendChild(tooltip);
        
        // Show/hide tooltip on hover
        element.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            tooltip.style.visibility = 'visible';
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
        });
    });
    
    // Add tooltip styles
    if (tooltipElements.length > 0 && !document.getElementById('tooltip-styles')) {
        const tooltipStyle = document.createElement('style');
        tooltipStyle.id = 'tooltip-styles';
        tooltipStyle.textContent = `
            [data-tooltip] {
                position: relative;
            }
            
            .tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                padding: 8px 12px;
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                border-radius: 4px;
                font-size: 0.8rem;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
                z-index: 1000;
                margin-bottom: 5px;
            }
            
            .tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border-width: 5px;
                border-style: solid;
                border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
            }
        `;
        document.head.appendChild(tooltipStyle);
    }
}

// Animate elements on scroll
function animateOnScroll() {
    const animatedElements = document.querySelectorAll('.feature-card, .room-card, .hero-content, .hero-image');
    
    if (animatedElements.length > 0) {
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            .animate-fade-in {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease, transform 0.6s ease;
            }
            
            .animate-fade-in.visible {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
        
        // Add animation class to elements
        animatedElements.forEach(element => {
            element.classList.add('animate-fade-in');
        });
        
        // Check if elements are in viewport
        const checkIfInView = () => {
            animatedElements.forEach(element => {
                const rect = element.getBoundingClientRect();
                const isInView = (
                    rect.top <= window.innerHeight * 0.8 &&
                    rect.bottom >= 0
                );
                
                if (isInView) {
                    element.classList.add('visible');
                }
            });
        };
        
        // Check on load and scroll
        window.addEventListener('scroll', checkIfInView);
        window.addEventListener('resize', checkIfInView);
        checkIfInView();
    }
}

// Check if user is coming from a shared link
function checkSharedLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
        // Redirect to room page
        window.location.href = `room.html?id=${roomId}`;
    }
}

// Kiểm tra và tối ưu cho thiết bị di động
function checkMobileDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Thêm class mobile vào body
        document.body.classList.add('mobile-device');
        
        // Tạo nút toggle menu cho thiết bị di động
        createMobileMenuToggle();
        
        // Tối ưu các phần tử cho thiết bị di động
        optimizeForMobile();
    }
    
    // Cập nhật menu điều hướng để thêm liên kết đến trang diễn đàn
    updateNavigation();
}

// Tạo nút toggle menu cho thiết bị di động
function createMobileMenuToggle() {
    // Kiểm tra xem nút đã tồn tại chưa
    if (document.querySelector('.mobile-menu-toggle')) return;
    
    const header = document.querySelector('header');
    const nav = document.querySelector('nav');
    
    if (header && nav) {
        // Tạo nút toggle menu
        const menuToggle = document.createElement('button');
        menuToggle.className = 'mobile-menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Thêm sự kiện click
        menuToggle.addEventListener('click', () => {
            const navMenu = nav.querySelector('ul');
            navMenu.classList.toggle('active');
            
            // Thay đổi icon
            const icon = menuToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });
        
        // Thêm vào header
        header.insertBefore(menuToggle, nav);
    }
}

// Tối ưu các phần tử cho thiết bị di động
function optimizeForMobile() {
    // Tăng kích thước các nút để dễ chạm
    document.querySelectorAll('.btn, button:not(.mobile-menu-toggle)').forEach(button => {
        button.style.minHeight = '44px';
    });
    
    // Tăng kích thước font chữ cho form
    document.querySelectorAll('input, textarea, select').forEach(input => {
        input.style.fontSize = '16px';
    });
    
    // Đảm bảo các phần tử có thể cuộn mượt mà
    document.querySelectorAll('.rooms-grid, .features-grid').forEach(element => {
        element.style.webkitOverflowScrolling = 'touch';
    });
    
    // Tối ưu header cho thiết bị di động
    optimizeHeaderForMobile();
}

// Tối ưu header cho thiết bị di động
function optimizeHeaderForMobile() {
    // Lấy kích thước màn hình
    const screenWidth = window.innerWidth;
    const header = document.querySelector('header');
    
    // Hàm cập nhật class dựa trên kích thước màn hình
    function updateHeaderClass() {
        // Xóa tất cả các class kích thước
        header.classList.remove('header-xs', 'header-sm', 'header-md');
        
        // Thêm class tương ứng với kích thước màn hình
        if (screenWidth <= 375) {
            header.classList.add('header-xs');
        } else if (screenWidth <= 480) {
            header.classList.add('header-sm');
        } else if (screenWidth <= 768) {
            header.classList.add('header-md');
        }
        
        // Thêm class cho chế độ landscape nếu cần
        if (window.matchMedia("(orientation: landscape)").matches && screenWidth <= 768) {
            header.classList.add('header-landscape');
        } else {
            header.classList.remove('header-landscape');
        }
    }
    
    // Cập nhật class ban đầu
    updateHeaderClass();
    
    // Lắng nghe sự kiện thay đổi kích thước màn hình
    window.addEventListener('resize', updateHeaderClass);
    
    // Lắng nghe sự kiện thay đổi hướng màn hình
    window.addEventListener('orientationchange', updateHeaderClass);
    
    // Xử lý khi scroll để thu nhỏ header
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 30) {
            // Scroll xuống và đã scroll quá 30px
            header.classList.add('header-compact');
        } else if (scrollTop < lastScrollTop || scrollTop <= 30) {
            // Scroll lên hoặc ở gần đầu trang
            header.classList.remove('header-compact');
        }
        
        lastScrollTop = scrollTop;
    });
}

// Copy room link to clipboard
function copyRoomLink(roomId) {
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    
    // Create temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = roomUrl;
    document.body.appendChild(tempInput);
    
    // Select and copy text
    tempInput.select();
    document.execCommand('copy');
    
    // Remove temporary element
    document.body.removeChild(tempInput);
    
    // Show notification
    showNotification('Đường dẫn phòng đã được sao chép!', 'success');
}

// Share room on social media
function shareRoom(roomId, platform) {
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    const roomName = document.querySelector('.room-details h2').textContent;
    const encodedRoomName = encodeURIComponent(roomName);
    const encodedRoomUrl = encodeURIComponent(roomUrl);
    
    let shareUrl = '';
    
    switch (platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedRoomUrl}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodedRoomName}&url=${encodedRoomUrl}`;
            break;
        case 'whatsapp':
            shareUrl = `https://api.whatsapp.com/send?text=${encodedRoomName} ${encodedRoomUrl}`;
            break;
        default:
            return;
    }
    
    // Open share dialog
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

// Add share buttons to room page
function addShareButtons() {
    // Check if we're on the room page
    if (!window.location.pathname.includes('room.html')) {
        return;
    }
    
    // Get room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');
    
    if (!roomId) return;
    
    // Create share buttons container
    const shareContainer = document.createElement('div');
    shareContainer.className = 'share-container';
    shareContainer.innerHTML = `
        <h3>Chia Sẻ Phòng</h3>
        <div class="share-buttons">
            <button class="share-btn copy" onclick="copyRoomLink('${roomId}')"><i class="fas fa-copy"></i></button>
            <button class="share-btn facebook" onclick="shareRoom('${roomId}', 'facebook')"><i class="fab fa-facebook-f"></i></button>
            <button class="share-btn twitter" onclick="shareRoom('${roomId}', 'twitter')"><i class="fab fa-twitter"></i></button>
            <button class="share-btn whatsapp" onclick="shareRoom('${roomId}', 'whatsapp')"><i class="fab fa-whatsapp"></i></button>
        </div>
    `;
    
    // Add share container to room sidebar
    const roomSidebar = document.querySelector('.room-sidebar');
    if (roomSidebar) {
        roomSidebar.appendChild(shareContainer);
    }
    
    // Add share button styles
    const style = document.createElement('style');
    style.textContent = `
        .share-container {
            padding: 20px;
            border-top: 1px solid #eee;
        }
        
        .share-container h3 {
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        
        .share-buttons {
            display: flex;
            gap: 10px;
        }
        
        .share-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .share-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
        }
        
        .share-btn.copy {
            background-color: #6c757d;
        }
        
        .share-btn.facebook {
            background-color: #3b5998;
        }
        
        .share-btn.twitter {
            background-color: #1da1f2;
        }
        
        .share-btn.whatsapp {
            background-color: #25d366;
        }
    `;
    document.head.appendChild(style);
}

// Add share buttons when on room page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('room.html')) {
        // Wait for room page to be fully set up
        setTimeout(addShareButtons, 1000);
    }
});

// Add loading animation
function addLoadingAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }
        
        .loading::after {
            content: '';
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Add loading animation on page load
document.addEventListener('DOMContentLoaded', addLoadingAnimation);

// Add responsive menu for mobile
function addResponsiveMenu() {
    // Get existing menu toggle button
    const menuToggle = document.querySelector('.menu-toggle');
    
    // Add menu toggle to header
    const header = document.querySelector('header');
    const nav = document.querySelector('nav');
    
    if (header && nav && menuToggle) {
        // Add event listener to toggle menu
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.innerHTML = nav.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : 
                '<i class="fas fa-bars"></i>';
        });
        
        // Add responsive menu styles
        const style = document.createElement('style');
        style.textContent = `
            .menu-toggle {
                display: none;
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--dark-color);
            }
            
            @media (max-width: 768px) {
                .menu-toggle {
                    display: block;
                }
                
                nav {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    background: white;
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
                    padding: 20px;
                    clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
                    transition: clip-path 0.4s ease-out;
                    z-index: 99;
                }
                
                nav.active {
                    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
                }
                
                nav ul {
                    flex-direction: column;
                    align-items: center;
                }
                
                nav ul li {
                    margin: 10px 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Add responsive menu on page load
document.addEventListener('DOMContentLoaded', addResponsiveMenu);

// Add theme toggle
function addThemeToggle() {
    // Create theme toggle button
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.setAttribute('data-tooltip', 'Chế độ tối');
    
    // Add theme toggle to header
    const header = document.querySelector('header');
    const authButtons = document.querySelector('.auth-buttons');
    
    if (header && authButtons) {
        header.insertBefore(themeToggle, authButtons);
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggle.setAttribute('data-tooltip', 'Chế độ sáng');
        }
        
        // Add event listener to toggle theme
        themeToggle.addEventListener('click', () => {
            // Sử dụng hàm toggleDarkMode từ auth.js nếu có, nếu không thì sử dụng logic tại chỗ
            if (typeof toggleDarkMode === 'function') {
                toggleDarkMode();
                // Cập nhật tooltip sau khi chuyển đổi
                if (document.body.classList.contains('dark-theme')) {
                    themeToggle.setAttribute('data-tooltip', 'Chế độ sáng');
                } else {
                    themeToggle.setAttribute('data-tooltip', 'Chế độ tối');
                }
            } else {
                // Logic cũ nếu không có hàm toggleDarkMode
                document.body.classList.toggle('dark-theme');
                
                if (document.body.classList.contains('dark-theme')) {
                    localStorage.setItem('theme', 'dark');
                    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                    themeToggle.setAttribute('data-tooltip', 'Chế độ sáng');
                } else {
                    localStorage.setItem('theme', 'light');
                    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                    themeToggle.setAttribute('data-tooltip', 'Chế độ tối');
                }
            }
        });
        
        // Add dark theme styles
        const style = document.createElement('style');
        style.textContent = `
            .theme-toggle {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: var(--dark-color);
                margin-right: 15px;
                transition: transform 0.3s;
            }
            
            .theme-toggle:hover {
                transform: rotate(30deg);
            }
            
            .dark-theme {
                --primary-color: #ff5e62;
                --secondary-color: #ff9966;
                --dark-color: #f4f4f4;
                --light-color: #2c3e50;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #f4f4f4;
            }
            
            .dark-theme header {
                background: rgba(26, 26, 46, 0.95);
                backdrop-filter: blur(10px);
            }
            
            .dark-theme .room-card,
            .dark-theme .feature-card,
            .dark-theme .about-section,
            .dark-theme .modal-content,
            .dark-theme .room-sidebar,
            .dark-theme .video-info,
            .dark-theme .post-card,
            .dark-theme .post-detail,
            .dark-theme .sidebar-section {
                background: #16213e;
                color: #f4f4f4;
            }
            
            .dark-theme .video-info h2,
            .dark-theme .post-title,
            .dark-theme .post-detail-title,
            .dark-theme .sidebar-title {
                color: #f4f4f4;
            }
            
            .dark-theme .filter-btn {
                background: #1a1a2e;
                color: #f4f4f4;
            }
            
            .dark-theme .room-info p,
            .dark-theme .feature-card p,
            .dark-theme .room-meta,
            .dark-theme .video-info p,
            .dark-theme .post-excerpt,
            .dark-theme .post-content p {
                color: #aaa;
            }
            
            .dark-theme .form-group input,
            .dark-theme .form-group textarea,
            .dark-theme .chat-input input,
            .dark-theme .search-container input,
            .dark-theme .comment-form textarea {
                background: #1a1a2e;
                color: #f4f4f4;
                border-color: #2c3e50;
            }
            
            .dark-theme .message-content {
                background: #2c3e50;
            }
            
            .dark-theme .message.own .message-content {
                background: #16213e;
            }
            
            .dark-theme .system-message {
                background-color: rgba(255, 255, 255, 0.05);
                color: #aaa;
            }
            
            .dark-theme footer {
                background: #1a1a2e;
            }
            
            .dark-theme .dropdown-content {
                background-color: #16213e;
            }
            
            .dark-theme .dropdown-content a:hover {
                background-color: #2c3e50;
            }
            
            .dark-theme .post-meta {
                border-top-color: #2c3e50;
            }
            
            .dark-theme .post-author,
            .dark-theme .post-detail-author,
            .dark-theme .post-detail-meta {
                color: #f4f4f4;
            }
            
            .dark-theme .post-stats,
            .dark-theme .post-stat,
            .dark-theme .post-detail-stats,
            .dark-theme .post-detail-stat {
                color: #aaa;
            }
            
            .dark-theme .category-tab {
                background-color: #1a1a2e;
                border-color: #2c3e50;
                color: #f4f4f4;
            }
            
            .dark-theme .category-tab:hover {
                background-color: #1a1a2e;
            }
        `;
        document.head.appendChild(style);
    }
}

// Add theme toggle on page load
document.addEventListener('DOMContentLoaded', addThemeToggle);

// Hide YouTube Watermark
const hideWatermarkStyle = document.createElement('style');
hideWatermarkStyle.textContent = `
    .ytp-watermark, 
    .ytp-youtube-button, 
    .ytp-small-redirect {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
`;
document.head.appendChild(hideWatermarkStyle);

// Ensure watermark is hidden when YouTube iframe is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Apply again after a short delay to ensure it catches dynamically loaded elements
    setTimeout(() => {
        const watermarks = document.querySelectorAll('.ytp-watermark, .ytp-youtube-button, .ytp-small-redirect');
        watermarks.forEach(watermark => {
            watermark.style.display = 'none';
            watermark.style.opacity = '0';
            watermark.style.pointerEvents = 'none';
        });
    }, 1000);
});

// Add scroll to top button
function addScrollToTopButton() {
    // Create scroll to top button
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.className = 'scroll-top-btn';
    scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    
    // Add button to body
    document.body.appendChild(scrollTopBtn);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    });
    
    // Scroll to top when clicked
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Add scroll to top button styles
    const style = document.createElement('style');
    style.textContent = `
        .scroll-top-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
            color: white;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s, transform 0.3s;
            z-index: 99;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .scroll-top-btn.show {
            opacity: 1;
            visibility: visible;
        }
        
        .scroll-top-btn:hover {
            transform: translateY(-5px);
        }
    `;
    document.head.appendChild(style);
}

// Add scroll to top button on page load
document.addEventListener('DOMContentLoaded', addScrollToTopButton);

// Cập nhật menu điều hướng để thêm liên kết đến trang diễn đàn
function updateNavigation() {
    const navMenu = document.querySelector('nav ul');
    if (!navMenu) return;
    
    // Kiểm tra xem liên kết đến trang diễn đàn đã tồn tại chưa
    const forumLink = Array.from(navMenu.querySelectorAll('a')).find(link => 
        link.getAttribute('href') === 'forum.html' || 
        link.textContent.trim() === 'Diễn đàn'
    );
    
    // Nếu chưa có liên kết đến trang diễn đàn, thêm vào
    if (!forumLink) {
        const forumLi = document.createElement('li');
        forumLi.innerHTML = '<a href="forum.html">Diễn đàn</a>';
        
        // Thêm vào sau liên kết "Phòng"
        const roomsLink = Array.from(navMenu.querySelectorAll('a')).find(link => 
            link.getAttribute('href') === 'index.html#rooms' || 
            link.textContent.trim() === 'Phòng'
        );
        
        if (roomsLink && roomsLink.parentElement) {
            navMenu.insertBefore(forumLi, roomsLink.parentElement.nextSibling);
        } else {
            // Nếu không tìm thấy liên kết "Phòng", thêm vào cuối
            navMenu.appendChild(forumLi);
        }
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