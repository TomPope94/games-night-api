import { success, failure } from '../../common/API_Responses';
import * as dynamoDbLib from '../../common/dynamodb-lib';
import { getCurrentGameData } from './articulateHelpers';
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

  const newGameState = data.complete ? 'GameComplete' : 'RoundInProgress';

  const updatedGameData = {
    ...GameData,
    Articulate: {
      ...GameData.Articulate,
      gameState: newGameState,
      teamTurn: data.team,
      playerTurn: data.player,
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

    const users = sessionData.UserList;
    const userList = users.filter((user) => user.ID !== data.player.ID);

    for (let i = 0; i < userList.length; i++) {
      const player = await getUser(userList[i].ID);
      const { domainName, stage, ID } = player;

      console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

      await send({
        domainName,
        stage,
        connectionId: ID,
        message: `[{"gameState": "${newGameState}", "team": "${data.team}", "player": "${data.player.Username}", "yourTurn": false}]`,
        type: 'articulate_next_round',
      });
    }

    const turnPlayer = await getUser(data.player.ID);
    await send({
      domainName: turnPlayer.domainName,
      stage: turnPlayer.stage,
      connectionId: turnPlayer.ID,
      message: `[{"gameState": "${newGameState}", "team": "${data.team}", "player": "${data.player.Username}", "yourTurn": true}]`,
      type: 'articulate_next_round',
    });

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
