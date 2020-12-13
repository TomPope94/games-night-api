// import { success, failure } from '../../common/API_Responses';
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

  const updatedNames = data.override
    ? [...GameData.GuessPeople.gameData]
    : [...GameData.GuessPeople.gameData, ...Object.values(data.names)];

  const updatedGameData = {
    ...GameData,
    GuessPeople: {
      ...GameData.GuessPeople,
      gameData: [...updatedNames],
    },
  };
  const completedSubmits =
    updatedGameData.GuessPeople.gameData.length >=
      updatedGameData.GuessPeople.numPlayers * 5 || data.override;

  if (!data.override) {
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

      // return success({ message: 'connected' });
    } catch (e) {
      console.log('Error: ', e);
      // return failure({ status: false });
    }
  }
  const userList = sessionData.UserList;

  for (let i = 0; i < userList.length; i++) {
    const player = await getUser(userList[i].ID);
    const { domainName, stage, ID } = player;

    console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

    await send({
      domainName,
      stage,
      connectionId: ID,
      message: `[{"names": ${JSON.stringify(
        updatedGameData.GuessPeople.gameData
      )}, "submitsComplete": ${completedSubmits}}]`,
      type: 'guesspeople_names',
    });
  }
}
