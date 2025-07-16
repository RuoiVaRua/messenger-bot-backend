// server.js
import express from 'express';
import dotenv from 'dotenv';

// Import các function từ thư mục api của bạn
// Lưu ý: vì package.json có "type": "module", chúng ta cần thêm .js ở cuối
import webhookHandler from './api/webhook.js';
import sendMessageHandler from './api/send-message.js';
import getLocationHandler from './api/get-location.js';
import getWeatherHandler from './api/get-weather.js';
import getHtmlHandler from './api/get-html.js';

// Nạp các biến môi trường từ file .env (quan trọng cho local dev)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Server sẽ chạy ở cổng 3000 bên trong container

// Middleware để parse JSON body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Định nghĩa các routes giống như trong vercel.json ---
// Express sẽ nhận request và chuyển cho handler tương ứng
app.use('/webhook', webhookHandler);
app.use('/send-message', sendMessageHandler);
app.use('/get-location', getLocationHandler);
app.use('/get-weather', getWeatherHandler);
app.use('/get-html', getHtmlHandler);

// Route gốc để kiểm tra server có hoạt động không
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});