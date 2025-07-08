import { sendMessageToMessenger } from '../messenger.js';

// Mock the fetch function as it's used internally by sendMessage
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message_id: 'test_message_id' }),
  })
);

describe('sendMessage', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('should send a message successfully', async () => {
    const recipientId = 'USER_ID';
    const messageText = 'Hello, world!';
    const pageAccessToken = 'PAGE_ACCESS_TOKEN';

    const result = await sendMessageToMessenger(messageText, null, 0); // Updated to match sendMessageToMessenger signature

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: messageText },
        }),
      }
    );
    expect(result).toEqual({ message_id: 'test_message_id' });
  });

  test('should handle API errors', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      })
    );

    const messageText = 'Hello, world!';

    await expect(sendMessageToMessenger(messageText, null, 0)).rejects.toThrow(
      'Failed to send message: Bad request'
    );
  });
});