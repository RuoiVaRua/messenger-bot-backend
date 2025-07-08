const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy middleware options
const options = {
  target: 'http://localhost:3000', // default target, will be overridden by pathRewrite
  changeOrigin: true,
  pathRewrite: {
    '^/get-html': '/get-html',
    '^/get-location': '/get-location',
    '^/get-weather': '/get-weather',
    '^/send-message': '/send-message',
    '^/webhook': '/webhook',
  },
  router: {
    '/get-html': 'http://get-html:3000',
    '/get-location': 'http://get-location:3000',
    '/get-weather': 'http://get-weather:3000',
    '/send-message': 'http://send-message:3000',
    '/webhook': 'http://webhook:3000',
  },
  onProxyReq: (proxyReq, req) => {
    console.log(`Proxying request: ${req.method} ${req.path} -> ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy Error');
  }
};

// Apply the proxy to all routes
app.use('/', createProxyMiddleware(options));

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});