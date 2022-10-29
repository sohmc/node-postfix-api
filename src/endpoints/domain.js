const mysql = require('mysql2/promise');

module.exports = {
  'metadata': {
    'endpoint': 'domain',
    'supportedMethods': ['GET', 'POST'],
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
        'type': '',
        'message': '',
      },
    };

    try {
      if (method === 'GET') {
        // If there are path parameters, then do a query for the domain provided
        if (pathParameters.length > 0) {
          const whereClause = 'domain=?';
          lambdaResponseObject = await getDomainInformation(whereClause, [pathParameters[0]]);
        } else if (Object.prototype.hasOwnProperty.call(queryParameters, 'q')) {
          const whereClause = 'domain LIKE ?';
          lambdaResponseObject = await getDomainInformation(whereClause, ['%' + queryParameters.q + '%']);
        }
      } else if (method === 'POST') {
        console.log('requestBody: ' + JSON.stringify(requestBody));
        if (!Object.prototype.hasOwnProperty.call(requestBody, 'domain') || requestBody.domain.length == 0) {
          lambdaResponseObject.body.type = 'domain';
          lambdaResponseObject.body.message = 'domain property required';
        } else {
          const placeholderArray = [ requestBody.domain, requestBody.description || '', requestBody.active || true ];
          const query = 'INSERT INTO domain SET domain=?, description=?, active=?, transport="virtual",  created=NOW(), modified=NOW()';

          // INSERT row into database
          const queryResults = await mysqlQuery(query, placeholderArray);
          if (Object.prototype.hasOwnProperty.call(queryResults, 'affectedRows') && (queryResults.affectedRows === 1)) {
            // if everything was successful, get the domain information from the database and return it as a response.
            const whereClause = 'domain=?';
            lambdaResponseObject = await getDomainInformation(whereClause, [requestBody.domain]);
            lambdaResponseObject.statusCode = 201;
          } else {
            lambdaResponseObject.body.type = 'domain';
            lambdaResponseObject.body.message = 'error inserting domain into table';
          }
        }
      }
    } catch (error) {
      console.error(error);
      lambdaResponseObject = {
        statusCode: 405,
        body: {
          'code': 418,
          'type': 'lambda',
          'message': `Could not process event: ${error}`,
        },
      };
    }

    // Stringify the object within the body
    lambdaResponseObject.body = JSON.stringify(lambdaResponseObject.body);
    return lambdaResponseObject;
  },
};

async function getDomainInformation(whereClause, placeholderArray) {
  console.log('getDomainInformation: ' + whereClause + ':' + placeholderArray);
  const returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'domain',
      'message': 'Domain does not exist.',
    },
  };

  const query = 'SELECT * FROM domain WHERE ' + whereClause;
  const domainInformation = await mysqlQuery(query, placeholderArray);

  if ((domainInformation.length >= 1) && Object.prototype.hasOwnProperty.call(domainInformation[0], 'domain')) {
    const returnArray = [];
    domainInformation.forEach(domainRow => {
      const returnDomainObject = createDomainObject(domainRow);
      returnArray.push(returnDomainObject);
    });

    returnObject.statusCode = 200;
    returnObject.body = returnArray;
  }

  return returnObject;
}

// Creates the domain object that aligns with the API declared schema
function createDomainObject(mysqlRowObject) {
  return {
    'domain': mysqlRowObject.domain,
    'description': mysqlRowObject.description,
    'active': mysqlRowObject.active,
    'created': mysqlRowObject.created,
    'modified': mysqlRowObject.modified,
  };
}


async function mysqlQuery(query, queryValues) {
  const dbConnection = await mysql.createConnection({
    host: process.env.POSTFIX_HOST,
    user: process.env.POSTFIX_USER,
    password: process.env.POSTFIX_PASSWORD,
    database: process.env.POSTFIX_DB,
  });

  const [queryResults, _fields] = await dbConnection.execute(query, queryValues);
  console.log('mysql Query Results: ' + JSON.stringify(queryResults));

  dbConnection.end();

  return queryResults;
}