import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

const app = express();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const IP_INFO_KEY = process.env.IP_INFO_KEY; // Cần cho getUserLocation
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Cần cho sendMessageToMessenger
const PAGE_SCOPED_USER_ID = process.env.PAGE_SCOPED_USER_ID; // Cần cho sendMessageToMessenger

// Hàm trợ giúp để gửi tin nhắn đến Messenger (được sao chép từ send-message.js để độc lập)
async function sendMessageToMessenger(messageContent) {
    const MY_PSID_FROM_PAGE = PAGE_SCOPED_USER_ID;

    if (!messageContent || !MY_PSID_FROM_PAGE) {
        console.error('Nội dung tin nhắn và PSID người nhận là bắt buộc.');
        return { success: false, error: 'Nội dung tin nhắn và PSID người nhận là bắt buộc.' };
    }

    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    const payload = {
        recipient: {
            id: MY_PSID_FROM_PAGE
        },
        message: {
            text: messageContent
        },
    };

    console.log('Đang gửi tin nhắn:', messageContent.substring(0, 256), '... đến PSID:', MY_PSID_FROM_PAGE);
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
            console.log('Tin nhắn đã được gửi thành công');
            return { success: true, data: data };
        } else {
            console.error('Lỗi từ Messenger API:', data);
            return { success: false, error: data };
        }
    } catch (error) {
        console.error('Lỗi khi gọi API Messenger:', error);
        return { success: false, error: 'Lỗi máy chủ nội bộ.' };
    }
}

// Hàm trợ giúp để lấy vị trí người dùng (được sao chép từ get-location.js để độc lập)
async function getUserLocation(req) {
    try {
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log('Đang lấy vị trí người dùng từ IP: ', clientIp);

        if (!clientIp) {
            return { success: false, error: 'Không thể xác định địa chỉ IP của người dùng.' };
        }
        if (clientIp.includes(',')) {
            const ips = clientIp.split(',');
            console.log('Nhiều IP được phát hiện, sử dụng IP đầu tiên:', ips[0].trim());
            clientIp = ips[0].trim();
        }

        const response = await fetch(`https://ipinfo.io/${clientIp}/json?token=${IP_INFO_KEY}`);
        
        if (!response.ok) {
            console.error(`IPinfo API request failed for IP ${clientIp} with status ${response.status}`);
            return { success: false, error: `IPinfo API request failed with status ${response.status}` };
        }

        const data = await response.json();
        const location = data.city || data.region || null;

        if (!location) {
            console.warn('Không thể xác định vị trí người dùng từ IPinfo API, sử dụng vị trí mặc định: Hanoi');
            return { success: false, error: 'Không thể xác định vị trí người dùng, sử dụng vị trí mặc định: Hanoi', location: 'Hanoi' };
        } else {
            console.log('Vị trí người dùng được xác định:', data);
        }

        sendMessageToMessenger(JSON.stringify(data));
                
        return { success: true, location: location };
    } catch (error) {
        console.error("Failed to get user location from IPinfo API:", error);
        return { success: false, error: 'Lỗi máy chủ nội bộ khi lấy vị trí.', location: 'Hanoi' };
    }
}

// Endpoint API để lấy thời tiết hiện tại
app.get('/api/get-weather', async (req, res) => {
    let city = req.query.city;
    const lang = req.query.lang || 'vi';

    if (!city) {
        const locationResult = await getUserLocation(req);
        if (locationResult.success) {
            city = locationResult.location;
            console.log('Đã lấy vị trí từ ipinfo.io:', city);
        } else {
            city = 'Hanoi';
        }
    }
    
    console.log('Đang lấy thời tiết cho thành phố (tỉnh):', city, 'với ngôn ngữ:', lang);

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
            res.status(200).json({
                success: true,
                weather: {
                    temp_c: data.current.temp_c ? Math.round(data.current.temp_c) + '°C' : '',
                    condition_text: data.current.condition.text || '',
                    condition_icon: data.current.condition.icon ? 'https:' + data.current.condition.icon : ''
                }
            });
        } else {
            console.warn("Weather data received but 'current' field is missing.");
            res.status(404).json({ success: false, error: "Không tìm thấy dữ liệu thời tiết cho thành phố này." });
        }
    } catch (error) {
        console.error("Failed to get current weather from WeatherAPI:", error);
        res.status(500).json({ success: false, error: 'Lỗi máy chủ nội bộ khi lấy thời tiết.' });
    }
});

export default app;