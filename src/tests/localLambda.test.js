import { handler } from '../index';

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
});

