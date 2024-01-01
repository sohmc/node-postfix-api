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
    const newSubDomainExists = currentConfig.body.findIndex(element => element.subdomain == placeholderObject.newSubDomain);

    // If there are domains configured, UPDATE an item
    if (currentConfig.body.length > 0) {
      if (newSubDomainExists == -1) {
        lambdaResponseObject = await addDomainObject(placeholderObject);
      } else {
        lambdaResponseObject.statusCode = 409;
        lambdaResponseObject.body.code = 409;
        lambdaResponseObject.body.message = 'domain exists';
      }
    } else {
      lambdaResponseObject.statusCode = 503;
      lambdaResponseObject.body = '{"message": "Not Refactored Yet"}';
      console.log('Adding new config object not refactored');
      return lambdaResponseObject;
      // lambdaResponseObject = await addDomainConfigObject(placeholderObject);
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