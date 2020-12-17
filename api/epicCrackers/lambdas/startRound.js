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

  const nextMatchup =
    GameData.Crackers.matchups[GameData.Crackers.roundNum + 1];

  const updatedGameData = {
    ...GameData,
    Crackers: {
      ...GameData.Crackers,
      roundStarted: true,
      roundNum: GameData.Crackers.roundNum + 1,
      nextMatchup,
      pastMatchups: [
        ...GameData.Crackers.pastMatchups,
        GameData.Crackers.nextMatchup,
      ],
    },
  };

  //get next players as ID array
  const currentPlayerIDs = nextMatchup.map((userData) => userData.ID);

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
    const notCurrentUserList = userList.filter(
      (user) => currentPlayerIDs.indexOf(user.ID) === -1
    );
    const currentUserList = userList.filter(
      (user) => currentPlayerIDs.indexOf(user.ID) !== -1
    );

    for (let i = 0; i < notCurrentUserList.length; i++) {
      const player = await getUser(notCurrentUserList[i].ID);
      const { domainName, stage, ID } = player;

      console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

      await send({
        domainName,
        stage,
        connectionId: ID,
        message: `[{"Data": ${JSON.stringify(
          updatedGameData
        )}, "YourTurn": false}]`,
        type: 'crackers_start_round',
      });
    }

    for (let i = 0; i < currentUserList.length; i++) {
      const player = await getUser(currentUserList[i].ID);
      const { domainName, stage, ID } = player;

      console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

      await send({
        domainName,
        stage,
        connectionId: ID,
        message: `[{"Data": ${JSON.stringify(
          updatedGameData
        )}, "YourTurn": true}]`,
        type: 'crackers_start_round',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
