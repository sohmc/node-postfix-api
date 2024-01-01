import { putItem } from '../_utilities';
import { execute as domainGet } from './GET';

export async function execute(pathParameters = [], queryParameters = {}, requestBody = {}) {
  console.log(`(domain/POST) Received request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)} requestBody ${JSON.stringify(requestBody)}`);

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

  const placeholderObject = {
    'domain': 'tacomail-config',
    'alias_address': 'sub_domains',
  };

  // Adding a domain requires a post body.  Any query parameters
  // are silently ignored.
  if (!Object.prototype.hasOwnProperty.call(requestBody, 'domain') || requestBody.domain.length == 0) {
    lambdaResponseObject.body.type = 'domain';
    lambdaResponseObject.body.message = 'request body required';
  } else {
    placeholderObject.newSubDomain = requestBody.domain.trim();
    placeholderObject.description = requestBody.description || '';
    placeholderObject.active_domain = requestBody.active || true;

    const currentConfig = await domainGet();
    console.log('domain.js:POST-CurrentConfig - ' + JSON.stringify(currentConfig));

    // Domains will return in an array.  If there are domains configured, UPDATE the configuration
    if (Array.isArray(currentConfig.body)) {
      lambdaResponseObject.statusCode = 503;
      lambdaResponseObject.body = '{"message": "Not Refactored Yet"}';
      console.log('Updating an existing config object not refactored');
      return lambdaResponseObject;
      // eslint-disable-next-line no-unreachable
      const newSubDomainExists = currentConfig.body.findIndex(element => element.subdomain == placeholderObject.newSubDomain);
      if (newSubDomainExists == -1) {
        lambdaResponseObject = await addDomainObject(placeholderObject);
      } else {
        lambdaResponseObject.statusCode = 409;
        lambdaResponseObject.body.code = 409;
        lambdaResponseObject.body.message = 'domain exists';
      }
    } else {
      // lambdaResponseObject.statusCode = 503;
      // lambdaResponseObject.body = '{"message": "Not Refactored Yet"}';
      // console.log('Adding new config object not refactored');
      // return lambdaResponseObject;
      lambdaResponseObject = await putTacomailConfigItem(placeholderObject);
    }
  }

  return lambdaResponseObject;
}

async function addDomainObject(placeholderObject) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  const queryResults = await addDomainConfigItem(placeholderObject);

  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    returnObject = await domainGet(placeholderObject, { 'sub_domain': placeholderObject.newSubDomain });
    returnObject.statusCode = 201;
  } else {
    returnObject.body.type = 'domain';
    returnObject.body.message = 'error updating domain in configuration';
  }

  return returnObject;
}

// Adds a domain to an already existing config
async function addDomainConfigItem(placeholderObject) {
  console.log('common.js:addDomainConfigItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

  const d = Math.floor(Date.now() / 1000);

  const domainInfo = new Map([
    ['subdomain', placeholderObject.newSubDomain],
    ['description', placeholderObject.description || ''],
    ['active', placeholderObject.active_domain || true],
    ['created_datetime', d],
    ['modified_datetime', d],
  ]);

  // These parameters do NOT check to see if the new subdomain
  // already exists.  That is done in domains.js
  const params = {
    'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
    'Key': {
      'alias_address': placeholderObject.alias_address,
      'sub_domain': placeholderObject.domain,
    },
    'UpdateExpression': 'SET #ri = list_append(#ri, :ri)',
    'ExpressionAttributeValues': {
      ':ri': [domainInfo],
    },
    'ExpressionAttributeNames': {
      '#ri': 'configValues',
    },
  };

  console.log('common.js:addDomainConfigItem -- ddbDocClient parameters: ' + JSON.stringify(params));
  const data = await sendDocClientCommand(new UpdateCommand(params));
  console.log('common.js:addDomainConfigItem -- Received data: ', JSON.stringify(data));

  // Return an empty array if we get anything other than 200
  if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

  return { 'affectedRows': 1, 'Item': params.Item };
}

async function putTacomailConfigItem(placeholderObject) {
  const responseObject = {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      'code': 500,
      'type': 'domain',
      'message': '',
    },
  };

  console.log('(domain/POST.putTacomailConfigItem) -- placeholderObject: ' + JSON.stringify(placeholderObject));

  const d = Math.floor(Date.now() / 1000);

  const domainInfo = new Map([
    ['subdomain', placeholderObject.newSubDomain],
    ['description', placeholderObject.description || ''],
    ['active', placeholderObject.active_domain || true],
    ['created_datetime', d],
    ['modified_datetime', d],
  ]);

  const params = {
    'Key': {
      'alias_address': placeholderObject.alias_address,
      'sub_domain': placeholderObject.domain,
    },
    'Item': {
      'sub_domain': placeholderObject.domain,
      'alias_address': placeholderObject.alias_address,
      'configValues': [domainInfo],
    },
    'ExpressionAttributeNames': {
      '#kn1': 'sub_domain',
      '#kn2': 'alias_address',
    },
    'ConditionExpression': 'attribute_not_exists(#kn1) AND attribute_not_exists(#kn2)',
  };

  console.log('(domain/POST.putTacomailConfigItem) -- putItem params: ' + JSON.stringify(params));

  const data = await putItem(params);
  if (Object.prototype.hasOwnProperty.call(data, 'affectedRows') && (data.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    const newDomainInfo = await domainGet({ 'sub_domain': placeholderObject.newSubDomain });

    // If the new domain was fetched, return statusCode 201 for 'Created'
    if (newDomainInfo.statusCode == 200) newDomainInfo.statusCode == 201;
  } else {
    responseObject.body.message = 'unable to add domain';
  }

  return responseObject;
}
