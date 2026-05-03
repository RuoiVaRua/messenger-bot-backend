// utils/telegram.js
// Hàm tiện ích để gửi tin nhắn đến Telegram Bot API

import 'dotenv/config';
import fetch from 'node-fetch';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Gửi tin nhắn đến Telegram Bot API.
 * @param {string} messageContent Nội dung tin nhắn.
 * @returns {Promise<{success: boolean, data?: object, error?: any}>} Kết quả gửi tin nhắn.
 */
export async function sendMessageToTelegram(messageContent) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('[sendMessageToTelegram] Lỗi: Biến môi trường TELEGRAM_BOT_TOKEN không được đặt.');
        return { success: false, error: 'Thiếu TELEGRAM_BOT_TOKEN.' };
    }
    if (!TELEGRAM_CHAT_ID) {
        console.error('[sendMessageToTelegram] Lỗi: Biến môi trường TELEGRAM_CHAT_ID không được đặt.');
        return { success: false, error: 'Thiếu TELEGRAM_CHAT_ID.' };
    }
    if (!messageContent) {
        return { success: false, error: 'Nội dung tin nhắn trống.' };
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: messageContent
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`[sendMessageToTelegram] Lỗi API: ${errorData}`);
            return { success: false, error: errorData };
        }

        const data = await response.json();
        console.log('[sendMessageToTelegram] Gửi thành công:', data);
        return { success: true, data };
    } catch (error) {
        console.error('[sendMessageToTelegram] Lỗi fetch:', error);
        return { success: false, error };
    }
}
