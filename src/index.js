exports.handler = async (event) => {
  // (optional) fetch method and querystring
  const method = event.requestContext.http.method;
  const queryParam = event.queryStringParameters.myCustomParameter;
  console.log(`Received ${method} request with ${queryParam}`);
  
  // retrieve signature and payload
  const webhookSignature = event.headers;
  const webhookPayload = JSON.parse(event.body);

  console.log(`Received Headers: ` + JSON.stringify(webhookSignature));
  console.log(`Received Payload: ` + JSON.stringify(webhookPayload));
  
  try {
      // validateSignature(webhookSignature); // throws if invalid signature
      // handleEvent(webhookPayload); // throws if processing error
      true;
  } catch (error) {
      console.error(error);
      return {
          statusCode: 400,
          body: `Cannot process event: ${error}`,
      };
  }

  return {
      statusCode: 200, // default value
      body: JSON.stringify({
          received: true,
      }),
  };
};
