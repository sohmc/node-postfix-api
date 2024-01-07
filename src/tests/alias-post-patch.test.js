import { handler } from '../index';
import { deleteItem } from '../newEndpoints/_utilities';

const prefix = 'peacelilly';
const r = (Math.random() + 1).toString(36).substring(7).toLowerCase();
const newAlias = `${prefix}.${r}`;
const newFullAddress = newAlias + '@capricadev.tk';
let createdAlias = {};

afterAll(async () => {
  if (Object.prototype.hasOwnProperty.call(createdAlias, 'uuid')) {
    console.log('Doing Cleanup of alias ' + JSON.stringify(createdAlias));
    const aliasToDelete = {
      alias: createdAlias.alias,
      domain: createdAlias.domain,
    };

    const data = await deleteItem(aliasToDelete);
    console.log(data);
  }
});

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
  expect(result.statusCode).toEqual(201);
  expect(result).toHaveProperty('body');
  expect(result.body).toHaveLength(1);
  expect(result.body[0].fullEmailAddress).toBe(newFullAddress);
  createdAlias = result.body[0];

  const changeAlias = newAlias;
  const changeFullAddress = changeAlias + '@capricatest.tk';
  console.log('Updating ' + newFullAddress + ' to ' + changeFullAddress);
  const lambdaChangeAliasEvent = {
    'requestContext': {
      'http': {
        'method': 'PATCH',
        'path': '/alias/' + createdAlias.uuid,
      },
    },
    'body': JSON.stringify({
      'domain': 'capricatest.tk',
    }),
  };

  const result2 = await handler(lambdaChangeAliasEvent, {});
  expect(result2.statusCode).toEqual(200);
  expect(result2).toHaveProperty('body');
  expect(result2.body).toHaveLength(1);
  expect(result2.body[0].fullEmailAddress).toBe(changeFullAddress);
  createdAlias = result2.body[0];
});

test('Coverage Test - Bad Update Request with non-existent domain', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'PATCH',
        'path': '/alias/' + createdAlias.uuid,
      },
    },
    'body': JSON.stringify({
      'domain': 'doesnotexist.tk',
    }),
  };

  const result2 = await handler(lambdaEvent, {});

  expect(result2.statusCode).toEqual(405);
});

test('Coverage Test - Bad Update Request with no changes', async () => {
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'PATCH',
        'path': '/alias/' + createdAlias.uuid,
      },
    },
  };

  const result2 = await handler(lambdaEvent, {});

  expect(result2.statusCode).toEqual(405);
});

test('Coverage Test - Bad Create Alias request with missing options.', async () => {
  console.log('Creating an Alias for ' + newFullAddress);
  const lambdaEvent = {
    'requestContext': {
      'http': {
        'method': 'POST',
        'path': '/alias',
      },
    },
    'body': JSON.stringify({
      'domain': 'capricadev.tk',
      'destination': 'S3',
    }),
  };

  const result2 = await handler(lambdaEvent, {});

  expect(result2.statusCode).toEqual(400);
});