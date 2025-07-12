// utils/redis-client.js
import Redis from 'ioredis';
import 'dotenv/config';

let redisClient;

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    console.warn('REDIS_URL không được đặt. Redis client sẽ không được khởi tạo.');
}

export function getRedisClient() {
    if (!redisClient && REDIS_URL) {
        redisClient = new Redis(REDIS_URL);

        redisClient.on('connect', () => {
            console.log('Kết nối Redis thành công!');
        });

        redisClient.on('error', (err) => {
            console.error('Lỗi kết nối Redis:', err);
        });
    }
    return redisClient;
}