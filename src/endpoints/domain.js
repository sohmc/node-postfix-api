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
          lambdaResponseObject.body.message = 'domain property required';
        } else {
          const placeholderArray = [requestBody.domain, requestBody.description || '', requestBody.active || true];
          lambdaResponseObject = await insertDomainObject(placeholderArray);
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
    if (domainConfigItem.configValues instanceof Set) {
      domainConfigItem.configValues.forEach(element => {
        // If element has search parameter q or if sub_domain equals,
        // or if no parameters, add it to the return array.
        if ((Object.prototype.hasOwnProperty.call(searchParams, 'q') && (element.indexOf(searchParams.q) >= 0))
          || ((Object.prototype.hasOwnProperty.call(searchParams, 'sub_domain') && (element == searchParams.sub_domain)))
          || (Object.is(searchParams, {})))
          returnArray.push(element);
      });

      returnObject.statusCode = 200;
      returnObject.body = returnArray;
    } else {
      returnObject.body.message = 'Domain configuration not set up';
    }
  }

  return returnObject;
}


// Creates the domain object that aligns with the API declared schema
function _createDomainObject(mysqlRowObject) {
  return {
    'domain': mysqlRowObject.domain,
    'description': mysqlRowObject.description,
    'active': mysqlRowObject.active,
    'created': mysqlRowObject.created,
    'modified': mysqlRowObject.modified,
  };
}

async function insertDomainObject(placeholderArray) {
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  const query = 'INSERT INTO domain SET domain=?, description=?, active=?, transport="virtual",  created=NOW(), modified=NOW()';

  // INSERT row into database
  const queryResults = await mysqlQuery(query, placeholderArray);
  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    const whereClause = 'domain=?';
    returnObject = await getDomainInformation(whereClause, [placeholderArray[0]]);
    returnObject.statusCode = 201;
  } else {
    returnObject.body.type = 'domain';
    returnObject.body.message = 'error inserting domain into table';
  }

  return returnObject;
}

async function updateDomainObject(domain, requestBody, allowedProperties) {
  const setClauses = [];
  const placeholderArray = [];
  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  allowedProperties.forEach(column => {
    console.log('checking for column ' + column);
    if (Object.prototype.hasOwnProperty.call(requestBody, column)) {
      setClauses.push(column + '=?');
      placeholderArray.push(requestBody[column]);
    }
  });

  // domain is always last
  placeholderArray.push(domain);

  const query = 'UPDATE domain SET ' + setClauses.join(', ') + ' WHERE domain=?';
  console.log('query: ' + query);
  const queryResults = await mysqlQuery(query, placeholderArray);

  if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
    // if everything was successful, get the domain information from the database and return it as a response.
    // domain is always last in the placeholderArray
    const whereClause = 'domain=?';
    returnObject = await getDomainInformation(whereClause, [placeholderArray.pop()]);
  } else {
    returnObject.body.type = 'domain';
    returnObject.body.message = 'error updating domain in table';
  }

  return returnObject;
}

async function mysqlQuery(query, queryValues) {
  const queryResults = await commonFunctions.sendMysqlQuery(query, queryValues);

  return queryResults;
}