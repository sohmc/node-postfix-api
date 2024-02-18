import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { simpleParser } from 'mailparser';
import { removeSubAddressExtension } from './newEndpoints/emailUtilities.js';
import { execute as getAlias } from './newEndpoints/alias/GET.js';

const s3 = new S3Client({ region: 'us-east-1' });

export const handler = async (lambdaEvent) => {
  console.log('handler event: ' + JSON.stringify(lambdaEvent));
  // Get the object from the event and show its content type
  const bucket = lambdaEvent.Records[0].s3.bucket.name;
  const key = decodeURIComponent(lambdaEvent.Records[0].s3.object.key.replace(/\+/g, ' '));
  const params = {
    Bucket: bucket,
    Key: key,
  };

  let s3Response = null;
  try {
    console.log('params: ' + JSON.stringify(params));

    const s3Command = new GetObjectCommand(params);
    s3Response = await s3.send(s3Command);
  } catch (err) {
    console.log(err);
    const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
    console.log(message);
    throw new Error(message);
  }

  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_GetObject_section.html
  // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
  const s3Data = await s3Response.Body.transformToString();
  const s3Mail = await simpleParser(s3Data);

  console.log('s3Data: ' + s3Data.length);
  console.log('s3Mail.subject: ' + s3Mail.subject);

  const destinations = consolidateAddresses(s3Mail);
  console.log('destinations: ' + JSON.stringify(destinations));

  const resolvedDestinations = await resolveAliases(destinations);
  console.log('resolvedDestinations: ' + JSON.stringify(resolvedDestinations));
};

function consolidateAddresses({ to, cc, bcc }) {
  const returnArray = [ ...getEmails(to), ...getEmails(cc), ...getEmails(bcc) ];
  return returnArray;
}

function getEmails(header, normalize = false) {
  if (!header?.value) return [];

  const returnArray = header.value.map((i) => { return (normalize ? removeSubAddressExtension(i.address) : i.address); });
  return returnArray;
}

async function resolveAliases(aliasArray) {
  const returnArray = [];

  for (let index = 0; index < aliasArray.length; index++) {
    const alias = aliasArray[index];
    const arrayResponse = await getDeliveryDestination(alias);
    returnArray.push(...arrayResponse);
  }

  return returnArray;
}

async function getDeliveryDestination(emailAddress) {
  console.log('s3handler.js:getDeliveryDestination -- ' + JSON.stringify(emailAddress));
  const apiResponse = await getAlias([], { 'alias': emailAddress });

  // Response Code 405 = Alias does not Exist
  if (apiResponse?.code == 405) return [];

  const apiResponseBody = apiResponse.body;
  console.log('s3handler.js:getDeliveryDestination -- ' + JSON.stringify(emailAddress) + ' :: ' + JSON.stringify(apiResponseBody));

  const aliasDetails = apiResponseBody[0];

  const returnDestinationArray = [];
  if (aliasDetails?.destination) returnDestinationArray.push(aliasDetails.destination);
  if (aliasDetails?.destinations) returnDestinationArray.push(aliasDetails?.destinations);

  return returnDestinationArray;
}
