const mysql = require('mysql2/promise');

exports.handler = async (lambdaEvent, lambdaContext) => {
  console.log('handler event: ' + JSON.stringify(lambdaEvent));
  console.log('handler context: ' + JSON.stringify(lambdaContext));

  // (optional) fetch method and querystring
  const method = lambdaEvent.requestContext.http.method;
  const queryParam = lambdaEvent.queryStringParameters;
  console.log(`Received ${method} request with ${JSON.stringify(queryParam)}`);

  const lambdaResponseObject = {
    statusCode: 418,
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{"message": "I am a teapot"}',
  };

  try {
    if (method === 'GET') {
      if (Object.prototype.hasOwnProperty.call(queryParam, 'domain')) {
        await getDomainInformation(queryParam.domain);
        lambdaResponseObject.statusCode = 200;
        lambdaResponseObject.body = { 'message': 'This function is working!' };
      } else if (Object.prototype.hasOwnProperty.call(queryParam, 'q')) {
        lambdaResponseObject.statusCode = 400;
        lambdaResponseObject.body = { 'message': 'This function has not been implemented' };
      } else {
        lambdaResponseObject.statusCode = 400;
        lambdaResponseObject.body = { 'message': 'This function has not been implemented' };
      }
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 400,
      body: `Cannot process event: ${error}`,
    };
  }

  return lambdaResponseObject;
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
  console.log('Rows: ' + JSON.stringify(queryResults));

  dbConnection.end();

  return queryResults;
}