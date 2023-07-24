const fs = require('fs');
const parse = require('csv-parse');

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const AWS_REGION = 'us-east-1';
const ddbClient = new DynamoDBClient({ region: AWS_REGION });

// Configuration
const DYNAMODB_TABLE_NAME = 'mailAliases-20230724';

// Define the name of your CSV file
const csvFileName = 'mail_aliases.csv';

// Create a parser to read the CSV file
const parser = parse.parse({
  columns: true,
  delimiter: ',',
});

// Read the CSV file and convert the data into DynamoDB JSON format
fs.createReadStream(csvFileName)
  .pipe(parser)
  .on('data', async function(data) {
    // Define the put parameters
    const params = {
      TableName: DYNAMODB_TABLE_NAME,
      Item: {
        application: { S: data.application },
        identifier: { S: data.identifier },
        alias_address: { S: data.alias_address },
        sub_domain: { S: data.sub_domain },
        full_address: { S: data.full_address },
        destination: { S: data.destination },
        created_datetime: { N: mysqlDatetimeToUnixTime(data.created).toString() },
        modified_datetime: { N: mysqlDatetimeToUnixTime(data.modified).toString() },
        active_alias: { 'BOOL': Boolean(data.active_alias) },
        ignore_alias: { 'BOOL': Boolean(data.ignore_alias) },
        use_count: { N: data.use_count.toString() },
      },
      ConditionExpression: 'attribute_not_exists(alias_address) AND attribute_not_exists(subdomain)',
    };

    console.log(JSON.stringify(params, null, 2));
    try {
      // Put the item to the DynamoDB table
      const response = await ddbClient.send(new PutItemCommand(params));
      console.log(response);
      console.log('Successfully added item!');
    } catch (err) {
      console.error(`Error adding item: ${err.message}`);
      console.error(JSON.stringify(err));
    }
  })
  .on('end', function() {
    console.log('CSV file processing completed.');
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
