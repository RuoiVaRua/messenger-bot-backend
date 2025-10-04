import mongoose from 'mongoose';
import { Server } from 'socket.io';

// Kết nối MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/messenger_bot_chat';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Định nghĩa Message Schema và Model
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String, // Có thể là ID người nhận hoặc ID phòng chat
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

export const initializeChatService = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // Cho phép tất cả các origin, bạn nên cấu hình cụ thể trong production
            methods: ["GET", "POST"]
        }
    });

    // Xử lý kết nối Socket.io
    io.on('connection', (socket) => {
        const clientIp = socket.request.connection.remoteAddress;
        console.log(`A user connected: ${socket.id} from IP: ${clientIp}`);

        // Lắng nghe sự kiện 'joinRoom'
        socket.on('joinRoom', async (room) => {
            // Rời khỏi các phòng cũ trước khi tham gia phòng mới (trừ phòng mặc định của socket)
            socket.rooms.forEach(r => {
                if (r !== socket.id) {
                    socket.leave(r);
                    console.log(`User ${socket.id} left room: ${r}`);
                }
            });

            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);

            // Gửi lịch sử tin nhắn cho người dùng khi họ tham gia phòng
            try {
                const messages = await Message.find({ receiver: room }).sort({ timestamp: 1 }).limit(50);
                socket.emit('messageHistory', messages);
            } catch (error) {
                console.error('Error fetching message history:', error);
            }
        });

        // Lắng nghe sự kiện 'sendMessage'
        socket.on('sendMessage', async (data) => {
            const { room, content } = data; // Client sẽ gửi cả room và content
            if (!room) {
                console.error('Error: Room not specified in sendMessage event.');
                return;
            }
            console.log(`Message from ${clientIp} to room ${room}: ${content}`);

            // Lưu tin nhắn vào MongoDB
            const newMessage = new Message({
                sender: clientIp,
                receiver: room, // Receiver là phòng mà client đã chọn
                content: content
            });
            try {
                await newMessage.save();
                // Phát tin nhắn đến tất cả các client trong phòng chat
                io.to(room).emit('receiveMessage', newMessage);
            } catch (error) {
                console.error('Error saving message to DB:', error);
            }
        });

        // Xử lý ngắt kết nối
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io; // Trả về instance io để có thể sử dụng nếu cần
};
