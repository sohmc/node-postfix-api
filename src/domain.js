var mysql = require('mysql');

exports.handler = async (event) => {
  // (optional) fetch method and querystring
  const method = event.requestContext.http.method;
  const queryParam = event.queryStringParameters;
  console.log(`Received ${method} request with ${queryParam}`);
  
  // retrieve signature and payload
  const webhookSignature = event.headers;
  const webhookPayload = JSON.parse(event.body);

  console.log(`Received Headers: ` + JSON.stringify(webhookSignature));
  console.log(`Received Payload: ` + JSON.stringify(webhookPayload));
  
  let statusCode = 900;
  let returnBody = {"message": "Processing Input"};

  try {
    if (method === 'GET') {
      if (Object.prototype.hasOwnProperty.call(queryParam, 'domain')) {
        getDomainInformation(queryParam.domain);
        statusCode = 200;
        returnBody = {"message": "This function is working!"};
      } else if (Object.prototype.hasOwnProperty.call(queryParam, 'q')) {
        statusCode = 400;
        returnBody = {"message": "This function has not been implemented"};
      } else {
        statusCode = 400;
        returnBody = {"message": "This function has not been implemented"};
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

  return {
    statusCode: statusCode, // default value
    body: JSON.stringify(returnBody),
  };
};

function getDomainInformation(domainIn) {
  return true;
}