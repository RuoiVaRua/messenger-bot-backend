# Sử dụng một image Node.js chính thức
FROM node:22-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Khai báo các build-argument cho các biến môi trường của bạn
# Dựa trên file .env.example của bạn
ARG PAGE_ACCESS_TOKEN
ARG VERIFY_TOKEN
ARG PAGE_SCOPED_USER_ID
ARG IP_INFO_KEY
ARG WEATHER_API_KEY
ARG PUSHER_APP_ID
ARG PUSHER_KEY
ARG PUSHER_SECRET
ARG PUSHER_CLUSTER
ARG ABLY_API_KEY
ARG MONGODB_URI

# Gán giá trị từ build-argument vào biến môi trường thực sự
ENV PAGE_ACCESS_TOKEN=$PAGE_ACCESS_TOKEN
ENV VERIFY_TOKEN=$VERIFY_TOKEN
ENV PAGE_SCOPED_USER_ID=$PAGE_SCOPED_USER_ID
ENV IP_INFO_KEY=$IP_INFO_KEY
ENV WEATHER_API_KEY=$WEATHER_API_KEY
ENV PUSHER_APP_ID=$PUSHER_APP_ID
ENV PUSHER_KEY=$PUSHER_KEY
ENV PUSHER_SECRET=$PUSHER_SECRET
ENV PUSHER_CLUSTER=$PUSHER_CLUSTER
ENV ABLY_API_KEY=$ABLY_API_KEY
ENV MONGODB_URI=$MONGODB_URI

# Copy file package.json và package-lock.json
COPY package*.json ./

# Cài đặt các dependencies (bao gồm cả express vừa thêm)
RUN npm install --only=production

# Copy toàn bộ source code của dự án
COPY . .

# Expose cổng 3000 mà server Express đang lắng nghe
EXPOSE 3000

# Lệnh để khởi động server Express
CMD [ "node", "server.js" ]