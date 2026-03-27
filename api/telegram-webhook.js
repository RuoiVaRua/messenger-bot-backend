// api/telegram-webhook.js
// Xử lý các yêu cầu cập nhật từ Telegram Bot Webhook

import 'dotenv/config';
import fetch from 'node-fetch';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async (req, res) => {
    if (req.method === 'POST') {
        const update = req.body;

        console.log("Telegram Update Received:", JSON.stringify(update, null, 2));

        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            const senderName = update.message.from.first_name || "User";

            console.log(`Tin nhắn từ Telegram (${chatId}): ${text}`);

            // Logic xử lý tin nhắn
            // Ví dụ: Gửi lại tin nhắn xác nhận
            if (text) {
                try {
                    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `Chào ${senderName}, tôi đã nhận được tin nhắn: "${text}"`,
                        }),
                    });
                } catch (error) {
                    console.error('Lỗi khi gửi tin nhắn tới Telegram:', error);
                }
            }
        }

        return res.status(200).send('OK');
    } else {
        return res.status(405).send('Method Not Allowed');
    }
};
