// api/message-processor.js
// Hàm này sẽ được kích hoạt để xử lý các tin nhắn từ queue
import { getRedisClient } from '../utils/redis-client.js';
import { sendMessageToMessenger } from '../utils/messenger.js'; // Để gửi phản hồi
import 'dotenv/config'; // Chỉ dùng khi chạy cục bộ với `vercel dev`

const REDIS_MESSAGE_QUEUE = 'messenger_inbox_queue';
const REDIS_OTN_QUEUE = 'otn_token_queue';

export default async (req, res) => {
    const redis = getRedisClient();
    if (!redis) {
        console.error('Redis client không khả dụng. Không thể xử lý queue.');
        return res.status(500).send('Redis client not available.');
    }

    console.log('Bắt đầu xử lý tin nhắn từ queue...');
    let processedCount = 0;

    // Xử lý tin nhắn đến
    while (true) {
        // BRPOP: Lấy và xóa phần tử cuối cùng từ danh sách, chờ nếu danh sách trống
        // Timeout 1 giây để hàm không chạy mãi mãi trong môi trường serverless
        const result = await redis.brpop(REDIS_MESSAGE_QUEUE, 1); 
        if (!result) {
            console.log('Không còn tin nhắn trong queue inbox.');
            break; // Thoát nếu queue trống sau timeout
        }

        const [queueName, rawEvent] = result;
        const webhook_event = JSON.parse(rawEvent);
        processedCount++;

        console.log(`Đang xử lý tin nhắn từ queue ${queueName}:`, webhook_event.message?.text);
        const sender_psid = webhook_event.sender.id;

        // --- Bắt đầu logic xử lý tin nhắn thực tế ở đây ---
        // Ví dụ: Phân tích tin nhắn, gọi API bên ngoài, truy vấn DB
        const receivedMessage = webhook_event.message?.text;
        let responseMessage = `Bạn đã nói: "${receivedMessage}". Tôi đang học cách phản hồi!`;

        if (receivedMessage && receivedMessage.toLowerCase().includes('hello')) {
            responseMessage = 'Chào bạn! Rất vui được gặp bạn.';
        } else if (receivedMessage && receivedMessage.toLowerCase().includes('thời tiết')) {
            // TODO: Gọi API thời tiết không đồng bộ
            responseMessage = 'Tôi chưa thể kiểm tra thời tiết lúc này. Vui lòng thử lại sau.';
        }
        // ... thêm các logic xử lý khác ...

        // Gửi phản hồi lại cho người dùng (có thể đẩy vào một queue gửi đi riêng)
        const sendResult = await sendMessageToMessenger(responseMessage, null, 0, sender_psid); // Truyền PSID người gửi
        if (sendResult.success) {
            console.log(`Đã gửi phản hồi thành công cho PSID ${sender_psid}.`);
        } else {
            console.error(`Lỗi khi gửi phản hồi cho PSID ${sender_psid}:`, sendResult.error);
            // TODO: Xử lý lỗi gửi tin nhắn (ví dụ: đẩy vào dead-letter queue)
        }
        // --- Kết thúc logic xử lý tin nhắn thực tế ---
    }

    // Xử lý OTN tokens
    console.log('Bắt đầu xử lý OTN tokens từ queue...');
    let processedOtnCount = 0;
    while (true) {
        const result = await redis.brpop(REDIS_OTN_QUEUE, 1);
        if (!result) {
            console.log('Không còn OTN tokens trong queue.');
            break;
        }

        const [, rawOtnData] = result;
        const { sender_psid, notification_token } = JSON.parse(rawOtnData);
        processedOtnCount++;

        console.log(`Đang xử lý OTN token từ PSID ${sender_psid}:`, notification_token);
        // *** QUAN TRỌNG: LƯU notification_token NÀY VÀO CƠ SỞ DỮ LIỆU CỦA BẠN ***
        // Ví dụ: await saveToDatabase(sender_psid, notification_token, otn_payload);
        console.log(`TODO: Lưu OTN token ${notification_token} vào database.`);
    }

    console.log(`Hoàn tất xử lý. Đã xử lý ${processedCount} tin nhắn và ${processedOtnCount} OTN tokens.`);
    res.status(200).json({ 
        success: true, 
        message: `Đã xử lý ${processedCount} tin nhắn và ${processedOtnCount} OTN tokens.`,
        processedMessages: processedCount,
        processedOtnTokens: processedOtnCount
    });
};