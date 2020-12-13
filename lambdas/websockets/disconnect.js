import { success, failure } from '../common/API_Responses';
// import * as dynamoDbLib from '../common/dynamodb-lib';
import { send } from '../common/websocketMessage';
import {
  getUser,
  deleteFromSession,
  deleteUser,
  getConnectedUsers,
} from '../common/user-db';

export async function main(event) {
  console.log('event', event);

  const { connectionId } = event.requestContext;

  const userData = await getUser(connectionId);
  console.log('User data: ', userData);
  const sessionId = userData.GameSessionID;

  try {
    let updatedData;
    if (sessionId !== 'NA') {
      updatedData = await deleteFromSession(sessionId, userData);
    }
    await deleteUser(connectionId);

    const sessionData = await getConnectedUsers(sessionId);
    const connectedUsers = sessionData.UserList;
    console.log('Connected Users: ', connectedUsers);
    for (let i = 0; i < connectedUsers.length; i++) {
      const player = await getUser(connectedUsers[i].ID);
      const { domainName, stage, ID } = player;

      console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

      await send({
        domainName,
        stage,
        connectionId: ID,
        message: `[{"ID": "${connectionId}", "Username": "${
          userData.Username
        }", "Data": ${JSON.stringify(updatedData)}}]`,
        type: 'player_left',
      });
    }

    return success({ status: true });
  } catch (e) {
    console.log(`Error: ${e}`);
    return failure({ status: false });
  }
}
