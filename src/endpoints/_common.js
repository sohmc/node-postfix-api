const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDB({ region: 'us-east-1' });

const { DynamoDBDocument, GetCommand, QueryCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const ddbDocClient = DynamoDBDocument.from(client);

module.exports = {
  async getItem(placeholderObject) {
    console.log('common.js:getItem -- placeholderObject: ' + JSON.stringify(placeholderObject));
    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Key': {
        'alias_address': placeholderObject.alias_address,
        'domain': placeholderObject.domain,
      },
    };

    console.log('ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new GetCommand(params));

    // If an array wasn't returned, there was an error.  sendDocClientCommand will output the error
    // so return nothing here.
    if (!Array.isArray(data)) return [];

    console.log('returning: ' + JSON.stringify(data));
    return data;
  },
  async aliasQuery(placeholderObject) {
    console.log('common.js:aliasQuery -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const allowedFilters = {
      'uuid': 'uuid',
      'full_address': 'full_address',
      'destination': 'destination',
      'active': 'active',
      'ignore': 'ignore_alias',
    };

    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'KeyConditionExpression': '',
      'ExpressionAttributeNames': {},
      'ExpressionAttributeValues': {},
    };

    const FilterExpressionArray = [];
    for (let index = 0; index < Object.keys(allowedFilters).length; index++) {
      const parameter = Object.keys(allowedFilters)[index];
      const placeholderName = 'kn' + index;

      console.log('checking placeholder for filter ' + parameter);
      if (Object.prototype.hasOwnProperty.call(placeholderObject, parameter)) {
        params.ExpressionAttributeNames[`#${placeholderName}`] = allowedFilters[parameter];
        params.ExpressionAttributeValues[`:${placeholderName}`] = placeholderObject[parameter];

        switch (parameter) {
        case 'uuid':
          params.IndexName = 'uuid-index';
          params.KeyConditionExpression = `#${placeholderName} = :${placeholderName}`;
          break;

        case 'full_address':
          params.IndexName = 'application-uuid-index';

          // Set key value for the index
          params.KeyConditionExpression = '#zz0 = :zz0';
          params.ExpressionAttributeNames['#zz0'] = 'application';
          params.ExpressionAttributeValues[':zz0'] = 'postfix';

          // Do a contains operation on full_address
          FilterExpressionArray.push(`contains(#${placeholderName}, :${placeholderName})`);
          break;

        default:
          FilterExpressionArray.push(`#${placeholderName} = :${placeholderName}`);
          break;
        }
      }
    }

    // If there are any filter expressions, join them here
    if (FilterExpressionArray.length > 0) params.FilterExpression = FilterExpressionArray.join(' AND ');

    console.log('ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new QueryCommand(params));

    // If an array wasn't returned, there was an error.  sendDocClientCommand will output the error
    // so return nothing here.
    if (!Array.isArray(data)) return [];

    return data;
  },
  async putAliasItem(placeholderObject) {
    console.log('common.js:putAliasItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const { v4: uuidv4 } = require('uuid');
    const d = Math.floor(Date.now() / 1000);

    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Item': {
        'application': 'postfix',
        'domain': placeholderObject.domain,
        'alias_address': placeholderObject.alias_address,
        'destination': placeholderObject.destination,
        'full_address': `${placeholderObject.alias_address}@${placeholderObject.domain}`,
        'uuid': placeholderObject.uuid || uuidv4(),
        'created': placeholderObject.created || d,
        'modified': d,
        'active': placeholderObject.active || true,
        'ignore_alias': placeholderObject.active || false,
        'count': placeholderObject.count || 1,
      },
      'ExpressionAttributeNames': {
        '#kn1': 'domain',
        '#kn2': 'alias_address',
      },
      'ConditionExpression': 'attribute_not_exists(#kn1) AND attribute_not_exists(#kn2)',
    };

    console.log('ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new PutCommand(params));
    console.log('Received data: ', JSON.stringify(data));

    if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

    return { 'affectedRows': 1, 'Item': params.Item };
  },
  async updateAliasItem(placeholderObject) {
    console.log('common.js:updateAliasItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

    // TODO
    return true;
  },
  async deleteAliasItem(placeholderObject) {
    console.log('common.js:deleteAliasItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Key': {
        'alias_address': placeholderObject.alias,
        'domain': placeholderObject.domain,
      },
      'ExpressionAttributeNames': {
        '#kn1': 'domain',
        '#kn2': 'alias_address',
      },
      'ConditionExpression': 'attribute_exists(#kn1) AND attribute_exists(#kn2)',
    };

    console.log('ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new DeleteCommand(params));
    console.log('ddbDocClient Received data: ', JSON.stringify(data));

    return data;
  },
};


async function sendDocClientCommand(commandPackage) {
  console.log('common.js:sendDocClientCommand -- commandPackage: ' + JSON.stringify(commandPackage));

  try {
    const data = await ddbDocClient.send(commandPackage);
    console.log('sendDocClientCommand -- Received data: ', JSON.stringify(data));

    if (Object.prototype.hasOwnProperty.call(data, 'Items')) return data.Items;
    else if (Object.prototype.hasOwnProperty.call(data, 'Item')) return [ data.Item ];
    else return data;

  } catch (err) {
    console.error('DynamoDB returned an error: ' + err);
    return err;
  }
}