const fs = require('node:fs');
const path = require('node:path');

exports.handler = async (lambdaEvent, lambdaContext) => {
  console.log('handler event: ' + JSON.stringify(lambdaEvent));
  console.log('handler context: ' + JSON.stringify(lambdaContext));

  let lambdaResponseObject = {
    statusCode: 418,
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{"message": "I am a teapot"}',
  };

  if (Object.prototype.hasOwnProperty.call(lambdaEvent, 'requestContext')) {
    const requestContext = lambdaEvent.requestContext;

    // Get rid of the empty first element that exists after the split.
    const pathParameters = requestContext.http.path.split('/').slice(1);
    const method = requestContext.http.method;
    const endpoint = pathParameters.shift();

    console.log(`Requested Endpoint: ${method} ${endpoint}`);
    const endpointFunction = loadEndpoint(endpoint);

    const queryStringParameters = lambdaEvent.queryStringParameters || {};
    const requestBody = JSON.parse(lambdaEvent.body || '{}');

    if (Object.prototype.hasOwnProperty.call(endpointFunction, 'metadata') &&
      (endpointFunction.metadata.supportedMethods.indexOf(requestContext.http.method) >= 0)) {
      lambdaResponseObject = await endpointFunction.execute(requestContext.http.method, pathParameters, queryStringParameters, requestBody, lambdaEvent, lambdaContext);
    }
  }


  return lambdaResponseObject;
};

function loadEndpoint(method, targetEndpoint) {
  const endpointModulesPath = path.join(__dirname + '/newEndpoints/' + targetEndpoint);
  const commandFilename = method + '.js';
  const endpointFiles = fs.readdirSync(endpointModulesPath).filter(file => file.toLowerCase() === commandFilename.toLowerCase() && file != 'index.js');

  if (endpointFiles.length == 0) return {};

  const filePath = path.join(endpointModulesPath, endpointFiles[0]);
  console.log('Loading: ' + filePath);
  const endpointModule = require(filePath);

  console.log('Loaded: ' + endpointModule.metadata.endpoint + ': (TYPE: ' + endpointModule.metadata.supportedMethods + ') ' + endpointModule.metadata.description);

  return endpointModule;
}