export const initGameState = {
  Articulate: {
    gameStarted: false,
    gameState: 'TeamSelect',
    gameMode: 'FurthestWins',
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
};
