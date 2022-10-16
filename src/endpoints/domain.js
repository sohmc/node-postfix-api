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
      body: '{"message": "I am a teapot"}',
    };

    try {
      if (method === 'GET') {
        if (pathParameters.length > 0) {
          lambdaResponseObject = await getDomainInformation(pathParameters[0]);
        } else {
          lambdaResponseObject.statusCode = 400;
          lambdaResponseObject.body = { 'message': 'This function has not been implemented' };
        }
      }
    } catch (error) {
      console.error(error);
      lambdaResponseObject = {
        statusCode: 400,
        body: `{"error": "Cannot process event: ${error}}"`,
      };
    }

    return lambdaResponseObject;
  },
};

async function getDomainInformation(domainIn) {
  const returnObject = {
    statusCode: 200,
    body: '{"error": "Domain does not exist"}',
  };

  const domainInformation = await mysqlQuery('SELECT * FROM domain WHERE domain=?', [domainIn]);

  if ((domainInformation.length == 1) && Object.prototype.hasOwnProperty.call(domainInformation[0], 'domain')) {
    returnObject.body = JSON.stringify(domainInformation[0]);
  }

  return returnObject;
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