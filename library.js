// Library JavaScript

// Global variables
let books = [];
let currentPage = 1;
let booksPerPage = 12;
let totalPages = 0;
let currentLanguageFilter = '';
let currentSortBy = 'popular';
let currentSearchQuery = '';
let currentBookDetail = null;

// DOM Elements
let booksGrid;
let loadingSpinner;
let prevPageBtn;
let nextPageBtn;
let currentPageSpan;
let bookSearchInput;
let bookSearchBtn;
let languageFilter;
let sortBySelect;
let bookDetailModal;
let readBookModal;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    booksGrid = document.getElementById('booksGrid');
    loadingSpinner = document.getElementById('loadingSpinner');
    prevPageBtn = document.getElementById('prevPageBtn');
    nextPageBtn = document.getElementById('nextPageBtn');
    currentPageSpan = document.getElementById('currentPage');
    bookSearchInput = document.getElementById('bookSearchInput');
    bookSearchBtn = document.getElementById('bookSearchBtn');
    languageFilter = document.getElementById('languageFilter');
    sortBySelect = document.getElementById('sortBy');
    bookDetailModal = document.getElementById('bookDetailModal');
    readBookModal = document.getElementById('readBookModal');
    
    // Add event listeners
    bookSearchBtn.addEventListener('click', handleSearch);
    bookSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    languageFilter.addEventListener('change', () => {
        currentLanguageFilter = languageFilter.value;
        currentPage = 1;
        fetchBooks();
    });
    
    sortBySelect.addEventListener('change', () => {
        currentSortBy = sortBySelect.value;
        currentPage = 1;
        fetchBooks();
    });
    
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchBooks();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchBooks();
        }
    });
    
    // Close modals when clicking on the close button or outside the modal
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            bookDetailModal.style.display = 'none';
            readBookModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === bookDetailModal) {
            bookDetailModal.style.display = 'none';
        }
        if (e.target === readBookModal) {
            readBookModal.style.display = 'none';
        }
    });
    
    // Font size selector for book reading
    document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
        const fontSize = e.target.value;
        document.getElementById('bookContent').className = `book-content ${fontSize}`;
        document.getElementById('translatedContent').className = `book-content ${fontSize}`;
        
        // Áp dụng font size cho nội dung mẫu nếu có
        const sampleContent = document.querySelector('.sample-content');
        if (sampleContent) {
            sampleContent.className = `sample-content ${fontSize}`;
        }
    });
    
    // Translation buttons
    document.getElementById('translateBtn').addEventListener('click', () => {
        translateBookContent();
    });
    
    document.getElementById('originalBtn').addEventListener('click', () => {
        document.getElementById('bookContent').style.display = 'block';
        document.getElementById('translatedContent').style.display = 'none';
        document.getElementById('translateBtn').style.display = 'block';
        document.getElementById('originalBtn').style.display = 'none';
    });
    
    // Read directly button
    document.getElementById('readDirectlyBtn').addEventListener('click', () => {
        if (currentBookDetail) {
            openReadBookModal(currentBookDetail);
        }
    });
    
    // Initial fetch
    fetchBooks();
    
    // Check for daily reward
    checkDailyReward();
});

// Search handler
function handleSearch() {
    currentSearchQuery = bookSearchInput.value.trim();
    currentPage = 1;
    fetchBooks();
}

// Fetch books from Project Gutenberg API
async function fetchBooks() {
    showLoading(true);
    
    try {
        // Build API URL with filters
        let apiUrl = `https://gutendex.com/books/?page=${currentPage}`;
        
        if (currentLanguageFilter) {
            apiUrl += `&languages=${currentLanguageFilter}`;
        }
        
        if (currentSearchQuery) {
            apiUrl += `&search=${encodeURIComponent(currentSearchQuery)}`;
        }
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        books = data.results;
        totalPages = Math.ceil(data.count / booksPerPage);
        
        // Sort books based on selection
        sortBooks();
        
        // Update UI
        updateBooksGrid();
        updatePagination();
    } catch (error) {
        console.error('Error fetching books:', error);
        showNotification('Lỗi khi tải dữ liệu sách. Vui lòng thử lại sau.', 'error');
    } finally {
        showLoading(false);
    }
}

// Sort books based on selected option
function sortBooks() {
    switch (currentSortBy) {
        case 'title':
            books.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'author':
            books.sort((a, b) => {
                const authorA = a.authors.length > 0 ? a.authors[0].name : '';
                const authorB = b.authors.length > 0 ? b.authors[0].name : '';
                return authorA.localeCompare(authorB);
            });
            break;
        case 'newest':
            // Sort by download count as a proxy for newest (API doesn't provide date)
            books.sort((a, b) => b.download_count - a.download_count);
            break;
        case 'popular':
        default:
            // Sort by download count (most popular)
            books.sort((a, b) => b.download_count - a.download_count);
            break;
    }
}

// Update books grid with fetched books
function updateBooksGrid() {
    booksGrid.innerHTML = '';
    
    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-book-open"></i>
                <p>Không tìm thấy sách phù hợp. Vui lòng thử lại với từ khóa khác.</p>
            </div>
        `;
        return;
    }
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        // Get cover image or use placeholder
        const coverUrl = book.formats['image/jpeg'] || 'https://via.placeholder.com/200x300?text=No+Cover';
        
        // Get author name
        const author = book.authors.length > 0 ? book.authors[0].name : 'Unknown Author';
        
        // Get language
        const language = book.languages[0] || 'unknown';
        const languageDisplay = getLanguageDisplay(language);
        
        bookCard.innerHTML = `
            <div class="book-cover">
                <img src="${coverUrl}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/200x300?text=No+Cover'">
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${author}</p>
                <p class="book-language"><i class="fas fa-globe"></i> ${languageDisplay}</p>
            </div>
        `;
        
        // Add click event to show book details
        bookCard.addEventListener('click', () => {
            showBookDetails(book);
        });
        
        booksGrid.appendChild(bookCard);
    });
}

// Update pagination controls
function updatePagination() {
    currentPageSpan.textContent = `Trang ${currentPage} / ${totalPages || 1}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Show book details in modal
function showBookDetails(book) {
    currentBookDetail = book;
    
    // Set book details
    document.getElementById('bookDetailTitle').textContent = book.title;
    document.getElementById('bookDetailAuthor').textContent = 
        book.authors.length > 0 ? book.authors[0].name : 'Unknown Author';
    
    const coverUrl = book.formats['image/jpeg'] || 'https://via.placeholder.com/200x300?text=No+Cover';
    document.getElementById('bookDetailCover').src = coverUrl;
    document.getElementById('bookDetailCover').alt = book.title;
    
    // Set language
    const language = book.languages[0] || 'unknown';
    document.getElementById('bookDetailLanguage').textContent = getLanguageDisplay(language);
    
    // Set subjects/genres
    document.getElementById('bookDetailSubjects').textContent = 
        book.subjects.slice(0, 5).join(', ') || 'Không có thông tin';
    
    // Set download links
    const downloadsContainer = document.getElementById('bookDetailDownloads');
    downloadsContainer.innerHTML = '';
    
    // Add download links for different formats
    const formats = {
        'application/epub+zip': { name: 'EPUB', icon: 'fa-book' },
        'application/x-mobipocket-ebook': { name: 'MOBI', icon: 'fa-tablet-alt' },
        'text/plain': { name: 'Text', icon: 'fa-file-alt' },
        'text/html': { name: 'HTML', icon: 'fa-code' },
        'application/pdf': { name: 'PDF', icon: 'fa-file-pdf' }
    };
    
    for (const [format, url] of Object.entries(book.formats)) {
        if (formats[format]) {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.innerHTML = `<i class="fas ${formats[format].icon}"></i> ${formats[format].name}`;
            downloadsContainer.appendChild(link);
        }
    }
    
    // Set read online links
    const readOnlineContainer = document.getElementById('bookDetailReadOnline');
    readOnlineContainer.innerHTML = '';
    
    if (book.formats['text/html']) {
        const link = document.createElement('a');
        link.href = book.formats['text/html'];
        link.target = '_blank';
        link.innerHTML = `<i class="fas fa-globe"></i> HTML`;
        readOnlineContainer.appendChild(link);
    }
    
    if (book.formats['text/plain']) {
        const link = document.createElement('a');
        link.href = book.formats['text/plain'];
        link.target = '_blank';
        link.innerHTML = `<i class="fas fa-file-alt"></i> Text`;
        readOnlineContainer.appendChild(link);
    }
    
    // Show modal
    bookDetailModal.style.display = 'block';
}

// Open read book modal
async function openReadBookModal(book) {
    // Set book title
    document.getElementById('readBookTitle').textContent = book.title;
    
    // Clear content containers
    document.getElementById('bookContent').innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải nội dung...</div>';
    document.getElementById('translatedContent').innerHTML = '';
    
    // Reset translation buttons
    document.getElementById('translateBtn').style.display = 'block';
    document.getElementById('originalBtn').style.display = 'none';
    document.getElementById('bookContent').style.display = 'block';
    document.getElementById('translatedContent').style.display = 'none';
    
    // Show modal
    readBookModal.style.display = 'block';
    
    try {
        // Try to get text content
        let textUrl = book.formats['text/plain; charset=utf-8'] || 
                     book.formats['text/plain'] || 
                     book.formats['text/html'];
        
        if (!textUrl) {
            throw new Error('Không tìm thấy định dạng văn bản để đọc.');
        }
        
        // Sử dụng CORS proxy để tránh lỗi CORS
        const corsProxyUrl = 'https://corsproxy.io/?';
        const proxyUrl = corsProxyUrl + encodeURIComponent(textUrl);
        
        try {
            const corsProxyUrl = 'https://api.allorigins.win/raw?url=';
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            let text = await response.text();
            
            // Clean up text for display
            text = cleanupBookText(text);
            
            // Display text
            document.getElementById('bookContent').innerHTML = formatBookText(text);
        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            // Hiển thị nội dung mẫu nếu không thể tải
            document.getElementById('bookContent').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Không thể tải nội dung sách do lỗi CORS. Đây là nội dung mẫu.</p>
                </div>
                <div class="sample-content">
                    <h3>${book.title}</h3>
                    <p><em>Tác giả: ${book.authors.length > 0 ? book.authors[0].name : 'Unknown Author'}</em></p>
                    <p>Đây là nội dung mẫu của sách. Trong môi trường thực tế, nội dung sẽ được tải từ Project Gutenberg.</p>
                    <p>Để đọc sách đầy đủ, bạn có thể tải xuống từ các liên kết trong phần chi tiết sách.</p>
                    <p>Lỗi khi tải: ${fetchError.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading book content:', error);
        document.getElementById('bookContent').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Không thể tải nội dung sách. ${error.message}</p>
            </div>
        `;
    }
}

// Clean up book text for better display
function cleanupBookText(text) {
    // Remove Project Gutenberg header and footer
    const headerEnd = text.indexOf('*** START OF THIS PROJECT GUTENBERG');
    const footerStart = text.indexOf('*** END OF THIS PROJECT GUTENBERG');
    
    if (headerEnd !== -1 && footerStart !== -1) {
        text = text.substring(headerEnd, footerStart);
    }
    
    // Remove extra line breaks and spaces
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text;
}

// Format book text for display
function formatBookText(text) {
    // Convert line breaks to paragraphs
    const paragraphs = text.split('\n\n');
    return paragraphs.map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
}

// Translate book content
async function translateBookContent() {
    const translatedContent = document.getElementById('translatedContent');
    const originalContent = document.getElementById('bookContent');
    
    // Show loading in translated content
    translatedContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang dịch nội dung...</div>';
    translatedContent.style.display = 'block';
    originalContent.style.display = 'none';
    document.getElementById('translateBtn').style.display = 'none';
    document.getElementById('originalBtn').style.display = 'block';
    
    try {
        // Get text to translate (limit to first 5000 characters to avoid API limits)
        const textToTranslate = originalContent.textContent.substring(0, 5000);
        
        // Check if we're dealing with sample content
        const hasSampleContent = originalContent.querySelector('.sample-content') !== null;
        
        // Use Google Translate API (you would need to set up your own API key)
        // This is a placeholder - in a real app, you'd call your backend to handle the translation
        // to avoid exposing API keys in frontend code
        
        // Simulate translation with a delay
        setTimeout(() => {
            // Get current font size class
            const fontSizeClass = originalContent.className.includes('small') ? 'small' : 
                                 originalContent.className.includes('large') ? 'large' : 'medium';
            
            if (hasSampleContent) {
                // For sample content, create a custom translated version
                const bookTitle = document.getElementById('readBookTitle').textContent;
                translatedContent.innerHTML = `
                    <div class="translation-notice">
                        <p><i class="fas fa-info-circle"></i> Tính năng dịch thuật đang được phát triển. Chắc không có xiền á.</p>
                    </div>
                    <div class="sample-content ${fontSizeClass}">
                        <h3>Bản dịch: ${bookTitle}</h3>
                        <p><em>Đây là bản dịch mẫu của nội dung sách.</em></p>
                        <p>Trong ứng dụng thực tế, nội dung sẽ được dịch bằng Google Translate API.</p>
                        <p>Bạn có thể tải xuống sách từ các liên kết trong phần chi tiết sách.</p>
                    </div>
                `;
            } else {
                // For regular content
                translatedContent.innerHTML = `
                    <div class="translation-notice">
                        <p><i class="fas fa-info-circle"></i> Tính năng dịch thuật đang được phát triển. Chắc ko có xiền á.</p>
                    </div>
                    <p>Đây là bản dịch mẫu của nội dung sách. Trong ứng dụng thực tế, nội dung sẽ được dịch bằng Google Translate API.</p>
                    ${originalContent.innerHTML}
                `;
            }
        }, 1500);
    } catch (error) {
        console.error('Translation error:', error);
        translatedContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Không thể dịch nội dung sách. ${error.message}</p>
            </div>
        `;
    }
}

// Helper function to get language display name
function getLanguageDisplay(code) {
    const languages = {
        'en': 'Tiếng Anh',
        'fr': 'Tiếng Pháp',
        'de': 'Tiếng Đức',
        'es': 'Tiếng Tây Ban Nha',
        'it': 'Tiếng Ý',
        'pt': 'Tiếng Bồ Đào Nha',
        'ru': 'Tiếng Nga',
        'zh': 'Tiếng Trung',
        'ja': 'Tiếng Nhật',
        'ko': 'Tiếng Hàn'
    };
    
    return languages[code] || code;
}

// Show/hide loading spinner
function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}

// Show notification
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
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Add close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('notification-hiding');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('notification-hiding');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Check for daily reward
async function checkDailyReward() {
    try {
        // Check if user is logged in
        if (!firebase.auth().currentUser) {
            return;
        }
        
        const userId = firebase.auth().currentUser.uid;
        const userRef = firebase.database().ref(`users/${userId}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};
        
        const lastReward = userData.lastLibraryReward ? new Date(userData.lastLibraryReward) : null;
        const today = new Date();
        
        // Check if user has already received reward today
        if (!lastReward || !isSameDay(lastReward, today)) {
            // Award MiniCoins
            const rewardAmount = 20;
            const currentCoins = userData.miniCoins || 0;
            
            await userRef.update({
                miniCoins: currentCoins + rewardAmount,
                lastLibraryReward: today.toISOString()
            });
            
            showNotification(`Bạn đã nhận ${rewardAmount} MiniCoin cho việc ghé thăm thư viện hôm nay!`, 'success');
            
            // Update MiniCoins display if function exists
            if (typeof updateMiniCoinsDisplay === 'function') {
                updateMiniCoinsDisplay();
            }
        }
    } catch (error) {
        console.error('Error checking daily reward:', error);
    }
}

// Helper function to check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}
