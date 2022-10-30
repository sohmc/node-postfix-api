const commonFunctions = require('./_common.js');

module.exports = {
  'metadata': {
    'endpoint': 'domain',
    'supportedMethods': ['GET'],
    'description': 'Works on domain objects, providing information about domains as well as creating domain records.',
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
        // if there are path parameters, then do a query for the destinationId provided
        if (pathParameters.length > 0) {
          const whereClause = 'destination_id=?';
          lambdaResponseObject = await getDestinationInformation(whereClause, [pathParameters[0]]);
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


// Creates the Destination object that aligns with the API declared schema
function createDestinationObject(mysqlRowObject) {
  return {
    'destinationId': mysqlRowObject.destination_id,
    'destination': mysqlRowObject.destination,
    'active': mysqlRowObject.active,
  };
}