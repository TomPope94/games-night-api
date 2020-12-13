import { success, failure } from '../../common/API_Responses';
import * as dynamoDbLib from '../../common/dynamodb-lib';
import { getCurrentGameData } from '../../articulate/lambdas/articulateHelpers';
import { getUser } from '../../common/user-db';
import { send } from '../../common/websocketMessage';

export async function main(event) {
  console.log('Event: ', event);

  const eventBody = JSON.parse(event.body);
  const data = eventBody.data;
  console.log('Data: ', data);

  const sessionData = await getCurrentGameData(data.sessionId);
  const GameData = sessionData.GameData;
  console.log('GameData: ', GameData);

  const { connectionId } = event.requestContext;
  const userData = await getUser(connectionId);

  const updatedGameData = {
    ...GameData,
    NamesOf: {
      ...GameData.NamesOf,
      roundComplete: false,
      roundStarted: false,
      gameState: data.state,
      master: { Username: userData.Username, ID: userData.ID },
      players: GameData.NamesOf.players.map((player) => {
        return {
          ...player,
          inPool: true,
        };
      }),
      gameRound: GameData.NamesOf.gameRound + 1,
    },
  };

  const params = {
    TableName: process.env.sessionsTableName,
    Key: {
      SessionId: data.sessionId,
    },
    UpdateExpression: 'SET GameData = :gd',
    ExpressionAttributeValues: {
      ':gd': {
        ...updatedGameData,
      },
    },
  };

  try {
    await dynamoDbLib.call('update', params);

    const userList = sessionData.UserList.filter(
      (user) => user.ID !== connectionId
    );

    for (let i = 0; i < userList.length; i++) {
      const player = await getUser(userList[i].ID);
      const { domainName, stage, ID } = player;

      console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

      await send({
        domainName,
        stage,
        connectionId: ID,
        message: `[{"Data": ${JSON.stringify(
          updatedGameData
        )}, "Master": false}]`,
        type: 'namesof_state_change',
      });
    }

    await send({
      domainName: userData.domainName,
      stage: userData.stage,
      connectionId,
      message: `[{"Data": ${JSON.stringify(updatedGameData)}, "Master": true}]`,
      type: 'namesof_state_change',
    });

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
