import { success, failure } from '../common/API_Responses';
import { send } from '../common/websocketMessage';

export async function main(event) {
  console.log('Event: ', event);

  const { domainName, stage, connectionId } = event.requestContext;

  try {
    await send({
      domainName,
      stage,
      connectionId,
      message: 'Working!',
      type: 'pong',
    });
    return success({ status: true });
  } catch (e) {
    console.error(e);
    return failure({ status: false });
  }
}
