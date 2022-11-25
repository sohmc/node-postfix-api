const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDB({ region: 'us-east-1' });

const { DynamoDBDocument, GetCommand, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
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
    const data = await ddbDocClient.send(new GetCommand(params));
    console.log('Received data: ', JSON.stringify(data));

    const returnData = [];
    if (Object.prototype.hasOwnProperty.call(data, 'Item')) returnData.push(data.Item);

    console.log('returning: ' + JSON.stringify(returnData));
    return returnData;
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
    const data = await ddbDocClient.send(new QueryCommand(params));
    console.log('Received data: ', JSON.stringify(data));

    let returnData = [];
    if (Object.prototype.hasOwnProperty.call(data, 'Items')) returnData = data.Items;

    return returnData;
  },
  async putAliasItem(placeholderObject) {
    console.log('common.js:putAliasItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const { v4: uuidv4 } = require('uuid');
    const d = Date.now() / 1000;

    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Item': {
        'application': 'postfix',
        'domain': 'someDomain',
        'alias_address': 'someAlias',
        'destination': 'someDestination',
        'full_address': '',
        'uuid': uuidv4(),
        'created': d,
        'modified': d,
        'active': true,
        'ignore_alias': false,
        'count': 1,
      },
      'ConditionExpression': 'attribute_not_exists(domain) AND attribute_not_exists(alias_address)',
    };

    console.log('ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new PutCommand(params));
    console.log('Received data: ', JSON.stringify(data));

    let returnData = [];
    if (Object.prototype.hasOwnProperty.call(data, 'Items')) returnData = data.Items;

    return returnData;
  },
};


async function sendDocClientCommand(commandPackage) {
  console.log('common.js:sendDocClientCommand');

  try {
    const data = await ddbDocClient.send(commandPackage);
    console.log('Received data: ', JSON.stringify(data));

    let returnData = [];
    if (Object.prototype.hasOwnProperty.call(data, 'Items')) returnData = data.Items;

    return returnData;
  } catch (err) {
    console.error('DynamoDB returned an error: ' + err);
  }
}