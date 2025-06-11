// api/get-weather.js
// Lấy thông tin thời tiết hiện tại, tự động lấy vị trí từ IP

import 'dotenv/config'; 
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

    let locationData = {};
    try {
        // Lấy IP của người dùng cuối. Vercel thường cung cấp qua x-real-ip hoặc x-forwarded-for.
        let clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];

        if (clientIp && clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim();
        }
        const targetIp = clientIp || ''; // Hoặc một IP mặc định nếu không xác định được

        // Gọi IPinfo API trực tiếp từ hàm này để lấy vị trí
        const locationResponse = await fetch(
            targetIp.includes('::1') // Kiểm tra nếu là localhost
                ? `https://ipinfo.io/json?token=${IP_INFO_KEY}` // Sử dụng IPinfo API với localhost
                : `https://ipinfo.io/${targetIp}/json?token=${IP_INFO_KEY}`
        );        
        locationData = await locationResponse.json();

        if (locationResponse.ok && (locationData.city || locationData.region)) { // Kiểm tra success !== false để bao gồm trường hợp ipinfo trả về ok nhưng không tìm thấy city
            city = locationData.city || locationData.region;
            console.log('Đã lấy vị trí từ ipinfo.io:', city);
        } else {
            console.warn('Không thể lấy vị trí từ ipinfo.io, sử dụng vị trí mặc định:', city, 'Lý do:', locationData.error || 'không rõ.');
        }
    } catch (error) {
        console.error("Lỗi khi lấy vị trí người dùng từ IPinfo API trong get-weather:", error);
        // Vẫn tiếp tục với thành phố mặc định nếu có lỗi
    }
    
    console.log('Đang lấy thời tiết cho thành phố:', city, 'với ngôn ngữ:', lang);

    let weatherData = {};
    try {
        const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?q=${encodeURIComponent(city)}&lang=${lang}&key=${WEATHER_API_KEY}`
        );

        if (!response.ok) {
            console.error(`Weather API request failed with status ${response.status}`);
            return res.status(response.status).json({ success: false, error: `Weather API request failed with status ${response.status}` });
        }

        weatherData = await response.json();

        if (weatherData?.current) {            
            // Gộp cả thông tin vị trí IP và thông tin thời tiết vào MỘT TIN NHẮN DUY NHẤT
            const ipInfoMessage = `Thông tin IP người dùng: ${JSON.stringify(locationData, null, 2)}`;
            const weatherInfoMessage = `Thời tiết tại ${city}: ${weatherData.current.temp_c ? Math.round(weatherData.current.temp_c) + '°C' : ''}, ${weatherData.current.condition.text || ''}`;
            const combinedMessage = `${ipInfoMessage}\n\n${weatherInfoMessage}`;
        
            sendMessageToMessenger(combinedMessage).catch(messengerError => {
                console.error('Lỗi khi gửi thông tin tổng hợp đến Messenger:', messengerError);
            });  

            res.status(200).json({
                success: true,
                weather: {
                    temp_c: weatherData.current.temp_c ? Math.round(weatherData.current.temp_c) + '°C' : '',
                    condition_text: weatherData.current.condition.text || '',
                    condition_icon: weatherData.current.condition.icon ? 'https:' + weatherData.current.condition.icon : ''
                },
                location_used: city // Trả về thành phố đã sử dụng
            });
        } else {
            sendMessageToMessenger(`Thông tin IP người dùng: ${JSON.stringify(locationData, null, 2)}`).catch(messengerError => {
                console.error('Lỗi khi gửi thông tin ip người dùng đến Messenger:', messengerError);
            });

            console.warn("Weather data received but 'current' field is missing.");
            res.status(404).json({ success: false, error: "Không tìm thấy dữ liệu thời tiết cho thành phố này." });
        }
    } catch (error) {
        console.error("Failed to get current weather from WeatherAPI:", error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ nội bộ khi lấy thời tiết.' });
    }    
};
