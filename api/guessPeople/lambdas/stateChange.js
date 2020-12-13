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

  const startMove = !GameData.GuessPeople.gameStarted; // game started inits as false so this will return true which means the action is to start the game
  // start move is needed to know if we need to calculate the starting team...

  const getTeams = (teams) => {
    const arr = Object.values(teams);
    const playingArr = [];
    for (let i = 0; i < arr.length; i++) {
      const players = arr[i].Players;

      if (players.length > 1) {
        playingArr.push(i);
      }
    }

    return playingArr.map((index) => Object.keys(teams)[index]);
  };

  const numTeams = getTeams(GameData.GuessPeople.gameTeams).length;
  const firstTeamIndex = Math.floor(Math.random() * numTeams);

  const updatedGameData = {
    ...GameData,
    GuessPeople: {
      ...GameData.GuessPeople,
      wordsPassed: [],
      wordsCorrect: [],
      roundScore: 0,
      roundComplete: false,
      roundStart: false,
      gameStarted: true,
      gameState: data.state,
      gameStarter: startMove
        ? firstTeamIndex
        : GameData.GuessPeople.gameStarter,
      gameRound: GameData.GuessPeople.gameRound + 1,
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
        type: 'guesspeople_state_change',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
