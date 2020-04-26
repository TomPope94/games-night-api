import { success, failure } from '../common/API_Responses';
import * as dynamoDbLib from '../common/dynamodb-lib';

export async function main(event) {
  console.log('event', event);

  const { connectionId: connectionID } = event.requestContext;

  const params = {
    TableName: process.env.usersTableName,
    Key: {
      ID: connectionID,
    },
  };

  try {
    await dynamoDbLib.call('delete', params);
    return success({ status: true });
  } catch (e) {
    console.log(`Error: ${e}`);
    return failure({ status: false });
  }
}
