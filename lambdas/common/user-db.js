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
  console.log('Connected users: ', connectedUsers);
  const newUserList = connectedUsers.filter((user) => user.ID !== connectionId);
  console.log('New User list: ', newUserList);

  const params = {
    TableName: process.env.sessionsTableName,
    Key: {
      SessionId: sessionId,
    },
    UpdateExpression: 'SET UserList = :ul',
    ExpressionAttributeValues: {
      ':ul': newUserList,
    },
  };

  try {
    await dynamoDbLib.call('update', params);
  } catch (e) {
    console.error(e);
  }
};
