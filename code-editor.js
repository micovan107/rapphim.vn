// Biến toàn cục
let currentUser = null;
let editor = null;
let currentProject = null;
let currentFile = null;
let files = [];
let isDarkTheme = false;
let isAutoSave = true;
let autoSaveInterval = null;
let lastChangeTime = null;
let changeTimeout = null;
let isPreviewDirty = true;

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra chế độ tối từ localStorage
    isDarkTheme = localStorage.getItem('darkTheme') === 'true';
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        document.getElementById('themeToggleBtn').innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Đảm bảo Firebase đã được khởi tạo
    const checkFirebaseInit = setInterval(() => {
        if (window.auth && window.database) {
            clearInterval(checkFirebaseInit);
            // Tiếp tục với auth và database đã được khởi tạo
            setupAuthListener();
            setupEventListeners();
            initializeEditor();
            loadProjectFromUrl();
        }
    }, 100);
});

// Thiết lập lắng nghe sự kiện đăng nhập
function setupAuthListener() {
    // Lắng nghe sự kiện đăng nhập
    window.auth.onAuthStateChanged(function(user) {
        currentUser = user;
        updateUserUI();
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

// Khởi tạo trình soạn thảo
function initializeEditor() {
    // Tạo instance CodeMirror
    editor = CodeMirror(document.getElementById('codeEditor'), {
        mode: 'htmlmixed',
        theme: isDarkTheme ? 'dracula' : 'eclipse',
        lineNumbers: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: true,
        extraKeys: {
            'Ctrl-Space': 'autocomplete',
            'Tab': function(cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection('add');
                } else {
                    cm.replaceSelection('    ', 'end', '+input');
                }
            }
        },
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
    });

    // Sự kiện khi nội dung thay đổi
    editor.on('change', function() {
        if (currentFile) {
            currentFile.content = editor.getValue();
            currentFile.isModified = true;
            lastChangeTime = new Date();
            isPreviewDirty = true;
            
            // Tự động lưu sau khi ngừng gõ
            if (isAutoSave) {
                clearTimeout(changeTimeout);
                changeTimeout = setTimeout(function() {
                    saveCurrentFile();
                    updatePreview();
                }, 1000); // Đợi 1 giây sau khi ngừng gõ
            }
        }
    });
}

// Thiết lập các sự kiện
function setupEventListeners() {
    // Sự kiện cho nút chuyển đổi chế độ tối/sáng
    document.getElementById('themeToggleBtn').addEventListener('click', function() {
        toggleDarkTheme();
    });

    // Sự kiện cho nút tạo file mới
    document.getElementById('newFileBtn').addEventListener('click', function() {
        showModal('newFileModal');
    });

    // Sự kiện cho nút lưu
    document.getElementById('saveBtn').addEventListener('click', function() {
        saveCurrentFile();
    });

    document.getElementById('publishBtn').addEventListener('click', function() {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để xuất bản dự án!');
        return;
    }

    // Nếu chưa có project, khởi tạo tạm để hiển thị modal
    if (!currentProject) {
        currentProject = {};
    }

    // Hiển thị modal xuất bản
    const projectNameInput = document.getElementById('projectName');
    const projectDescriptionInput = document.getElementById('projectDescription');

    projectNameInput.value = currentProject.name || '';
    projectDescriptionInput.value = currentProject.description || '';

    showModal('publishModal');
});


    // Sự kiện cho nút format code
    document.getElementById('formatCodeBtn').addEventListener('click', function() {
        formatCode();
    });

    // Sự kiện cho nút hoàn tác
    document.getElementById('undoBtn').addEventListener('click', function() {
        editor.undo();
    });

    // Sự kiện cho nút làm lại
    document.getElementById('redoBtn').addEventListener('click', function() {
        editor.redo();
    });

    // Sự kiện cho select ngôn ngữ
    document.getElementById('languageSelect').addEventListener('change', function() {
        if (editor) {
            editor.setOption('mode', this.value);
        }
    });

    // Sự kiện cho nút thêm file
    document.getElementById('addFileBtn').addEventListener('click', function() {
        showModal('newFileModal');
    });

    // Sự kiện cho nút thêm ảnh
    document.getElementById('addImageBtn').addEventListener('click', function() {
        showModal('uploadImageModal');
    });

    // Sự kiện cho nút đổi tên file
    document.getElementById('renameFileBtn').addEventListener('click', function() {
        if (!currentFile) {
            alert('Vui lòng chọn một file để đổi tên!');
            return;
        }
        
        const newFileNameInput = document.getElementById('newFileNameInput');
        newFileNameInput.value = currentFile.name;
        
        showModal('renameModal');
    });

    // Sự kiện cho nút xóa file
    document.getElementById('deleteFileBtn').addEventListener('click', function() {
        if (!currentFile) {
            alert('Vui lòng chọn một file để xóa!');
            return;
        }
        
        if (confirm(`Bạn có chắc chắn muốn xóa file "${currentFile.name}"?`)) {
            deleteCurrentFile();
        }
    });

    // Sự kiện cho nút làm mới xem trước
    document.getElementById('refreshPreviewBtn').addEventListener('click', function() {
        updatePreview(true);
    });

    // Sự kiện cho nút mở xem trước trong tab mới
    document.getElementById('openPreviewBtn').addEventListener('click', function() {
        openPreviewInNewTab();
    });

    // Sự kiện cho nút tạo file trong modal
    document.getElementById('createFileBtn').addEventListener('click', function() {
        createNewFile();
    });

    // Sự kiện cho input file ảnh
    document.getElementById('imageFileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewImage = document.getElementById('previewImage');
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                
                // Tự động đặt tên file nếu chưa có
                const imageFileName = document.getElementById('imageFileName');
                if (!imageFileName.value) {
                    imageFileName.value = file.name;
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // Sự kiện cho nút tải lên ảnh
    document.getElementById('uploadImageBtn').addEventListener('click', function() {
        uploadImage();
    });

    // Sự kiện cho nút đổi tên file trong modal
    document.getElementById('confirmRenameBtn').addEventListener('click', function() {
        renameCurrentFile();
    });

    // Sự kiện cho nút xuất bản trong modal
    document.getElementById('confirmPublishBtn').addEventListener('click', function() {
        publishProject();
    });

    // Sự kiện cho nút đóng modal
    document.querySelectorAll('.close-btn, .close-modal').forEach(btn => {
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

    // Sự kiện cho nút hồ sơ người dùng
    document.getElementById('userProfileBtn').addEventListener('click', function() {
        if (currentUser) {
            window.location.href = 'user-profile.html';
        } else {
            // Chuyển hướng đến trang đăng nhập
            window.location.href = 'index.html?login=true';
        }
    });

    // Sự kiện cho nút cộng đồng
    document.getElementById('communityLink').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'code-projects.html';
    });
}

// Chuyển đổi chế độ tối/sáng
function toggleDarkTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme');
    
    // Lưu trạng thái vào localStorage
    localStorage.setItem('darkTheme', isDarkTheme);
    
    // Cập nhật biểu tượng
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.innerHTML = isDarkTheme ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    // Cập nhật theme cho editor
    if (editor) {
        editor.setOption('theme', isDarkTheme ? 'dracula' : 'eclipse');
    }
}

// Hiển thị modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        // Focus vào input đầu tiên (nếu có)
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
            }, 100);
        }
    }
}

// Tạo file mới
function createNewFile() {
    const fileName = document.getElementById('newFileName').value.trim();
    const fileType = document.getElementById('newFileType').value;
    
    if (!fileName) {
        alert('Vui lòng nhập tên file!');
        return;
    }
    
    // Kiểm tra tên file hợp lệ
    if (!/^[\w\-. ]+$/.test(fileName)) {
        alert('Tên file không hợp lệ! Chỉ được phép sử dụng chữ cái, số, dấu gạch dưới, dấu gạch ngang và dấu chấm.');
        return;
    }
    
    // Kiểm tra file đã tồn tại
    const fullFileName = fileName + (fileName.includes('.') ? '' : fileType);
    const fileExists = files.some(file => file.name === fullFileName);
    
    if (fileExists) {
        alert(`File "${fullFileName}" đã tồn tại!`);
        return;
    }
    
    // Tạo file mới
    const newFile = {
        id: generateId(),
        name: fullFileName,
        content: getTemplateForFileType(fileType),
        type: getFileType(fileType),
        isModified: true
    };
    
    files.push(newFile);
    
    // Cập nhật danh sách file
    updateFileList();
    
    // Chọn file mới tạo
    selectFile(newFile);
    
    // Đóng modal
    document.getElementById('newFileModal').style.display = 'none';
    document.getElementById('newFileName').value = '';
    
    // Lưu file mới
    saveCurrentFile();
}

// Lấy template cho loại file
function getTemplateForFileType(fileType) {
    switch (fileType) {
        case '.html':
            return '<!DOCTYPE html>\n<html lang="vi">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Trang web của tôi</title>\n    <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n    <h1>Xin chào thế giới!</h1>\n    \n    <script src="script.js"></script>\n</body>\n</html>';
        case '.css':
            return '/* Styles cho trang web */\n\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n    background-color: #f5f5f5;\n    color: #333;\n}\n\nh1 {\n    color: #2c3e50;\n    text-align: center;\n}';
        case '.js':
            return '// JavaScript cho trang web\n\ndocument.addEventListener(\'DOMContentLoaded\', function() {\n    console.log("Trang web đã được tải!");\n    \n    // Thêm mã JavaScript của bạn ở đây\n});';
        default:
            return '';
    }
}

// Lấy loại file từ phần mở rộng
function getFileType(extension) {
    switch (extension) {
        case '.html':
            return 'html';
        case '.css':
            return 'css';
        case '.js':
            return 'javascript';
        default:
            return 'text';
    }
}

// Cập nhật danh sách file
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    // Sắp xếp file: index.html đầu tiên, sau đó là CSS, rồi đến JS, cuối cùng là các file khác
    files.sort((a, b) => {
        // Đưa index.html lên đầu
        if (a.name === 'index.html') return -1;
        if (b.name === 'index.html') return 1;
        
        // Sắp xếp theo loại file
        const getFileOrder = (filename) => {
            if (filename.endsWith('.html')) return 1;
            if (filename.endsWith('.css')) return 2;
            if (filename.endsWith('.js')) return 3;
            return 4;
        };
        
        const aOrder = getFileOrder(a.name);
        const bOrder = getFileOrder(b.name);
        
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        // Sắp xếp theo tên nếu cùng loại
        return a.name.localeCompare(b.name);
    });
    
    // Tạo các phần tử file
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        if (currentFile && file.id === currentFile.id) {
            fileItem.classList.add('active');
        }
        
        // Xác định icon dựa trên loại file
        let iconClass = 'fa-file';
        let fileClass = '';
        
        if (file.name.endsWith('.html')) {
            iconClass = 'fa-html5';
            fileClass = 'html';
        } else if (file.name.endsWith('.css')) {
            iconClass = 'fa-css3-alt';
            fileClass = 'css';
        } else if (file.name.endsWith('.js')) {
            iconClass = 'fa-js';
            fileClass = 'js';
        } else if (file.type === 'image') {
            iconClass = 'fa-image';
            fileClass = 'image';
        }
        
        fileItem.classList.add(fileClass);
        
        fileItem.innerHTML = `
            <i class="fab ${iconClass}"></i>
            <span>${file.name}</span>
            ${file.isModified ? '<span class="modified-indicator">•</span>' : ''}
        `;
        
        fileItem.addEventListener('click', function() {
            selectFile(file);
        });
        
        fileList.appendChild(fileItem);
    });
}

// Chọn file
function selectFile(file) {
    // Lưu file hiện tại trước khi chuyển sang file khác
    if (currentFile && currentFile.isModified) {
        saveCurrentFile();
    }
    
    currentFile = file;
    
    // Cập nhật UI
    updateFileList();
    
    // Cập nhật editor
    if (file.type === 'image') {
        // Hiển thị ảnh thay vì mã
        editor.setValue('// Đây là file ảnh. Không thể chỉnh sửa trực tiếp.');
        editor.setOption('readOnly', true);
    } else {
        // Cập nhật nội dung và mode
        editor.setValue(file.content || '');
        editor.setOption('readOnly', false);
        
        // Cập nhật mode dựa trên loại file
        let mode = 'text/plain';
        if (file.name.endsWith('.html')) {
            mode = 'htmlmixed';
        } else if (file.name.endsWith('.css')) {
            mode = 'css';
        } else if (file.name.endsWith('.js')) {
            mode = 'javascript';
        }
        
        editor.setOption('mode', mode);
        document.getElementById('languageSelect').value = mode;
    }
    
    // Đặt con trỏ vào đầu file
    editor.setCursor(0, 0);
    editor.focus();
}

// Lưu file hiện tại
function saveCurrentFile() {
    if (!currentFile || !currentFile.isModified) return;
    
    // Cập nhật nội dung file
    currentFile.content = editor.getValue();
    currentFile.isModified = false;
    
    // Cập nhật UI
    updateFileList();
    
    // Lưu vào database nếu có dự án
    if (currentProject && currentProject.id) {
        saveFileToDatabase(currentFile);
    } else {
        // Lưu vào localStorage nếu không có dự án
        saveProjectToLocalStorage();
        
        // Hiển thị thông báo nhỏ
        showSaveNotification();
    }
}

// Hiển thị thông báo đã lưu
function showSaveNotification() {
    // Kiểm tra xem đã có thông báo chưa
    let notification = document.getElementById('saveNotification');
    
    if (!notification) {
        // Tạo thông báo mới
        notification = document.createElement('div');
        notification.id = 'saveNotification';
        notification.className = 'save-notification';
        notification.innerHTML = '<i class="fas fa-check-circle"></i> Đã lưu';
        document.body.appendChild(notification);
        
        // Thêm CSS cho thông báo
        const style = document.createElement('style');
        style.textContent = `
            .save-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: rgba(40, 167, 69, 0.9);
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s, transform 0.3s;
            }
            .save-notification.show {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Hiển thị thông báo
    setTimeout(() => {
        notification.classList.add('show');
        
        // Ẩn thông báo sau 2 giây
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }, 10);
}

// Lưu tất cả các file
function saveAllFiles() {
    // Lưu file hiện tại trước
    if (currentFile && currentFile.isModified) {
        currentFile.content = editor.getValue();
        currentFile.isModified = false;
    }
    
    // Lưu tất cả các file đã sửa đổi
    files.forEach(file => {
        if (file.isModified) {
            file.isModified = false;
            if (currentProject && currentProject.id) {
                saveFileToDatabase(file);
            }
        }
    });
    
    // Cập nhật UI
    updateFileList();
    
    // Nếu không có dự án, lưu vào localStorage
    if (!currentProject || !currentProject.id) {
        saveProjectToLocalStorage();
        showSaveNotification();
    }
}

// Lưu file vào database
function saveFileToDatabase(file) {
    if (!window.database || !currentUser || !currentProject || !currentProject.id) return;
    
    const fileRef = window.database.ref(`projects/${currentProject.id}/files/${file.id}`);
    
    // Cập nhật thời gian sửa đổi dự án
    const timestamp = new Date().toISOString();
    window.database.ref(`projects/${currentProject.id}/updatedAt`).set(timestamp);
    
    // Lưu file
    return fileRef.set(file);
}

// Xóa file hiện tại
function deleteCurrentFile() {
    if (!currentFile) return;
    
    // Không cho phép xóa index.html
    if (currentFile.name === 'index.html') {
        alert('Không thể xóa file index.html!');
        return;
    }
    
    // Xóa file khỏi mảng
    const index = files.findIndex(file => file.id === currentFile.id);
    if (index !== -1) {
        files.splice(index, 1);
    }
    
    // Xóa file khỏi database
    if (currentProject && currentProject.id) {
        const fileRef = window.database.ref(`projects/${currentProject.id}/files/${currentFile.id}`);
        fileRef.remove();
        
        // Cập nhật thời gian sửa đổi dự án
        const timestamp = new Date().toISOString();
        window.database.ref(`projects/${currentProject.id}/updatedAt`).set(timestamp);
    }
    
    // Chọn file khác nếu còn file
    if (files.length > 0) {
        selectFile(files[0]);
    } else {
        currentFile = null;
        editor.setValue('');
    }
    
    // Cập nhật UI
    updateFileList();
}

// Đổi tên file hiện tại
function renameCurrentFile() {
    if (!currentFile) return;
    
    const newFileName = document.getElementById('newFileNameInput').value.trim();
    
    if (!newFileName) {
        alert('Vui lòng nhập tên file!');
        return;
    }
    
    // Kiểm tra tên file hợp lệ
    if (!/^[\w\-. ]+$/.test(newFileName)) {
        alert('Tên file không hợp lệ! Chỉ được phép sử dụng chữ cái, số, dấu gạch dưới, dấu gạch ngang và dấu chấm.');
        return;
    }
    
    // Không cho phép đổi tên index.html
    if (currentFile.name === 'index.html' && newFileName !== 'index.html') {
        alert('Không thể đổi tên file index.html!');
        return;
    }
    
    // Kiểm tra file đã tồn tại
    const fileExists = files.some(file => file.name === newFileName && file.id !== currentFile.id);
    
    if (fileExists) {
        alert(`File "${newFileName}" đã tồn tại!`);
        return;
    }
    
    // Đổi tên file
    const oldName = currentFile.name;
    currentFile.name = newFileName;
    currentFile.isModified = true;
    
    // Cập nhật UI
    updateFileList();
    
    // Lưu file
    saveCurrentFile();
    
    // Đóng modal
    document.getElementById('renameModal').style.display = 'none';
}

// Tải lên ảnh
function uploadImage() {
    const fileName = document.getElementById('imageFileName').value.trim();
    const fileInput = document.getElementById('imageFileInput');
    
    if (!fileName) {
        alert('Vui lòng nhập tên file!');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Vui lòng chọn một file ảnh!');
        return;
    }
    
    // Kiểm tra tên file hợp lệ
    if (!/^[\w\-. ]+$/.test(fileName)) {
        alert('Tên file không hợp lệ! Chỉ được phép sử dụng chữ cái, số, dấu gạch dưới, dấu gạch ngang và dấu chấm.');
        return;
    }
    
    // Thêm phần mở rộng nếu chưa có
    let fullFileName = fileName;
    if (!fullFileName.includes('.')) {
        const file = fileInput.files[0];
        const extension = file.name.split('.').pop();
        fullFileName += '.' + extension;
    }
    
    // Kiểm tra file đã tồn tại
    const fileExists = files.some(file => file.name === fullFileName);
    
    if (fileExists) {
        alert(`File "${fullFileName}" đã tồn tại!`);
        return;
    }
    
    // Đọc file ảnh
    const reader = new FileReader();
    reader.onload = function(e) {
        // Tạo file mới
        const newFile = {
            id: generateId(),
            name: fullFileName,
            content: e.target.result,
            type: 'image',
            isModified: true
        };
        
        files.push(newFile);
        
        // Cập nhật danh sách file
        updateFileList();
        
        // Chọn file mới tạo
        selectFile(newFile);
        
        // Lưu file mới
        saveCurrentFile();
        
        // Đóng modal
        document.getElementById('uploadImageModal').style.display = 'none';
        document.getElementById('imageFileName').value = '';
        document.getElementById('imageFileInput').value = '';
        document.getElementById('previewImage').style.display = 'none';
    };
    
    reader.readAsDataURL(fileInput.files[0]);
}

// Format code
function formatCode() {
    if (!editor || !currentFile) return;
    
    const content = editor.getValue();
    let formattedContent = content;
    
    // Format dựa trên loại file
    if (currentFile.name.endsWith('.html')) {
        formattedContent = html_beautify(content, {
            indent_size: 4,
            indent_char: ' ',
            max_preserve_newlines: 1
        });
    } else if (currentFile.name.endsWith('.css')) {
        formattedContent = css_beautify(content, {
            indent_size: 4,
            indent_char: ' '
        });
    } else if (currentFile.name.endsWith('.js')) {
        formattedContent = js_beautify(content, {
            indent_size: 4,
            indent_char: ' ',
            space_after_anon_function: true
        });
    }
    
    // Cập nhật nội dung
    editor.setValue(formattedContent);
    
    // Đánh dấu file đã sửa đổi
    currentFile.isModified = true;
    updateFileList();
}

// Cập nhật xem trước
function updatePreview(force = false) {
    if (!isPreviewDirty && !force) return;
    
    // Tìm file index.html
    const htmlFile = files.find(file => file.name === 'index.html');
    
    if (htmlFile) {
        // Xử lý HTML để nhúng CSS và JS
        let processedHtml = processHtmlForPreview(htmlFile.content);
        
        // Tạo Blob và URL
        const blob = new Blob([processedHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Cập nhật iframe
        const previewFrame = document.getElementById('previewFrame');
        previewFrame.src = url;
        
        isPreviewDirty = false;
    }
}

// Xử lý HTML để nhúng CSS và JS
function processHtmlForPreview(htmlContent) {
    // Tìm thẻ head và body
    const headMatch = htmlContent.match(/<head[^>]*>(([\s\S](?!<\/head>))*[\s\S])<\/head>/i);
    const bodyMatch = htmlContent.match(/<body[^>]*>(([\s\S](?!<\/body>))*[\s\S])<\/body>/i);
    
    let headContent = headMatch ? headMatch[1] : '';
    let bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;
    
    // Xử lý các thẻ link CSS
    const linkRegex = /<link[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch;
    
    while ((linkMatch = linkRegex.exec(htmlContent)) !== null) {
        const href = linkMatch[1];
        if (href && href.endsWith('.css')) {
            // Tìm file CSS tương ứng
            const cssFile = files.find(file => file.name === href);
            if (cssFile) {
                // Thay thế link bằng style
                headContent = headContent.replace(
                    linkMatch[0],
                    `<style data-file="${href}">${cssFile.content}</style>`
                );
            }
        }
    }
    
    // Xử lý các thẻ script JS
    const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
    let scriptMatch;
    
    while ((scriptMatch = scriptRegex.exec(htmlContent)) !== null) {
        const src = scriptMatch[1];
        if (src && src.endsWith('.js')) {
            // Tìm file JS tương ứng
            const jsFile = files.find(file => file.name === src);
            if (jsFile) {
                // Thay thế script src bằng nội dung
                bodyContent = bodyContent.replace(
                    scriptMatch[0],
                    `<script data-file="${src}">${jsFile.content}</script>`
                );
            }
        }
    }
    
    // Xử lý các thẻ img
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    
    while ((imgMatch = imgRegex.exec(htmlContent)) !== null) {
        const src = imgMatch[1];
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            // Tìm file ảnh tương ứng
            const imgFile = files.find(file => file.name === src);
            if (imgFile && imgFile.type === 'image') {
                // Thay thế src bằng data URL
                const newImgTag = imgMatch[0].replace(src, imgFile.content);
                htmlContent = htmlContent.replace(imgMatch[0], newImgTag);
                bodyContent = bodyContent.replace(imgMatch[0], newImgTag);
            }
        }
    }
    
    // Tạo HTML hoàn chỉnh
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${headContent}
</head>
<body>
    ${bodyContent}
</body>
</html>`;
}

// Mở xem trước trong tab mới
function openPreviewInNewTab() {
    // Cập nhật xem trước trước
    updatePreview(true);
    
    // Lấy URL từ iframe
    const previewFrame = document.getElementById('previewFrame');
    const url = previewFrame.src;
    
    // Mở trong tab mới
    window.open(url, '_blank');
}

// Xuất bản dự án
function publishProject() {
    if (!currentUser || !window.database) {
        alert('Bạn cần đăng nhập để xuất bản dự án!');
        return;
    }
    
    // Lấy thông tin từ form
    const projectName = document.getElementById('projectName').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const isPublic = document.getElementById('projectPublic').checked;
    
    if (!projectName) {
        alert('Vui lòng nhập tên dự án!');
        return;
    }
    
    // Lưu tất cả các file trước khi xuất bản
    saveAllFiles();
    
    // Tạo hoặc cập nhật dự án
    const timestamp = new Date().toISOString();
    
    if (!currentProject || !currentProject.id) {
        // Tạo dự án mới
        const newProjectId = generateId();
        
        currentProject = {
            id: newProjectId,
            name: projectName,
            description: projectDescription,
            isPublic: isPublic,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Người dùng',
            userPhoto: currentUser.photoURL || '',
            createdAt: timestamp,
            updatedAt: timestamp
        };
        
        // Lưu thông tin dự án
        window.database.ref(`projects/${newProjectId}`).set(currentProject)
            .then(() => {
                // Lưu các file
                const filePromises = files.map(file => {
                    return window.database.ref(`projects/${newProjectId}/files/${file.id}`).set(file);
                });
                
                return Promise.all(filePromises);
            })
            .then(() => {
                alert('Dự án đã được xuất bản thành công!');
                // Đóng modal
                document.getElementById('publishModal').style.display = 'none';
                // Cập nhật URL
                window.history.replaceState(null, '', `?id=${newProjectId}`);
            })
            .catch(error => {
                console.error('Lỗi khi xuất bản dự án:', error);
                alert('Không thể xuất bản dự án. Vui lòng thử lại sau.');
            });
    } else {
        // Cập nhật dự án hiện tại
        const projectRef = window.database.ref(`projects/${currentProject.id}`);
        
        // Cập nhật thông tin
        projectRef.update({
            name: projectName,
            description: projectDescription,
            isPublic: isPublic,
            updatedAt: timestamp
        })
        .then(() => {
            alert('Dự án đã được cập nhật thành công!');
            // Đóng modal
            document.getElementById('publishModal').style.display = 'none';
        })
        .catch(error => {
            console.error('Lỗi khi cập nhật dự án:', error);
            alert('Không thể cập nhật dự án. Vui lòng thử lại sau.');
        });
    }
}

// Tải dự án từ URL
function loadProjectFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    
    if (projectId) {
        loadProject(projectId);
    } else {
        // Tạo dự án mới với file mặc định
        createDefaultProject();
    }
}

// Tải dự án từ database
function loadProject(projectId) {
    if (!window.database) return;
    
    window.database.ref('projects/' + projectId).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const project = snapshot.val();
                
                // Kiểm tra quyền truy cập
                if (!project.isPublic && (!currentUser || currentUser.uid !== project.userId)) {
                    alert('Dự án này là riêng tư. Bạn không có quyền truy cập.');
                    createDefaultProject();
                    return;
                }
                
                currentProject = {
                    id: projectId,
                    name: project.name,
                    description: project.description,
                    isPublic: project.isPublic,
                    userId: project.userId,
                    userName: project.userName,
                    userPhoto: project.userPhoto,
                    createdAt: project.createdAt,
                    updatedAt: project.updatedAt
                };
                
                // Tải các file của dự án
                return window.database.ref('projects/' + projectId + '/files').once('value');
            } else {
                throw new Error('Không tìm thấy dự án');
            }
        })
        .then(filesSnapshot => {
            if (filesSnapshot && filesSnapshot.exists()) {
                files = [];
                
                filesSnapshot.forEach(fileSnapshot => {
                    const file = fileSnapshot.val();
                    files.push({
                        id: file.id,
                        name: file.name,
                        content: file.content || '',
                        type: file.type || getFileTypeFromName(file.name),
                        isModified: false
                    });
                });
                
                // Cập nhật danh sách file
                updateFileList();
                
                // Chọn file index.html nếu có
                const indexFile = files.find(file => file.name === 'index.html');
                if (indexFile) {
                    selectFile(indexFile);
                } else if (files.length > 0) {
                    selectFile(files[0]);
                }
                
                // Cập nhật xem trước
                updatePreview();
                
                // Cập nhật tiêu đề trang
                document.title = currentProject.name + ' - Trình Soạn Thảo Mã';
            } else {
                throw new Error('Dự án không có file nào');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải dự án:', error);
            alert('Không thể tải dự án. Tạo dự án mới.');
            createDefaultProject();
        });
}

// Tạo dự án mặc định
function createDefaultProject() {
    // Kiểm tra xem có dự án trong localStorage không
    const savedProject = localStorage.getItem('tempProject');
    
    if (savedProject) {
        try {
            const projectData = JSON.parse(savedProject);
            files = projectData.files || [];
            
            // Đảm bảo các file có đủ thông tin
            files.forEach(file => {
                file.type = file.type || getFileTypeFromName(file.name);
                file.isModified = false;
            });
            
            // Nếu không có file nào, tạo file mặc định
            if (files.length === 0) {
                createDefaultFiles();
            }
        } catch (error) {
            console.error('Lỗi khi đọc dự án từ localStorage:', error);
            createDefaultFiles();
        }
    } else {
        createDefaultFiles();
    }
    
    // Cập nhật danh sách file
    updateFileList();
    
    // Chọn file index.html
    const indexFile = files.find(file => file.name === 'index.html');
    if (indexFile) {
        selectFile(indexFile);
    } else if (files.length > 0) {
        selectFile(files[0]);
    }
    
    // Cập nhật xem trước
    updatePreview();
    
    // Đặt tiêu đề trang
    document.title = 'Dự án mới - Trình Soạn Thảo Mã';
    
    // Đặt dự án hiện tại là null
    currentProject = null;
    
    // Lưu dự án vào localStorage
    saveProjectToLocalStorage();
}

// Tạo các file mặc định
function createDefaultFiles() {
    files = [
        {
            id: generateId(),
            name: 'index.html',
            content: getTemplateForFileType('.html'),
            type: 'html',
            isModified: false
        },
        {
            id: generateId(),
            name: 'styles.css',
            content: getTemplateForFileType('.css'),
            type: 'css',
            isModified: false
        },
        {
            id: generateId(),
            name: 'script.js',
            content: getTemplateForFileType('.js'),
            type: 'javascript',
            isModified: false
        }
    ];
}

// Lưu dự án vào localStorage
function saveProjectToLocalStorage() {
    if (!currentProject) {
        const projectData = {
            files: files.map(file => ({
                id: file.id,
                name: file.name,
                content: file.content,
                type: file.type
            }))
        };
        
        localStorage.setItem('tempProject', JSON.stringify(projectData));
    }
}

// Lấy loại file từ tên file
function getFileTypeFromName(filename) {
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.js')) return 'javascript';
    if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(filename)) return 'image';
    return 'text';
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

// Thiết lập tự động cập nhật xem trước
setInterval(function() {
    if (isPreviewDirty) {
        updatePreview();
    }
}, 2000); // Cập nhật mỗi 2 giây nếu có thay đổi