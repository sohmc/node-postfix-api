import { execute as getAlias } from './GET';
import { updateItem } from '../_utilities';

const allowedParameters = {
  'alias': 'full_address',
  'q': 'full_address',
  'destination': 'destination',
  'active': 'active_alias',
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

  // If trying to change alias_address or domain, then the entire record needs to be recreated.
  if (Object.prototype.hasOwnProperty.call(placeholderObject, 'alias_address') || Object.prototype.hasOwnProperty.call(placeholderObject, 'domain')) {
    returnObject.statusCode = 503;
    returnObject.body = '{"message": "Not Refactored Yet"}';
    console.log('Updating active/inactive not refactored');
    return returnObject;

    for (const aliasProperty in currentAliasInfo) {
      // if the property isn't set in the placeholderObject, set it with the current value.
      if (!Object.prototype.hasOwnProperty.call(placeholderObject, aliasProperty)) placeholderObject[aliasProperty] = currentAliasInfo[aliasProperty];
    }

    console.log('Current placeholderObject: ' + JSON.stringify(placeholderObject));

    // Delete Alias First
    const deleteItemResults = await commonFunctions.deleteAliasItem(currentAliasInfo);
    console.log('deleteItem returned: ' + JSON.stringify(deleteItemResults));
    if (Object.prototype.hasOwnProperty.call(deleteItemResults, '$fault')) {
      returnObject.body.message = 'Alias needed to be deleted, but the operation failed.';
      return returnObject;
    }

    // Now create the Item
    returnObject = await insertAliasObject(placeholderObject);
  } else {
    console.log('updating alias per normal UpdateItem command');
    placeholderObject.alias_address = currentAliasInfo.alias;
    placeholderObject.domain = currentAliasInfo.domain;
    const updateItemResults = await updateItem(placeholderObject);

    if (Object.prototype.hasOwnProperty.call(updateItemResults, 'affectedRows') && (updateItemResults.affectedRows == 1)) {
      returnObject = await getAlias([uuid]);
      returnObject.statusCode = 201;
    } else {
      returnObject.body.message = 'Could not update alias.';
    }
  }

  return returnObject;
}
