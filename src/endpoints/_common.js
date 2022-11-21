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
    console.log('common.js:aliasItem -- placeholderObject: ' + JSON.stringify(placeholderObject));
    const params = {
      'TableName': 'mailAliasesImport-9fbda3b75639',
      'KeyConditionExpression': '',
      'ExpressionAttributeNames': {},
      'ExpressionAttributeValues': {},
    };

    if (Object.prototype.hasOwnProperty.call(placeholderObject, 'uuid')) {
      params.IndexName = 'uuid-index';
      params.KeyConditionExpression = '#kn0 = :kn0';
      params.ExpressionAttributeNames['#kn0'] = 'uuid';
      params.ExpressionAttributeValues[':kn0'] = placeholderObject.uuid;
    }

    console.log('ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await ddbDocClient.send(new QueryCommand(params));
    console.log('Received data: ', JSON.stringify(data));

    let returnData = [];
    if (Object.prototype.hasOwnProperty.call(data, 'Items')) returnData = data.Items;

    return returnData;
  },
};
