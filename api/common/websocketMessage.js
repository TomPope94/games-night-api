import AWS from 'aws-sdk';

const create = (domainName, stage) => {
  const endpoint = `${domainName}/${stage}`;

  return new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint,
  });
};

export const send = ({ domainName, stage, connectionId, message, type }) => {
  const ws = create(domainName, stage);

  const postParams = {
    Data: `type:${type}; message:${message}`,
    ConnectionId: connectionId,
  };

  return ws.postToConnection(postParams).promise();
};
