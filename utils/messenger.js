// utils/messenger.js
// Hàm tiện ích để gửi tin nhắn đến Messenger API

import 'dotenv/config'; // Tải biến môi trường (nếu chạy cục bộ với `vercel dev`)
import fetch from 'node-fetch'; // Sử dụng node-fetch cho HTTP requests

// Lấy biến môi trường từ process.env
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// PAGE_SCOPED_USER_ID sẽ được sử dụng làm PSID mặc định nếu không có OTN token
const MY_PSID_FROM_PAGE = process.env.PAGE_SCOPED_USER_ID; 

/**
 * Gửi tin nhắn đến Messenger API.
 * @param {string} messageContent Nội dung tin nhắn.
 * @param {string|null} [one_time_notif_token=null] One-Time Notification Token (tùy chọn, để gửi tin nhắn theo sau OTN).
 * @returns {Promise<{success: boolean, data?: object, error?: object|string}>} Kết quả gửi tin nhắn.
 */
export async function sendMessageToMessenger(messageContent, one_time_notif_token = null) {
    if (!PAGE_ACCESS_TOKEN) {
        console.error('Lỗi: Biến môi trường PAGE_ACCESS_TOKEN không được đặt.');
        return { success: false, error: 'Lỗi cấu hình server: PAGE_ACCESS_TOKEN bị thiếu.' };
    }
    if (!messageContent) {
        console.error('Lỗi: Nội dung tin nhắn là bắt buộc.');
        return { success: false, error: 'Nội dung tin nhắn là bắt buộc.' };
    }

    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    let payload;

    if (one_time_notif_token) {
        // Payload để gửi tin nhắn theo sau OTN
        payload = {
            recipient: {
                one_time_notif_token: one_time_notif_token
            },
            message: {
                text: messageContent.substring(0, 2000)
            },
            messaging_type: "MESSAGE_TAG", // Bắt buộc cho OTN follow-up
            tag: "ONE_TIME_NOTIFICATION" // Bắt buộc cho OTN follow-up
        };
        console.log('Đang gửi tin nhắn OTN follow-up tới token:', one_time_notif_token);
    } else {
        // Payload để gửi tin nhắn thông thường
        if (!MY_PSID_FROM_PAGE) {
            console.error('Lỗi: Biến môi trường MY_PSID_FROM_PAGE không được đặt và không có OTN token được cung cấp.');
            return { success: false, error: 'Thiếu PSID người nhận hoặc OTN token.' };
        }
        payload = {
            recipient: {
                id: MY_PSID_FROM_PAGE // PSID mặc định để gửi tin nhắn thường
            },
            message: {
                text: messageContent.substring(0, 2000)
            }
            // Không có messaging_type/tag nếu là tin nhắn trong 24h và không phải OTN follow-up
            // Nếu gửi ngoài 24h mà không phải OTN follow-up, cần MESSAGE_TAG hợp lệ (ví dụ: ACCOUNT_UPDATE)
        };
        console.log('Đang gửi tin nhắn thường tới PSID:', MY_PSID_FROM_PAGE);
        console.log('Nội dung tin nhắn:', messageContent.substring(0, 50) + '...'); // Hiển thị 50 ký tự đầu tiên
    }

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
            return { success: true, data: data };
        } else {
            console.error('Lỗi từ Messenger API:', data);
            return { success: false, error: data };
        }
    } catch (error) {
        console.error('Lỗi khi gọi API Messenger:', error);
        return { success: false, error: 'Lỗi máy chủ nội bộ khi gửi tin nhắn.' };
    }
}
