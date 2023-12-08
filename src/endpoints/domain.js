const commonFunctions = require('./_common.js');

module.exports = {
  'metadata': {
    'endpoint': 'domain',
    'supportedMethods': ['GET', 'POST', 'PATCH'],
    'description': 'Works on domain objects, providing information about domains as well as creating domain records.',
  },

  async execute(method, pathParameters, queryParameters, requestBody) {
    console.log(`Received ${method} request with pathParameters ${JSON.stringify(pathParameters)} and queryParameters ${JSON.stringify(queryParameters)}`);

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

    const placeholderObject = {
      'domain': 'tacomail-config',
      'alias_address': 'sub_domains',
    };

    try {
      if (method === 'GET') {
        // If there are path parameters, then do a query for the domain provided
        if (pathParameters.length > 0) {
          lambdaResponseObject = await getDomainInformation(placeholderObject, { 'sub_domain': pathParameters[0] });
        } else if (Object.prototype.hasOwnProperty.call(queryParameters, 'q')) {
          lambdaResponseObject = await getDomainInformation(placeholderObject, { 'q': queryParameters.q });
        } else {
          // If there are no path parameters and there is no query parameters
          // then return all domains
          lambdaResponseObject = await getDomainInformation(placeholderObject);
        }
      } else if (method === 'POST') {
        console.log('requestBody: ' + JSON.stringify(requestBody));
        if (!Object.prototype.hasOwnProperty.call(requestBody, 'domain') || requestBody.domain.length == 0) {
          lambdaResponseObject.body.type = 'domain';
          lambdaResponseObject.body.message = 'request body required';
        } else {
          placeholderObject.newSubDomain = requestBody.domain.trim();
          placeholderObject.description = requestBody.description || '';
          placeholderObject.active_domain = requestBody.active || true;

          const currentConfig = await getDomainInformation(placeholderObject);
          console.log('domain.js:CurrentConfig - ' + JSON.stringify(currentConfig));
          const newSubDomainExists = currentConfig.body.findIndex(element => element.subdomain == placeholderObject.newSubDomain);

          // If there are domains configured, UPDATE an item
          if (currentConfig.body.length > 0) {
            if (newSubDomainExists == -1) {
              lambdaResponseObject = await addDomainObject(placeholderObject);
            } else {
              lambdaResponseObject.statusCode = 409;
              lambdaResponseObject.body.code = 409;
              lambdaResponseObject.body.message = 'domain exists';
            }
          } else {
            lambdaResponseObject = await addDomainConfigObject(placeholderObject);
          }
        }
      } else if (method === 'PATCH') {
        console.log('requestBody: ' + JSON.stringify(requestBody));

        const allowedProperties = ['description', 'active'];

        // If there is a path parameter and there is at least one accepted property in the request body, then continue
        if ((pathParameters.length > 0) && (allowedProperties.findIndex((property) => Object.prototype.hasOwnProperty.call(requestBody, property)) >= 0)) {

          lambdaResponseObject = await updateDomainObject(pathParameters[0], requestBody, allowedProperties);
        } else {
          lambdaResponseObject.statusCode = 405;
          lambdaResponseObject.body.code = 405;
          lambdaResponseObject.body.message = 'must provide a property to update';
        }
      }
    } catch (error) {
      console.error(error);
      lambdaResponseObject = {
        statusCode: 405,
        body: {
          'code': 405,
          'type': 'lambda',
          'message': `Could not process event: ${error}`,
        },
      };
    }

    // Stringify the object within the body
    if (Object.prototype.hasOwnProperty.call(lambdaResponseObject, 'body') && typeof lambdaResponseObject.body === 'object') {
      lambdaResponseObject.body = JSON.stringify(lambdaResponseObject.body);
    }

    return lambdaResponseObject;
  },
};

async function getDomainInformation(placeholderObject, searchParams = {}) {
  console.log('getDomainInformation: ' + JSON.stringify(placeholderObject));

  const returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  const domainItem = await commonFunctions.getItem(placeholderObject);

  if ((domainItem.length == 1) && (typeof domainItem[0] !== 'undefined') && Object.prototype.hasOwnProperty.call(domainItem[0], 'configValues')) {
    const domainConfigItem = domainItem[0];

    const returnArray = [];
    if (Object.prototype.hasOwnProperty.call(domainConfigItem, 'configValues') && domainConfigItem.configValues.length > 0) {
      domainConfigItem.configValues.forEach(element => {
        // If element has search parameter q or if sub_domain equals,
        // or if no parameters, add it to the return array.
        if ((Object.prototype.hasOwnProperty.call(searchParams, 'q') && (element.subdomain.indexOf(searchParams.q) >= 0))
          || ((Object.prototype.hasOwnProperty.call(searchParams, 'sub_domain') && (element.subdomain == searchParams.sub_domain)))
          || (Object.keys(searchParams).length == 0)) {
          returnArray.push(element);
        }
      });

      returnObject.statusCode = 200;
      returnObject.body = returnArray;
    } else {
      returnObject.body.message = 'Domain configuration not set up';
    }
  } else {
    returnObject.body.message = 'Domain configuration not set up';
  }

  return returnObject;
}


async function addDomainConfigObject(placeholderObject) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  // Update the config ITEM
  const queryResults = await commonFunctions.addDomainConfigItem(placeholderObject);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    returnObject = await getDomainInformation(placeholderObject, { 'sub_domain': placeholderObject.newSubDomain });
    returnObject.statusCode = 201;
  } else {
    returnObject.body.type = 'domain';
    returnObject.body.message = 'error inserting domain in configuration';
  }

  return returnObject;
}

async function addDomainObject(placeholderObject) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  const queryResults = await commonFunctions.addDomainConfigItem(placeholderObject);

  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    returnObject = await getDomainInformation(placeholderObject, { 'sub_domain': placeholderObject.newSubDomain });
    returnObject.statusCode = 201;
  } else {
    returnObject.body.type = 'domain';
    returnObject.body.message = 'error updating domain in configuration';
  }

  return returnObject;
}
