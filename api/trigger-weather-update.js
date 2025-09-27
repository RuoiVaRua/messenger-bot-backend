import Pusher from 'pusher';
import { getWeather } from '../utils/getWeather.js'; // Import hàm getWeather mới từ utils
import { handleCorsPreflight, setCorsHeaders } from '../utils/cors.js';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'ap1', // Mặc định 'ap1' nếu không có
  useTLS: true,
});

export default async function (request, response) {
  setCorsHeaders(response); // Luôn đặt CORS headers
  if (handleCorsPreflight(request, response)) { // Xử lý preflight OPTIONS request
      return;
  }

  try {
    // Lấy dữ liệu thời tiết. Bạn có thể tùy chỉnh vị trí hoặc các tham số khác nếu cần.
    // Ví dụ: lấy vị trí từ request.query.location hoặc một cấu hình mặc định.
    const lang = request.query.lang || 'vi'; // Ngôn ngữ cho thời tiết
    const location = request.query.location || 'Hanoi'; // Vị trí mặc định

    console.log(`Fetching weather for location: ${location}, lang: ${lang}`);
    const weatherResponse = await getWeather(location, lang);
    console.log('Weather API Response:', weatherResponse);

    if (weatherResponse.weather && weatherResponse.success) {
      const weatherData = {
        weatherCelsius: weatherResponse.weather.temp_c,
        weatherDesc: weatherResponse.weather.condition_text,
        weatherPic: weatherResponse.weather.condition_icon,
      };

      console.log('Attempting to trigger Pusher event:');
      console.log('  Channel: weather-channel');
      console.log('  Event: weather-update');
      console.log('  Data:', weatherData);

      await pusher.trigger('weather-channel', 'weather-update', weatherData);
      console.log('Pusher event triggered successfully.');

      response.status(200).json({ message: 'Weather update triggered successfully', weatherData });
    } else {
      console.error('Failed to fetch weather data:', weatherResponse);
      response.status(500).json({ error: 'Failed to fetch weather data' });
    }
  } catch (error) {
    console.error('Error triggering weather update:', error);
    response.status(500).json({ error: 'Failed to trigger weather update', details: error.message });
  }
}
