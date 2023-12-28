import expect from 'expect';
import { handler } from '../index';

test('Get current domain config', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/domain',
      },
    },
  };

  const result = await handler(lambdaEvent, {});

  expect(result.statusCode).toEqual(200);
  expect(result).toHaveProperty('body');
});

