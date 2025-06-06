import 'dotenv/config'; // Tải các biến từ .env

import express from 'express';
import cors from 'cors'; // Để xử lý CORS từ frontend

const app = express();

// Lấy các biến môi trường
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_SCOPED_USER_ID = process.env.PAGE_SCOPED_USER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const IP_INFO_KEY = process.env.IP_INFO_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Kiểm tra xem các biến môi trường đã được tải chưa
if (!PAGE_ACCESS_TOKEN || !PAGE_SCOPED_USER_ID || !VERIFY_TOKEN) {
    console.error('Lỗi: PAGE_ACCESS_TOKEN hoặc PAGE_SCOPED_USER_ID hoặc VERIFY_TOKEN không được đặt trong file .env');
    process.exit(1);
}

// Kiểm tra xem các biến môi trường đã được tải chưa
if (!IP_INFO_KEY || !WEATHER_API_KEY) {
    console.error('Lỗi: Các API Key (IPinfo hoặc WeatherAPI) không được đặt trong file .env');
    process.exit(1);
}

// Middleware
app.use(express.json()); // Cho phép server đọc JSON từ body của request
app.use(cors()); // Cho phép yêu cầu từ các domain khác (quan trọng cho frontend)

// Export ứng dụng Express để Vercel có thể sử dụng
export default app;