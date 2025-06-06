// api/webhook.js
// Xử lý xác thực webhook và các sự kiện từ Facebook Messenger

import 'dotenv/config'; // Chỉ dùng khi chạy cục bộ với `vercel dev`

// Lấy biến môi trường VERIFY_TOKEN
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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

        // Kiểm tra xem đây có phải là sự kiện từ Page Messenger không
        if (body.object === 'page') {
            body.entry.forEach(entry => {
                entry.messaging.forEach(webhook_event => {
                    console.log("Webhook Event Received:", JSON.stringify(webhook_event, null, 2));

                    const sender_psid = webhook_event.sender.id;
                    console.log('PSID của người gửi:', sender_psid);

                    // Xử lý sự kiện tin nhắn thông thường
                    if (webhook_event.message) {
                        console.log('Tin nhắn đến:', webhook_event.message?.text || webhook_event.message?.attachments?.type);
                        // TODO: Thêm logic xử lý tin nhắn đến ở đây
                    } 
                    // Xử lý sự kiện người dùng đồng ý One-Time Notification (OTN)
                    else if (webhook_event.optin && webhook_event.optin.one_time_notif_token) {
                        const notification_token = webhook_event.optin.one_time_notif_token;
                        const otn_payload = webhook_event.optin.payload; 

                        console.log('Người dùng đã đồng ý OTN!');
                        console.log('Notification Token:', notification_token);
                        console.log('OTN Payload:', otn_payload);

                        // *** QUAN TRỌNG: LƯU notification_token NÀY VÀO CƠ SỞ DỮ LIỆU CỦA BẠN ***
                        // Trong môi trường Serverless, bạn KHÔNG THỂ lưu vào biến toàn cục.
                        // Bạn cần một database (ví dụ: MongoDB Atlas, Firestore, Supabase)
                        // để lưu trữ PSID và notification_token này để có thể sử dụng sau.
                        // Ví dụ: await saveToDatabase(sender_psid, notification_token, otn_payload);
                    }
                    // TODO: Xử lý các loại sự kiện khác (postback, delivery, read, v.v.)
                    else {
                        console.log('Sự kiện webhook khác:', webhook_event);
                    }
                });
            });
            // Facebook yêu cầu phản hồi 200 OK để xác nhận đã nhận sự kiện
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
