import { success, failure } from '../common/API_Responses';
import * as dynamoDbLib from '../common/dynamodb-lib';

export async function main(event) {
  console.log('event', event);

  const {
    connectionId: connectionID,
    domainName,
    stage,
  } = event.requestContext;

  const params = {
    TableName: process.env.usersTableName,
    Item: {
      ID: connectionID,
      date: Date.now(),
      messages: [],
      domainName,
      stage,
    },
  };

  try {
    await dynamoDbLib.call('put', params);
    return success({ message: 'connected' });
  } catch (e) {
    console.log(`Error: ${e}`);
    return failure({ status: false });
  }
}
