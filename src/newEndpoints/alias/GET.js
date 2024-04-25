import { updateAliasObject } from './PATCH.js';
import { getItem, updateItem } from '../_utilities.js';

const allowedParameters = {
  'alias': 'full_address',
  'q': 'full_address',
  'destination': 'destination',
  'active': 'active_alias',
  'ignore': 'ignore_alias',
};


export async function execute(pathParameters = [], queryParameters = {}) {
  console.log(`(alias/GET) Received request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)}`);

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

  // If there are path parameters, then do a query for the alias uuid provided
  if (pathParameters.length > 0) {
    const uuid = pathParameters[0];

    // Check to see if there is a second path parameter (e.g. activate, deactivate, count)
    if (pathParameters.length == 2) {
      const updateAliasRequestBody = {};

      switch (pathParameters[1]) {
      case 'activate':
        updateAliasRequestBody.active = true;
        updateAliasRequestBody.ignore = false;
        break;

      case 'deactivate':
        updateAliasRequestBody.active = false;
        break;

      case 'ignore':
        updateAliasRequestBody.ignore = true;
        break;

      default:
        break;
      }

      // If a second path parameter is set, take that action first by updating the alias and then return the updated details
      if (Object.keys(updateAliasRequestBody).length > 0) {
        lambdaResponseObject = await updateAliasObject(uuid, updateAliasRequestBody);
      } else if (pathParameters[1] === 'count') {
        lambdaResponseObject = await incrementAliasCount(uuid);
      }
    } else {
      // If the length of pathParameters is essentially not 2, the endpoint is
      // not really supported but we'll run it as if the uuid was provided only.
      const placeholderObject = { 'uuid': uuid };

      lambdaResponseObject = await getAliasDetails(placeholderObject);
    }
  } else if ((pathParameters.length == 0) && (Object.keys(allowedParameters).findIndex((parameter) => Object.prototype.hasOwnProperty.call(queryParameters, parameter)) >= 0)) {
    // No path parameters means that we're doing some sort of search
    // using QUERY parameters.
    const placeholderObject = {};

    // Check for permitted parameters
    Object.keys(allowedParameters).forEach(parameter => {
      console.log('checking for parameter ' + parameter);
      if (Object.prototype.hasOwnProperty.call(queryParameters, parameter)) {
        if (parameter == 'q') {
          placeholderObject[allowedParameters[parameter]] = queryParameters[parameter];
        } else if (parameter == 'alias') {
          const emailParts = queryParameters[parameter].split('@', 2);

          // If an '@' symbol was sent, then parse it into alias & domain
          if (emailParts.length == 2) {
            placeholderObject.alias_address = emailParts[0];
            placeholderObject.domain = emailParts[1];
          } else {
            // If the parameter couldn't be split into two, assume it's
            // a domain so that the call to DynamoDB doesn't fail.
            placeholderObject.domain = emailParts[0];
          }
        } else {
          placeholderObject[allowedParameters[parameter]] = queryParameters[parameter];
        }
      }
    });

    lambdaResponseObject = await getAliasDetails(placeholderObject);
  }

  return lambdaResponseObject;
}

async function getAliasDetails(placeholderObject) {
  console.log('getAliasInformation: ' + JSON.stringify(placeholderObject));

  const returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'alias',
      'message': 'alias does not exist.',
    },
  };

  let aliasInformation = {};
  // alias_address requires an exact key match
  if (Object.prototype.hasOwnProperty.call(placeholderObject, 'alias_address')) {
    const params = {
      'Key': {
        'alias_address': placeholderObject.alias_address,
        'sub_domain': placeholderObject.domain,
      },
    };
    aliasInformation = await getItem(params);
  } else {
    aliasInformation = await aliasQuery(placeholderObject);
  }

  if ((aliasInformation.length >= 1) && (typeof aliasInformation[0] !== 'undefined') && Object.prototype.hasOwnProperty.call(aliasInformation[0], 'alias_address')) {
    const returnArray = [];
    aliasInformation.forEach(aliasRow => {
      const returnAliasObject = marshallAliasObject(aliasRow);
      returnArray.push(returnAliasObject);
    });

    returnObject.statusCode = 200;
    returnObject.body = returnArray;
  }

  return returnObject;
}

async function aliasQuery(placeholderObject) {
  console.log('common.js:aliasQuery -- placeholderObject: ' + JSON.stringify(placeholderObject));

  const allowedFilters = {
    'uuid': 'identifier',
    'full_address': 'full_address',
    'destination': 'destination',
    'active': 'active_alias',
    'ignore': 'ignore_alias',
  };

  const params = {
    'KeyConditionExpression': '',
    'ExpressionAttributeNames': {},
    'ExpressionAttributeValues': {},
  };

  const FilterExpressionArray = [];
  for (let index = 0; index < Object.keys(allowedFilters).length; index++) {
    const parameter = Object.keys(allowedFilters)[index];
    const placeholderName = 'aliasGETsv' + index;

    console.log('common.js:aliasQuery -- checking placeholder for filter ' + parameter);
    if (Object.prototype.hasOwnProperty.call(placeholderObject, parameter)) {
      params.ExpressionAttributeNames[`#${placeholderName}`] = allowedFilters[parameter];
      params.ExpressionAttributeValues[`:${placeholderName}`] = placeholderObject[parameter];

      switch (parameter) {
      case 'uuid':
        params.IndexName = 'identifier-index';
        params.KeyConditionExpression = `#${placeholderName} = :${placeholderName}`;
        break;

      case 'full_address':
        params.IndexName = 'application-identifier-index';

        // Set key value for the index
        params.KeyConditionExpression = '#zz0 = :zz0';
        params.ExpressionAttributeNames['#zz0'] = 'application';
        params.ExpressionAttributeValues[':zz0'] = 'tacomail';

        // Do a contains operation on full_address
        FilterExpressionArray.push(`contains(#${placeholderName}, :${placeholderName})`);
        break;

      default:
        FilterExpressionArray.push(`#${placeholderName} = :${placeholderName}`);
        break;
      }
    }
  }

  // If there are any filter expressions, join them here
  if (FilterExpressionArray.length > 0) params.FilterExpression = FilterExpressionArray.join(' AND ');

  const data = await getItem(params);

  return data;
}

async function incrementAliasCount(uuid) {
  const returnObject = {
    statusCode: 405,
  };

  // Get current alias item by UUID
  const currentAliasItem = await getAliasDetails({ 'uuid': uuid });
  // if the uuid doesn't retrieve an alias, return an error
  if (currentAliasItem.body.length != 1) return returnObject;

  const currentAliasInfo = currentAliasItem.body[0];
  console.log('results: ' + JSON.stringify(currentAliasItem));
  const placeholderObject = {
    'alias_address': currentAliasInfo.alias,
    'domain': currentAliasInfo.domain,
    'use_count': 1,
  };

  const queryResults = await updateItem(placeholderObject);

  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    returnObject.statusCode = 204;
  } else {
    returnObject.body = {
      'code': 405,
      'type': 'alias',
      'message': 'Could not increment alias',
    };
  }

  return returnObject;
}

// Creates the alias object that aligns with the API declared schema
function marshallAliasObject(aliasObject) {
  return {
    'alias': aliasObject.alias_address,
    'domain': aliasObject.sub_domain,
    'fullEmailAddress': aliasObject.full_address,
    'destination': aliasObject.destination,
    'active': aliasObject.active_alias,
    'ignore': aliasObject.ignore_alias,
    'uuid': aliasObject.identifier,
    'count': aliasObject.use_count,
    'created': aliasObject.created_datetime,
    'modified': aliasObject.modified_datetime,
  };
}
