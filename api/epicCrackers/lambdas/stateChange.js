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

  function scramblePlayers(arr) {
    const newArr = [...arr];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }

    return newArr;
  }

  console.log(GameData.Crackers.players);
  const scrambledPlayers = scramblePlayers(GameData.Crackers.players);
  console.log(scrambledPlayers);

  const matchups = scrambledPlayers.reduce(function (
    result,
    value,
    index,
    array
  ) {
    if (index % 2 === 0) result.push(array.slice(index, index + 2));
    return result;
  },
  []);

  console.log('matchups: ', matchups);

  const updatedGameData = {
    ...GameData,
    Crackers: {
      ...GameData.Crackers,
      roundComplete: false,
      roundStart: false,
      gameStarted: true,
      gameState: data.state,
      matchups:
        GameData.Crackers.matchups.length > 0
          ? GameData.Crackers.matchups
          : matchups,
      nextMatchup: GameData.Crackers.matchups[GameData.Crackers.roundNum + 1],
      pastMatchups:
        GameData.Crackers.nextMatchup.length > 0
          ? [...GameData.Crackers.pastMatchups, GameData.Crackers.nextMatchup]
          : [],
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
        message: `[{"gameData": ${JSON.stringify(updatedGameData)}}]`,
        type: 'crackers_state_change',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
