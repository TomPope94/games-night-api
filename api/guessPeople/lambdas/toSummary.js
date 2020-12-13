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

  const wordsCorrectIds = GameData.GuessPeople.wordsCorrect.map(
    (val) => val.id
  );

  const updatedGameData = {
    ...GameData,
    GuessPeople: {
      ...GameData.GuessPeople,
      namesInPlay: [
        ...GameData.GuessPeople.namesInPlay.filter(
          (val) => !wordsCorrectIds.includes(val.id)
        ),
      ],
      roundComplete: true,
      gameTeams: {
        ...GameData.GuessPeople.gameTeams,
        [GameData.GuessPeople.teamTurn]: {
          ...GameData.GuessPeople.gameTeams[GameData.GuessPeople.teamTurn],
          Pos:
            GameData.GuessPeople.gameTeams[GameData.GuessPeople.teamTurn].Pos +
            GameData.GuessPeople.roundScore,
          PlayersLeft: GameData.GuessPeople.gameTeams[
            GameData.GuessPeople.teamTurn
          ].PlayersLeft.filter(
            (player) => player.ID !== GameData.GuessPeople.playerTurn.ID
          ),
          PlayersGone: [
            ...GameData.GuessPeople.gameTeams[GameData.GuessPeople.teamTurn]
              .PlayersGone,
            GameData.GuessPeople.playerTurn,
          ],
        },
      },
    },
  };
  const objStr = JSON.stringify(updatedGameData);
  console.log('UPDATED DATA: ', objStr);

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
        message: `[{"data": ${JSON.stringify(updatedGameData)}}]`,
        type: 'guesspeople_summary',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
