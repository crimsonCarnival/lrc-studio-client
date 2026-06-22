import { PlayerEngineProvider } from '../PlayerEngine';
import type { PlayerHandle, PlayerEngineProps } from '../PlayerEngine';
import PlayerControls from './PlayerControls';

export type { PlayerHandle };

type PlayerProps = Omit<PlayerEngineProps, 'children'>;

function Player(props: PlayerProps) {
  return (
    <PlayerEngineProvider {...props}>
      <PlayerControls variant="mobile" />
    </PlayerEngineProvider>
  );
}

export default Player;
