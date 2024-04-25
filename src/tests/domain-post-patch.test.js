import { handler } from '../index';

const randomString = (Math.random() + 1).toString(36).substring(2).toLowerCase();
const randomDomain = `caprica${randomString}.ga`;

afterAll(async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'PATCH',
        'path': `/domain/${randomDomain}/delete`,
      },
    },
  };

  console.log('Deleting test configuration ' + randomDomain);
  const result = await handler(lambdaEvent, {});
  expect(result.statusCode).toEqual(204);
});

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

test('Update capricatest.tk entry', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'PATCH',
        'path': '/domain/capricatest.tk',
      },
    },
    'body': JSON.stringify({
      'description': 'jestjs.io domain insertion test - ' + randomString,
      'active': true,
    }),
  };

  const result = await handler(lambdaEvent, {});

  expect(result.statusCode).toEqual(200);
  expect(result.body).toHaveLength(1);
  expect(result.body[0].subdomain).toBe('capricatest.tk');
  expect(result.body[0].description).toBe('jestjs.io domain insertion test - ' + randomString);
  expect(result.body[0].active).toBeTruthy();
});
