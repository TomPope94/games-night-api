import * as dynamoDbLib from '../common/dynamodb-lib';
import { success, failure } from '../common/API_Responses';
import { send } from '../common/websocketMessage';

export async function main(event) {
  console.log('Event: ', event);

  const { domainName, stage, connectionId } = event.requestContext;

  const body = JSON.parse(event.body);

  const params = {
    TableName: process.env.usersTableName,
    Key: {
      ID: connectionId,
    },
    UpdateExpression: 'SET Username = :user',
    ExpressionAttributeValues: {
      ':user': body.data,
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    await dynamoDbLib.call('update', params);
    console.log(
      'Sending: ',
      JSON.stringify({
        domainName,
        stage,
        connectionId,
        message: body.data,
        type: 'username',
      })
    );
    await send({
      domainName,
      stage,
      connectionId,
      message: body.data,
      type: 'username',
    });
    return success({ status: true });
  } catch (e) {
    console.error(e);
    return failure({ status: false });
  }
}
