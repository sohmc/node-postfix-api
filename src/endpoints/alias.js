module.exports = {
  'metadata': {
    'endpoint': 'alias',
    'supportedMethods': ['GET'],
    'description': 'Works on alias objects, providing information about aliases as well as creating alias records.',
  },

  async execute(method, pathParameters, queryParameters, requestBody) {
    console.log(`Received ${method} request with pathParameters ${JSON.stringify(pathParameters)} and queryParameters ${JSON.stringify(queryParameters)}`);

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
          const whereClause = 'uuid=?';
          lambdaResponseObject = await getAliasInformation(whereClause, [pathParameters[0]]);
        } else if ((pathParameters.length == 0) && (Object.keys(allowedParameters).findIndex((parameter) => Object.prototype.hasOwnProperty.call(queryParameters, parameter)) >= 0)) {
          const whereClauses = [];
          const placeholderArray = [];

          Object.keys(allowedParameters).forEach(parameter => {
            console.log('checking for parameter ' + parameter);
            if (Object.prototype.hasOwnProperty.call(queryParameters, parameter)) {
              if (parameter == 'q') {
                // 'q' gets a LIKE vs. =
                whereClauses.push(allowedParameters[parameter] + ' LIKE ?');
                placeholderArray.push('%' + queryParameters[parameter] + '%');
              } else {
                whereClauses.push(allowedParameters[parameter] + ' = ?');
                placeholderArray.push(queryParameters[parameter]);
              }
            }
          });

          lambdaResponseObject = await getAliasInformation(whereClauses, placeholderArray);
        }

      } else if (method === 'POST') {
        console.log('requestBody: ' + JSON.stringify(requestBody));
        if (!Object.prototype.hasOwnProperty.call(requestBody, 'domain') || requestBody.domain.length == 0) {
          lambdaResponseObject.body.type = 'domain';
          lambdaResponseObject.body.message = 'domain property required';
        } else {
          const placeholderArray = [ requestBody.domain, requestBody.description || '', requestBody.active || true ];
          lambdaResponseObject = await insertDomainObject(placeholderArray);
        }
      } else if (method === 'PATCH') {
        console.log('requestBody: ' + JSON.stringify(requestBody));

        const allowedProperties = ['description', 'active'];

        // If there is a path parameter and there is at least one accepted property in the request body, then continue
        if ((pathParameters.length > 0) && (allowedProperties.findIndex((property) => Object.prototype.hasOwnProperty.call(requestBody, property)) >= 0)) {

          lambdaResponseObject = await updateDomainObject(pathParameters[0], requestBody, allowedProperties);
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

async function getAliasInformation(whereClauses, placeholderArray) {
  console.log('getAliasInformation: ' + whereClauses + ':' + placeholderArray);
  const whereClause = whereClauses.join(' AND ');

  const returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'alias',
      'message': 'alias does not exist.',
    },
  };

  const query = 'SELECT * FROM mail_aliases WHERE ' + whereClause;
  const aliasInformation = await mysqlQuery(query, placeholderArray);

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

async function insertDomainObject(placeholderArray) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  const query = 'INSERT INTO domain SET domain=?, description=?, active=?, transport="virtual",  created=NOW(), modified=NOW()';

  // INSERT row into database
  const queryResults = await mysqlQuery(query, placeholderArray);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    const whereClause = 'domain=?';
    returnObject = await getAliasInformation(whereClause, [placeholderArray[0]]);
    returnObject.statusCode = 201;
  } else {
    returnObject.body.type = 'domain';
    returnObject.body.message = 'error inserting domain into table';
  }

  return returnObject;
}

async function updateDomainObject(domain, requestBody, allowedProperties) {
  const setClauses = [];
  const placeholderArray = [];
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  allowedProperties.forEach(column => {
    console.log('checking for column ' + column);
    if (Object.prototype.hasOwnProperty.call(requestBody, column)) {
      setClauses.push(column + '=?');
      placeholderArray.push(requestBody[column]);
    }
  });

  // domain is always last
  placeholderArray.push(domain);

  const query = 'UPDATE domain SET ' + setClauses.join(', ') + ' WHERE domain=?';
  console.log('query: ' + query);
  const queryResults = await mysqlQuery(query, placeholderArray);

  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    // domain is always last in the placeholderArray
    const whereClause = 'domain=?';
    returnObject = await getAliasInformation(whereClause, [placeholderArray.pop()]);
  } else {
    returnObject.body.type = 'domain';
    returnObject.body.message = 'error updating domain in table';
  }

  return returnObject;
}

async function mysqlQuery(query, queryValues) {
  const commonFunctions = require('./_common.js');

  const queryResults = await commonFunctions.sendMysqlQuery(query, queryValues);

  return queryResults;
}