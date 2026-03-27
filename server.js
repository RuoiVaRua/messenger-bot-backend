// server.js
import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http'; // Import createServer từ http
import { initializeChatService } from './services/chatService.js'; // Import chatService

// Import các function từ thư mục api của bạn
// Lưu ý: vì package.json có "type": "module", chúng ta cần thêm .js ở cuối
import webhookHandler from './api/webhook.js';
import sendMessageHandler from './api/send-message.js';
import getLocationHandler from './api/get-location.js';
import getWeatherHandler from './api/get-weather.js';
import getHtmlHandler from './api/get-html.js';
import triggerWeatherUpdate from './api/trigger-weather-update.js';
import ablyTokenHandler from './api/ably-token.js';
import sendNotificationHandler from './api/send-notification.js';
import telegramWebhookHandler from './api/telegram-webhook.js';
// Nạp các biến môi trường từ file .env (quan trọng cho local dev)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Server sẽ chạy ở cổng 3000 bên trong container

// Tạo HTTP server từ Express app
const httpServer = createServer(app);

// Khởi tạo và cấu hình Socket.io server thông qua chatService
initializeChatService(httpServer);

// Middleware để parse JSON body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Định nghĩa các routes giống như trong vercel.json ---
// Express sẽ nhận request và chuyển cho handler tương ứng
app.use('/api/webhook', webhookHandler);
app.use('/api/send-message', sendMessageHandler);
app.use('/api/get-location', getLocationHandler);
app.use('/api/get-weather', getWeatherHandler);
app.use('/api/get-html', getHtmlHandler);
app.use('/api/trigger-weather-update', triggerWeatherUpdate);
app.use('/api/ably-token', ablyTokenHandler);
app.use('/api/send-notification', sendNotificationHandler);
app.use('/api/telegram-webhook', telegramWebhookHandler);
// Route gốc để kiểm tra server có hoạt động không
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

// Khởi động server
httpServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
