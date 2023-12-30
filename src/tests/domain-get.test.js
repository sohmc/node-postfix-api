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

test('Get config for specific domain', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/domain/capricatest.tk',
      },
    },
  };

  const result = await handler(lambdaEvent, {});

  expect(result.statusCode).toEqual(200);
  expect(result).toHaveProperty('body');
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
  expect(result).toHaveProperty('body');
  expect(result.body.length).toBeGreaterThanOrEqual(1);
});

