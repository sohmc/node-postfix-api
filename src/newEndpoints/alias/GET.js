import { getItem } from "../_utilities";

const allowedParameters = {
  'alias': 'full_address',
  'q': 'full_address',
  'destination': 'destination',
  'active': 'active_alias',
  'ignore': 'ignore_alias',
};


export async function execute(pathParameters = [], queryParameters = {}) {
  console.log(`(alias/GET) Received request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)}`);

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
        return 'Not Refactored Yet';
        // lambdaResponseObject = await updateAliasObject(uuid, updateAliasRequestBody, allowedParameters);
      } else if (pathParameters[1] === 'count') {
        return 'Not Refactored Yet';
        // lambdaResponseObject = await incrementAliasCount(uuid);
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
  if (Object.prototype.hasOwnProperty.call(placeholderObject, 'alias_address')) {
    aliasInformation = await getItem(placeholderObject);
  } else {
    return 'Not Refactored Yet';
    // aliasInformation = await commonFunctions.aliasQuery(placeholderObject);
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