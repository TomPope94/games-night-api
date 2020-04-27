import * as dynamoDbLib from '../../common/dynamodb-lib';

export const getCurrentGameData = async (sessionId) => {
  const params = {
    TableName: process.env.sessionsTableName,
    Key: {
      SessionId: sessionId,
    },
  };

  try {
    const result = await dynamoDbLib.call('get', params);
    console.log('Result: ', result);
    if (result.Item) {
      return result.Item;
    } else {
      return 'Could not find Session!';
    }
  } catch (e) {
    console.log('Error: ', e);
  }
};
