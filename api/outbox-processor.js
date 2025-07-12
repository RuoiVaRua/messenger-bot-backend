// api/outbox-processor.js
// Hàm này sẽ được kích hoạt để xử lý các tin nhắn đi từ queue
import { getRedisClient } from '../utils/redis-client.js';
import { sendMessageToMessenger } from '../utils/messenger.js';
import 'dotenv/config'; // Chỉ dùng khi chạy cục bộ với `vercel dev`

const REDIS_OUTBOX_QUEUE = 'messenger_outbox_queue';

export default async (req, res) => {
    const redis = getRedisClient();
    if (!redis) {
        console.error('Redis client không khả dụng. Không thể xử lý queue gửi đi.');
        return res.status(500).send('Redis client not available.');
    }

    console.log('Bắt đầu xử lý tin nhắn đi từ queue...');
    let processedCount = 0;

    while (true) {
        const result = await redis.brpop(REDIS_OUTBOX_QUEUE, 1);
        if (!result) {
            console.log('Không còn tin nhắn trong queue gửi đi.');
            break;
        }

        const [queueName, rawMessagePayload] = result;
        const { messageContent, one_time_notif_token, targetPsid } = JSON.parse(rawMessagePayload);
        processedCount++;

        console.log(`Đang gửi tin nhắn từ queue ${queueName}:`, messageContent.substring(0, 50));

        const sendResult = await sendMessageToMessenger(messageContent, one_time_notif_token, 0, targetPsid);
        if (sendResult.success) {
            console.log(`Đã gửi tin nhắn thành công.`);
        } else {
            console.error(`Lỗi khi gửi tin nhắn:`, sendResult.error);
            // TODO: Xử lý lỗi gửi tin nhắn (ví dụ: đẩy vào dead-letter queue)
        }
    }

    console.log(`Hoàn tất xử lý. Đã xử lý ${processedCount} tin nhắn đi.`);
    res.status(200).json({ 
        success: true, 
        message: `Đã xử lý ${processedCount} tin nhắn đi.`,
        processedMessages: processedCount
    });
};