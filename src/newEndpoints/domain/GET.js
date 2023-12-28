export async function execute(pathParameters = [], queryParameters = {}) {
  console.log(`(domain/GET) Received request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)}`);

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
}

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
