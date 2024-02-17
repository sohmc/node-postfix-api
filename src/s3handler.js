import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

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
  try {
    console.log('params: ' + JSON.stringify(params));

    const s3Command = new HeadObjectCommand(params);
    const s3Response = await s3.send(s3Command);
    console.log('s3Response: ' + JSON.stringify(s3Response));
    return s3Response.ContentType;
  } catch (err) {
    console.log(err);
    const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
    console.log(message);
    throw new Error(message);
  }
};
