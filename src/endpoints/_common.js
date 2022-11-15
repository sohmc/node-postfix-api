const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDB({ region: 'us-east-1'});

const { DynamoDBDocument, GetCommand } = require('@aws-sdk/lib-dynamodb');
const ddbDocClient = DynamoDBDocument.from(client);

module.exports = {
  async getItem(_alias, _domain) {
    const params = {
      'TableName': 'mailAliasesImport-9f39f536549d',
      'Key': {
        'alias_address': 'testing.zttttgs9',
        'domain': 'capricadev.tk',
      },
    };

    const data = await ddbDocClient.send(new GetCommand(params));
    console.log('Success', JSON.stringify(data));
    return data;
  },
};
