const mysql = require('mysql2/promise');

module.exports = {
  'metadata': {
    'endpoint': 'domain',
    'supportedMethods': ['GET'],
    'description': 'Works on domain objects, providing information about domains as well as creating domain records.',
  },

  async execute(method, pathParameters, queryParameters, _body) {
    console.log(`Received ${method} request with pathParameters ${JSON.stringify(pathParameters)} and queryParameters ${JSON.stringify(queryParameters)}`);

    let lambdaResponseObject = {
      statusCode: 418,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        'code': 418,
        'type': '',
        'message': '',
      },
    };

    try {
      if (method === 'GET') {
        if (pathParameters.length > 0) {
          lambdaResponseObject = await getDomainInformation(pathParameters[0]);
        } else {
          lambdaResponseObject.statusCode = 405;
          lambdaResponseObject.body = { 'message': 'This function has not been implemented' };
        }
      }
    } catch (error) {
      console.error(error);
      lambdaResponseObject = {
        statusCode: 405,
        body: {
          'code': 418,
          'type': 'lambda',
          'message': `Could not process event: ${error}`,
        },
      };
    }

    // Stringify the object within the body
    lambdaResponseObject.body = JSON.stringify(lambdaResponseObject.body);
    return lambdaResponseObject;
  },
};

async function getDomainInformation(domainIn) {
  const returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  const domainInformation = await mysqlQuery('SELECT * FROM domain WHERE domain=?', [domainIn]);

  if ((domainInformation.length == 1) && Object.prototype.hasOwnProperty.call(domainInformation[0], 'domain')) {
    const returnDomainObject = createDomainObject(domainInformation[0]);
    returnObject.statusCode = 200;
    returnObject.body = [returnDomainObject];
  }

  return returnObject;
}

// Creates the domain object that aligns with the API declared schema
function createDomainObject(mysqlRowObject) {
  return {
    'domain': mysqlRowObject.domain,
    'description': mysqlRowObject.description,
    'active': mysqlRowObject.active,
    'created': mysqlRowObject.created,
    'modified': mysqlRowObject.modified,
  };
}


async function mysqlQuery(query, queryValues) {
  const dbConnection = await mysql.createConnection({
    host: process.env.POSTFIX_HOST,
    user: process.env.POSTFIX_USER,
    password: process.env.POSTFIX_PASSWORD,
    database: process.env.POSTFIX_DB,
  });

  const [queryResults, _fields] = await dbConnection.execute(query, queryValues);
  console.log('mysql Query Results: ' + JSON.stringify(queryResults));

  dbConnection.end();

  return queryResults;
}