const allowedParameters = {
  'alias': 'full_address',
  'q': 'full_address',
  'destination': 'destination',
  'active': 'active_alias',
  'ignore': 'ignore_alias',
};

async function execute(method, pathParameters = [], queryParameters = {}, requestBody = {}) {
  console.log(`Received ${method} request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)} requestBody ${JSON.stringify(requestBody)}`);

  let lambdaResponseObject = {
    statusCode: 418,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      'code': 418,
      'type': 'alias',
      'message': '',
    },
  };

  // If there is a path parameter and there is at least one accepted property in the request body, then continue
  if ((pathParameters.length > 0) && (Object.keys(allowedProperties).findIndex((property) => Object.prototype.hasOwnProperty.call(requestBody, property)) >= 0)) {

    lambdaResponseObject = await updateAliasObject(pathParameters[0], requestBody, allowedProperties);
  } else {
    lambdaResponseObject.statusCode = 405;
    lambdaResponseObject.body.code = 405;
    lambdaResponseObject.body.message = 'must provide a property to update';
  }
}