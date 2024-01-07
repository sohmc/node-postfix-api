import { updateItem, putItem } from '../_utilities.js';
import { execute as domainGet } from './GET.js';

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
    lambdaResponseObject.body.message = 'request body required with domain property required';
  } else {
    placeholderObject.newSubDomain = requestBody.domain.trim();
    placeholderObject.description = requestBody.description || '';
    placeholderObject.active = (Object.prototype.hasOwnProperty.call(requestBody, 'active') ? requestBody.active : true);

    const currentConfig = await domainGet();
    console.log('domain.js:POST-CurrentConfig - ' + JSON.stringify(currentConfig));

    // Domains will return in an array.  If there are domains configured, UPDATE the configuration
    if (Array.isArray(currentConfig.body)) {
      const newSubDomainExists = currentConfig.body.findIndex(element => element.subdomain == placeholderObject.newSubDomain);
      if (newSubDomainExists == -1) {
        lambdaResponseObject = await putTacomailConfigItem(placeholderObject, true);
      } else {
        lambdaResponseObject.statusCode = 409;
        lambdaResponseObject.body.code = 409;
        lambdaResponseObject.body.message = 'domain exists';
      }
    } else {
      lambdaResponseObject = await putTacomailConfigItem(placeholderObject, false);
    }
  }

  // If the new domain was fetched, return statusCode 201 for 'Created'
  if (lambdaResponseObject.statusCode == 200) lambdaResponseObject.statusCode = 201;
  return lambdaResponseObject;
}

async function putTacomailConfigItem(placeholderObject, configAlreadyExists = false) {
  let responseObject = {
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
    ['active', (Object.prototype.hasOwnProperty.call(placeholderObject, 'active') ? placeholderObject.active : true)],
    ['created_datetime', d],
    ['modified_datetime', d],
  ]);

  let params = {
    'Key': {
      'alias_address': placeholderObject.alias_address,
      'sub_domain': placeholderObject.domain,
    },
  };

  // if config already exists, add UpdateExpressions
  if (configAlreadyExists) {
    params = {
      ...params,
      'UpdateExpression': 'SET #ri = list_append(#ri, :ri)',
      'ExpressionAttributeValues': {
        ':ri': [domainInfo],
      },
      'ExpressionAttributeNames': {
        '#kn1': 'sub_domain',
        '#kn2': 'alias_address',
        '#ri': 'configValues',
      },
      'ConditionExpression': 'attribute_exists(#kn1) AND attribute_exists(#kn2) AND attribute_exists(#ri)',
    };
  } else {
    // If it doesn't, add an "Item" property to create the new config.
    params = {
      ...params,
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
  }

  console.log('(domain/POST.putTacomailConfigItem) -- params: ' + JSON.stringify(params));

  const data = (configAlreadyExists ? await updateItem(params) : await putItem(params));
  if (Object.prototype.hasOwnProperty.call(data, 'affectedRows') && (data.affectedRows == 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    responseObject = await domainGet([placeholderObject.newSubDomain]);
  } else {
    responseObject.body.message = 'unable to add domain';
  }

  return responseObject;
}
