// api/send-message.js
import { sendMessageToMessenger } from '../utils/messenger.js'; // Import hàm trợ giúp
import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js'; // Import CORS helpers

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
    if (!req.body) {
        return res.status(400).json({ success: false, error: 'Empty request body' });
    }    
    else if (req.headers['content-type'] && req.headers['content-type'].includes('text/plain')) {
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

    const { message, one_time_notif_token } = requestBody;
    
    // Gọi hàm trợ giúp để gửi tin nhắn
    const result = await sendMessageToMessenger(
        targetIp ? 'IP: ' + targetIp + ' \n' + message : message, 
        one_time_notif_token
    );
    
    if (result.success) {
        res.status(200).json(result);
    } else {
        // Xử lý lỗi cụ thể hơn nếu cần
        res.status(result.error.code === 100 || result.error.code === 400 ? 400 : 500).json(result); 
    }
};
