import expect from 'expect';
import { handler } from '../index';

const r = (Math.random() + 1).toString(36).substring(7).toLowerCase();
const newAlias = 'peacelilly.' + r;
const newFullAddress = newAlias + '@capricadev.tk';

test('Create an Alias', async () => {
  console.log('Creating an Alias for ' + newFullAddress);
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'POST',
        'path': '/alias',
      },
    },
    'body': JSON.stringify({
      'alias': newAlias,
      'domain': 'capricadev.tk',
      'destination': 'S3',
    }),
  };

  const result = await handler(lambdaEvent, {});
  console.log(JSON.stringify(result));
  expect(result.statusCode).toEqual(201);
  expect(result).toHaveProperty('body');
  expect(result.body).toHaveLength(1);
  expect(result.body[0].fullEmailAddress).toBe(newFullAddress);
});