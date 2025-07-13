const { Client } = require('@elastic/elasticsearch');

const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

async function checkElasticsearchConnection() {
  try {
    await elasticsearchClient.ping();
    console.log('Kết nối thành công đến Elasticsearch');
  } catch (error) {
    console.error('Không thể kết nối đến Elasticsearch:', error);
  }
}

module.exports = {
  elasticsearchClient,
  checkElasticsearchConnection,
};