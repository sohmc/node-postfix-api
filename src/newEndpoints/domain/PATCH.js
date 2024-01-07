import { updateItem } from '../_utilities.js';
import { execute as domainGet } from './GET.js';

const allowedProperties = ['description', 'active'];

export async function execute(pathParameters = [], queryParameters = {}, requestBody = {}) {
  console.log(`(domain/PATCH) Received request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)} requestBody ${JSON.stringify(requestBody)}`);

  let lambdaResponseObject = {
    statusCode: 418,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      'code': 418,
      'type': 'alias',
      'message': '',
    },
  };

  const placeholderObject = {
    'domain': 'tacomail-config',
    'alias_address': 'sub_domains',
  };

  if (pathParameters.length > 0) {
    placeholderObject.subdomain = pathParameters[0].trim();
    const currentConfig = await domainGet();
    console.log('domain.js:POST-CurrentConfig - ' + JSON.stringify(currentConfig));
    const subDomainPosition = currentConfig.body.findIndex(element => element.subdomain == placeholderObject.subdomain);

    if (subDomainPosition == -1) {
      lambdaResponseObject.statusCode = 405;
      lambdaResponseObject.body.code = 405;
      lambdaResponseObject.body.message = 'subdomain does not exist';
      return lambdaResponseObject;
    }

    // if the second path parameter is 'delete` then mark the domain for deletion, ignoring everything else
    const deleteDomain = ((pathParameters.length > 1) && (pathParameters[1].toLowerCase() == 'delete') ? true : false);

    // If we're not deleting and there is at least one accepted property in the request body, then continue
    if ((!deleteDomain) && (allowedProperties.findIndex((property) => Object.prototype.hasOwnProperty.call(requestBody, property)) >= 0)) {
      for (const key in requestBody) {
        if (Object.hasOwnProperty.call(requestBody, key)) {
          const value = requestBody[key];
          if (allowedProperties.indexOf(key) >= 0) placeholderObject[key] = value;
        }
      }
    }

    lambdaResponseObject = await updateDomainConfigObject(placeholderObject, subDomainPosition, deleteDomain);
  } else {
    lambdaResponseObject.statusCode = 405;
    lambdaResponseObject.body.code = 405;
    lambdaResponseObject.body.message = 'must provide a property to update';
  }

  return lambdaResponseObject;
}

async function updateDomainConfigObject(placeholderObject, subDomainPosition, deleteDomain = false) {
  let returnObject = {
    statusCode: 405,
  };

  // Update the config ITEM
  const queryResults = await updateDomainConfigItem(placeholderObject, subDomainPosition, deleteDomain);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    if (deleteDomain) {
      returnObject.statusCode = 204;
    } else {
      // if everything was successful, get the domain information from the database and return it as a response.
      returnObject = await domainGet([placeholderObject.subdomain]);
    }
  } else {
    returnObject.body = {
      'code': 405,
      'type': 'domain',
      'message': 'error updating domain in configuration',
    };
  }

  return returnObject;
}

async function updateDomainConfigItem(placeholderObject, subDomainPosition, deleteDomain) {
  console.log('common.js:updateDomainConfigItem -- placeholderObject: ' + JSON.stringify(placeholderObject));
  const d = Math.floor(Date.now() / 1000);

  const params = {
    'Key': {
      'alias_address': placeholderObject.alias_address,
      'sub_domain': placeholderObject.domain,
    },
    // You can't use an array (e.g. configValues[1]) here.  It must be explicitly defined
    'ExpressionAttributeNames': {
      '#kn1': 'configValues',
    },
    'ExpressionAttributeValues': {
      ':yf1': placeholderObject.subdomain,
    },
    'ConditionExpression': `#kn1[${subDomainPosition}].subdomain = :yf1`,
  };

  if (deleteDomain) {
    params.UpdateExpression = `REMOVE #kn1[${subDomainPosition}]`;
  } else {
    // Add modified datetime
    params.ExpressionAttributeValues[':yf2'] = d;
    const setArray = [`#kn1[${subDomainPosition}].modified_datetime = :yf2`];

    for (let index = 0; index < Object.keys(placeholderObject).length; index++) {
      const property = Object.keys(placeholderObject)[index];
      const placeholderName = 'domainPATCH' + index;

      if ((property == 'domain') || (property == 'alias_address')) continue;

      console.log('common.js:updateDomainConfigItem -- adding property ' + property + '=' + placeholderObject[property]);
      setArray.push(`#kn1[${subDomainPosition}].#${placeholderName} = :${placeholderName}`);
      params.ExpressionAttributeNames[`#${placeholderName}`] = property;
      params.ExpressionAttributeValues[`:${placeholderName}`] = placeholderObject[property];
    }

    // Create UpdateExpression
    params.UpdateExpression = 'SET ' + setArray.join(', ');
  }

  const data = await updateItem(params);

  if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

  return { 'affectedRows': 1, 'Item': placeholderObject };
}
