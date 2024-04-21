const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDB({ region: 'us-east-1' });

const { DynamoDBDocument, GetCommand, QueryCommand, PutCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const ddbDocClient = DynamoDBDocument.from(client);

module.exports = {
  async getItem(placeholderObject) {
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
  },
  async aliasQuery(placeholderObject) {
    console.log('common.js:aliasQuery -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const allowedFilters = {
      'uuid': 'identifier',
      'full_address': 'full_address',
      'destination': 'destination',
      'active': 'active_alias',
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

      console.log('common.js:aliasQuery -- checking placeholder for filter ' + parameter);
      if (Object.prototype.hasOwnProperty.call(placeholderObject, parameter)) {
        params.ExpressionAttributeNames[`#${placeholderName}`] = allowedFilters[parameter];
        params.ExpressionAttributeValues[`:${placeholderName}`] = placeholderObject[parameter];

        switch (parameter) {
        case 'uuid':
          params.IndexName = 'identifier-index';
          params.KeyConditionExpression = `#${placeholderName} = :${placeholderName}`;
          break;

        case 'full_address':
          params.IndexName = 'application-identifier-index';

          // Set key value for the index
          params.KeyConditionExpression = '#zz0 = :zz0';
          params.ExpressionAttributeNames['#zz0'] = 'application';
          params.ExpressionAttributeValues[':zz0'] = 'tacomail';

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
      'Key': {
        'alias_address': placeholderObject.alias_address,
        'sub_domain': placeholderObject.domain,
      },
      'Item': {
        'application': 'tacomail',
        'sub_domain': placeholderObject.domain || 'foobar',
        'alias_address': placeholderObject.alias_address,
        'destination': placeholderObject.destination,
        'full_address': `${placeholderObject.alias_address}@${placeholderObject.domain}`,
        'identifier': placeholderObject.uuid || uuidv4(),
        'created_datetime': placeholderObject.created || d,
        'modified_datetime': d,
        'active_alias': placeholderObject.active || true,
        'ignore_alias': placeholderObject.ignore_alias || false,
        'use_count': parseInt(placeholderObject.count) || 1,
      },
      'ExpressionAttributeNames': {
        '#kn1': 'sub_domain',
        '#kn2': 'alias_address',
      },
      'ConditionExpression': 'attribute_not_exists(#kn1) AND attribute_not_exists(#kn2)',
    };

    console.log('common.js:putAliasItem -- ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new PutCommand(params));
    console.log('common.js:putAliasItem -- Received data: ', JSON.stringify(data));

    if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

    return { 'affectedRows': 1, 'Item': params.Item };
  },
  async updateAliasItem(placeholderObject) {
    console.log('common.js:updateAliasItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const d = Math.floor(Date.now() / 1000);

    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Key': {
        'alias_address': placeholderObject.alias_address,
        'sub_domain': placeholderObject.domain,
      },
      'ExpressionAttributeNames': {
        '#kn1': 'sub_domain',
        '#kn2': 'alias_address',
      },
      'ExpressionAttributeValues': {},
      'ConditionExpression': 'attribute_exists(#kn1) AND attribute_exists(#kn2)',
    };

    // Add modified_datetime to the update
    placeholderObject.modified_datetime = d;

    const setArray = [];
    for (let index = 0; index < Object.keys(placeholderObject).length; index++) {
      const property = Object.keys(placeholderObject)[index];
      const placeholderName = 'pt' + index;

      // skip keys since they are already declared
      switch (property) {
      case 'domain':
        continue;

      case 'alias_address':
        continue;

      case 'use_count':
        setArray.push(`#${placeholderName} = #${placeholderName} + :${placeholderName}`);
        break;

      default:
        setArray.push(`#${placeholderName} = :${placeholderName}`);
        break;
      }

      console.log('common.js:updateAliasItem -- adding property ' + property + '=' + placeholderObject[property]);
      params.ExpressionAttributeNames[`#${placeholderName}`] = property;
      params.ExpressionAttributeValues[`:${placeholderName}`] = placeholderObject[property];
    }

    // Create UpdateExpression
    params.UpdateExpression = 'SET ' + setArray.join(', ');
    console.log('common.js:updateAliasItem -- ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new UpdateCommand(params));
    console.log('common.js:updateAliasItem -- Received data: ', JSON.stringify(data));

    if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

    return { 'affectedRows': 1, 'Item': placeholderObject };
  },
  async deleteAliasItem(placeholderObject) {
    console.log('common.js:deleteAliasItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Key': {
        'alias_address': placeholderObject.alias,
        'sub_domain': placeholderObject.domain,
      },
      'ExpressionAttributeNames': {
        '#kn1': 'sub_domain',
        '#kn2': 'alias_address',
      },
      'ConditionExpression': 'attribute_exists(#kn1) AND attribute_exists(#kn2)',
    };

    console.log('ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new DeleteCommand(params));
    console.log('ddbDocClient Received data: ', JSON.stringify(data));

    return data;
  },
  async putDomainItem(placeholderObject) {
    console.log('common.js:putDomainItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const d = Math.floor(Date.now() / 1000);

    const domainInfo = new Map([
      ['subdomain', placeholderObject.newSubDomain],
      ['description', placeholderObject.description || ''],
      ['active', placeholderObject.active_domain || true],
      ['created_datetime', d],
      ['modified_datetime', d],
    ]);

    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Key': {
        'alias_address': placeholderObject.alias_address,
        'sub_domain': placeholderObject.domain,
      },
      'Item': {
        'sub_domain': placeholderObject.domain,
        'alias_address': placeholderObject.alias_address,
        'configValues': [domainInfo],
      },
      'ExpressionAttributeNames': {
        '#kn1': 'sub_domain',
        '#kn2': 'alias_address',
      },
      'ConditionExpression': 'attribute_not_exists(#kn1) AND attribute_not_exists(#kn2)',
    };

    console.log('common.js:putDomainItem -- ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new PutCommand(params));
    console.log('common.js:putDomainItem -- Received data: ', JSON.stringify(data));

    // Return an empty array if we get anything other than 200
    if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

    return { 'affectedRows': 1, 'Item': params.Item };
  },
  async addDomainConfigItem(placeholderObject) {
    console.log('common.js:addDomainConfigItem -- placeholderObject: ' + JSON.stringify(placeholderObject));

    const d = Math.floor(Date.now() / 1000);

    const domainInfo = new Map([
      ['subdomain', placeholderObject.newSubDomain],
      ['description', placeholderObject.description || ''],
      ['active', placeholderObject.active_domain || true],
      ['created_datetime', d],
      ['modified_datetime', d],
    ]);

    // These parameters do NOT check to see if the new subdomain
    // already exists.  That is done in domains.js
    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Key': {
        'alias_address': placeholderObject.alias_address,
        'sub_domain': placeholderObject.domain,
      },
      'UpdateExpression': 'SET #ri = list_append(#ri, :ri)',
      'ExpressionAttributeValues': {
        ':ri': [domainInfo],
      },
      'ExpressionAttributeNames': {
        '#ri': 'configValues',
      },
    };

    console.log('common.js:addDomainConfigItem -- ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new UpdateCommand(params));
    console.log('common.js:addDomainConfigItem -- Received data: ', JSON.stringify(data));

    // Return an empty array if we get anything other than 200
    if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

    return { 'affectedRows': 1, 'Item': params.Item };
  },
  async updateDomainConfigItem(placeholderObject, subDomainPosition) {
    console.log('common.js:updateDomainConfigItem -- placeholderObject: ' + JSON.stringify(placeholderObject));
    const d = Math.floor(Date.now() / 1000);

    const params = {
      'TableName': process.env.POSTFIX_DYNAMODB_TABLE,
      'Key': {
        'alias_address': placeholderObject.alias_address,
        'sub_domain': placeholderObject.domain,
      },
      // You can't use an array (e.g. configValues[1]) here.  It must be explicitly defined
      'ExpressionAttributeNames': {
        '#kn1': 'configValues',
      },
      'ExpressionAttributeValues': {
        ':yf1': placeholderObject.subdomain,
        ':yf2': d,
      },
      'ConditionExpression': `#kn1[${subDomainPosition}].subdomain = :yf1`,
    };

    const setArray = [`#kn1[${subDomainPosition}].modified_datetime = :yf2`];
    for (let index = 0; index < Object.keys(placeholderObject).length; index++) {
      const property = Object.keys(placeholderObject)[index];
      const placeholderName = 'pt' + index;

      // skip keys since they are already declared
      switch (property) {
      case 'domain':
      case 'alias_address':
        continue;

      default:
        setArray.push(`#kn1[${subDomainPosition}].#${placeholderName} = :${placeholderName}`);
        break;
      }

      console.log('common.js:updateDomainConfigItem -- adding property ' + property + '=' + placeholderObject[property]);
      params.ExpressionAttributeNames[`#${placeholderName}`] = property;
      params.ExpressionAttributeValues[`:${placeholderName}`] = placeholderObject[property];
    }

    // Create UpdateExpression
    params.UpdateExpression = 'SET ' + setArray.join(', ');
    console.log('common.js:updateDomainConfigItem -- ddbDocClient parameters: ' + JSON.stringify(params));
    const data = await sendDocClientCommand(new UpdateCommand(params));
    console.log('common.js:updateDomainConfigItem -- Received data: ', JSON.stringify(data));

    if (Object.prototype.hasOwnProperty.call(data, '$metadata') && (data['$metadata'].httpStatusCode !== 200)) return [];

    return { 'affectedRows': 1, 'Item': placeholderObject };
  },
};


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