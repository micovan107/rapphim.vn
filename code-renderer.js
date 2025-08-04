// Biến toàn cục
let currentUser = null;
let currentProject = null;
let projectId = null;
let rendererFrame = null;

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Lấy ID dự án từ URL
    const urlParams = new URLSearchParams(window.location.search);
    projectId = urlParams.get('id');
    
    if (!projectId) {
        showError('Không tìm thấy ID dự án trong URL');
        return;
    }
    
    // Đảm bảo Firebase đã được khởi tạo
    const checkFirebaseInit = setInterval(() => {
        if (window.auth && window.database) {
            clearInterval(checkFirebaseInit);
            // Tiếp tục với auth và database đã được khởi tạo
            setupAuthListener();
        }
    }, 100);
    
});

// Thiết lập lắng nghe sự kiện đăng nhập
function setupAuthListener() {
    // Lắng nghe sự kiện đăng nhập
    window.auth.onAuthStateChanged(function(user) {
        currentUser = user;
        // Tải dự án sau khi đã xác thực người dùng
        loadProject();
    });
    
    // Thiết lập các sự kiện
    setupEventListeners();
};

// Thiết lập các sự kiện
function setupEventListeners() {
    // Nút xem mã nguồn
    document.getElementById('viewSourceBtn').addEventListener('click', function() {
        if (projectId) {
            window.location.href = `code-projects.html?view=${projectId}`;
        }
    });
    
    // Nút sao chép dự án
    document.getElementById('cloneProjectBtn').addEventListener('click', function() {
        if (!currentUser) {
            if (confirm('Bạn cần đăng nhập để sao chép dự án. Chuyển đến trang đăng nhập?')) {
                window.location.href = 'code-editor-login.html';
            }
            return;
        }
        
        if (projectId) {
            cloneProject(projectId);
        }
    });
    
    // Nút toàn màn hình
    document.getElementById('fullscreenBtn').addEventListener('click', function() {
        const rendererFrame = document.getElementById('rendererFrame');
        if (rendererFrame.requestFullscreen) {
            rendererFrame.requestFullscreen();
        } else if (rendererFrame.webkitRequestFullscreen) { /* Safari */
            rendererFrame.webkitRequestFullscreen();
        } else if (rendererFrame.msRequestFullscreen) { /* IE11 */
            rendererFrame.msRequestFullscreen();
        }
    });
    
    // Nút làm mới
    document.getElementById('refreshBtn').addEventListener('click', function() {
        const rendererFrame = document.getElementById('rendererFrame');
        rendererFrame.src = rendererFrame.src;
    });
}

// Tải dự án từ Firebase
function loadProject() {
    if (!window.database || !projectId) {
        showError('Không thể kết nối đến cơ sở dữ liệu hoặc không có ID dự án');
        return;
    }
    
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = 'flex';
    
    // Tải thông tin dự án
    window.database.ref('projects/' + projectId).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const project = snapshot.val();
                currentProject = {
                    id: projectId,
                    name: project.name,
                    description: project.description,
                    isPublic: project.isPublic,
                    userId: project.userId,
                    userName: project.userName,
                    userPhoto: project.userPhoto,
                    createdAt: project.createdAt,
                    updatedAt: project.updatedAt,
                    viewCount: project.viewCount || 0
                };
                
                // Kiểm tra quyền truy cập
                if (!currentProject.isPublic && (!currentUser || currentUser.uid !== currentProject.userId)) {
                    showError('Dự án này là riêng tư. Bạn không có quyền truy cập.');
                    return;
                }
                
                // Tải các file của dự án
                return window.database.ref('projects/' + projectId + '/files').once('value');
            } else {
                throw new Error('Không tìm thấy dự án');
            }
        })
        .then(filesSnapshot => {
            if (filesSnapshot && filesSnapshot.exists()) {
                currentProject.files = [];
                
                filesSnapshot.forEach(fileSnapshot => {
                    const file = fileSnapshot.val();
                    currentProject.files.push({
                        id: file.id,
                        name: file.name,
                        path: file.path,
                        type: file.type,
                        content: file.content || ''
                    });
                });
                
                // Hiển thị dự án
                displayProject();
                
                // Cập nhật lượt xem
                updateProjectViews();
            } else {
                throw new Error('Dự án không có file nào');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải dự án:', error);
            showError(error.message || 'Không thể tải dự án. Vui lòng thử lại sau.');
        });
}

// Hiển thị dự án
function displayProject() {
    if (!currentProject || !currentProject.files) return;
    
    // Hiển thị thông tin dự án
    document.getElementById('projectTitle').textContent = currentProject.name;
    document.getElementById('projectDescription').textContent = currentProject.description || 'Không có mô tả';
    
    // Format thời gian
    const updatedDate = new Date(currentProject.updatedAt || currentProject.createdAt);
    const createdDate = new Date(currentProject.createdAt);
    
    const formatDate = (date) => {
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    
    document.getElementById('projectDate').textContent = formatDate(updatedDate);
    document.getElementById('projectCreatedDate').textContent = formatDate(createdDate);
    document.getElementById('projectViews').textContent = currentProject.viewCount || '0';
    
    // Thông tin tác giả
    document.getElementById('authorName').textContent = currentProject.userName || 'Người dùng';
    if (currentProject.userPhoto) {
        document.getElementById('authorAvatar').src = currentProject.userPhoto;
    }
    
    // Tạo HTML từ các file
    const htmlFile = currentProject.files.find(file => file.name === 'index.html');
    
    if (htmlFile) {
        // Xử lý HTML để nhúng CSS và JS
        let processedHtml = processHtmlForRenderer(htmlFile.content, currentProject.files);
        
        // Tạo Blob và URL
        const blob = new Blob([processedHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Hiển thị trong iframe
        const rendererFrame = document.getElementById('rendererFrame');
        rendererFrame.src = url;
        
        // Hiển thị container
        document.getElementById('rendererContainer').style.display = 'flex';
        document.getElementById('projectInfo').style.display = 'block';
        document.getElementById('loadingContainer').style.display = 'none';
        
        // Thiết lập tiêu đề trang
        document.title = currentProject.name + ' - Lập Trình Trực Tuyến';
    } else {
        showError('Không tìm thấy file index.html trong dự án');
    }
}

// Xử lý HTML để nhúng CSS và JS
function processHtmlForRenderer(htmlContent, files) {
    // Tìm thẻ head và body
    const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    
    let headContent = headMatch ? headMatch[1] : '';
    let bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;
    
    // Nhúng CSS
    const cssFiles = files.filter(file => file.name.endsWith('.css'));
    let cssContent = '';
    
    cssFiles.forEach(cssFile => {
        cssContent += `<style data-file="${cssFile.name}">${cssFile.content}</style>\n`;
    });
    
    // Nhúng JavaScript
    const jsFiles = files.filter(file => file.name.endsWith('.js'));
    let jsContent = '';
    
    jsFiles.forEach(jsFile => {
        jsContent += `<script data-file="${jsFile.name}">${jsFile.content}</script>\n`;
    });
    
    // Tạo HTML hoàn chỉnh
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentProject.name}</title>
    ${headContent}
    ${cssContent}
</head>
<body>
    ${bodyContent}
    ${jsContent}
</body>
</html>`;
}

// Cập nhật lượt xem dự án
function updateProjectViews() {
    if (!window.database || !projectId) return;
    
    const viewsRef = window.database.ref(`projects/${projectId}/viewCount`);
    
    // Sử dụng transaction để tránh xung đột
    viewsRef.transaction(currentViews => {
        return (currentViews || 0) + 1;
    })
    .then(result => {
        // Cập nhật số lượt xem trên giao diện
        if (result.committed) {
            document.getElementById('projectViews').textContent = result.snapshot.val() || '0';
        }
    })
    .catch(error => {
        console.error('Lỗi khi cập nhật lượt xem:', error);
    });
}

// Sao chép dự án
function cloneProject(projectId) {
    if (!currentUser || !window.database) {
        alert('Bạn cần đăng nhập để sao chép dự án!');
        return;
    }
    
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = 'flex';
    
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
            showError('Không thể sao chép dự án. Vui lòng thử lại sau.');
        });
}

// Hiển thị lỗi
function showError(message) {
    // Ẩn loading và container
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('rendererContainer').style.display = 'none';
    document.getElementById('projectInfo').style.display = 'none';
    
    // Hiển thị lỗi
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorContainer.style.display = 'flex';
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