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

  //check to see if there is anything in namesInPlay (if no, make it equal to gameData)
  const checkNames = GameData.GuessPeople.namesInPlay.length <= 0;

  const rounds = ['Articulate', 'Charades', 'One Word'];
  const newModeNum = checkNames
    ? GameData.GuessPeople.modeRound + 1
    : GameData.GuessPeople.modeRound;
  const newRoundMode = rounds[newModeNum];

  //check to see if the player pools need refreshing
  const checkPools = data.refreshPools;
  const newPools = {
    Red: { ...GameData.GuessPeople.gameTeams.Red },
    Blue: { ...GameData.GuessPeople.gameTeams.Blue },
    Orange: { ...GameData.GuessPeople.gameTeams.Orange },
    Green: { ...GameData.GuessPeople.gameTeams.Green },
  };
  if (checkPools) {
    for (let [key, value] of Object.entries(GameData.GuessPeople.gameTeams)) {
      console.log('Key:', key);
      console.log('Val:', value);
      newPools[key] = {
        ...value,
        PlayersLeft: [...value.PlayersGone],
        PlayersGone: [],
      };
    }
  }

  console.log('New Pools:', JSON.stringify(newPools));

  const updatedGameData = {
    ...GameData,
    GuessPeople: {
      ...GameData.GuessPeople,
      gameState: 'RoundInProgress',
      teamTurn: data.team,
      playerTurn: data.player,
      modeRound: newModeNum,
      gameMode: newRoundMode,
      namesInPlay: checkNames
        ? [...GameData.GuessPeople.gameData]
        : [...GameData.GuessPeople.namesInPlay],
      gameTeams: { ...newPools },
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
        message: `[{"gameState": "RoundInProgress", "data": ${JSON.stringify(
          updatedGameData
        )}, "yourTurn": false}]`,
        type: 'guesspeople_next_round',
      });
    }

    const turnPlayer = await getUser(data.player.ID);
    await send({
      domainName: turnPlayer.domainName,
      stage: turnPlayer.stage,
      connectionId: turnPlayer.ID,
      message: `[{"gameState": "RoundInProgress", "data": ${JSON.stringify(
        updatedGameData
      )}, "yourTurn": true}]`,
      type: 'guesspeople_next_round',
    });

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
