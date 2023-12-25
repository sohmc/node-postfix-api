const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDB({ region: 'us-east-1' });

const { DynamoDBDocument, GetCommand, _QueryCommand, _PutCommand, _DeleteCommand, _UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const ddbDocClient = DynamoDBDocument.from(client);


export async function getItem(placeholderObject) {
  console.log('common.js:getItem -- placeholderObject: ' + JSON.stringify(placeholderObject));
  const params = {
    'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
    'Key': {
      'alias_address': placeholderObject.alias_address,
      'sub_domain': placeholderObject.domain,
    },
  };

  console.log('ddbDocClient parameters: ' + JSON.stringify(params));
  const data = await sendDocClientCommand(new GetCommand(params));

  // If an array wasn't returned, there was an error.  sendDocClientCommand will output the error
  // so return nothing here.
  if (!Array.isArray(data)) return [];

  console.log('common.js:getItem -- returning: ' + JSON.stringify(data));
  return data;
}

async function sendDocClientCommand(commandPackage) {
  console.log('common.js:sendDocClientCommand -- commandPackage: ' + JSON.stringify(commandPackage));

  try {
    const data = await ddbDocClient.send(commandPackage);
    console.log('sendDocClientCommand -- Received data: ' + JSON.stringify(data));

    if (Object.prototype.hasOwnProperty.call(data, 'Items')) return data.Items;
    else if (Object.prototype.hasOwnProperty.call(data, 'Item')) return [ data.Item ];
    else return data;

  } catch (err) {
    console.error('DynamoDB returned an error: ' + err);
    return err;
  }
}