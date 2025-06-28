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

    const { message, one_time_notif_token } = req.body;
    
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
