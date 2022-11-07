const fs = require('node:fs');
const path = require('node:path');

/* Lambda must return a callback with one of these dispositions:
    - STOP_RULE—No further actions in the current receipt rule will be processed, but further receipt rules can be processed.
    - STOP_RULE_SET—No further actions or receipt rules will be processed.
    - CONTINUE or any other invalid value—This means that further actions and receipt rules can be processed.
*/
exports.handler = (lambdaEvent, lambdaContext, callback) => {
  console.log('handler event: ' + JSON.stringify(lambdaEvent));
  console.log('handler context: ' + JSON.stringify(lambdaContext));

  if (Object.prototype.hasOwnProperty.call(lambdaEvent, 'Records') && (lambdaEvent.Records.length === 1)) {
    const sesRecord = lambdaEvent.Records[0];
    const mailRecord = sesRecord.mail;

    console.log('Destination: ' + mailRecord.destination);
  }

  callback(null, null);
};

function _loadEndpoint(targetEndpoint) {
  const endpointModulesPath = path.join(__dirname + '/endpoints');
  const commandFilename = targetEndpoint + '.js';
  const endpointFiles = fs.readdirSync(endpointModulesPath).filter(file => file.toLowerCase() === commandFilename.toLowerCase() && file != 'index.js');

  if (endpointFiles.length == 0) return {};

  const filePath = path.join(endpointModulesPath, endpointFiles[0]);
  console.log('Loading: ' + filePath);
  const endpointModule = require(filePath);

  console.log('Loaded: ' + endpointModule.metadata.endpoint + ': (TYPE: ' + endpointModule.metadata.supportedMethods + ') ' + endpointModule.metadata.description);

  return endpointModule;
}