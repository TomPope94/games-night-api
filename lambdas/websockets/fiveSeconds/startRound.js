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

  // get next player
  const livePlayers = GameData.FiveSeconds.players.filter(
    (player) => player.lives > 0
  );
  const randNum = Math.floor(Math.random() * livePlayers.length);
  const nextPlayer = livePlayers[randNum];

  //update players with completed: false

  const updatedGameData = {
    ...GameData,
    FiveSeconds: {
      ...GameData.FiveSeconds,
      roundStart: true,
      roundComplete: false,
      roundRoundStarted: true,
      roundRoundComplete: false,
      gameRound: data.gameRound,
      playerTurn: nextPlayer,
      players: GameData.FiveSeconds.players.map((player) => {
        return {
          ...player,
          completed: false,
        };
      }),
      gameQuestion: data.gameQuestion,
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
        message: `[{"nextPlayer": ${JSON.stringify(
          nextPlayer
        )}, "gameQuestion": "${
          data.gameQuestion
        }", "gameData": ${JSON.stringify(updatedGameData)}}]`,
        type: 'fiveseconds_start_round',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
