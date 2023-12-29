import { execute as getAlias } from './GET';
import { execute as getDomainConfig } from '../domain/GET';
import { putItem } from '../_utilities';

const requiredParameters = ['alias', 'domain', 'destination'];

export async function execute(_pathParameters = [], _queryParameters = {}, requestBody = {}) {
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

  if (requiredParameters.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property)) === -1) {
    // return error message with property that is missing
    lambdaResponseObject.body.message = 'missing required property: ' + requiredParameters[requiredParameters.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property))];
  } else if (await checkDomainConfig(requestBody.domain) == -1) {
    // return error message stating domain is invalid
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

async function insertAliasObject(placeholderObject) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'alias',
      'message': 'Could not insert alias.',
    },
  };

  const { v4: uuidv4 } = require('uuid');
  const d = Math.floor(Date.now() / 1000);

  const thisUUID = placeholderObject.uuid || uuidv4();

  const params = {
    'Key': {
      'alias_address': placeholderObject.alias_address,
      'sub_domain': placeholderObject.domain,
    },
    'Item': {
      'application': 'tacomail',
      'sub_domain': placeholderObject.domain || 'foobar',
      'alias_address': placeholderObject.alias_address,
      'destination': placeholderObject.destination,
      'full_address': `${placeholderObject.alias_address}@${placeholderObject.domain}`,
      'identifier': thisUUID,
      'created_datetime': placeholderObject.created || d,
      'modified_datetime': d,
      'active_alias': placeholderObject.active || true,
      'ignore_alias': placeholderObject.ignore_alias || false,
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

async function checkDomainConfig(domainToCheck) {
  const domainListResponse = await getDomainConfig([], {});
  const domainList = domainListResponse.body;

  console.log(JSON.stringify(domainList));

  return domainList.findIndex(domain => ((domain.subdomain == domainToCheck) && (domain.active)));
}