# Sử dụng image Node.js LTS chính thức làm base image
FROM node:22-alpine

# Thiết lập thư mục làm việc trong container
WORKDIR /usr/src/app

# Sao chép package.json và package-lock.json (nếu có) để cài đặt dependencies
# Sử dụng COPY --from=builder nếu có bước build riêng
COPY package*.json ./

# Cài đặt dependencies
RUN npm install --omit=dev

# Sao chép toàn bộ mã nguồn vào thư mục làm việc
COPY . .

# Mở cổng mà ứng dụng sẽ lắng nghe (nếu có)
# Dự án này là serverless functions, nên không cần mở cổng cụ thể cho HTTP server
# Tuy nhiên, nếu chạy cục bộ với `vercel dev`, nó sẽ lắng nghe trên cổng 3000
EXPOSE 3000

# Lệnh để chạy ứng dụng khi container khởi động
# Đối với Vercel serverless functions, không có một lệnh `start` duy nhất cho toàn bộ ứng dụng
# Thay vào đó, mỗi function được gọi riêng lẻ.
# Tuy nhiên, để chạy cục bộ trong Docker, chúng ta có thể sử dụng `vercel dev`
CMD [ "npm", "run", "start" ]