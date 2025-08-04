// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBgITWCnQO7pW2-VOAgpKFsK6GN8H037HM",
  authDomain: "masoi-92684.firebaseapp.com",
  databaseURL: "https://masoi-92684-default-rtdb.firebaseio.com",
  projectId: "masoi-92684",
  storageBucket: "masoi-92684.firebasestorage.app",
  messagingSenderId: "1030518945375",
  appId: "1:1030518945375:web:a531a0233c0dcbde120dea",
  measurementId: "G-QNS4GVQ178"
};

// Khởi tạo Firebase và các dịch vụ
function initFirebase() {
    // Kiểm tra xem Firebase đã được tải chưa
    if (typeof firebase === 'undefined') {
        console.error('Firebase chưa được tải. Vui lòng đảm bảo thư viện Firebase đã được tải.');
        return { auth: null, database: null };
    }
    
    // Khởi tạo Firebase nếu chưa được khởi tạo
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
        } catch (error) {
            console.error('Lỗi khi khởi tạo Firebase:', error);
            return { auth: null, database: null };
        }
    }
    
    try {
        // Lấy các dịch vụ Firebase
        const auth = firebase.auth();
        const database = firebase.database();

        // Bật xác thực ẩn danh
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
          .then(() => {
            console.log('Đã thiết lập persistence thành công');
          })
          .catch((error) => {
            console.error('Lỗi khi thiết lập persistence:', error);
          });
          
        return { auth, database };
    } catch (error) {
        console.error('Lỗi khi lấy các dịch vụ Firebase:', error);
        return { auth: null, database: null };
    }
}

// Khởi tạo các biến toàn cục
let auth, database;

// Khởi tạo Firebase ngay lập tức
const services = initFirebase();
auth = services.auth;
database = services.database;

// Cloudinary configuration
const cloudinaryConfig = {
    cloudName: 'dw8rpacnn', // Thay thế bằng cloud name của bạn
    uploadPreset: 'nguyentiennam', // Thay thế bằng upload preset của bạn
    folder: '',
    apiKey: '338841869745923' // Thêm API key của bạn
};

// Thiết lập xử lý trạng thái xác thực
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Kiểm tra xem Firebase và auth đã được khởi tạo chưa
        if (!auth || !database) {
            console.log('Auth hoặc database chưa được khởi tạo, đang khởi tạo lại...');
            const services = initFirebase();
            auth = services.auth;
            database = services.database;
        }
        
        // Đảm bảo Firebase đã được khởi tạo
        if (auth) {
            // Bật xác thực ẩn danh nếu cần
            auth.onAuthStateChanged((user) => {
                if (!user) {
                    console.log('Không có người dùng đăng nhập, chuẩn bị đăng nhập ẩn danh nếu cần');
                } else {
                    console.log('Người dùng đã đăng nhập:', user.uid);
                }
            });
        }
        
        // Export Firebase services and Cloudinary config for use in other files
        window.auth = auth;
        window.database = database;
        window.cloudinaryConfig = cloudinaryConfig;
        
        console.log('Firebase đã được khởi tạo và xuất ra window thành công');
    } catch (error) {
        console.error('Lỗi khi khởi tạo Firebase:', error);
    }
});

// Helper function to generate a unique ID
function generateId(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Helper function to get current user data
async function getCurrentUserData() {
    const user = auth.currentUser;
    if (!user) {
        console.log('Không có người dùng đăng nhập');
        return {
            uid: 'guest',
            displayName: 'Khách',
            photoURL: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
            miniCoins: 0,
            learningPoints: 0,
            isGuest: true
        };
    }
    
    // Kiểm tra nếu là người dùng ẩn danh (guest)
    if (user.isAnonymous || (typeof currentUser !== 'undefined' && currentUser && currentUser.isAnonymous)) {
        console.log('Đang lấy dữ liệu người dùng ẩn danh');
        // Trả về thông tin người dùng ẩn danh đã được lưu trong biến currentUser
        return {
            uid: user.uid,
            displayName: user.displayName || 'Khách',
            photoURL: user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
            miniCoins: 0,
            learningPoints: 0,
            isGuest: true
        };
    }
    
    try {
        console.log('Đang lấy dữ liệu người dùng mới nhất cho:', user.uid);
        // Sử dụng .get() thay vì .once('value') để đảm bảo luôn lấy dữ liệu mới nhất từ server
        const snapshot = await database.ref(`users/${user.uid}`).get();
        const userData = snapshot.val() || {};
        console.log('Dữ liệu người dùng từ database:', userData);
        const result = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || userData.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || userData.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email),
            miniCoins: userData.miniCoins !== undefined ? userData.miniCoins : 100,
            learningPoints: userData.learningPoints || 0
        };
        console.log('Dữ liệu người dùng đã xử lý:', result);
        return result;
    } catch (error) {
        console.error('Error getting user data:', error);
        const defaultData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email),
            miniCoins: 100,
            learningPoints: 0
        };
        console.log('Trả về dữ liệu mặc định do lỗi:', defaultData);
        return defaultData;
    }
}

// Export helper functions

window.generateId = generateId;
window.formatTimestamp = formatTimestamp;
window.getCurrentUserData = getCurrentUserData;