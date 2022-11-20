const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDB({ region: 'us-east-1' });

const { DynamoDBDocument, GetCommand } = require('@aws-sdk/lib-dynamodb');
const ddbDocClient = DynamoDBDocument.from(client);

module.exports = {
  async getItem(domain, alias) {
    console.log('common.js:getItem -- domain: ' + ' alias: ' + alias);
    const params = {
      'TableName': 'mailAliasesImport-66fed9a176c7',
      'Key': {
        'alias_address': alias,
        'domain': domain,
      },
    };

    const data = await ddbDocClient.send(new GetCommand(params));
    console.log('Success', JSON.stringify(data));

    const returnData = [];
    if (Object.prototype.hasOwnProperty.call(data, 'Item')) returnData.push(data.Item);

    console.log('returning: ' + JSON.stringify(returnData));
    return returnData;
  },
  async aliasQuery(KeyConditions, ExpressionValues) {
    const params = {
      'TableName': 'mailAliasesImport-66fed9a176c7',
      'KeyConditionExpression': KeyConditions,
      'ExpressionAttributeValues': ExpressionValues,
    };

    return params;
  },
};
