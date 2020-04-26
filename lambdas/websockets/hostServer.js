import { success, failure } from '../common/API_Responses';
import * as dynamoDbLib from '../common/dynamodb-lib';
import { send } from '../common/websocketMessage';

export async function main(event) {
  console.log('Event: ', event);

  const makeid = (length) => {
    var result = '';
    var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  const { connectionId, domainName, stage } = event.requestContext;
  const sessionId = makeid(6);
  const params = {
    TableName: process.env.sessionsTableName,
    Item: {
      SessionId: sessionId,
      users: [connectionId],
    },
  };

  try {
    await dynamoDbLib.call('put', params);
    console.log(
      'Domain: ',
      domainName,
      'Stage: ',
      stage,
      'ConnectionId: ',
      connectionId,
      'SessionID: ',
      sessionId
    );

    await send({
      domainName,
      stage,
      connectionId,
      message: sessionId,
      type: 'host',
    });
    console.log('sent a reply message!');

    return success({ message: 'connected' });
  } catch (e) {
    console.log(`Error: ${e}`);
    return failure({ status: false });
  }
}
