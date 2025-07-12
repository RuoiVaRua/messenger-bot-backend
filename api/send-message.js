// api/send-message.js
import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js'; // Import CORS helpers
import { getRedisClient } from '../utils/redis-client.js'; // Import Redis client

const REDIS_OUTBOX_QUEUE = 'messenger_outbox_queue'; // Tên queue cho tin nhắn đi

export default async (req, res) => {
    setCorsHeaders(res); // Luôn đặt CORS headers
    if (handleCorsPreflight(req, res)) { // Xử lý preflight OPTIONS request
        return; 
    }
    
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    let clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];
    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }
    const targetIp = clientIp || '';     

    let requestBody;

    // kiểm tra content-type có phải JSON hay là text/plain
    // text/plain được gửi ở request navigator.sendBeacon phía front-end (để tránh preflight OPTIONS request khi gửi JSON)
    if (req.headers['content-type'] && req.headers['content-type'].includes('text/plain')) {
        try {
            // Đảm bảo req.body là một chuỗi trước khi phân tích cú pháp
            requestBody = JSON.parse(typeof req.body === 'string' ? req.body : req.body.toString());
        } catch (e) {
            console.error('Lỗi phân tích cú pháp JSON từ text/plain:', e);
            return res.status(400).json({ success: false, error: 'Invalid JSON in request body' });
        }
    } else {
        requestBody = req.body;
    }

    const { message, one_time_notif_token, target_psid } = requestBody; // Thêm target_psid nếu muốn gửi cho PSID cụ thể

    const redis = getRedisClient();
    if (!redis) {
        console.error('Redis client không khả dụng. Không thể đẩy tin nhắn vào queue gửi đi.');
        return res.status(500).json({ success: false, error: 'Server configuration error: Redis client not available.' });
    }

    // Đẩy tin nhắn vào queue gửi đi
    const messagePayload = {
        messageContent: targetIp ? 'IP: ' + targetIp + ' \n' + message : message,
        one_time_notif_token: one_time_notif_token,
        targetPsid: target_psid // PSID đích nếu có
    };

    try {
        await redis.lpush(REDIS_OUTBOX_QUEUE, JSON.stringify(messagePayload));
        console.log(`Đã đẩy tin nhắn vào queue gửi đi: ${REDIS_OUTBOX_QUEUE}`);
        res.status(200).json({ success: true, message: 'Tin nhắn đã được đẩy vào hàng đợi để gửi.' });
    } catch (error) {
        console.error('Lỗi khi đẩy tin nhắn vào Redis queue:', error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ nội bộ khi đẩy tin nhắn vào queue.' });
    }
};
