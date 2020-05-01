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

  const dataset = GameData.FiveSeconds.gameData.cards;

  const randWordIndex = Math.floor(Math.random() * dataset.length);
  const nextWord = dataset[randWordIndex];
  dataset.splice(randWordIndex, 1); // Stops you from getting the same word twice

  const updatedGameData = {
    ...GameData,
    FiveSeconds: {
      ...GameData.FiveSeconds,
      playerPassed: data.result,
      pass: 0,
      fail: 0,
      roundRoundComplete: false,
      players: [
        ...GameData.FiveSeconds.players.filter(
          (player) => player.ID !== GameData.FiveSeconds.playerTurn.ID
        ),
        {
          ...GameData.FiveSeconds.playerTurn,
          completed: true,
          lives: data.result
            ? GameData.FiveSeconds.playerTurn.lives
            : GameData.FiveSeconds.playerTurn.lives - 1,
        },
      ],
      gameQuestion: nextWord,
      gameData: { cards: [...dataset] },
    },
  };

  const livePlayers = updatedGameData.FiveSeconds.players.filter(
    (player) => player.lives > 0
  );
  const playersToGo = livePlayers.filter((player) => !player.completed);
  const roundCompleted = playersToGo.length <= 0;

  const randNum = Math.floor(Math.random() * playersToGo.length);
  const nextPlayer = !roundCompleted ? playersToGo[randNum] : 'RoundEnd';

  const updateWithNextPlayer = {
    ...updatedGameData,
    FiveSeconds: {
      ...updatedGameData.FiveSeconds,
      playerTurn: nextPlayer,
      roundRoundComplete: roundCompleted,
      roundComplete: roundCompleted,
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
        ...updateWithNextPlayer,
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
        message: `[{"result": ${
          data.result
        }, "roundComplete": ${roundCompleted}, "nextPlayer": ${JSON.stringify(
          nextPlayer
        )}, "nextWord": "${nextWord}", "dataset":${JSON.stringify(dataset)}}]`,
        type: 'fiveseconds_result',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
