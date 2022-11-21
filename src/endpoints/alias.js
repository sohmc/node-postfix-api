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
            const whereClauses = [ 'uuid = :uuid' ];
            const placeholderObject = { 'uuid': uuid };

            lambdaResponseObject = await getAliasInformation(whereClauses, placeholderObject);
          }

        } else if ((pathParameters.length == 0) && (Object.keys(allowedParameters).findIndex((parameter) => Object.prototype.hasOwnProperty.call(queryParameters, parameter)) >= 0)) {
          const whereClauses = [];
          const placeholderObject = {};

          Object.keys(allowedParameters).forEach(parameter => {
            console.log('checking for parameter ' + parameter);
            if (Object.prototype.hasOwnProperty.call(queryParameters, parameter)) {
              if (parameter == 'q') {
                whereClauses.push('contains(' + allowedParameters[parameter] + ', :q)');
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
                whereClauses.push(allowedParameters[parameter] + ' = ?');
                placeholderObject[allowedParameters[parameter]] = queryParameters[parameter];
              }
            }
          });

          lambdaResponseObject = await getAliasInformation(whereClauses, placeholderObject);
        }

      } else if (method === 'POST') {
        const requiredProperties = ['alias', 'domain', 'destination'];

        if (requiredProperties.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property)) === -1) {
          // return error message with property that is missing
          lambdaResponseObject.body.message = 'missing required property: ' + requiredProperties[requiredProperties.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property))];
        } else {
          const aliasObject = [requestBody.alias, requestBody.domain, requestBody.destination];

          lambdaResponseObject = await insertAliasObject(aliasObject);
        }
      } else if (method === 'PATCH') {
        const allowedProperties = {
          'alias': 'alias_address',
          'domain': 'domain_id',
          'destination': 'destination_id',
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

async function getAliasInformation(whereClauses, placeholderObject) {
  console.log('getAliasInformation: ' + whereClauses + ':' + JSON.stringify(placeholderObject));

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

  if ((aliasInformation.length >= 1) && Object.prototype.hasOwnProperty.call(aliasInformation[0], 'alias_address')) {
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
    'domain': mysqlRowObject.domain,
    'fullEmailAddress': mysqlRowObject.full_address,
    'destination': mysqlRowObject.destination,
    'active': mysqlRowObject.active,
    'ignore': mysqlRowObject.ignore_alias,
    'uuid': mysqlRowObject.uuid,
    'count': mysqlRowObject.count,
    'created': mysqlRowObject.created,
    'modified': mysqlRowObject.modified,
  };
}

async function insertAliasObject(placeholderArray) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'alias',
      'message': 'Could not insert alias.',
    },
  };

  const query = 'CALL create_alias(?, ?, ?)';

  // INSERT row into database
  const queryResults = await commonFunctions.sendMysqlQuery(query, placeholderArray);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    const whereClauses = ['full_address=?', 'destination=?'];
    const getAliasPlaceholders = [placeholderArray[0] + '@' + placeholderArray[1], placeholderArray[2]];
    returnObject = await getAliasInformation(whereClauses, getAliasPlaceholders);
    returnObject.statusCode = 201;
  } else {
    returnObject.body.message = 'error running stored procedure create_alias.';
  }

  return returnObject;
}

async function incrementAliasCount(uuid) {
  const returnObject = {
    statusCode: 405,
  };

  const query = 'UPDATE `aliases` SET count = count + 1 WHERE uuid = ?';
  const queryResults = await commonFunctions.sendMysqlQuery(query, [uuid]);

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
  const setClauses = [];
  const placeholderArray = [];

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
      setClauses.push(allowedProperties[property] + '=?');

      let query = '';
      const primaryKeyWhereClause = [];

      switch (property) {
      case 'domain':
        // get domain id
        query = 'SELECT `domain_id` as PRIMARY_KEY FROM `domain` WHERE `domain` = ?';
        primaryKeyWhereClause.push(requestBody[property]);
        true;
        break;

      case 'destination':
        // get destination id
        query = 'SELECT `destination_id` as PRIMARY_KEY FROM `destination` WHERE `destination` = ?';
        primaryKeyWhereClause.push(requestBody[property]);
        true;
        break;

      default:
        true;
        break;
      }

      // If there is a query set, then find the primary key and add that to our placeholders
      if (query.length > 0) {
        console.log('Checking for primary key');
        const queryResults = await commonFunctions.sendMysqlQuery(query, primaryKeyWhereClause);

        if ((queryResults.length > 0) && Object.prototype.hasOwnProperty.call(queryResults[0], 'PRIMARY_KEY')) {
          placeholderArray.push(queryResults[0].PRIMARY_KEY);
        } else {
          console.log('primary key check failed: ' + JSON.stringify(queryResults));
          returnObject.body.message = 'Unable to determine primary key for ' + property + ': ' + requestBody[property];
        }
      } else {
        placeholderArray.push(requestBody[property]);
      }
    }
  }

  // uuid is always last
  placeholderArray.push(uuid);

  const query = 'UPDATE `aliases` SET ' + setClauses.join(', ') + ' WHERE `uuid`=?';
  const queryResults = await commonFunctions.sendMysqlQuery(query, placeholderArray);

  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    // domain is always last in the placeholderArray
    const whereClauses = ['uuid=?'];
    returnObject = await getAliasInformation(whereClauses, [uuid]);
  } else {
    returnObject.body.message = 'error updating Alias in table';
  }

  return returnObject;
}
