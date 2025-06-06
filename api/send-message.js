import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_SCOPED_USER_ID = process.env.PAGE_SCOPED_USER_ID;
let ONE_TIME_NOTIF_TOKEN = ''; // Cần cơ chế để lấy token này, có thể từ DB hoặc từ request

// Hàm trợ giúp để gửi tin nhắn đến Messenger
async function sendMessageToMessenger(messageContent) {
    const MY_PSID_FROM_PAGE = PAGE_SCOPED_USER_ID;

    if (!messageContent || !MY_PSID_FROM_PAGE) {
        console.error('Nội dung tin nhắn và PSID người nhận là bắt buộc.');
        return { success: false, error: 'Nội dung tin nhắn và PSID người nhận là bắt buộc.' };
    }

    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    const payload = ONE_TIME_NOTIF_TOKEN
        ? {
            recipient: {
                one_time_notif_token: ONE_TIME_NOTIF_TOKEN
            },
            message: {
                text: messageContent
            },
            messaging_type: "MESSAGE_TAG",
            tag: "ONE_TIME_NOTIFICATION"
        }
        : {
            recipient: {
                id: MY_PSID_FROM_PAGE
            },
            message: {
                text: messageContent
            },
        };

    console.log('Đang gửi tin nhắn:', messageContent.substring(0, 256), '... đến PSID:', MY_PSID_FROM_PAGE);
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
            console.log('Tin nhắn đã được gửi thành công');
            return { success: true, data: data };
        } else {
            console.error('Lỗi từ Messenger API:', data);
            return { success: false, error: data };
        }
    } catch (error) {
        console.error('Lỗi khi gọi API Messenger:', error);
        return { success: false, error: 'Lỗi máy chủ nội bộ.' };
    }
}

// Endpoint API để gửi tin nhắn
app.post('/api/send-message', async (req, res) => {
    const { message, oneTimeNotifToken } = req.body; // Thêm oneTimeNotifToken từ request body
    if (oneTimeNotifToken) {
        ONE_TIME_NOTIF_TOKEN = oneTimeNotifToken;
    }
    const result = await sendMessageToMessenger(message);
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(400).json(result);
    }
});

export default app;