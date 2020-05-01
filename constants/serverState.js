import { initArticulate } from './articulateState';
import { initFiveSeconds } from './fiveSecondsState';

export const initGameState = {
  Articulate: { ...initArticulate },
  FiveSeconds: { ...initFiveSeconds },
};
