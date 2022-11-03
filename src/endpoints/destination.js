const commonFunctions = require('./_common.js');

module.exports = {
  'metadata': {
    'endpoint': 'destination',
    'supportedMethods': ['GET', 'POST', 'PATCH'],
    'description': 'Works on destination objects, providing information about destinations as well as creating destination records.',
  },

  async execute(method, pathParameters, queryParameters, requestBody) {
    console.log(`Received ${method} request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)} requestBody ${requestBody}`);

    let lambdaResponseObject = {
      statusCode: 418,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        'code': 418,
        'type': 'destination',
        'message': '',
      },
    };

    try {
      if (method === 'GET') {
        const allowedParameters = ['q', 'active'];

        // if there are path parameters, then do a query for the destinationId provided
        if (pathParameters.length > 0) {
          const whereClause = 'destination_id=?';
          lambdaResponseObject = await getDestinationInformation(whereClause, [pathParameters[0]]);
        } else if (allowedParameters.findIndex(parameter => Object.prototype.hasOwnProperty.call(queryParameters, parameter)) >= 0) {
          const whereClauseArray = [];
          const placeholderArray = [];

          allowedParameters.forEach(property => {
            if (Object.prototype.hasOwnProperty.call(queryParameters, property)) {
              if (property == 'q') {
                whereClauseArray.push('destination LIKE ?');
                placeholderArray.push('%' + queryParameters[property] + '%');
              } else {
                whereClauseArray.push(property + '=?');
                placeholderArray.push(queryParameters[property]);
              }
            }
          });
          lambdaResponseObject = await getDestinationInformation(whereClauseArray.join(' AND '), placeholderArray);
        } else {
          console.log('everything failed');
        }
      } else if (method === 'POST') {
        if (!Object.prototype.hasOwnProperty.call(requestBody, 'destination') || requestBody.destination.length == 0) {
          lambdaResponseObject.body.message = 'destination property required';
        } else {
          const placeholderArray = [ requestBody.destination ];
          lambdaResponseObject = await insertDestinationObject(placeholderArray);
        }
      } else if (method === 'PATCH') {
        const allowedProperties = ['destination', 'active'];

        // If there is a path parameter and there is at least one accepted property in the request body, then continue
        if ((pathParameters.length > 0) && (allowedProperties.findIndex((property) => Object.prototype.hasOwnProperty.call(requestBody, property)) >= 0)) {

          lambdaResponseObject = await updateDestinationObject(pathParameters[0], requestBody, allowedProperties);
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

async function getDestinationInformation(whereClause, placeholderArray) {
  console.log('getDestinationInformation: ' + whereClause + ':' + placeholderArray);
  const returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'destination',
      'message': 'Destination does not exist.',
    },
  };

  const query = 'SELECT * FROM destination WHERE ' + whereClause;
  const destinationInformation = await commonFunctions.sendMysqlQuery(query, placeholderArray);

  if ((destinationInformation.length >= 1) && Object.prototype.hasOwnProperty.call(destinationInformation[0], 'destination')) {
    const returnArray = [];
    destinationInformation.forEach(tableRow => {
      const apiObject = createDestinationObject(tableRow);
      returnArray.push(apiObject);
    });

    returnObject.statusCode = 200;
    returnObject.body = returnArray;
  }

  return returnObject;
}

async function insertDestinationObject(placeholderArray) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'destination',
      'message': 'destination does not exist.',
    },
  };

  const query = 'INSERT INTO destination SET destination=?, active=true';

  // INSERT row into database
  const queryResults = await commonFunctions.sendMysqlQuery(query, placeholderArray);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the destination information from the database and return it as a response.
    const whereClause = 'destination=?';
    returnObject = await getDestinationInformation(whereClause, [placeholderArray[0]]);
    returnObject.statusCode = 201;
  } else {
    returnObject.body.message = 'error inserting destination into table';
  }

  return returnObject;
}


// Creates the Destination object that aligns with the API declared schema
function createDestinationObject(mysqlRowObject) {
  return {
    'destinationId': mysqlRowObject.destination_id,
    'destination': mysqlRowObject.destination,
    'active': mysqlRowObject.active,
  };
}


async function updateDestinationObject(destination, requestBody, allowedProperties) {
  const setClauses = [];
  const placeholderArray = [];
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'destination',
      'message': 'destination does not exist.',
    },
  };

  allowedProperties.forEach(column => {
    console.log('checking for column ' + column);
    if (Object.prototype.hasOwnProperty.call(requestBody, column)) {
      setClauses.push(column + '=?');
      placeholderArray.push(requestBody[column]);
    }
  });

  // destination is always last
  placeholderArray.push(destination);

  const query = 'UPDATE destination SET ' + setClauses.join(', ') + ' WHERE destination_id=?';
  const queryResults = await commonFunctions.sendMysqlQuery(query, placeholderArray);

  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the destination information from the database and return it as a response.
    // destination is always last in the placeholderArray
    const whereClause = 'destination_id=?';
    returnObject = await getDestinationInformation(whereClause, [placeholderArray.pop()]);
  } else {
    returnObject.body.message = 'error updating destination in table';
  }

  return returnObject;
}