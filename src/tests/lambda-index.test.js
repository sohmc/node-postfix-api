import expect from 'expect';
import { handler } from '../index';

test('Coverage Test - Bad Request', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'HEAD',
        'path': '/alias',
      },
    },
    'queryStringParameters': {
      'alias': 'peacelilly.02@capricadev.tk',
    },
  };

  const result = await handler(lambdaEvent, {});
  expect(result.statusCode).toEqual(400);
});