import Ably from 'ably';
import { setCorsHeaders, handleCorsPreflight } from "../utils/cors.js";

const ABLY_API_KEY = process.env.ABLY_API_KEY;

if (!ABLY_API_KEY) {
  console.error('ABLY_API_KEY is not set in environment variables.');
}

const handler = async (request, response) => {
	setCorsHeaders(response);
	if (handleCorsPreflight(request, response)) {
		return;
	}

  if (request.method === 'GET') {
    try {
      const ably = new Ably.Realtime(ABLY_API_KEY);
      const tokenRequest = await ably.auth.createTokenRequest({
        capability: {
          "access-log": ["subscribe"], // Chỉ cho phép subscribe trên kênh 'access-log'
          "page-access": ["subscribe"], // Cho phép subscribe trên các kênh user cụ thể
        },
        // userId: 'user-123', // Tùy chọn: Gán userId cho token
        // ttl: 60 * 60 * 1000, // Tùy chọn: Thời gian sống của token (1 giờ)
      });
      ably.close(); // Đóng kết nối sau khi tạo token

      return response.status(200).json(tokenRequest);
    } catch (error) {
      console.error('Error creating Ably token:', error);
      return response.status(500).json({ error: 'Failed to create Ably token' });
    }
  } else {
    response.setHeader('Allow', ['GET']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }
};

export default handler;
