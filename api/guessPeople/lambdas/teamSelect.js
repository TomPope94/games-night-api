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

  const { connectionId } = event.requestContext;
  const userData = await getUser(connectionId);

  const updatedGameData = {
    ...GameData,
    GuessPeople: {
      ...GameData.GuessPeople,
      numPlayers: GameData.GuessPeople.numPlayers + 1,
      gameTeams: {
        ...GameData.GuessPeople.gameTeams,
        [data.teamSelected]: {
          ...GameData.GuessPeople.gameTeams[data.teamSelected],
          Players: [
            ...GameData.GuessPeople.gameTeams[data.teamSelected].Players,
            { ID: connectionId, Username: userData.Username },
          ],
          PlayersLeft: [
            ...GameData.GuessPeople.gameTeams[data.teamSelected].PlayersLeft,
            { ID: connectionId, Username: userData.Username },
          ],
        },
      },
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
        message: `[{"ID": "${connectionId}", "Username": "${userData.Username}", "Team": "${data.teamSelected}"}]`,
        type: 'guesspeople_team_join',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
