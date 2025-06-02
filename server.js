import 'dotenv/config'; // Tải các biến từ .env

import express from 'express';
import fetch from 'node-fetch'; // Dùng fetch cho các yêu cầu HTTP
import cors from 'cors'; // Để xử lý CORS từ frontend

const app = express();
const port = process.env.PORT || 3000; // Cổng cho server backend

// Lấy các biến môi trường
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID; // Hoặc ID của người nhận nếu bạn biết PSID

// Kiểm tra xem các biến môi trường đã được tải chưa
if (!PAGE_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
    console.error('Lỗi: PAGE_ACCESS_TOKEN hoặc FACEBOOK_PAGE_ID không được đặt trong file .env');
    process.exit(1);
}

// Middleware
app.use(express.json()); // Cho phép server đọc JSON từ body của request
app.use(cors()); // Cho phép yêu cầu từ các domain khác (quan trọng cho frontend)

// Endpoint API để gửi tin nhắn
app.post('/api/send-message', async (req, res) => {
    const { message } = req.body; // Nhận tin nhắn từ frontend

    if (!message) {
        return res.status(400).json({ error: 'Nội dung tin nhắn là bắt buộc.' });
    }

    // Cấu hình yêu cầu API đến Messenger Platform
    const url = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    const payload = {
        recipient: {
            id: 100011598824751
        },
        message: {
            text: message
        }
    };

    console.log('Đang gửi tin nhắn:', message);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Tin nhắn đã được gửi thành công:', data);
            res.status(200).json({ success: true, data: data });
        } else {
            console.error('Lỗi từ Messenger API:', data);
            res.status(response.status).json({ success: false, error: data });
        }
    } catch (error) {
        console.error('Lỗi khi gọi API Messenger:', error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ nội bộ.' });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server backend đang chạy tại http://localhost:${port}`);
});