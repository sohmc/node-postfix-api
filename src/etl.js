import { createReadStream } from 'node:fs';
import { parse } from 'csv-parse';

const minAliasId = 901;
const maxAliasId = 1000;

import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
// Configuration
const DYNAMODB_TABLE_NAME = 'mailAliases-20230724';
const AWS_REGION = 'us-east-1';

// Define the name of your CSV file
const csvFileName = '/workspaces/node-postfix-api/src/mail_aliases.csv';


const ddbClient = new DynamoDBClient({ region: AWS_REGION });

// Create a parser to read the CSV file
const parser = parse({
  columns: true,
  delimiter: ',',
});

// Read the CSV file and convert the data into DynamoDB JSON format
createReadStream(csvFileName)
  .pipe(parser)
  .on('data', async function(data) {
    if ((data.alias_id < minAliasId) || (data.alias_id > maxAliasId)) return;
    // Define the put parameters
    // console.log(JSON.stringify(data));
    const params = {
      TableName: DYNAMODB_TABLE_NAME,
      Item: {
        application: { S: data.application || 'tacomail' },
        identifier: { S: data.identifier },
        alias_address: { S: data.alias_address },
        sub_domain: { S: data.subdomain },
        full_address: { S: data.full_address },
        destination: { S: data.destination },
        created_datetime: { N: mysqlDatetimeToUnixTime(data.created).toString() },
        modified_datetime: { N: mysqlDatetimeToUnixTime(data.modified).toString() },
        active_alias: { 'BOOL': Boolean(parseInt(data.active_alias)) },
        ignore_alias: { 'BOOL': Boolean(parseInt(data.ignore_alias)) },
        use_count: { N: data.use_count.toString() },
      },
      // ConditionExpression: 'attribute_not_exists(alias_address) AND attribute_not_exists(sub_domain)',
    };

    // console.log(JSON.stringify(params, null, 2));
    try {
      // Put the item to the DynamoDB table
      const command = new PutItemCommand(params);
      const response = await ddbClient.send(command);
      if (response['$metadata'].httpStatusCode != 200) {
        console.log(response);
      }
    } catch (err) {
      console.error(`Error adding item: ${err.message}`);
      console.error(`${err}`);
      console.error(JSON.stringify(err));
    }
  })
  .on('end', function() {
    console.log('CSV file processing completed.');
    console.log(`minId: ${minAliasId} - maxId: ${maxAliasId}`);
  });


function mysqlDatetimeToUnixTime(mysqlDatetime) {
  // Convert MySQL datetime to UTC datetime string
  const utcDatetime = mysqlDatetime.replace(' ', 'T') + 'Z';

  // Convert UTC datetime string to Unix timestamp in milliseconds
  const unixTimeMs = Date.parse(utcDatetime);

  // Convert Unix timestamp in milliseconds to Unix timestamp in seconds
  const unixTimeSec = Math.floor(unixTimeMs / 1000);

  return unixTimeSec;
}
