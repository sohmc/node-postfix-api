exports.handler = async (lambdaEvent, lambdaContext) => {
  console.log('handler event: ' + JSON.stringify(lambdaEvent));
  console.log('handler context: ' + JSON.stringify(lambdaContext));

  const lambdaResponseObject = {
    statusCode: 418,
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{"message": "I am a teapot"}',
  };


  return lambdaResponseObject;
};
