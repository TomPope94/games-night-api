import { success, failure } from '../common/API_Responses';
import * as dynamoDbLib from '../common/dynamodb-lib';
// import { send } from '../common/websocketMessage';

export async function main(event) {
  console.log('event', event);

  const { connectionId, domainName, stage } = event.requestContext;

  const params = {
    TableName: process.env.usersTableName,
    Item: {
      ID: connectionId,
      GameSessionID: 'NA',
      Date: Date.now(),
      Username: 'Guest',
      domainName,
      stage,
    },
  };

  try {
    console.log(
      'Domain: ',
      domainName,
      'Stage: ',
      stage,
      'ConnectionId: ',
      connectionId
    );

    await dynamoDbLib.call('put', params);
    // await send({
    //   domainName,
    //   stage,
    //   connectionId,
    //   message: 'Guest',
    //   type: 'username',
    // });
    // console.log('sent a reply message!');

    return success({ message: 'connected' });
  } catch (e) {
    console.log(`Error: ${e}`);
    return failure({ status: false });
  }
}
