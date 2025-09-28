import Ably from "ably";
import { setCorsHeaders, handleCorsPreflight } from "../utils/cors.js";

const ABLY_API_KEY = process.env.ABLY_API_KEY;

if (!ABLY_API_KEY) {
	console.error("ABLY_API_KEY is not set in environment variables.");
}

export default async function (request, response) {
	setCorsHeaders(response);
	if (handleCorsPreflight(request, response)) {
		return;
	}

	if (request.method === "POST") {
		const { channel, event, message } = request.body;

		if (!channel || !event || !message) {
			return response
				.status(400)
				.json({
					error: "Missing required parameters: channel, event, message",
				});
		}

		try {
			let clientIp = request.query.client_ip?.toString().trim()
				|| request.headers['x-real-ip']?.toString().trim() 
				|| request.headers['x-forwarded-for']?.toString().split(',')[0].trim()
				|| request.headers['cf-connecting-ip']?.toString().trim();

			if (clientIp && clientIp.includes(',')) {
				clientIp = clientIp.split(',')[0].trim();
			}
			const targetIp = clientIp || ''; // Hoặc một IP mặc định nếu không xác định được				

			// Connect to Ably
			const ably = new Ably.Realtime(ABLY_API_KEY);
			ably.connection.once("connected", () => {
				console.log("Connected to Ably!")
			})			
			const ablyChannel = ably.channels.get(channel); // Create a channel
			
			// Thêm IP vào đối tượng message trước khi publish
			const messageWithIp = { ...message, ipAddress: targetIp };
			await ablyChannel.publish(event, messageWithIp); // Publish đối tượng message đã sửa đổi
			ably.connection.close(); // Đóng kết nối Ably sau khi gửi tin nhắn
			return response
				.status(200)
				.json({
					success: true,
					message: "Notification sent successfully",
				});
		} catch (error) {
			console.error("Error sending notification:", error);
			return response
				.status(500)
				.json({ error: "Failed to send notification" });
		}
	} else {
		response.setHeader("Allow", ["POST"]);
		return response.status(405).end(`Method ${request.method} Not Allowed`);
	}
}
