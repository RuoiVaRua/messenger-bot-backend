// api/webhook.js
// Xử lý xác thực webhook và các sự kiện từ Facebook Messenger

import 'dotenv/config'; // Chỉ dùng khi chạy cục bộ với `vercel dev`
import { getRedisClient } from '../utils/redis-client.js'; // Import Redis client

// Lấy biến môi trường VERIFY_TOKEN
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const REDIS_MESSAGE_QUEUE = 'messenger_inbox_queue'; // Tên queue cho tin nhắn đến
const REDIS_OTN_QUEUE = 'otn_token_queue'; // Tên queue cho OTN tokens

export default async (req, res) => {
    // Xử lý yêu cầu GET để xác thực webhook (Facebook sẽ gửi khi bạn cấu hình)
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                return res.sendStatus(403);
            }
        } else {
            return res.sendStatus(400);
        }
    } 
    // Xử lý yêu cầu POST cho các sự kiện webhook (tin nhắn, opt-in, v.v.)
    else if (req.method === 'POST') {
        const body = req.body;

        if (body.object === 'page') {
            const redis = getRedisClient(); // Lấy Redis client

            if (!redis) {
                console.error('Redis client không khả dụng. Không thể đẩy tin nhắn vào queue.');
                // Vẫn phản hồi 200 OK để Facebook không gửi lại
                return res.status(200).send('EVENT_RECEIVED_NO_QUEUE');
            }

            body.entry.forEach(entry => {
                entry.messaging.forEach(async webhook_event => { // Sử dụng async ở đây
                    console.log("Webhook Event Received:", JSON.stringify(webhook_event, null, 2));

                    const sender_psid = webhook_event.sender.id;
                    console.log('PSID của người gửi:', sender_psid);

                    if (webhook_event.message) {
                        console.log('Tin nhắn đến:', webhook_event.message?.text || webhook_event.message?.attachments?.type);
                        // Đẩy toàn bộ webhook_event vào queue để xử lý không đồng bộ
                        await redis.lpush(REDIS_MESSAGE_QUEUE, JSON.stringify(webhook_event));
                        console.log(`Đã đẩy tin nhắn từ PSID ${sender_psid} vào queue: ${REDIS_MESSAGE_QUEUE}`);
                    }
                    else if (webhook_event.optin && webhook_event.optin.one_time_notif_token) {
                        const notification_token = webhook_event.optin.one_time_notif_token;
                        const otn_payload = webhook_event.optin.payload;

                        console.log('Người dùng đã đồng ý OTN!');
                        console.log('Notification Token:', notification_token);
                        console.log('OTN Payload:', otn_payload);

                        // Đẩy thông tin OTN vào queue để lưu vào DB không đồng bộ
                        await redis.lpush(REDIS_OTN_QUEUE, JSON.stringify({ sender_psid, notification_token, otn_payload }));
                        console.log(`Đã đẩy OTN token từ PSID ${sender_psid} vào queue: ${REDIS_OTN_QUEUE}`);
                    }
                    else {
                        console.log('Sự kiện webhook khác:', webhook_event);
                        // Có thể đẩy các sự kiện khác vào một queue riêng nếu cần xử lý
                    }
                });
            });
            return res.status(200).send('EVENT_RECEIVED');
        } else {
            return res.sendStatus(404);
        }
    }
    // Xử lý các phương thức HTTP không được phép
    else {
        return res.sendStatus(405); // Method Not Allowed
    }
};
