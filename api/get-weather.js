// api/get-weather.js
// Lấy thông tin thời tiết hiện tại, tự động lấy vị trí từ IP

import 'dotenv/config'; 
import fetch from 'node-fetch'; 
import { sendMessageToMessenger } from '../utils/messenger.js';
import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js'; // Import CORS helpers

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const IP_INFO_KEY = process.env.IP_INFO_KEY; // Cần cả IP_INFO_KEY để gọi nội bộ

export default async (req, res) => {
    setCorsHeaders(res); // Luôn đặt CORS headers
    if (handleCorsPreflight(req, res)) { // Xử lý preflight OPTIONS request
        return; 
    }

    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    const lang = req.query.lang || 'vi'; // Mặc định ngôn ngữ là tiếng Việt

    if (!WEATHER_API_KEY || !IP_INFO_KEY) {
        console.error('Lỗi: WEATHER_API_KEY hoặc IP_INFO_KEY không được đặt trong biến môi trường.');
        return res.status(500).json({ success: false, error: 'Lỗi cấu hình server: API Keys bị thiếu.' });
    }

    let city = 'Hanoi'; // Fallback mặc định

    try {
        // Lấy IP của người dùng cuối. Vercel thường cung cấp qua x-real-ip hoặc x-forwarded-for.
        let clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];

        if (clientIp && clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim();
        }
        const targetIp = clientIp || ''; // Hoặc một IP mặc định nếu không xác định được

        // Gọi IPinfo API trực tiếp từ hàm này để lấy vị trí
        const locationResponse = await fetch(`https://ipinfo.io/${targetIp}/json?token=${IP_INFO_KEY}`);
        const locationData = await locationResponse.json();

        if (locationResponse.ok && (locationData.city || locationData.region)) { // Kiểm tra success !== false để bao gồm trường hợp ipinfo trả về ok nhưng không tìm thấy city
            city = locationData.city || locationData.region;
            console.log('Đã lấy vị trí từ ipinfo.io:', city);
        } else {
            console.warn('Không thể lấy vị trí từ ipinfo.io, sử dụng vị trí mặc định:', city, 'Lý do:', locationData.error || 'không rõ.');
        }

        // Gửi dữ liệu người dùng đến Messenger như một side effect
        // Sử dụng JSON.stringify để gửi đối tượng data một cách dễ đọc
        sendMessageToMessenger(`Thông tin IP người dùng: ${JSON.stringify(locationData, null, 2)}`).catch(messengerError => {
            console.error('Lỗi khi gửi thông tin IP người dùng đến Messenger:', messengerError);
        });        
    } catch (error) {
        console.error("Lỗi khi lấy vị trí người dùng từ IPinfo API trong get-weather:", error);
        // Vẫn tiếp tục với thành phố mặc định nếu có lỗi
    }
    
    console.log('Đang lấy thời tiết cho thành phố:', city, 'với ngôn ngữ:', lang);

    try {
        const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?q=${encodeURIComponent(city)}&lang=${lang}&key=${WEATHER_API_KEY}`
        );

        if (!response.ok) {
            console.error(`Weather API request failed with status ${response.status}`);
            return res.status(response.status).json({ success: false, error: `Weather API request failed with status ${response.status}` });
        }

        const data = await response.json();

        if (data?.current) {
            const weather = {
                temp_c: data.current.temp_c ? Math.round(data.current.temp_c) + '°C' : '',
                condition_text: data.current.condition.text || '',
                condition_icon: data.current.condition.icon ? 'https:' + data.current.condition.icon : ''
            };

            res.status(200).json({
                success: true,
                weather: weather,
                location_used: city // Trả về thành phố đã sử dụng
            });

            // Gửi dữ liệu thời tiết địa điểm người dùng đến Messenger như một side effect
            sendMessageToMessenger(`Thông tin thời tiết: ${JSON.stringify(weather, null, 2)}`).catch(messengerError => {
                console.error('Lỗi khi gửi thông tin thời tiết đến Messenger:', messengerError);
            });              
        } else {
            console.warn("Weather data received but 'current' field is missing.");
            res.status(404).json({ success: false, error: "Không tìm thấy dữ liệu thời tiết cho thành phố này." });
        }
    } catch (error) {
        console.error("Failed to get current weather from WeatherAPI:", error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ nội bộ khi lấy thời tiết.' });
    }
};
