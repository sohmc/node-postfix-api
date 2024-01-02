

const allowedProperties = ['description', 'active'];

export async function execute(pathParameters = [], queryParameters = {}, requestBody = {}) {
  console.log(`(domain/PATCH) Received request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)} requestBody ${JSON.stringify(requestBody)}`);

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
  if ((pathParameters.length > 0) && (allowedProperties.findIndex((property) => Object.prototype.hasOwnProperty.call(requestBody, property)) >= 0)) {
    placeholderObject.subdomain = pathParameters[0].trim();
    const currentConfig = await getDomainInformation(placeholderObject);
    console.log('domain.js:POST-CurrentConfig - ' + JSON.stringify(currentConfig));
    const subDomainPosition = currentConfig.body.findIndex(element => element.subdomain == placeholderObject.subdomain);

    if (subDomainPosition == -1) {
      lambdaResponseObject.statusCode = 405;
      lambdaResponseObject.body.code = 405;
      lambdaResponseObject.body.message = 'subdomain does not exist';
    } else {
      for (const key in requestBody) {
        if (Object.hasOwnProperty.call(requestBody, key)) {
          const value = requestBody[key];
          if (allowedProperties.indexOf(key) >= 0) placeholderObject[key] = value;
        }
      }

      lambdaResponseObject = await updateDomainConfigObject(placeholderObject, subDomainPosition);
    }
  } else {
    lambdaResponseObject.statusCode = 405;
    lambdaResponseObject.body.code = 405;
    lambdaResponseObject.body.message = 'must provide a property to update';
  }

  return lambdaResponseObject;
}