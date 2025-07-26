// Script để triển khai quy tắc bảo mật Firestore
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Kiểm tra xem Firebase CLI đã được cài đặt chưa
try {
  console.log('Kiểm tra Firebase CLI...');
  execSync('firebase --version', { stdio: 'inherit' });
} catch (error) {
  console.error('Firebase CLI chưa được cài đặt. Vui lòng cài đặt bằng lệnh: npm install -g firebase-tools');
  process.exit(1);
}

// Kiểm tra xem đã đăng nhập Firebase chưa
try {
  console.log('Kiểm tra trạng thái đăng nhập Firebase...');
  execSync('firebase login:list', { stdio: 'inherit' });
} catch (error) {
  console.error('Bạn chưa đăng nhập Firebase. Vui lòng đăng nhập bằng lệnh: firebase login');
  process.exit(1);
}

// Kiểm tra xem file firestore.rules tồn tại không
const rulesPath = path.join(__dirname, 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
  console.error('Không tìm thấy file firestore.rules. Vui lòng kiểm tra lại.');
  process.exit(1);
}

// Kiểm tra xem đã khởi tạo dự án Firebase chưa
const firebaseRcPath = path.join(__dirname, '.firebaserc');
if (!fs.existsSync(firebaseRcPath)) {
  console.log('Chưa khởi tạo dự án Firebase. Tiến hành khởi tạo...');
  try {
    execSync('firebase init firestore', { stdio: 'inherit' });
  } catch (error) {
    console.error('Lỗi khi khởi tạo dự án Firebase:', error);
    process.exit(1);
  }
}

// Triển khai quy tắc bảo mật Firestore
console.log('Tiến hành triển khai quy tắc bảo mật Firestore...');
try {
  execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
  console.log('Triển khai quy tắc bảo mật Firestore thành công!');
} catch (error) {
  console.error('Lỗi khi triển khai quy tắc bảo mật Firestore:', error);
  process.exit(1);
}