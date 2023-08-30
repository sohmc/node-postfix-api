const commonFunctions = require('./_common.js');

module.exports = {
  'metadata': {
    'endpoint': 'alias',
    'supportedMethods': ['GET', 'POST', 'PATCH'],
    'description': 'Works on alias objects, providing information about aliases as well as creating alias records.',
  },

  async execute(method, pathParameters = [], queryParameters = {}, requestBody = {}) {
    console.log(`Received ${method} request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)} requestBody ${JSON.stringify(requestBody)}`);

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

    try {
      if (method === 'GET') {
        // If there are path parameters, then do a query for the alias uuid provided
        const allowedParameters = {
          'alias': 'full_address',
          'q': 'full_address',
          'destination': 'destination',
          'active': 'active',
          'ignore': 'ignore_alias',
        };

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

            if (Object.keys(updateAliasRequestBody).length > 0) {
              lambdaResponseObject = await updateAliasObject(uuid, updateAliasRequestBody, allowedParameters);
            } else if (pathParameters[1] === 'count') {
              lambdaResponseObject = await incrementAliasCount(uuid);
            }
          } else {
            // If the length of pathParameters is essentially not 2, the endpoint is
            // not really supported but we'll run it as if the uuid was provided only.
            const placeholderObject = { 'uuid': uuid };

            lambdaResponseObject = await getAliasInformation(placeholderObject);
          }

        } else if ((pathParameters.length == 0) && (Object.keys(allowedParameters).findIndex((parameter) => Object.prototype.hasOwnProperty.call(queryParameters, parameter)) >= 0)) {
          const placeholderObject = {};

          Object.keys(allowedParameters).forEach(parameter => {
            console.log('checking for parameter ' + parameter);
            if (Object.prototype.hasOwnProperty.call(queryParameters, parameter)) {
              if (parameter == 'q') {
                placeholderObject[allowedParameters[parameter]] = queryParameters[parameter];
              } else if (parameter == 'alias') {
                const emailParts = queryParameters[parameter].split('@', 2);

                // If an '@' symbol was sent, then parse it into alias + domain
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

          lambdaResponseObject = await getAliasInformation(placeholderObject);
        }

      } else if (method === 'POST') {
        const requiredProperties = ['alias', 'domain', 'destination'];

        if (requiredProperties.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property)) === -1) {
          // return error message with property that is missing
          lambdaResponseObject.body.message = 'missing required property: ' + requiredProperties[requiredProperties.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property))];
        } else {
          const aliasObject = {
            'alias_address': requestBody.alias,
            'domain': requestBody.domain,
            'destination': requestBody.destination,
          };

          lambdaResponseObject = await insertAliasObject(aliasObject);
        }
      } else if (method === 'PATCH') {
        const allowedProperties = {
          'alias': 'alias_address',
          'domain': 'domain',
          'destination': 'destination',
          'active': 'active',
          'ignore': 'ignore_alias',
        };

        // If there is a path parameter and there is at least one accepted property in the request body, then continue
        if ((pathParameters.length > 0) && (Object.keys(allowedProperties).findIndex((property) => Object.prototype.hasOwnProperty.call(requestBody, property)) >= 0)) {

          lambdaResponseObject = await updateAliasObject(pathParameters[0], requestBody, allowedProperties);
        } else {
          lambdaResponseObject.statusCode = 405;
          lambdaResponseObject.body.code = 405;
          lambdaResponseObject.body.message = 'must provide a property to update';
        }
      }
    } catch (error) {
      console.error(error);
      lambdaResponseObject = {
        statusCode: 405,
        body: {
          'code': 405,
          'type': 'lambda',
          'message': `Could not process event: ${error}`,
        },
      };
    }

    // Stringify the object within the body
    if (Object.prototype.hasOwnProperty.call(lambdaResponseObject, 'body') && typeof lambdaResponseObject.body === 'object') {
      lambdaResponseObject.body = JSON.stringify(lambdaResponseObject.body);
    }

    return lambdaResponseObject;
  },
};

async function getAliasInformation(placeholderObject) {
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
    aliasInformation = await commonFunctions.getItem(placeholderObject);
  } else {
    aliasInformation = await commonFunctions.aliasQuery(placeholderObject);
  }

  if ((aliasInformation.length >= 1) && (typeof aliasInformation[0] !== 'undefined') && Object.prototype.hasOwnProperty.call(aliasInformation[0], 'alias_address')) {
    const returnArray = [];
    aliasInformation.forEach(aliasRow => {
      const returnAliasObject = createAliasObject(aliasRow);
      returnArray.push(returnAliasObject);
    });

    returnObject.statusCode = 200;
    returnObject.body = returnArray;
  }

  return returnObject;
}

// Creates the domain object that aligns with the API declared schema
function createAliasObject(mysqlRowObject) {
  return {
    'alias': mysqlRowObject.alias_address,
    'domain': mysqlRowObject.sub_domain,
    'fullEmailAddress': mysqlRowObject.full_address,
    'destination': mysqlRowObject.destination,
    'active': mysqlRowObject.active_alias,
    'ignore': mysqlRowObject.ignore_alias,
    'uuid': mysqlRowObject.identifier,
    'count': mysqlRowObject.use_count,
    'created': mysqlRowObject.created_date,
    'modified': mysqlRowObject.modified_date,
  };
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

  // PUT row into database
  const queryResults = await commonFunctions.putAliasItem(placeholderObject);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    const getAliasPlaceholdersObject = {
      'alias_address': placeholderObject.alias_address,
      'domain': placeholderObject.domain,
    };
    returnObject = await getAliasInformation(getAliasPlaceholdersObject);
    returnObject.statusCode = 201;
  } else {
    returnObject.body.message = 'Alias could not be added.';
  }

  return returnObject;
}

async function incrementAliasCount(uuid) {
  const returnObject = {
    statusCode: 405,
  };

  // Get current alias item by UUID
  const currentAliasItem = await getAliasInformation({ 'uuid': uuid });
  // if the uuid doesn't retrieve an alias, return an error
  if (currentAliasItem.body.length != 1) return returnObject;

  const currentAliasInfo = currentAliasItem.body[0];
  console.log('results: ' + JSON.stringify(currentAliasItem));
  const placeholderObject = {
    'alias_address': currentAliasInfo.alias,
    'domain': currentAliasInfo.domain,
    'use_count': 1,
  };

  const queryResults = await commonFunctions.updateAliasItem(placeholderObject);

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

async function updateAliasObject(uuid, requestBody, allowedProperties) {
  const placeholderObject = {};

  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'alias',
      'message': 'Alias does not exist.',
    },
  };

  for (const property in allowedProperties) {
    console.log('checking for property ' + property);
    if (Object.prototype.hasOwnProperty.call(requestBody, property)) {
      placeholderObject[allowedProperties[property]] = requestBody[property];
    }
  }

  // Get current alias item by UUID
  const currentAliasItem = await getAliasInformation({ 'uuid': uuid });
  // if the uuid doesn't retrieve an alias, return an error
  if (currentAliasItem.body.length != 1) return returnObject;

  const currentAliasInfo = currentAliasItem.body[0];

  // If trying to change alias_address or domain, then the entire record needs to be recreated.
  if (Object.prototype.hasOwnProperty.call(placeholderObject, 'alias_address') || Object.prototype.hasOwnProperty.call(placeholderObject, 'domain')) {
    for (const aliasProperty in currentAliasInfo) {
      // if the property isn't set in the placeholderObject, set it with the current value.
      if (!Object.prototype.hasOwnProperty.call(placeholderObject, aliasProperty)) placeholderObject[aliasProperty] = currentAliasInfo[aliasProperty];
    }

    console.log('Current placeholderObject: ' + JSON.stringify(placeholderObject));

    // Delete Alias First
    const deleteItemResults = await commonFunctions.deleteAliasItem(currentAliasInfo);
    console.log('deleteItem returned: ' + JSON.stringify(deleteItemResults));
    if (Object.prototype.hasOwnProperty.call(deleteItemResults, '$fault')) {
      returnObject.body.message = 'Alias needed to be deleted, but the operation failed.';
      return returnObject;
    }

    // Now create the Item
    returnObject = await insertAliasObject(placeholderObject);
  } else {
    console.log('updating alias per normal UpdateItem command');
    placeholderObject.alias_address = currentAliasInfo.alias;
    placeholderObject.domain = currentAliasInfo.domain;
    const updateItemResults = await commonFunctions.updateAliasItem(placeholderObject);

    if (Object.prototype.hasOwnProperty.call(updateItemResults, 'affectedRows') && (updateItemResults.affectedRows === 1)) {
      // if everything was successful, get the domain information from the database and return it as a response.
      const getAliasPlaceholdersObject = {
        'alias_address': placeholderObject.alias_address,
        'domain': placeholderObject.domain,
      };
      returnObject = await getAliasInformation(getAliasPlaceholdersObject);
      returnObject.statusCode = 201;
    } else {
      returnObject.body.message = 'Could not update alias.';
    }
  }


  return returnObject;
}
