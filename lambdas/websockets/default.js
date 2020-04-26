import { success } from '../common/API_Responses';

export async function main(event) {
  console.log('event', event);

  return success({ message: 'default message' });
}
