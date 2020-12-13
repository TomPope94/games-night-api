import {
  getCurrentGameData,
  refreshDataSet,
} from '../../articulate/lambdas/articulateHelpers';
import { success, failure } from '../../common/API_Responses';
import * as dynamoDbLib from '../../common/dynamodb-lib';
import { getUser } from '../../common/user-db';
import { send } from '../../common/websocketMessage';

export async function main(event) {
  console.log('Event: ', event);

  // get the json file from the s3 bucket
  // update the session gameData with the raw data
  // off to the races fam

  const eventBody = JSON.parse(event.body);
  const data = eventBody.data;
  console.log('Data: ', data);

  const sessionData = await getCurrentGameData(data.sessionId);
  const GameData = sessionData.GameData;
  console.log('GameData: ', GameData);

  const dataRaw = await refreshDataSet('FiveSecondRule/FiveSecondData.json');
  const dataDecoded = dataRaw.Body.toString('utf-8');
  console.log('data clean: ', dataDecoded);

  const dataAsJson = JSON.parse(dataDecoded);

  const updatedGameData = {
    ...GameData,
    FiveSeconds: {
      ...GameData.FiveSeconds,
      gameData: dataAsJson,
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
        type: 'fiveseconds_data_reset',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
