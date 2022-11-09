const aliasApi = require('./endpoints/alias.js');

/* Lambda must return a callback with one of these dispositions:
    - STOP_RULE—No further actions in the current receipt rule will be processed, but further receipt rules can be processed.
    - STOP_RULE_SET—No further actions or receipt rules will be processed.
    - CONTINUE or any other invalid value—This means that further actions and receipt rules can be processed.
*/
exports.handler = (lambdaEvent, lambdaContext, callback) => {
  console.log('handler event: ' + JSON.stringify(lambdaEvent));
  console.log('handler context: ' + JSON.stringify(lambdaContext));

  const emailDeliverable = [];

  if (Object.prototype.hasOwnProperty.call(lambdaEvent, 'Records') && (lambdaEvent.Records.length === 1)) {
    const sesRecord = lambdaEvent.Records[0];
    const mailRecord = sesRecord.ses.mail;

    console.log('Destination: ' + mailRecord.destination);

    for (const email of mailRecord.destination) {
      console.log('email: ' + email);

      // X-Postfix-Check-2 means that the first rule has processed and completed with STOP_RULE (i.e. The alias exists)
      //    That means that we need to check if the alias is set to ignore.
      if (mailRecord.headers.findIndex(headerObject => headerObject.name === 'X-Postfix-Check-2') >= 0) {
        console.log('Found X-Postfix-Check-2: Checking for IgnoreFlag');
        // If alias is set to ignore, it means that the email is not deliverable.
        const ignoreFlag = isIgnoreAlias(email)
          .then((result) => { return !result; })
          .then((result) => { incrementAliasCount(email); return result; })
          .catch((error) => { console.error('Error caught running isIgnoreAlias: ' + JSON.stringify(error)); });

        emailDeliverable.push(ignoreFlag);
      } else {
        console.log('NOT FOUND X-Postfix-Check-2: Checking for ActiveFlag');
        const activeFlag = isActiveEmail(email)
          .then((result) => { return result; })
          .catch((error) => { console.error('Error caught running isActiveEmail: ' + JSON.stringify(error)); });

        emailDeliverable.push(activeFlag);
      }
    }
  }

  // If every email address is not deliverable, then CONTINUE so that it can bounce or be ignored.
  // If at least one email address is deliverable, then STOP_RULE so that it can get delivered in a future rule.
  Promise.all(emailDeliverable).then((emailDeliverableResolution) => {
    console.log('emailDeliverable: ' + emailDeliverableResolution);
    let sesLambdaDisposition = null;
    if (emailDeliverable.every(disposition => disposition === false)) sesLambdaDisposition = 'CONTINUE';
    else sesLambdaDisposition = 'STOP_RULE';
    return sesLambdaDisposition;
  }).then((disposition) => {
    console.log('Sending disposition: ' + disposition);
    callback(null, { 'disposition': disposition });
  });
};


async function isActiveEmail(emailAddress) {
  const apiResponse = await aliasApi.execute('GET', [], { 'alias': emailAddress });
  const apiResponseBody = JSON.parse(apiResponse.body);

  if (apiResponseBody.length == 0) return false;
  else if (apiResponseBody[0].active) return true;

  return false;
}

async function isIgnoreAlias(emailAddress) {
  const apiResponse = await aliasApi.execute('GET', [], { 'alias': emailAddress });
  const apiResponseBody = JSON.parse(apiResponse.body);

  if (apiResponseBody.length == 0) return false;
  else if (apiResponseBody[0].ignore) return true;

  return false;
}

async function incrementAliasCount(emailAddress) {
  const apiResponse = await aliasApi.execute('GET', [], { 'alias': emailAddress });
  const apiResponseBody = JSON.parse(apiResponse.body);

  if (apiResponseBody.length == 0) {
    return false;
  } else {
    for (const alias of apiResponseBody) {
      const aliasIncrement = await aliasApi.execute('GET', [alias.uuid, 'count']);
      if (aliasIncrement.statusCode != 204) return false;
    }
  }

  return true;
}