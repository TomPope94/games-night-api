import { success, failure } from '../../common/API_Responses';
import * as dynamoDbLib from '../../common/dynamodb-lib';
import { getCurrentGameData } from '../articulate/articulateHelpers';
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

  const startMove = !GameData.FiveSeconds.gameStarted; // game started inits as false so this will return true which means the action is to start the game
  // start move is needed to know if we need to calculate the starting team...

  const numPlayers = GameData.FiveSeconds.players.length;
  const firstPlayerIndex = Math.floor(Math.random() * numPlayers);

  const updatedGameData = {
    ...GameData,
    FiveSeconds: {
      ...GameData.FiveSeconds,
      roundComplete: false,
      roundStart: false,
      gameStarted: true,
      gameState: data.state,
      gameStarter: startMove
        ? firstPlayerIndex
        : GameData.FiveSeconds.gameStarter,
      players: GameData.FiveSeconds.players.map((player) => {
        return {
          ...player,
          lives: GameData.FiveSeconds.numLives,
          completed: false,
        };
      }),
      gameRound: GameData.FiveSeconds.gameRound + 1,
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

    const userList = sessionData.UserList;

    for (let i = 0; i < userList.length; i++) {
      const player = await getUser(userList[i].ID);
      const { domainName, stage, ID } = player;

      console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

      await send({
        domainName,
        stage,
        connectionId: ID,
        message: `[{"gameData": ${JSON.stringify(
          updatedGameData
        )}, "startMove": "${startMove}"}]`,
        type: 'fiveseconds_state_change',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
