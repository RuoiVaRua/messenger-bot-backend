// utils/cors.js
// Hàm tiện ích để thêm các header CORS vào phản hồi HTTP

/**
 * Thêm các header CORS vào đối tượng phản hồi (res)
 * @param {object} res Đối tượng phản hồi Express (hoặc tương tự Vercel Function res)
 */
export function setCorsHeaders(res) {
    // Cho phép yêu cầu từ bất kỳ origin nào.
    // Trong môi trường production, bạn nên thay '*' bằng domain frontend của bạn (ví dụ: 'https://your-frontend-domain.com')
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    
    // Cho phép các phương thức HTTP mà API của bạn sử dụng
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    // Cho phép các header tùy chỉnh (ví dụ: Content-Type)
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Cho phép gửi credentials (ví dụ: cookies, authorization headers)
    // res.setHeader('Access-Control-Allow-Credentials', 'true'); // Chỉ bật nếu bạn cần gửi cookies/auth headers và Access-Control-Allow-Origin không phải '*'
}

/**
 * Xử lý yêu cầu preflight OPTIONS
 * @param {object} req Đối tượng yêu cầu
 * @param {object} res Đối tượng phản hồi
 * @returns {boolean} True nếu yêu cầu là OPTIONS và đã được xử lý
 */
export function handleCorsPreflight(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).end(); // Trả về 204 No Content cho yêu cầu preflight thành công
        return true;
    }
    return false;
}
