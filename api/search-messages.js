// api/search-messages.js
import { elasticsearchClient } from '../utils/elasticsearch-client.js';

export default async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).send('Chỉ hỗ trợ phương thức GET');
  }

  const { query, sender_psid } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Tham số "query" là bắt buộc.' });
  }

  try {
    const searchBody = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ['message_text'], // Tìm kiếm trong trường tin nhắn
              },
            },
          ],
        },
      },
      sort: [
        { timestamp: { order: 'desc' } } // Sắp xếp theo thời gian giảm dần
      ]
    };

    // Nếu có sender_psid, thêm vào điều kiện tìm kiếm
    if (sender_psid) {
      searchBody.query.bool.filter = [
        { term: { sender_psid: sender_psid } }
      ];
    }

    const { hits } = await elasticsearchClient.search({
      index: 'messenger_messages',
      body: searchBody,
    });

    const messages = hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    }));

    res.status(200).json({
      success: true,
      total: hits.total.value,
      messages: messages,
    });

  } catch (error) {
    console.error('Lỗi khi tìm kiếm tin nhắn trong Elasticsearch:', error);
    res.status(500).json({ error: 'Không thể tìm kiếm tin nhắn.' });
  }
};