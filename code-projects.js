// Biến toàn cục
let currentUser = null;
let projectsData = [];
let currentPage = 1;
let projectsPerPage = 12;
let totalPages = 1;
let currentFilters = {
    sort: 'newest',
    types: ['html', 'javascript', 'other']
};
let currentSearchQuery = '';

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Thiết lập các sự kiện
    setupEventListeners();
    
    // Đảm bảo Firebase đã được khởi tạo
    const checkFirebaseInit = setInterval(() => {
        if (window.auth && window.database) {
            clearInterval(checkFirebaseInit);
            // Tiếp tục với auth và database đã được khởi tạo
            setupAuthListener();
            updateUserUI();
            loadProjects();
        }
    }, 100);
});

// Thiết lập lắng nghe sự kiện đăng nhập
function setupAuthListener() {
    // Lắng nghe sự kiện đăng nhập
    window.auth.onAuthStateChanged(function(user) {
        currentUser = user;
    });
}

// Cập nhật giao diện người dùng
function updateUserUI() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (currentUser) {
        // Sử dụng getCurrentUserData để lấy thông tin người dùng đầy đủ
        window.getCurrentUserData().then(userData => {
            userNameElement.textContent = userData.displayName || 'Người dùng';
            userAvatarElement.src = userData.photoURL || 'avatarlazi.png';
        }).catch(error => {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            userNameElement.textContent = currentUser.displayName || 'Người dùng';
            if (currentUser.photoURL) {
                userAvatarElement.src = currentUser.photoURL;
            }
        });
    } else {
        userNameElement.textContent = 'Đăng nhập';
        userAvatarElement.src = 'avatarlazi.png';
    }
}

// Thiết lập các sự kiện
function setupEventListeners() {
    // Sự kiện cho nút tìm kiếm
    document.getElementById('searchBtn').addEventListener('click', function() {
        const searchInput = document.getElementById('searchProjects');
        currentSearchQuery = searchInput.value.trim();
        currentPage = 1;
        loadProjects();
    });
    
    // Sự kiện cho input tìm kiếm khi nhấn Enter
    document.getElementById('searchProjects').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentSearchQuery = this.value.trim();
            currentPage = 1;
            loadProjects();
        }
    });
    
    // Sự kiện cho bộ lọc sắp xếp
    document.getElementById('sortFilter').addEventListener('change', function() {
        currentFilters.sort = this.value;
    });
    
    // Sự kiện cho các checkbox loại dự án
    document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedBoxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
            currentFilters.types = Array.from(checkedBoxes).map(cb => cb.value);
        });
    });
    
    // Sự kiện cho nút áp dụng bộ lọc
    document.getElementById('applyFiltersBtn').addEventListener('click', function() {
        currentPage = 1;
        loadProjects();
    });
    
    // Sự kiện cho nút đặt lại bộ lọc
    document.getElementById('resetFiltersBtn').addEventListener('click', function() {
        document.getElementById('sortFilter').value = 'newest';
        currentFilters.sort = 'newest';
        
        document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        currentFilters.types = ['html', 'javascript', 'other'];
        
        document.getElementById('searchProjects').value = '';
        currentSearchQuery = '';
        
        currentPage = 1;
        loadProjects();
    });
    
    // Sự kiện cho nút phân trang
    document.getElementById('prevPageBtn').addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            displayProjects();
            updatePagination();
            window.scrollTo(0, 0);
        }
    });
    
    document.getElementById('nextPageBtn').addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            displayProjects();
            updatePagination();
            window.scrollTo(0, 0);
        }
    });
    
    // Sự kiện cho nút đóng modal
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Đóng modal khi click bên ngoài
    window.addEventListener('click', function(e) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Sự kiện cho nút mở rộng xem trước
    document.getElementById('openFullscreenBtn').addEventListener('click', function() {
        const iframe = document.getElementById('projectPreviewFrame');
        const url = iframe.src;
        window.open(url, '_blank');
    });
    
    // Sự kiện cho nút xem mã nguồn
    document.getElementById('viewSourceBtn').addEventListener('click', function() {
        const projectId = this.getAttribute('data-project-id');
        if (projectId) {
            loadProjectSource(projectId);
        }
    });
    
    // Sự kiện cho nút sao chép dự án
    document.getElementById('cloneProjectBtn').addEventListener('click', function() {
        const projectId = this.getAttribute('data-project-id');
        if (projectId) {
            cloneProject(projectId);
        }
    });
    
    // Sự kiện cho nút xóa dự án
    document.getElementById('deleteProjectBtn').addEventListener('click', function() {
        const projectId = this.getAttribute('data-project-id');
        if (projectId) {
            if (confirm('Bạn có chắc chắn muốn xóa dự án này không? Hành động này không thể hoàn tác.')) {
                deleteProject(projectId);
            }
        }
    });
    
    // Sự kiện cho nút sao chép mã nguồn
    document.getElementById('copySourceBtn').addEventListener('click', function() {
        const codeElement = document.querySelector('#sourceCodeDisplay code');
        if (codeElement) {
            const textToCopy = codeElement.textContent;
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    alert('Đã sao chép mã nguồn vào clipboard!');
                })
                .catch(err => {
                    console.error('Lỗi khi sao chép:', err);
                    alert('Không thể sao chép mã nguồn. Vui lòng thử lại.');
                });
        }
    });
    
    // Sự kiện cho nút hồ sơ người dùng
    document.getElementById('userProfileBtn').addEventListener('click', function() {
        if (currentUser) {
            window.location.href = 'user-profile.html';
        } else {
            window.location.href = 'code-editor-login.html';
        }
    });
}

// Tải danh sách dự án từ Firebase
function loadProjects() {
    if (!window.database) return;
    
    const loadingElement = document.getElementById('loadingProjects');
    loadingElement.style.display = 'flex';
    
    // Tham chiếu đến dự án trong database
    let projectsRef = window.database.ref('projects');
    
    // Chỉ lấy các dự án công khai
    projectsRef = projectsRef.orderByChild('isPublic').equalTo(true);
    
    projectsRef.once('value')
        .then(snapshot => {
            projectsData = [];
            
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const project = childSnapshot.val();
                    project.id = childSnapshot.key;
                    projectsData.push(project);
                });
                
                // Lọc theo tìm kiếm
                if (currentSearchQuery) {
                    const query = currentSearchQuery.toLowerCase();
                    projectsData = projectsData.filter(project => {
                        return project.name.toLowerCase().includes(query) || 
                               (project.description && project.description.toLowerCase().includes(query)) ||
                               (project.userName && project.userName.toLowerCase().includes(query));
                    });
                }
                
                // Sắp xếp dự án
                sortProjects();
                
                // Hiển thị dự án
                displayProjects();
                updatePagination();
            } else {
                const projectsGrid = document.getElementById('projectsGrid');
                projectsGrid.innerHTML = '<div class="no-projects"><p>Không có dự án nào được tìm thấy.</p></div>';
            }
            
            loadingElement.style.display = 'none';
        })
        .catch(error => {
            console.error('Lỗi khi tải dự án:', error);
            showError('Không thể tải dự án. Vui lòng thử lại sau.');
            loadingElement.style.display = 'none';
        });
}

// Sắp xếp dự án theo bộ lọc
function sortProjects() {
    switch (currentFilters.sort) {
        case 'newest':
            projectsData.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
            break;
        case 'oldest':
            projectsData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'name':
            projectsData.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'popular':
            // Giả sử có trường viewCount để đếm lượt xem
            projectsData.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
            break;
    }
}

// Hiển thị dự án theo trang hiện tại
function displayProjects() {
    const projectsGrid = document.getElementById('projectsGrid');
    projectsGrid.innerHTML = '';
    
    if (projectsData.length === 0) {
        projectsGrid.innerHTML = '<div class="no-projects"><p>Không có dự án nào được tìm thấy.</p></div>';
        return;
    }
    
    // Tính toán phân trang
    totalPages = Math.ceil(projectsData.length / projectsPerPage);
    const startIndex = (currentPage - 1) * projectsPerPage;
    const endIndex = Math.min(startIndex + projectsPerPage, projectsData.length);
    
    // Lấy dự án cho trang hiện tại
    const currentPageProjects = projectsData.slice(startIndex, endIndex);
    
    // Tạo HTML cho mỗi dự án
    currentPageProjects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        
        // Format thời gian
        const updatedDate = new Date(project.updatedAt || project.createdAt);
        const formattedDate = updatedDate.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Giới hạn độ dài mô tả
        const description = project.description || 'Không có mô tả';
        const shortDescription = description.length > 80 ? description.substring(0, 80) + '...' : description;
        
        projectCard.innerHTML = `
            <div class="project-preview">
                <iframe src="code-renderer.html?id=${project.id}" frameborder="0" sandbox="allow-scripts"></iframe>
            </div>
            <div class="project-info">
                <h3 class="project-title" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</h3>
                <p class="project-description" title="${escapeHtml(description)}">${escapeHtml(shortDescription)}</p>
                <div class="project-meta">
                    <div class="project-author">
                        <img src="${project.userPhoto || 'avatarlazi.png'}" alt="Avatar">
                        <span>${escapeHtml(project.userName || 'Người dùng')}</span>
                    </div>
                    <span class="project-date">${formattedDate}</span>
                </div>
            </div>
            <div class="project-actions">
                <button class="view-project-btn" data-project-id="${project.id}" title="Xem chi tiết dự án">
                    <i class="fas fa-eye"></i> Xem
                </button>
                <button class="run-project-btn" data-project-id="${project.id}" title="Chạy dự án trong tab mới">
                    <i class="fas fa-play"></i> Chạy
                </button>
            </div>
        `;
        
        projectsGrid.appendChild(projectCard);
    });
    
    // Thêm sự kiện cho các nút trong thẻ dự án
    document.querySelectorAll('.view-project-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const projectId = this.getAttribute('data-project-id');
            viewProject(projectId);
        });
    });
    
    document.querySelectorAll('.run-project-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const projectId = this.getAttribute('data-project-id');
            runProject(projectId);
        });
    });
}

// Cập nhật thông tin phân trang
function updatePagination() {
    const pageInfoElement = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    pageInfoElement.textContent = `Trang ${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Xem chi tiết dự án
function viewProject(projectId) {
    if (!window.database) return;
    
    window.database.ref('projects/' + projectId).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const project = snapshot.val();
                
                // Cập nhật modal xem dự án
                document.getElementById('viewProjectTitle').textContent = project.name;
                document.getElementById('viewProjectDescription').textContent = project.description || 'Không có mô tả';
                document.getElementById('viewProjectAuthor').textContent = project.userName || 'Người dùng';
                
                // Format thời gian
                const updatedDate = new Date(project.updatedAt || project.createdAt);
                const formattedDate = updatedDate.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                document.getElementById('viewProjectDate').textContent = formattedDate;
                
                // Cập nhật iframe xem trước
                const previewFrame = document.getElementById('projectPreviewFrame');
                previewFrame.src = `code-renderer.html?id=${projectId}`;
                
                // Cập nhật data-project-id cho các nút
                document.getElementById('viewSourceBtn').setAttribute('data-project-id', projectId);
                document.getElementById('cloneProjectBtn').setAttribute('data-project-id', projectId);
                document.getElementById('deleteProjectBtn').setAttribute('data-project-id', projectId);
                
                // Chỉ hiển thị nút xóa dự án nếu người dùng là chủ sở hữu
                const deleteBtn = document.getElementById('deleteProjectBtn');
                if (currentUser && project.userId === currentUser.uid) {
                    deleteBtn.style.display = 'block';
                } else {
                    deleteBtn.style.display = 'none';
                }
                
                // Hiển thị modal
                document.getElementById('viewProjectModal').style.display = 'block';
                
                // Cập nhật lượt xem (nếu cần)
                updateProjectViews(projectId);
            } else {
                alert('Không tìm thấy dự án!');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải dự án:', error);
            alert('Không thể tải dự án. Vui lòng thử lại sau.');
        });
}

// Chạy dự án trong tab mới
function runProject(projectId) {
    window.open(`code-renderer.html?id=${projectId}`, '_blank');
    
    // Cập nhật lượt xem (nếu cần)
    updateProjectViews(projectId);
}

// Cập nhật lượt xem dự án
function updateProjectViews(projectId) {
    if (!window.database) return;
    
    const viewsRef = window.database.ref(`projects/${projectId}/viewCount`);
    
    // Sử dụng transaction để tránh xung đột
    viewsRef.transaction(currentViews => {
        return (currentViews || 0) + 1;
    });
}

// Tải mã nguồn dự án
function loadProjectSource(projectId) {
    if (!window.database) return;
    
    window.database.ref(`projects/${projectId}`).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const project = snapshot.val();
                
                // Cập nhật tiêu đề
                document.getElementById('sourceProjectTitle').textContent = project.name;
                
                // Tải danh sách file
                return window.database.ref(`projects/${projectId}/files`).once('value');
            } else {
                throw new Error('Không tìm thấy dự án');
            }
        })
        .then(filesSnapshot => {
            if (filesSnapshot.exists()) {
                const files = [];
                filesSnapshot.forEach(fileSnapshot => {
                    files.push(fileSnapshot.val());
                });
                
                // Hiển thị danh sách file
                displayFileList(files);
                
                // Hiển thị nội dung file đầu tiên
                if (files.length > 0) {
                    displayFileContent(files[0]);
                }
                
                // Hiển thị modal
                document.getElementById('viewSourceModal').style.display = 'block';
            } else {
                alert('Dự án không có file nào!');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải mã nguồn:', error);
            alert('Không thể tải mã nguồn. Vui lòng thử lại sau.');
        });
}

// Hiển thị danh sách file
function displayFileList(files) {
    const fileListElement = document.getElementById('sourceFileList');
    fileListElement.innerHTML = '';
    
    // Sắp xếp file: index.html đầu tiên, sau đó là CSS, rồi đến JS
    files.sort((a, b) => {
        // Đưa index.html lên đầu
        if (a.name === 'index.html') return -1;
        if (b.name === 'index.html') return 1;
        
        // Sắp xếp theo loại file
        const getFileType = (filename) => {
            if (filename.endsWith('.html')) return 1;
            if (filename.endsWith('.css')) return 2;
            if (filename.endsWith('.js')) return 3;
            return 4;
        };
        
        const aType = getFileType(a.name);
        const bType = getFileType(b.name);
        
        if (aType !== bType) return aType - bType;
        
        // Sắp xếp theo tên nếu cùng loại
        return a.name.localeCompare(b.name);
    });
    
    files.forEach((file, index) => {
        const li = document.createElement('li');
        li.textContent = file.name;
        li.setAttribute('data-file-index', index);
        
        if (index === 0) {
            li.classList.add('active');
        }
        
        li.addEventListener('click', function() {
            // Xóa class active từ tất cả các li
            document.querySelectorAll('#sourceFileList li').forEach(item => {
                item.classList.remove('active');
            });
            
            // Thêm class active cho li được chọn
            this.classList.add('active');
            
            // Hiển thị nội dung file
            const fileIndex = parseInt(this.getAttribute('data-file-index'));
            displayFileContent(files[fileIndex]);
        });
        
        fileListElement.appendChild(li);
    });
}

// Hiển thị nội dung file
function displayFileContent(file) {
    const codeElement = document.querySelector('#sourceCodeDisplay code');
    const fileNameElement = document.getElementById('currentFileName');
    
    fileNameElement.textContent = file.name;
    codeElement.textContent = file.content || '';
    
    // Thêm class cho syntax highlighting (nếu cần)
    codeElement.className = '';
    if (file.name.endsWith('.html')) {
        codeElement.classList.add('language-html');
    } else if (file.name.endsWith('.css')) {
        codeElement.classList.add('language-css');
    } else if (file.name.endsWith('.js')) {
        codeElement.classList.add('language-javascript');
    }
    
    // Áp dụng syntax highlighting nếu có thư viện Prism
    if (window.Prism) {
        Prism.highlightElement(codeElement);
    }
}

// Sao chép dự án
function cloneProject(projectId) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để sao chép dự án!');
        window.location.href = 'code-editor-login.html';
        return;
    }
    
    if (!window.database) return;
    
    window.database.ref(`projects/${projectId}`).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const project = snapshot.val();
                
                // Tải danh sách file
                return window.database.ref(`projects/${projectId}/files`).once('value')
                    .then(filesSnapshot => {
                        const files = [];
                        if (filesSnapshot.exists()) {
                            filesSnapshot.forEach(fileSnapshot => {
                                files.push(fileSnapshot.val());
                            });
                        }
                        
                        return { project, files };
                    });
            } else {
                throw new Error('Không tìm thấy dự án');
            }
        })
        .then(({ project, files }) => {
            // Tạo dự án mới
            const newProjectId = generateId();
            const timestamp = new Date().toISOString();
            
            const newProject = {
                id: newProjectId,
                name: `${project.name} (Sao chép)`,
                description: project.description,
                isPublic: false, // Mặc định là riêng tư
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Người dùng',
                userPhoto: currentUser.photoURL || '',
                createdAt: timestamp,
                updatedAt: timestamp,
                clonedFrom: projectId
            };
            
            // Lưu thông tin dự án mới
            return window.database.ref(`projects/${newProjectId}`).set(newProject)
                .then(() => {
                    // Lưu các file
                    const filePromises = files.map(file => {
                        const newFile = {
                            id: generateId(),
                            name: file.name,
                            path: file.path,
                            type: file.type,
                            content: file.content || ''
                        };
                        
                        return window.database.ref(`projects/${newProjectId}/files/${newFile.id}`).set(newFile);
                    });
                    
                    return Promise.all(filePromises).then(() => newProjectId);
                });
        })
        .then(newProjectId => {
            alert('Dự án đã được sao chép thành công!');
            // Chuyển hướng đến trình soạn thảo với dự án mới
            window.location.href = `code-editor.html?id=${newProjectId}`;
        })
        .catch(error => {
            console.error('Lỗi khi sao chép dự án:', error);
            alert('Không thể sao chép dự án. Vui lòng thử lại sau.');
        });
}

// Xóa dự án
function deleteProject(projectId) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để xóa dự án!');
        return;
    }
    
    if (!window.database) return;
    
    // Kiểm tra xem người dùng có quyền xóa dự án không
    window.database.ref(`projects/${projectId}`).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const project = snapshot.val();
                
                // Chỉ cho phép người tạo dự án xóa
                if (project.userId === currentUser.uid) {
                    // Xóa dự án
                    return window.database.ref(`projects/${projectId}`).remove();
                } else {
                    throw new Error('Bạn không có quyền xóa dự án này!');
                }
            } else {
                throw new Error('Không tìm thấy dự án');
            }
        })
        .then(() => {
            alert('Dự án đã được xóa thành công!');
            // Đóng modal
            document.getElementById('viewProjectModal').style.display = 'none';
            // Tải lại danh sách dự án
            loadProjects();
        })
        .catch(error => {
            console.error('Lỗi khi xóa dự án:', error);
            alert(error.message || 'Không thể xóa dự án. Vui lòng thử lại sau.');
        });
}

// Hiển thị lỗi
function showError(message) {
    alert(message);
}

// Tạo ID ngẫu nhiên
function generateId(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Escape HTML để tránh XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }; // Close escapeHtml function

