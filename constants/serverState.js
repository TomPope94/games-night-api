import { initArticulate } from './articulateState';
import { initFiveSeconds } from './fiveSecondsState';
import { initGuessPeople } from './guessPeopleState';
import { initNamesOf } from './namesOfState';
import { initCrackers } from './crackersState';

export const initGameState = {
  Articulate: { ...initArticulate },
  FiveSeconds: { ...initFiveSeconds },
  GuessPeople: { ...initGuessPeople },
  NamesOf: { ...initNamesOf },
  Crackers: { ...initCrackers },
};
