import expect from 'expect';
import { handler } from '../index';

const randomString = (Math.random() + 1).toString(36).substring(2).toLowerCase();
const randomDomain = `caprica${randomString}.ga`;

test('Add a domain to an EXISTING config', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'POST',
        'path': '/domain',
      },
    },
    'body': JSON.stringify({
      'domain': randomDomain,
      'description': 'jestjs.io domain insertion test',
      'active': false,
    }),
  };

  const result = await handler(lambdaEvent, {});

  expect(result.statusCode).toEqual(201);
  expect(Array.isArray(result.body)).toBeTruthy();
  expect(result.body[0].subdomain).toBe(randomDomain);
  expect(result.body[0].active).toBeFalsy();
});

test.skip('Add a NEW configuration with a new domain', async () => {
  const targetDomain = 'capricadev.tk';

  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'POST',
        'path': '/domain',
      },
    },
    'body': JSON.stringify({
      'domain': targetDomain,
      'description': 'jestjs.io domain insertion test',
      'active': false,
    }),
  };

  const result = await handler(lambdaEvent, {});

  expect(result.statusCode).toEqual(201);
  expect(Array.isArray(result.body)).toBeTruthy();
  expect(result.body[0].subdomain).toBe(targetDomain);
  expect(result.body[0].active).toBeFalsy();
});

test.skip('Do a query for domains', async () => {
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

