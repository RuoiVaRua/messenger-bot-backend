import 'dotenv/config'; // Tải các biến từ .env

import express from 'express';
import fetch from 'node-fetch'; // Dùng fetch cho các yêu cầu HTTP
import cors from 'cors'; // Để xử lý CORS từ frontend

const app = express();
const port = process.env.PORT || 3000; // Cổng cho server backend

// Lấy các biến môi trường
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_SCOPED_USER_ID = process.env.PAGE_SCOPED_USER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const IP_INFO_KEY = process.env.IP_INFO_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
// const BACK_END_URL = process.env.BACK_END_URL || `http://localhost:${port}`; // URL của backend, có thể dùng trong frontend
let ONE_TIME_NOTIF_TOKEN = ''; // Biến này sẽ lưu one-time notification token nếu có

// Kiểm tra xem các biến môi trường đã được tải chưa
if (!PAGE_ACCESS_TOKEN || !PAGE_SCOPED_USER_ID || !VERIFY_TOKEN) {
    console.error('Lỗi: PAGE_ACCESS_TOKEN hoặc PAGE_SCOPED_USER_ID hoặc VERIFY_TOKEN không được đặt trong file .env');
    process.exit(1);
}

// Kiểm tra xem các biến môi trường đã được tải chưa
if (!IP_INFO_KEY || !WEATHER_API_KEY) {
    console.error('Lỗi: Các API Key (IPinfo hoặc WeatherAPI) không được đặt trong file .env');
    process.exit(1);
}

// Middleware
app.use(express.json()); // Cho phép server đọc JSON từ body của request
app.use(cors()); // Cho phép yêu cầu từ các domain khác (quan trọng cho frontend)

// Webhook Verification (cho Facebook xác thực)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// Webhook Event Handling (nhận sự kiện từ Facebook)
app.post('/webhook', (req, res) => {
    let body = req.body;

    // Kiểm tra xem đây có phải là sự kiện từ Page Messenger không
    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            let webhook_event = entry.messaging[0];
            console.log("Webhook Event:", webhook_event);

            // Lấy PSID của người gửi
            let sender_psid = webhook_event.sender.id;
            console.log('PSID của người gửi:', sender_psid);

            // *** LƯU PSID NÀY LẠI! ***
            // Đây chính là ID mà bạn sẽ dùng làm recipient.id để gửi tin nhắn
            // Bạn có thể lưu nó vào database hoặc vào một biến tạm thời để test.
            // Ví dụ: global.myTestPSID = sender_psid;


            // Lấy one time notification token nếu có
            entry.messaging.forEach(function(event) {
                // Nếu là phản hồi từ quick reply yêu cầu OTN
                if (event.message && event.message.quick_reply && event.message.quick_reply.payload === 'OTN_YEU_CAU') {
                    // Kiểm tra có OTN token không
                    if (event.message && event.message.quick_reply.one_time_notif_token) {
                        const otn_token = event.message.quick_reply.one_time_notif_token;
                        console.log('OTN Token nhận được:', otn_token);
                        ONE_TIME_NOTIF_TOKEN = otn_token; // Lưu token vào biến toàn cục

                        // Lưu token vào cơ sở dữ liệu (hoặc tạm thời trong RAM để test)
                        // saveOTNToken(sender_psid, otn_token);
                    } else {
                        console.log('Không có OTN token trong phản hồi.');
                    }
                }
            });            
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Hàm trợ giúp để gửi tin nhắn đến Messenger
async function sendMessageToMessenger(messageContent) {
    const MY_PSID_FROM_PAGE = PAGE_SCOPED_USER_ID;

    if (!messageContent || !MY_PSID_FROM_PAGE) {
        console.error('Nội dung tin nhắn và PSID người nhận là bắt buộc.');
        return { success: false, error: 'Nội dung tin nhắn và PSID người nhận là bắt buộc.' };
    }

    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    const payload = ONE_TIME_NOTIF_TOKEN
        ? {
            recipient: {
                one_time_notif_token: ONE_TIME_NOTIF_TOKEN
            },
            message: {
                text: messageContent
            },
            messaging_type: "MESSAGE_TAG",
            tag: "ONE_TIME_NOTIFICATION"
        }
        //! gửi tin nhắn bình thường mà không dùng message tag hoặc yêu cầu one-time notification
        // : {
        //     recipient: {
        //         id: MY_PSID_FROM_PAGE // <-- Sử dụng PSID ở đây
        //     },
        //     message: {
        //         text: message,
        //         quick_replies: [
        //             {
        //                 content_type: "ONE_TIME_NOTIF_REQ",
        //                 // title: "Thông báo cho tôi bất cứ điều gì",
        //                 payload: "OTN_YEU_CAU",
        //                 // messenger_extensions: true
        //             }
        //         ]            
        //     },
        //     // messaging_type: "MESSAGE_TAG",
        //     // tag: "ONE_TIME_NOTIFICATION"
        // };
        : {
            recipient: {
                id: MY_PSID_FROM_PAGE
            },
            message: {
                text: messageContent
            },
            // messaging_type: "MESSAGE_TAG",
            // tag: "ACCOUNT_UPDATE"               
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

// Endpoint API để gửi tin nhắn
app.post('/api/send-message', async (req, res) => {
    const { message } = req.body;
    const result = await sendMessageToMessenger(message);
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(400).json(result);
    }
});

// Hàm trợ giúp để lấy vị trí người dùng
async function getUserLocation(req) {
    try {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log('Đang lấy vị trí người dùng từ IP: ', clientIp);

        if (!clientIp) {
            return { success: false, error: 'Không thể xác định địa chỉ IP của người dùng.' };
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

        // Gửi dữ liệu người dùng đến Messenger mà không ảnh hưởng đến tiến trình lấy vị trí
        sendMessageToMessenger(JSON.stringify(data)); // không dùng await ở đây vì không cần chờ phản hồi
                
        return { success: true, location: location };
    } catch (error) {
        console.error("Failed to get user location from IPinfo API:", error);
        return { success: false, error: 'Lỗi máy chủ nội bộ khi lấy vị trí.', location: 'Hanoi' };
    }
}

// Endpoint API để lấy vị trí người dùng
app.get('/api/get-location', async (req, res) => {
    const result = await getUserLocation(req);
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(result.error.includes('Không thể xác định địa chỉ IP') ? 400 : 500).json(result);
    }
});

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
            city = 'Hanoi'; // Nếu không lấy được vị trí, sử dụng vị trí mặc định
            // console.warn('Không thể lấy vị trí từ ipinfo.io, sử dụng vị trí mặc định:', city);
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

// Khởi động server
app.listen(port, () => {
    console.log(`Server backend đang chạy tại http://localhost:${port}`);
});