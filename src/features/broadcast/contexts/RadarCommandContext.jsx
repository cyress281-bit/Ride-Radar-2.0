import { createContext, useContext } from 'react';

export const RadarCommandContext = createContext(null);

export function useRadarCommand() {
  return useContext(RadarCommandContext);
}
