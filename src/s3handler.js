import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { simpleParser } from 'mailparser';

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
};

function consolidateAddresses({ to, cc, bcc }) {
  const returnArray = [ ...getEmails(to), ...getEmails(cc), ...getEmails(bcc) ];
  return returnArray;
}

function getEmails(header) {
  if (!header?.value) return [];

  const returnArray = header.value.map((i) => { return i.address; });
  return returnArray;
}
