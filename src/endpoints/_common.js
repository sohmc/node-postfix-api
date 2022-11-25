const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDB({ region: 'us-east-1' });

const { DynamoDBDocument, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const ddbDocClient = DynamoDBDocument.from(client);

module.exports = {
  async getItem(placeholderObject) {
    console.log('common.js:getItem -- placeholderObject: ' + JSON.stringify(placeholderObject));
    const params = {
      'TableName': 'mailAliasesImport-9fbda3b75639',
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
      'TableName': 'mailAliasesImport-9fbda3b75639',
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
};
