require('dotenv').config();

const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDB({ region: 'us-east-1' });

const { DynamoDBDocument, GetCommand, _QueryCommand, PutCommand, _DeleteCommand, _UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const ddbDocClient = DynamoDBDocument.from(client);


export async function getItem(placeholderObject) {
  console.log('utilities/getItem -- placeholderObject: ' + JSON.stringify(placeholderObject));
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

  console.log('utilities/getItem -- returning: ' + JSON.stringify(data));
  return data;
}

export async function putItem(placeholderObject) {
  console.log('utilities/putAliasItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

  const params = {
    'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
    'Key': {
      'alias_address': placeholderObject.alias_address,
      'sub_domain': placeholderObject.domain,
    },
    'Item': { ...placeholderObject.Item },
    'ConditionExpression': 'attribute_not_exists(#kn1) AND attribute_not_exists(#kn2)',
    'ExpressionAttributeNames': {
      '#kn1': 'sub_domain',
      '#kn2': 'alias_address',
    },
  };

  console.log('utilities/putItem -- ddbDocClient parameters: ' + JSON.stringify(params));
  const data = await sendDocClientCommand(new PutCommand(params));
  console.log('utilities/putItem -- Received data: ', JSON.stringify(data));

  // If we don't get a 200, return an empty array.  I probably should
  // change this to provide some sort of error.
  if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

  return { 'affectedRows': 1, 'Item': { ...params.Item } };
}

async function sendDocClientCommand(commandPackage) {
  console.log('utilities/sendDocClientCommand -- commandPackage: ' + JSON.stringify(commandPackage));

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

export function buildExpressionAttributes(attributesObject) {
  const chars = 'bcdfghklmnpqrstvwxz';
  let placeholderPrefix = 'UTIL';

  for (let i = 0; i < 2; i++) {
    const x = Math.floor(Math.random() * chars.length);
    placeholderPrefix += chars.substring(x, x + 1);
  }

  console.log('expressionPlaceholderString: ' + placeholderPrefix);

  const expressionsAttributes = {
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    setArray: [],
  };
  for (let index = 0; index < Object.keys(attributesObject).length; index++) {
    const property = Object.keys(attributesObject)[index];
    const placeholderName = placeholderPrefix + index;

    // skip keys since they are already declared
    if ((property != 'domain') && (property != 'alias_address')) {
      expressionsAttributes.ExpressionAttributeNames[`#${placeholderName}`] = property;
      expressionsAttributes.ExpressionAttributeValues[`:${placeholderName}`] = attributesObject[property];

      expressionsAttributes.setArray.push(`#${placeholderName} = :${placeholderName}`);
    }

    console.log('utilities/buildExpressionAttributes -- Key: ' + placeholderName + ' - adding property ' + property + '=' + attributesObject[property]);
  }

  return expressionsAttributes;
}