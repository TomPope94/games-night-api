export const initArticulate = {
  gameStarted: false,
  gameState: 'TeamSelect',
  gameMode: 'FurthestWins',
  gameStarter: -1,
  gameRound: -1,
  roundScore: 0,
  roundComplete: false,
  roundStart: false,
  wordsPassed: [],
  wordsCorrect: [],
  gameTeams: {
    Red: {
      Pos: 0,
      Players: [],
      PlayersGone: [],
      PlayersLeft: [],
    },
    Blue: {
      Pos: 0,
      Players: [],
      PlayersGone: [],
      PlayersLeft: [],
    },
    Orange: {
      Pos: 0,
      Players: [],
      PlayersGone: [],
      PlayersLeft: [],
    },
    Green: {
      Pos: 0,
      Players: [],
      PlayersGone: [],
      PlayersLeft: [],
    },
  },
  gameData: [],
};
