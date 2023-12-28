import { execute as getDomainConfig } from '../domain/GET';

const requiredParameters = ['alias', 'domain', 'destination']

export async function execute(pathParameters = [], queryParameters = {}, requestBody = {}) {
  let lambdaResponseObject = {
    statusCode: 418,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      'code': 418,
      'type': 'domain',
      'message': '',
    },
  };

  if (requiredParameters.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property)) === -1) {
    // return error message with property that is missing
    lambdaResponseObject.body.message = 'missing required property: ' + requiredParameters[requiredParameters.findIndex(property => Object.prototype.hasOwnProperty.call(requestBody, property))];
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

  return lambdaResponseObject;
}

async function insertAliasObject(placeholderObject) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'alias',
      'message': 'Could not insert alias.',
    },
  };

  // PUT row into database
  const queryResults = await commonFunctions.putAliasItem(placeholderObject);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    const getAliasPlaceholdersObject = {
      'alias_address': placeholderObject.alias_address,
      'domain': placeholderObject.domain,
    };
    returnObject = await getAliasInformation(getAliasPlaceholdersObject);
    returnObject.statusCode = 201;
  } else {
    returnObject.body.message = 'Alias could not be added.';
  }

  return returnObject;
}


async function checkDomainConfig(domainToCheck) {
  const domainListResponse = await getDomainConfig([], {});
  const domainList = JSON.parse(domainListResponse.body);

  console.log(JSON.stringify(domainList));

  return domainList.findIndex(domain => ((domain.subdomain == domainToCheck) && (domain.active)));
}