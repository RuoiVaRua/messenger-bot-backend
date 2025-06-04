import 'dotenv/config'; // Tải các biến từ .env

import express from 'express';
import fetch from 'node-fetch'; // Dùng fetch cho các yêu cầu HTTP
import cors from 'cors'; // Để xử lý CORS từ frontend

const app = express();
const port = process.env.PORT || 3000; // Cổng cho server backend

// Lấy các biến môi trường
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_SCOPED_USER_ID = process.env.PAGE_SCOPED_USER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
let ONE_TIME_NOTIF_TOKEN = ''; // Biến này sẽ lưu one-time notification token nếu có

// Kiểm tra xem các biến môi trường đã được tải chưa
if (!PAGE_ACCESS_TOKEN || !PAGE_SCOPED_USER_ID || !VERIFY_TOKEN) {
    console.error('Lỗi: PAGE_ACCESS_TOKEN hoặc PAGE_SCOPED_USER_ID hoặc VERIFY_TOKEN không được đặt trong file .env');
    process.exit(1);
}

// Middleware
app.use(express.json()); // Cho phép server đọc JSON từ body của request
app.use(cors()); // Cho phép yêu cầu từ các domain khác (quan trọng cho frontend)

// Webhook Verification (cho Facebook xác thực)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// Webhook Event Handling (nhận sự kiện từ Facebook)
app.post('/webhook', (req, res) => {
    let body = req.body;

    // Kiểm tra xem đây có phải là sự kiện từ Page Messenger không
    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            let webhook_event = entry.messaging[0];
            console.log("Webhook Event:", webhook_event);

            // Lấy PSID của người gửi
            let sender_psid = webhook_event.sender.id;
            console.log('PSID của người gửi:', sender_psid);

            // *** LƯU PSID NÀY LẠI! ***
            // Đây chính là ID mà bạn sẽ dùng làm recipient.id để gửi tin nhắn
            // Bạn có thể lưu nó vào database hoặc vào một biến tạm thời để test.
            // Ví dụ: global.myTestPSID = sender_psid;


            // Lấy one time notification token nếu có
            entry.messaging.forEach(function(event) {
                // Nếu là phản hồi từ quick reply yêu cầu OTN
                if (event.message && event.message.quick_reply && event.message.quick_reply.payload === 'OTN_YEU_CAU') {
                    // Kiểm tra có OTN token không
                    if (event.message && event.message.quick_reply.one_time_notif_token) {
                        const otn_token = event.message.quick_reply.one_time_notif_token;
                        console.log('OTN Token nhận được:', otn_token);
                        ONE_TIME_NOTIF_TOKEN = otn_token; // Lưu token vào biến toàn cục

                        // Lưu token vào cơ sở dữ liệu (hoặc tạm thời trong RAM để test)
                        // saveOTNToken(sender_psid, otn_token);
                    } else {
                        console.log('Không có OTN token trong phản hồi.');
                    }
                }
            });            
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Endpoint API để gửi tin nhắn
app.post('/api/send-message', async (req, res) => {
    const { message } = req.body; // Nhận tin nhắn từ frontend
    // Dán PSID của tài khoản cá nhân của bạn vào đây sau khi lấy được từ webhook
    const MY_PSID_FROM_PAGE = PAGE_SCOPED_USER_ID; 

    if (!message || !MY_PSID_FROM_PAGE) {
        return res.status(400).json({ error: 'Nội dung tin nhắn và PSID người nhận là bắt buộc.' });
    }

    // Cấu hình yêu cầu API đến Messenger Platform
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`; // Lưu ý: endpoint đổi từ PAGE_ID sang /me/messages

    console.log('========== one-time notification token: ', ONE_TIME_NOTIF_TOKEN);
    // Nếu có ONE_TIME_NOTIF_TOKEN, sử dụng nó để gửi tin nhắn
    // Nếu không, sử dụng PSID của bạn để gửi tin nhắn và kèm theo yêu cầu ONE_TIME_NOTIF_TOKEN
    const payload = ONE_TIME_NOTIF_TOKEN 
        ? {
            recipient: {
                one_time_notif_token: ONE_TIME_NOTIF_TOKEN
            },
            message: {
                text: message
            },
            messaging_type: "MESSAGE_TAG",
            tag: "ONE_TIME_NOTIFICATION"            
        }
        : {
            recipient: {
                id: MY_PSID_FROM_PAGE // <-- Sử dụng PSID ở đây
            },
            message: {
                text: message,
                quick_replies: [
                    {
                        content_type: "ONE_TIME_NOTIF_REQ",
                        // title: "Thông báo cho tôi bất cứ điều gì",
                        payload: "OTN_YEU_CAU",
                        // messenger_extensions: true
                    }
                ]            
            },
            // messaging_type: "MESSAGE_TAG",
            // tag: "ONE_TIME_NOTIFICATION"
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