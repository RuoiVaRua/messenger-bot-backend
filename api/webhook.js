import 'dotenv/config';
import express from 'express';

const app = express();

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            let webhook_event = entry.messaging[0];
            console.log("Webhook Event:", webhook_event);

            let sender_psid = webhook_event.sender.id;
            console.log('PSID của người gửi:', sender_psid);

            entry.messaging.forEach(function(event) {
                if (event.message && event.message.quick_reply && event.message.quick_reply.payload === 'OTN_YEU_CAU') {
                    if (event.message && event.message.quick_reply.one_time_notif_token) {
                        const otn_token = event.message.quick_reply.one_time_notif_token;
                        console.log('OTN Token nhận được:', otn_token);
                        // ONE_TIME_NOTIF_TOKEN = otn_token; // Biến này sẽ được xử lý ở nơi khác hoặc lưu vào DB
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

export default app;