import * as dynamoDbLib from '../../common/dynamodb-lib';
import AWS from 'aws-sdk';

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

export const refreshDataSet = async () => {
  const s3 = new AWS.S3();

  const datasets = await s3
    .getObject({
      Bucket: process.env.s3BucketName,
      Key: 'Articulate/ArticulateData.json',
    })
    .promise();

  console.log('s3Data: ', datasets);

  return datasets;
};
