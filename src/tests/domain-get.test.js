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
  expect(Array.isArray(result.body)).toBeTruthy();
});

test('Get config for specific domain', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/domain/capricadev.tk',
      },
    },
  };

  const result = await handler(lambdaEvent, {});

  expect(result.statusCode).toEqual(200);
  expect(Array.isArray(result.body)).toBeTruthy();
  expect(result.body).toHaveLength(1);
  expect(result.body[0].subdomain).toBe('capricadev.tk');
});

test('Do a query for domains', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/domain',
      },
      'queryStringParameters': {
        'q': '.tk',
      },
    },
  };

  const result = await handler(lambdaEvent, {});

  expect(result.statusCode).toEqual(200);
  expect(Array.isArray(result.body)).toBeTruthy();
  expect(result.body.length).toBeGreaterThanOrEqual(1);
});

