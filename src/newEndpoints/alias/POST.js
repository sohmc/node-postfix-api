const allowedParameters = {
  'alias': 'full_address',
  'q': 'full_address',
  'destination': 'destination',
  'active': 'active_alias',
  'ignore': 'ignore_alias',
};


export async function execute(pathParameters = [], queryParameters = {}) {
  const requiredProperties = ['alias', 'domain', 'destination'];

  if (requiredProperties.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property)) === -1) {
    // return error message with property that is missing
    lambdaResponseObject.body.message = 'missing required property: ' + requiredProperties[requiredProperties.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property))];
  } else if (await checkDomainConfig(requestBody.domain) == -1) {
    // return error message stating domain is invalid
    lambdaResponseObject.body.message = 'domain is either inactive or invalid';
  } else {
    const aliasObject = {
      'alias_address': requestBody.alias,
      'domain': requestBody.domain,
      'destination': requestBody.destination,
    };

    lambdaResponseObject = await insertAliasObject(aliasObject);
  }
}