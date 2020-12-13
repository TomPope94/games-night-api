import { success, failure } from '../../common/API_Responses';
import * as dynamoDbLib from '../../common/dynamodb-lib';
import { getCurrentGameData } from '../../articulate/lambdas/articulateHelpers';
import { getUser } from '../../common/user-db';
import { send } from '../../common/websocketMessage';

export async function main(event) {
  const poolCheck = (players, master) => {
    const livePlayers = players.filter(
      (player) => player.ID !== master.ID && player.inPool
    );

    if (livePlayers.length <= 0) {
      const replenishPlayers = players.map((player) => {
        return {
          ...player,
          inPool: true,
        };
      });

      return replenishPlayers;
    } else {
      return players;
    }
  };
  console.log('Event: ', event);

  const eventBody = JSON.parse(event.body);
  const data = eventBody.data;
  console.log('Data: ', data);

  const sessionData = await getCurrentGameData(data.sessionId);
  const GameData = sessionData.GameData;
  console.log('GameData: ', GameData);

  let updatedGameData;
  if (data.verdict) {
    // check that there are any players left in pool
    // get next player and take current player out of pool
    const updatedPlayers = GameData.NamesOf.players.map((player) => {
      return {
        ...player,
        inPool:
          player.ID === GameData.NamesOf.playerTurn.ID
            ? !player.inPool
            : player.inPool,
      };
    });

    console.log('UpdatedPlayers: ', updatedPlayers);

    const livePlayers = poolCheck(updatedPlayers, GameData.NamesOf.master);

    console.log('Players: ', livePlayers);

    const activePlayers = livePlayers.filter(
      (player) => player.ID !== GameData.NamesOf.master.ID && player.inPool
    );
    const randNum = Math.floor(Math.random() * activePlayers.length);
    const nextPlayer = activePlayers[randNum];

    updatedGameData = {
      ...GameData,
      NamesOf: {
        ...GameData.NamesOf,
        playerTurn: nextPlayer,
        players: livePlayers,
      },
    };
  } else {
    updatedGameData = {
      ...GameData,
      NamesOf: {
        ...GameData.NamesOf,
        master: GameData.NamesOf.playerTurn,
        playerTurn: {},
        roundStarted: false,
      },
    };
  }

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

    if (data.verdict) {
      for (let i = 0; i < userList.length; i++) {
        const player = await getUser(userList[i].ID);
        const { domainName, stage, ID } = player;

        console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

        await send({
          domainName,
          stage,
          connectionId: ID,
          message: `[{"Data": ${JSON.stringify(updatedGameData)}}]`,
          type: 'namesof_pass',
        });
      }
    } else {
      const newList = userList.filter(
        (player) => player.ID !== GameData.NamesOf.playerTurn.ID
      );
      for (let i = 0; i < newList.length; i++) {
        const player = await getUser(newList[i].ID);
        const { domainName, stage, ID } = player;

        console.log('Domain: ', domainName, 'Stage: ', stage, 'ID: ', ID);

        await send({
          domainName,
          stage,
          connectionId: ID,
          message: `[{"Data": ${JSON.stringify(
            updatedGameData
          )}, "Master": false}]`,
          type: 'namesof_fail',
        });
      }
      const newMaster = await getUser(GameData.NamesOf.playerTurn.ID);
      await send({
        domainName: newMaster.domainName,
        stage: newMaster.stage,
        connectionId: newMaster.ID,
        message: `[{"Data": ${JSON.stringify(
          updatedGameData
        )}, "Master": true}]`,
        type: 'namesof_fail',
      });
    }

    return success({ message: 'connected' });
  } catch (e) {
    console.log('Error: ', e);
    return failure({ status: false });
  }
}
