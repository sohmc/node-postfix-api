import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export async function handler(lambdaEvent, lambdaContext) {
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
    const endpointFunction = loadEndpoint(method, endpoint);

    const queryStringParameters = lambdaEvent.queryStringParameters || {};
    const requestBody = JSON.parse(lambdaEvent.body || '{}');

    if (Object.prototype.hasOwnProperty.call(endpointFunction, 'execute')) {
      lambdaResponseObject = await endpointFunction.execute(pathParameters, queryStringParameters, requestBody, lambdaEvent, lambdaContext);
    } else {
      lambdaResponseObject.statusCode = 400;
      lambdaResponseObject.body = '{"message": "Bad Request"}';
    }
  }


  console.log('lambdaResponseObject: ' + JSON.stringify(lambdaResponseObject));
  return lambdaResponseObject;
}

function loadEndpoint(method, targetEndpoint) {
  const endpointModulesPath = join(__dirname + '/newEndpoints/' + targetEndpoint);
  const commandFilename = method + '.js';
  const endpointFiles = readdirSync(endpointModulesPath).filter(file => file.toLowerCase() === commandFilename.toLowerCase() && file != 'index.js');

  if (endpointFiles.length == 0) return {};

  const filePath = join(endpointModulesPath, endpointFiles[0]);
  console.log('Loading: ' + filePath);
  const endpointModule = require(filePath);

  // console.log('Loaded: ' + endpointModule.metadata.endpoint + ': (TYPE: ' + endpointModule.metadata.supportedMethods + ') ' + endpointModule.metadata.description);

  return endpointModule;
}