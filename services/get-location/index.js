// api/get-location.js
import 'dotenv/config'; 
import { sendMessageToMessenger } from '../utils/messenger.js'; // Import hàm trợ giúp
import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js'; // Import CORS helpers

const IP_INFO_KEY = process.env.IP_INFO_KEY;

export default async (req, res) => {
    setCorsHeaders(res); // Luôn đặt CORS headers
    if (handleCorsPreflight(req, res)) { // Xử lý preflight OPTIONS request
        return; 
    }
    
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    if (!IP_INFO_KEY) {
        console.error('Lỗi: Biến môi trường IP_INFO_KEY không được đặt.');
        return res.status(500).json({ success: false, error: 'Lỗi cấu hình server: IPinfo API Key bị thiếu.' });
    }

    let clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];

    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }
    const targetIp = clientIp || ''; 

    let locationResult;
    try {
        console.log('Đang lấy vị trí người dùng từ IP:', targetIp);
        const response = await fetch(
            targetIp.includes('::1') // Kiểm tra nếu là localhost
                ? `https://ipinfo.io/json?token=${IP_INFO_KEY}` // Sử dụng IPinfo API với localhost
                : `https://ipinfo.io/${targetIp}/json?token=${IP_INFO_KEY}`
        );
        
        if (!response.ok) {
            console.error(`Yêu cầu IPinfo API thất bại cho IP ${targetIp} với trạng thái ${response.status}`);
            locationResult = { success: false, error: `Yêu cầu IPinfo API thất bại với trạng thái ${response.status}` };
        } else {
            const data = await response.json();
            const location = data.city || data.region || null;

            if (!location) {
                console.warn('Không thể xác định vị trí người dùng từ IPinfo API, sử dụng mặc định: Hanoi');
                locationResult = { success: true, location: 'Hanoi', originalIpInfo: data }; 
            } else {
                console.log('Vị trí người dùng được xác định:', location);
                locationResult = { success: true, location: location, originalIpInfo: data };
            }

            // Gửi dữ liệu người dùng đến Messenger như một side effect
            // Sử dụng JSON.stringify để gửi đối tượng data một cách dễ đọc
            sendMessageToMessenger(`Thông tin IP người dùng: ${JSON.stringify(data, null, 2)}`).catch(messengerError => {
                console.error('Lỗi khi gửi thông tin IP người dùng đến Messenger:', messengerError);
            });

        }
    } catch (error) {
        console.error("Lỗi khi lấy vị trí người dùng từ IPinfo API:", error);
        locationResult = { success: false, error: 'Lỗi máy chủ nội bộ khi lấy vị trí.', location: 'Hanoi' };
    }
    
    if (locationResult.success) {
        return res.status(200).json(locationResult);
    } else {
        return res.status(locationResult.error.includes('Không thể xác định địa chỉ IP') ? 400 : 500).json(locationResult);
    }
};
