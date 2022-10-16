const mysql = require('mysql');

exports.handler = async (event) => {
  // (optional) fetch method and querystring
  const method = event.requestContext.http.method;
  const queryParam = event.queryStringParameters;
  console.log(`Received ${method} request with ${queryParam}`);

  // retrieve signature and payload
  const webhookHeaders = event.headers;
  const webhookBody = JSON.parse(event.body);

  console.log('Received Headers: ' + JSON.stringify(webhookHeaders));
  console.log('Received Body: ' + JSON.stringify(webhookBody));

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
        getDomainInformation(queryParam.domain);
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

    // validateSignature(webhookSignature); // throws if invalid signature
    // handleEvent(webhookPayload); // throws if processing error
  } catch (error) {
    console.error(error);
    return {
      statusCode: 400,
      body: `Cannot process event: ${error}`,
    };
  }

  return lambdaResponseObject;
};

function getDomainInformation(domainIn) {
  mysqlQuery(`SELECT * FROM domains WHERE domain='${domainIn}'`);
  return true;
}

function mysqlQuery(query, queryValues) {
  let queryResults = [];

  const dbConnection = mysql.createConnection({
    host: process.env.POSTFIX_HOST,
    user: process.env.POSTFIX_USER,
    password: process.env.POSTFIX_PASSWORD,
  });

  dbConnection.query(query, queryValues, function(error, results) {
    if (error) {
      console.log(error);
      queryResults = ['error', error];
    } else if (results.length > 0) {
      console.log('Results length: ' + results.length);
      queryResults = results;
    } else {
      queryResults = ['error', 'No results found'];
    }

    console.log(results);
  });

  dbConnection.end();

  return queryResults;
}