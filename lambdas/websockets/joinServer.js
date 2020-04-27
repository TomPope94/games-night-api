import { success, failure } from '../common/API_Responses';
import * as dynamoDbLib from '../common/dynamodb-lib';
import { getUser, getConnectedUsers, connectUser } from '../common/user-db';
import { send } from '../common/websocketMessage';

export async function main(event) {
  console.log('Event: ', event);

  const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body);

  const userData = await getUser(connectionId);
  const sessionData = await getConnectedUsers(body.data);
  const connectedUsers = sessionData.UserList;
  console.log('Connected Users: ', connectedUsers);

  const params = {
    TableName: process.env.sessionsTableName,
    Key: {
      SessionId: body.data,
    },
    UpdateExpression: 'SET UserList = :userArr',
    ExpressionAttributeValues: {
      ':userArr': [
        ...connectedUsers,
        {
          ID: connectionId,
          Username: userData.Username,
        },
      ],
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    await dynamoDbLib.call('update', params);
    await connectUser(connectionId, body.data);
    for (let i = 0; i < connectedUsers.length; i++) {
      const player = await getUser(connectedUsers[i].ID);
      const { domainName, stage, ID } = player;

      console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

      await send({
        domainName,
        stage,
        connectionId: ID,
        message: `[{"ID": "${connectionId}", "Username": "${userData.Username}"}]`,
        type: 'player_join',
      });
    }

    const sessionUsers = [
      ...connectedUsers,
      { ID: connectionId, Username: userData.Username },
    ];

    await send({
      domainName: userData.domainName,
      stage: userData.stage,
      connectionId: connectionId,
      message: `[{"SessionID": "${body.data}", "GameData": ${JSON.stringify(
        sessionData.GameData
      )}, "Players": ${JSON.stringify(sessionUsers)}}]`,
      type: 'server_join',
    });

    console.log('sent a reply message!');
    return success({ message: 'connected' });
  } catch (e) {
    console.error(e);
    return failure({ status: false });
  }
}
