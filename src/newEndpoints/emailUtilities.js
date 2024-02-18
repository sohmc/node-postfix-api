export function removeSubAddressExtension(emailAddress) {
  console.log('emailUtilities.js:removeSubAddressExtension -- emailAddress: ' + emailAddress);
  const allowedSeparators = ['+', '--', '#', '='];
  let alias_address = '';
  let domain = '';

  const emailParts = emailAddress.split('@', 2);
  if (emailParts.length == 2) {
    alias_address = emailParts[0];
    domain = emailParts[1];
  }

  if (emailParts.length >= 1) alias_address = emailParts[0];

  // If separator was not found, then return the original email address
  if (allowedSeparators.findIndex((i) => alias_address.indexOf(i) > -1) === -1) return emailAddress;
  else console.log('emailUtilities.js:removeSubAddressExtension -- separator found');

  // Build the address with only the localPart by removing everything to the right of each separator
  let newLocalPart = alias_address;
  allowedSeparators.forEach((separator) => {
    newLocalPart = newLocalPart.split(separator)[0];
  });

  console.log('ses.js:removeSubAddressExtension -- newLocalPart: ' + newLocalPart);
  return `${newLocalPart}@${domain}`;
}

export function parseEmailExtension(emailAddress) {
  console.log('emailUtilities.js:parseEmailExtension -- emailAddress: ' + emailAddress);

  // schema: alias+field1.value-field2.value-field3.value@domain.com
  const emailParts = emailAddress.split('+');
  if (emailParts.length == 1) return {};

  const emailExtension = emailParts[1].split('-');
  const emailMetadata = {};
  for (let index = 0; index < emailExtension.length; index++) {
    const [ name, value ] = emailExtension[index].split('.');
    if (name.length > 0) {
      emailMetadata[name] = (value.length > 0 ? value : 'undefined');
    }
  }

  return emailMetadata;
}