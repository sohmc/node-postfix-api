import { execute as getAlias } from './GET.js';
import { execute as getDomainConfig } from '../domain/GET.js';
import { putItem } from '../_utilities.js';
import { v4 as uuidv4 } from 'uuid';

const requiredParameters = ['alias', 'domain', 'destination'];

export async function execute(pathParameters = [], queryParameters = {}, requestBody = {}) {
  console.log(`(alias/POST) Received request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)} requestBody ${JSON.stringify(requestBody)}`);

  let lambdaResponseObject = {
    statusCode: 418,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      'code': 418,
      'type': 'domain',
      'message': '',
    },
  };

  if (!requiredParameters.every(property => Object.prototype.hasOwnProperty.call(requestBody, property))) {
    // return error message with property that is missing
    lambdaResponseObject.statusCode = 400;
    lambdaResponseObject.body.code = 400;
    lambdaResponseObject.body.message = 'missing required property: ' + requiredParameters[requiredParameters.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property))];
  } else if (await checkDomainConfig(requestBody.domain) == -1) {
    // return error message stating domain is invalid
    lambdaResponseObject.statusCode = 400;
    lambdaResponseObject.body.code = 400;
    lambdaResponseObject.body.message = 'domain is either inactive or invalid';
  } else {
    const aliasObject = {
      'alias_address': requestBody.alias,
      'domain': requestBody.domain,
      'destination': requestBody.destination,
    };

    lambdaResponseObject = await insertAliasObject(aliasObject);
  }

  return lambdaResponseObject;
}

export async function insertAliasObject(placeholderObject) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'alias',
      'message': 'Could not insert alias.',
    },
  };

  const d = Math.floor(Date.now() / 1000);

  const thisUUID = placeholderObject.uuid || uuidv4();

  const params = {
    'Key': {
      'alias_address': placeholderObject.alias_address,
      'sub_domain': placeholderObject.domain,
    },
    'Item': {
      'application': 'tacomail',
      'sub_domain': placeholderObject.domain || 'NOT-PROPERLY-SET',
      'alias_address': placeholderObject.alias_address,
      'destination': placeholderObject.destination,
      'full_address': `${placeholderObject.alias_address}@${placeholderObject.domain}`,
      'identifier': thisUUID,
      'created_datetime': placeholderObject.created || d,
      'modified_datetime': d,
      'active_alias': (Object.prototype.hasOwnProperty.call(placeholderObject, 'active') ? placeholderObject.active : true),
      'ignore_alias': (Object.prototype.hasOwnProperty.call(placeholderObject, 'ignore_alias') ? placeholderObject.ignore_alias : false),
      'use_count': parseInt(placeholderObject.count) || 1,
    },
    'ExpressionAttributeNames': {
      '#postALIAS1': 'sub_domain',
      '#postALIAS2': 'alias_address',
    },
    'ConditionExpression': 'attribute_not_exists(#postALIAS1) AND attribute_not_exists(#postALIAS2)',
  };

  // PUT row into database
  const queryResults = await putItem(params);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    returnObject = await getAlias([thisUUID]);

    // Change the status code to 201 since this was just created.
    if (returnObject.statusCode == 200) returnObject.statusCode = 201;
  } else {
    returnObject.body.message = 'Alias could not be added.';
  }

  return returnObject;
}

export async function checkDomainConfig(domainToCheck) {
  const domainListResponse = await getDomainConfig([], {});
  const domainList = domainListResponse.body;

  console.log(JSON.stringify(domainList));

  return domainList.findIndex(domain => ((domain.subdomain == domainToCheck) && (domain.active)));
}