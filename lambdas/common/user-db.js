import * as dynamoDbLib from '../common/dynamodb-lib';

export const getAllClients = async () => {
  const params = {
    TableName: process.env.usersTableName,
  };

  try {
    const result = await dynamoDbLib.call('scan', params);
    console.log('Raw result: ', result);
    if (result.Items) {
      return result.Items;
    } else {
      ('Error reading table');
    }
  } catch (e) {
    console.error(e);
  }
};

export const getUser = async (connectionId) => {
  const params = {
    TableName: process.env.usersTableName,
    Key: {
      ID: connectionId,
    },
  };

  try {
    const result = await dynamoDbLib.call('get', params);

    if (result.Item) {
      return result.Item;
    } else {
      return 'ID not found!';
    }
  } catch (e) {
    console.error('Error: ', e);
  }
};

export const connectUser = async (connectionId, sessionId) => {
  const params = {
    TableName: process.env.usersTableName,
    Key: {
      ID: connectionId,
    },
    UpdateExpression: 'SET GameSessionID = :gs',
    ExpressionAttributeValues: {
      ':gs': sessionId,
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    await dynamoDbLib.call('update', params);
  } catch (e) {
    console.error(e);
  }
};

export const getConnectedUsers = async (sessionId) => {
  const params = {
    TableName: process.env.sessionsTableName,
    Key: {
      SessionId: sessionId,
    },
  };

  try {
    const result = await dynamoDbLib.call('get', params);

    if (result.Item) {
      return result.Item;
    } else {
      return 'ID not found!';
    }
  } catch (e) {
    console.error(e);
  }
};

export const deleteUser = async (connectionId) => {
  const params = {
    TableName: process.env.usersTableName,
    Key: {
      ID: connectionId,
    },
  };

  try {
    await dynamoDbLib.call('delete', params);
    console.log('User Deleted!');
  } catch (e) {
    console.log('Delete Error: ', e);
  }
};

export const deleteFromSession = async (sessionId, connectionId) => {
  console.log('Session ID: ', sessionId);
  const sessionData = await getConnectedUsers(sessionId);
  console.log('SessionData: ', sessionData);
  const connectedUsers = sessionData.UserList;
  const GameData = sessionData.GameData;

  const updatedGameData = {
    ...GameData,
    Articulate: {
      ...GameData.Articulate,
      gameTeams: {
        ...GameData.Articulate.gameTeams,
        Red: {
          ...GameData.Articulate.gameTeams.Red,
          Players: GameData.Articulate.gameTeams.Red.Players.filter(
            (player) => player.ID !== connectionId
          ),
          PlayersLeft: GameData.Articulate.gameTeams.Red.PlayersLeft.filter(
            (player) => player.ID !== connectionId
          ),
          PlayersGone: GameData.Articulate.gameTeams.Red.PlayersGone.filter(
            (player) => player.ID !== connectionId
          ),
        },
        Blue: {
          ...GameData.Articulate.gameTeams.Blue,
          Players: GameData.Articulate.gameTeams.Blue.Players.filter(
            (player) => player.ID !== connectionId
          ),
          PlayersLeft: GameData.Articulate.gameTeams.Blue.PlayersLeft.filter(
            (player) => player.ID !== connectionId
          ),
          PlayersGone: GameData.Articulate.gameTeams.Blue.PlayersGone.filter(
            (player) => player.ID !== connectionId
          ),
        },
        Orange: {
          ...GameData.Articulate.gameTeams.Orange,
          Players: GameData.Articulate.gameTeams.Orange.Players.filter(
            (player) => player.ID !== connectionId
          ),
          PlayersLeft: GameData.Articulate.gameTeams.Orange.PlayersLeft.filter(
            (player) => player.ID !== connectionId
          ),
          PlayersGone: GameData.Articulate.gameTeams.Orange.PlayersGone.filter(
            (player) => player.ID !== connectionId
          ),
        },
        Green: {
          ...GameData.Articulate.gameTeams.Green,
          Players: GameData.Articulate.gameTeams.Green.Players.filter(
            (player) => player.ID !== connectionId
          ),
          PlayersLeft: GameData.Articulate.gameTeams.Green.PlayersLeft.filter(
            (player) => player.ID !== connectionId
          ),
          PlayersGone: GameData.Articulate.gameTeams.Green.PlayersGone.filter(
            (player) => player.ID !== connectionId
          ),
        },
      },
    },
  };

  console.log('Connected users: ', connectedUsers);
  const newUserList = connectedUsers.filter((user) => user.ID !== connectionId);
  console.log('New User list: ', newUserList);

  const params = {
    TableName: process.env.sessionsTableName,
    Key: {
      SessionId: sessionId,
    },
    UpdateExpression: 'SET UserList = :ul, GameData = :gd',
    ExpressionAttributeValues: {
      ':ul': newUserList,
      ':gd': updatedGameData,
    },
  };

  try {
    await dynamoDbLib.call('update', params);

    return updatedGameData;
  } catch (e) {
    console.error(e);
  }
};
