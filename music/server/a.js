const fs = require('fs');
const JSON5 = require('json5');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Đọc file (nếu có vấn đề encoding, thêm iconv-lite)
let content = fs.readFileSync('HN-KS24-CNTT2.json', 'utf8');

// Thêm ngoặc nhọn nếu thiếu
if (!content.trim().startsWith('{')) {
  content = '{' + content + '}';
}

// Parse bằng JSON5 (cho phép thiếu dấu ngoặc kép, trailing commas)
let data;
try {
  data = JSON5.parse(content);
} catch (err) {
  console.error('Lỗi parse JSON5:', err.message);
  process.exit(1);
}

const studentClass = data.studentClass;
console.log(`Tìm thấy ${studentClass.length} bản ghi`);

// Trích xuất student
const users = studentClass.map(item => {
  const student = item.student;
  return {
    id: student.id,
    name: student.fullName,
    password: student.password,
    created_at: student.createdAt,
    role: "USER",
    email: student.email
  };
});

// Xuất CSV
const createCSV = (data) => {
  const headers = ['id', 'role', 'name', 'created_at', 'password', 'email'];
  const rows = data.map(u => [
    u.id,
    u.role,
    `"${u.name.replace(/"/g, '""')}"`,
    u.created_at,
    u.password,
    u.email
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

fs.writeFileSync('users.csv', createCSV(users));
console.log('Đã tạo users.csv, sẵn sàng import vào Supabase');