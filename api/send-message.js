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

    const { message, one_time_notif_token } = req.body;
    
    // Gọi hàm trợ giúp để gửi tin nhắn
    const result = await sendMessageToMessenger(message, one_time_notif_token);
    
    if (result.success) {
        res.status(200).json(result);
    } else {
        // Xử lý lỗi cụ thể hơn nếu cần
        res.status(result.error.code === 100 || result.error.code === 400 ? 400 : 500).json(result); 
    }
};
