// utils/getWeather.js
// Lấy thông tin thời tiết hiện tại dựa trên thông tin vị trí được cung cấp

import 'dotenv/config';

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

/**
 * Lấy thông tin thời tiết hiện tại cho một vị trí cụ thể.
 * @param {string} location Tên thành phố hoặc vị trí để lấy thời tiết.
 * @param {string} [lang='vi'] Ngôn ngữ cho thông tin thời tiết (mặc định là 'vi').
 * @returns {Promise<{success: boolean, weather?: object, location_used?: string, error?: string}>} Kết quả thời tiết.
 */
export async function getWeather(location, lang = 'vi') {
    if (!WEATHER_API_KEY) {
        console.error('Lỗi: WEATHER_API_KEY không được đặt trong biến môi trường.');
        return { success: false, error: 'Lỗi cấu hình server: WEATHER_API_KEY bị thiếu.' };
    }
    if (!location) {
        console.error('Lỗi: Tham số vị trí (location) là bắt buộc.');
        return { success: false, error: 'Tham số vị trí (location) là bắt buộc.' };
    }

    console.log('Đang lấy thời tiết cho thành phố:', location, 'với ngôn ngữ:', lang);

    let weatherData = {};
    try {
        const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?q=${encodeURIComponent(location)}&lang=${lang}&key=${WEATHER_API_KEY}`
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`Weather API request failed with status ${response.status}: ${errorData}`);
            return { success: false, error: `Weather API request failed with status ${response.status}: ${errorData}` };
        }

        weatherData = await response.json();

        if (weatherData?.current) {
            return {
                success: true,
                weather: {
                    temp_c: weatherData.current.temp_c ? Math.round(weatherData.current.temp_c) + '°C' : '',
                    condition_text: weatherData.current.condition.text || '',
                    condition_icon: weatherData.current.condition.icon ? 'https:' + weatherData.current.condition.icon : ''
                },
                location_used: location
            };
        } else {
            console.warn("Weather data received but 'current' field is missing.");
            return { success: false, error: "Không tìm thấy dữ liệu thời tiết cho thành phố này." };
        }
    } catch (error) {
        console.error("Failed to get current weather from WeatherAPI:", error);
        return { success: false, error: 'Lỗi máy chủ nội bộ khi lấy thời tiết.' };
    }
}
