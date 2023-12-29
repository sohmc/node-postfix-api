import { execute as getAlias } from './GET';
import { insertAliasObject, checkDomainConfig } from './POST';
import { updateItem, deleteItem } from '../_utilities';

const allowedParameters = {
  'alias': 'alias_address',
  'domain': 'domain',
  'destination': 'destination',
  'active': 'active',
  'ignore': 'ignore_alias',
};

export async function execute(pathParameters = [], queryParameters = {}, requestBody = {}) {
  console.log(`(alias/PATCH) Received request with pathParameters ${JSON.stringify(pathParameters)} queryParameters ${JSON.stringify(queryParameters)} requestBody ${JSON.stringify(requestBody)}`);

  let lambdaResponseObject = {
    statusCode: 418,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      'code': 418,
      'type': 'alias',
      'message': '',
    },
  };

  // If there is a path parameter and there is at least one accepted property in the request body, then continue
  if ((pathParameters.length > 0) && (Object.keys(allowedParameters).findIndex((property) => Object.prototype.hasOwnProperty.call(requestBody, property)) >= 0)) {

    lambdaResponseObject = await updateAliasObject(pathParameters[0], requestBody);
  } else {
    lambdaResponseObject.statusCode = 405;
    lambdaResponseObject.body.code = 405;
    lambdaResponseObject.body.message = 'must provide a property to update';
  }

  return lambdaResponseObject;
}

export async function updateAliasObject(uuid, requestBody) {
  const placeholderObject = {};

  let returnObject = {
    statusCode: 405,
    body: {
      'code': 405,
      'type': 'alias',
      'message': 'Alias does not exist.',
    },
  };

  for (const property in allowedParameters) {
    console.log('checking for property ' + property);
    if (Object.prototype.hasOwnProperty.call(requestBody, property)) {
      placeholderObject[allowedParameters[property]] = requestBody[property];
    }
  }

  // Get current alias item by UUID
  const currentAliasItem = await getAlias([uuid]);
  // if the uuid doesn't retrieve an alias, return an error
  if (currentAliasItem.body.length != 1) return returnObject;

  const currentAliasInfo = currentAliasItem.body[0];
  console.log('(alias/PATCH.updateAliasObject) - currentAliasInfo for uuid is ' + JSON.stringify(currentAliasInfo));

  // If trying to change alias_address or domain, then the entire record needs to be recreated.
  if (Object.prototype.hasOwnProperty.call(requestBody, 'alias') || Object.prototype.hasOwnProperty.call(requestBody, 'domain')) {
    // returnObject.statusCode = 503;
    // returnObject.body = '{"message": "Not Refactored Yet"}';
    // console.log('Updating active/inactive not refactored');
    // return returnObject;

    if (Object.prototype.hasOwnProperty.call(requestBody, 'domain') && (await checkDomainConfig(requestBody.domain) == -1)) {
      // return error message stating domain is invalid
      returnObject.body.message = 'domain is either inactive or invalid';
      return returnObject;
    }

    console.log('(alias/PATCH.updateAliasObject) Received request to change either the alias_address or the domain.  We must delete the existing record first.');

    for (const aliasProperty in currentAliasInfo) {
      // if the property isn't set in the placeholderObject, set it with the current value.
      if (!Object.prototype.hasOwnProperty.call(placeholderObject, aliasProperty)) placeholderObject[aliasProperty] = currentAliasInfo[aliasProperty];
    }

    // alias_address doesn't get set if it's not sent as part of the request.
    // So copy it from the getAlias call
    if (!Object.prototype.hasOwnProperty.call(placeholderObject, 'alias_address')) placeholderObject['alias_address'] = placeholderObject.alias;

    console.log('(alias/PATCH.updateAliasObject) Current placeholderObject: ' + JSON.stringify(placeholderObject));

    // Delete Alias First
    const deleteItemResults = await deleteItem(currentAliasInfo);
    console.log('deleteItem returned: ' + JSON.stringify(deleteItemResults));
    if (Object.prototype.hasOwnProperty.call(deleteItemResults, '$fault')) {
      returnObject.body.message = 'Alias needed to be deleted, but the operation failed.';
      return returnObject;
    }

    // Now create the Item
    returnObject = await insertAliasObject(placeholderObject);
    if (returnObject.statusCode == 201) returnObject.statusCode = 200;
  } else {
    console.log('(alias/PATCH.updateAliasObject) updating alias per normal UpdateItem command');
    placeholderObject.alias_address = currentAliasInfo.alias;
    placeholderObject.domain = currentAliasInfo.domain;
    const updateItemResults = await updateItem(placeholderObject);

    if (Object.prototype.hasOwnProperty.call(updateItemResults, 'affectedRows') && (updateItemResults.affectedRows == 1)) {
      returnObject = await getAlias([uuid]);
    } else {
      returnObject.body.message = 'Could not update alias.';
    }
  }

  return returnObject;
}
