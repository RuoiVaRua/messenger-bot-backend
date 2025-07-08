import fetch from 'node-fetch';
import { createServer } from 'http';
import { handler as webhookHandler } from '../../api/webhook.js';

// Mock environment variables if needed for the webhook handler
process.env.VERIFY_TOKEN = 'YOUR_VERIFY_TOKEN'; // Replace with your actual token for testing

let server;
let serverUrl;

beforeAll(async () => {
  server = createServer(async (req, res) => {
    // Simulate Vercel's req/res structure for serverless functions
    const url = new URL(req.url, `http://${req.headers.host}`);
    req.query = Object.fromEntries(url.searchParams.entries());
    req.body = await new Promise(resolve => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
		  console.log(e);
          resolve(body); // Handle non-JSON bodies
        }
      });
    });

    // Call the actual webhook handler
    await webhookHandler(req, {
      status: (code) => {
        res.statusCode = code;
        return {
          send: (data) => res.end(data),
          json: (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          }
        };
      }
    });
  });

  await new Promise(resolve => {
    server.listen(0, () => {
      const port = server.address().port;
      serverUrl = `http://localhost:${port}`;
      console.log(`Test server running at ${serverUrl}`);
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

describe('Webhook API Integration Tests', () => {
  test('GET /api/webhook should verify token', async () => {
    const mode = 'subscribe';
    const token = process.env.VERIFY_TOKEN;
    const challenge = 'CHALLENGE_ACCEPTED';

    const response = await fetch(`${serverUrl}/api/webhook?hub.mode=${mode}&hub.verify_token=${token}&hub.challenge=${challenge}`);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe(challenge);
  });

  test('GET /api/webhook should return 403 for invalid token', async () => {
    const mode = 'subscribe';
    const token = 'INVALID_TOKEN';
    const challenge = 'CHALLENGE_ACCEPTED';

    const response = await fetch(`${serverUrl}/api/webhook?hub.mode=${mode}&hub.verify_token=${token}&hub.challenge=${challenge}`);

    expect(response.status).toBe(403);
  });

  test('POST /api/webhook should process message event', async () => {
    const payload = {
      object: 'page',
      entry: [
        {
          messaging: [
            {
              sender: { id: 'USER_ID' },
              message: { text: 'Hello, bot!' },
            },
          ],
        },
      ],
    };

    const response = await fetch(`${serverUrl}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    // Add more specific assertions based on expected webhook handler behavior
  });

  test('POST /api/webhook should return 200 for unsupported event', async () => {
    const payload = {
      object: 'page',
      entry: [
        {
          messaging: [
            {
              sender: { id: 'USER_ID' },
              postback: { payload: 'UNSUPPORTED_PAYLOAD' }, // Example of unsupported event
            },
          ],
        },
      ],
    };

    const response = await fetch(`${serverUrl}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
  });
});