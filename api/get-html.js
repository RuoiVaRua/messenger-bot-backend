// api/get-html.js
import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js';
import fetch from 'node-fetch';

export default async function (req, res) {
    setCorsHeaders(res);

    if (handleCorsPreflight(req, res)) {
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Chỉ chấp nhận phương thức GET' });
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Thiếu tham số URL' });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        res.status(200).send(html);
    } catch (error) {
        console.error('Lỗi khi lấy HTML:', error);
        res.status(500).json({ error: 'Không thể lấy HTML', details: error.message });
    }
}