// utils/messenger.js
// Hàm tiện ích để gửi tin nhắn đến Messenger API

import 'dotenv/config'; // Tải biến môi trường (nếu chạy cục bộ với `vercel dev`)

// Lấy biến môi trường từ process.env
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const MY_PSID_FROM_PAGE = process.env.PAGE_SCOPED_USER_ID; 

// Cấu hình retry
const MAX_RETRIES = 3; // Số lần thử lại tối đa
const RETRY_DELAY_MS = 2000; // Thời gian chờ giữa các lần thử lại (2 giây), tăng lên để giảm áp lực

/**
 * Gửi tin nhắn đến Messenger API.
 * @param {string} messageContent Nội dung tin nhắn.
 * @param {string|null} [one_time_notif_token=null] One-Time Notification Token (tùy chọn, để gửi tin nhắn theo sau OTN).
 * @param {number} [retries=0] Số lần thử lại hiện tại.
 * @returns {Promise<{success: boolean, data?: object, error?: object|string}>} Kết quả gửi tin nhắn.
 */
export async function sendMessageToMessenger(messageContent, one_time_notif_token = null, retries = 0) {
    console.log(`[sendMessageToMessenger] Lần gọi: ${retries + 1}`);

    if (!PAGE_ACCESS_TOKEN) {
        console.error('[sendMessageToMessenger] Lỗi: Biến môi trường PAGE_ACCESS_TOKEN không được đặt.');
        return { success: false, error: 'Lỗi cấu hình server: PAGE_ACCESS_TOKEN bị thiếu.' };
    }
    if (!messageContent) {
        console.error('[sendMessageToMessenger] Lỗi: Nội dung tin nhắn là bắt buộc.');
        return { success: false, error: 'Nội dung tin nhắn là bắt buộc.' };
    }

    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    let payload;

    if (one_time_notif_token) {
        payload = {
            recipient: {
                one_time_notif_token: one_time_notif_token
            },
            message: {
                text: messageContent.substring(0, 2000)
            },
            messaging_type: "MESSAGE_TAG", 
            tag: "ONE_TIME_NOTIFICATION" 
        };
        console.log(`[sendMessageToMessenger] Đang gửi tin nhắn OTN follow-up tới token: ${one_time_notif_token}`);
    } else {
        if (!MY_PSID_FROM_PAGE) {
            console.error('[sendMessageToMessenger] Lỗi: Biến môi trường MY_PSID_FROM_PAGE không được đặt và không có OTN token được cung cấp.');
            return { success: false, error: 'Thiếu PSID người nhận hoặc OTN token.' };
        }
        payload = {
            recipient: {
                id: MY_PSID_FROM_PAGE 
            },
            message: {
                text: messageContent.substring(0, 2000)
            }
        };
        console.log(`[sendMessageToMessenger] Đang gửi tin nhắn thường tới PSID: ${MY_PSID_FROM_PAGE}`);
        console.log(`[sendMessageToMessenger] Nội dung tin nhắn: ${messageContent.substring(0, 50)}...`); 
    }

    console.log(`[sendMessageToMessenger] URL API Messenger: ${url}`);
    console.log(`[sendMessageToMessenger] Payload gửi đi: ${JSON.stringify(payload, null, 2)}`);

    try {
        const response = await fetch(url, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            // Tăng timeout của fetch (nếu có thể cấu hình, Undici mặc định 30s)
            // timeout: 10000 // Thêm timeout nếu bạn muốn kiểm soát sớm hơn
        });

        // Kiểm tra phản hồi có OK không trước khi gọi .json()
        if (!response.ok) {
            const errorData = await response.text(); // Lấy raw text nếu không phải JSON
            console.error(`[sendMessageToMessenger] Phản hồi API không OK (Status: ${response.status}): ${errorData}`);
            // Đặt lỗi cụ thể hơn nếu cần
            const parsedError = JSON.parse(errorData); // Thử parse nếu là JSON
            if (retries < MAX_RETRIES) {
                console.warn(`[sendMessageToMessenger] Lỗi không OK, đang thử lại lần ${retries + 1} sau ${RETRY_DELAY_MS}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                return sendMessageToMessenger(messageContent, one_time_notif_token, retries + 1); // Thử lại
            }
            return { success: false, error: parsedError || errorData };
        }

        const data = await response.json();
        console.log('[sendMessageToMessenger] Tin nhắn đã được gửi thành công:', data);
        return { success: true };

    } catch (error) {
        console.error('[sendMessageToMessenger] Lỗi khi gọi API Messenger (ngoại lệ fetch):', error);
        // Kiểm tra lỗi để xác định có nên thử lại không
        if ((error.name === 'FetchError' && (error.cause && (error.cause.code === 'ETIMEDOUT' || error.cause.code === 'ECONNRESET'))) && retries < MAX_RETRIES) {
            console.warn(`[sendMessageToMessenger] Lỗi mạng/TLS tạm thời, đang thử lại lần ${retries + 1} sau ${RETRY_DELAY_MS}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            return sendMessageToMessenger(messageContent, one_time_notif_token, retries + 1); // Thử lại
        }
        return { success: false, error: 'Lỗi máy chủ nội bộ khi gửi tin nhắn.' };
    }
}
