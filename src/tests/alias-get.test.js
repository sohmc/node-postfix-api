import expect from 'expect';
import { handler } from '../index';

test('Get Alias (peacelilly.02@capricadev.tk) by alias query', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/alias',
      },
    },
    'queryStringParameters': {
      'alias': 'peacelilly.02@capricadev.tk',
    },
  };

  const result = await handler(lambdaEvent, {});
  console.log(JSON.stringify(result));
  expect(result.statusCode).toEqual(200);
  expect(result).toHaveProperty('body');
  
  expect(result.body).toHaveLength(1);
  expect(result.body[0].fullEmailAddress).toBe('peacelilly.02@capricadev.tk');
});

test('Get Alias (peacelilly.02@capricadev.tk) by UUID (dbabb088-40ad-4bc0-8627-d810e2d4f205)', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/alias/dbabb088-40ad-4bc0-8627-d810e2d4f205',
      },
    },
  };

  const result = await handler(lambdaEvent, {});
  console.log(JSON.stringify(result));

  expect(result.statusCode).toEqual(200);
  expect(result.body[0].fullEmailAddress).toBe('peacelilly.02@capricadev.tk');
});

test('Ignore peacelilly.02@capricadev.tk by alias UUID', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/alias/dbabb088-40ad-4bc0-8627-d810e2d4f205/ignore',
      },
    },
  };

  const result = await handler(lambdaEvent, {});
  console.log(JSON.stringify(result));

  expect(result.statusCode).toEqual(201);
  expect(result.body[0].ignore).toBeTruthy();
});

test('Activate peacelilly.02@capricadev.tk by alias UUID', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/alias/dbabb088-40ad-4bc0-8627-d810e2d4f205/activate',
      },
    },
  };

  const result = await handler(lambdaEvent, {});
  console.log(JSON.stringify(result));

  expect(result.statusCode).toEqual(201);
  expect(result.body[0].ignore).toBeFalsy();
  expect(result.body[0].active).toBeTruthy();
});

test('Increment count for peacelilly.02@capricadev.tk by alias UUID', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'GET',
        'path': '/alias/dbabb088-40ad-4bc0-8627-d810e2d4f205/count',
      },
    },
  };

  const result = await handler(lambdaEvent, {});
  console.log(JSON.stringify(result));

  expect(result.statusCode).toEqual(204);
});
