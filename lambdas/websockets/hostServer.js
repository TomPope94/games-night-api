import { success, failure } from '../common/API_Responses';
import * as dynamoDbLib from '../common/dynamodb-lib';
import { send } from '../common/websocketMessage';
import { getUser, connectUser } from '../common/user-db';

export async function main(event) {
  console.log('Event: ', event);

  const makeid = (length) => {
    var result = '';
    var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  const { connectionId, domainName, stage } = event.requestContext;

  const userData = await getUser(connectionId);

  const sessionId = makeid(6);
  const params = {
    TableName: process.env.sessionsTableName,
    Item: {
      SessionId: sessionId,
      HostDetails: {
        ID: connectionId,
        Username: userData.Username,
      },
      UserList: [
        {
          ID: connectionId,
          Username: userData.Username,
        },
      ],
      GameData: {
        Articulate: {
          gameStarted: false,
          gameState: 'TeamSelect',
          gameTeams: {
            Red: {
              Pos: 1,
              Players: [],
              PlayersGone: [],
              PlayersLeft: [],
            },
            Blue: {
              Pos: 1,
              Players: [],
              PlayersGone: [],
              PlayersLeft: [],
            },
            Orange: {
              Pos: 1,
              Players: [],
              PlayersGone: [],
              PlayersLeft: [],
            },
            Green: {
              Pos: 1,
              Players: [],
              PlayersGone: [],
              PlayersLeft: [],
            },
          },
          gameData: [],
        },
      },
    },
  };

  try {
    await dynamoDbLib.call('put', params);
    await connectUser(connectionId, sessionId);

    await send({
      domainName,
      stage,
      connectionId,
      message: `[{"SessionID": "${sessionId}", "Players": [{"ID": "${connectionId}", "Username": "${userData.Username}"}]}]`,
      type: 'host',
    });
    console.log('sent a reply message!');

    return success({ message: 'connected' });
  } catch (e) {
    console.log(`Error: ${e}`);
    return failure({ status: false });
  }
}
