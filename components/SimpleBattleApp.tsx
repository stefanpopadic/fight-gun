import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInput } from '../hooks/useInput';
import { useSocket } from '../hooks/useSocket';
import { GameStatus } from '../types';
import type { Player, Bullet, Vector, Wall, Bomb, BloodParticle, BloodSplat, PowerUp, MuzzleFlash, Explosion } from '../types';
import { Game } from './Game';
import { PLAYER_SIZE, MAX_ROUNDS } from '../constants';

interface SimpleBattleAppProps {
  onBackToMenu: () => void;
}

interface GameData {
  players: Player[];
  gameState: {
    bullets: Bullet[];
    bomb: Bomb | null;
    bloodParticles: BloodParticle[];
    bloodSplats: BloodSplat[];
    powerUp: PowerUp | null;
    muzzleFlashes: MuzzleFlash[];
    explosions: Explosion[];
  };
  scores: { team1: number; team2: number };
  status: GameStatus;
}

export const SimpleBattleApp: React.FC<SimpleBattleAppProps> = ({ onBackToMenu }) => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Start);
  const [battleState, setBattleState] = useState<{
    battleId: string | null;
    playerId: number | null;
    isHost: boolean;
    friendJoined: boolean;
    shareableLink: string | null;
  }>({
    battleId: null,
    playerId: null,
    isHost: false,
    friendJoined: false,
    shareableLink: null
  });

  const [gameData, setGameData] = useState<GameData>({
    players: [],
    gameState: {
      bullets: [],
      bomb: null,
      bloodParticles: [],
      bloodSplats: [],
      powerUp: null,
      muzzleFlashes: [],
      explosions: [],
    },
    scores: { team1: 0, team2: 0 },
    status: GameStatus.Start
  });

  const [walls, setWalls] = useState<Wall[]>([]);
  const [baseZones, setBaseZones] = useState<(Wall & { id: number })[]>([]);
  const [arenaDimensions, setArenaDimensions] = useState({ width: 900, height: 600 });
  const [scale, setScale] = useState(1);
  const [mouseRenderPos, setMouseRenderPos] = useState<Vector>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const keysPressedRef = useInput();
  const mousePosRef = useRef<Vector>({ x: 0, y: 0 });
  const p1ShootingRef = useRef(false);
  const spaceHeldRef = useRef(false);

  // Socket event handlers
  const onBattleCreated = useCallback((data: { roomId: string; shareableLink?: string }) => {
    setBattleState(prev => ({ 
      ...prev, 
      battleId: data.roomId,
      shareableLink: data.shareableLink || '',
      isHost: true
    }));
  }, []);

  const onJoinedBattle = useCallback((data: { roomId: string; playerId: number; teamId: number; isHost?: boolean }) => {
    setBattleState(prev => ({
      ...prev,
      battleId: data.roomId,
      playerId: data.playerId,
      isHost: data.isHost || false
    }));
    setError(null);
  }, []);

  const onFriendJoined = useCallback(() => {
    setBattleState(prev => ({ ...prev, friendJoined: true }));
  }, []);

  const onFriendLeft = useCallback(() => {
    setBattleState(prev => ({ ...prev, friendJoined: false }));
    if (gameStatus === GameStatus.Playing) {
      setGameStatus(GameStatus.Start);
    }
  }, [gameStatus]);

  const onBattleStarted = useCallback((data: { walls: Wall[]; baseZones: (Wall & { id: number })[]; arenaDimensions: { width: number; height: number } }) => {
    setWalls(data.walls);
    setBaseZones(data.baseZones);
    setArenaDimensions(data.arenaDimensions);
    setGameStatus(GameStatus.Playing);
  }, []);

  const onGameStateUpdate = useCallback((data: GameData) => {
    setGameData(data);
    setGameStatus(data.status);
  }, []);

  const onSocketError = useCallback((data: { message: string }) => {
    setError(data.message);
  }, []);

  const { socket, isConnected, createRoom, joinRoom, setPlayerReady, sendPlayerInput } = useSocket(
    onBattleCreated,
    onJoinedBattle,
    onFriendJoined,
    onFriendLeft,
    undefined, // We don't need playerReadyUpdate for simple battles
    onBattleStarted,
    onGameStateUpdate,
    onSocketError
  );

  // Handle scale updates
  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / arenaDimensions.width;
      const scaleY = window.innerHeight / arenaDimensions.height;
      setScale(Math.min(scaleX, scaleY) * 0.95);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [arenaDimensions]);

  // Handle mouse and keyboard input
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (gameContainerRef.current) {
        const rect = gameContainerRef.current.getBoundingClientRect();
        mousePosRef.current = {
          x: (event.clientX - rect.left) / scale,
          y: (event.clientY - rect.top) / scale,
        };
      }
    };

    const handleMouseDown = () => { p1ShootingRef.current = true; };
    const handleMouseUp = () => { p1ShootingRef.current = false; };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') spaceHeldRef.current = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') spaceHeldRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [scale]);

  // Send player input to server
  useEffect(() => {
    if (gameStatus !== GameStatus.Playing || !battleState.playerId) return;

    const gameLoop = () => {
      const keys = keysPressedRef.current;
      let dx = 0;
      let dy = 0;

      if (keys['KeyW']) dy -= 1;
      if (keys['KeyS']) dy += 1;
      if (keys['KeyA']) dx -= 1;
      if (keys['KeyD']) dx += 1;

      const myPlayer = gameData.players.find(p => p.id === battleState.playerId);
      if (myPlayer) {
        const angle = Math.atan2(
          mousePosRef.current.y - myPlayer.position.y,
          mousePosRef.current.x - myPlayer.position.x
        ) * 180 / Math.PI;

        sendPlayerInput({
          movement: { dx, dy },
          angle,
          shooting: p1ShootingRef.current,
          spacePressed: spaceHeldRef.current
        });
      }

      setMouseRenderPos(mousePosRef.current);
    };

    const intervalId = setInterval(gameLoop, 1000 / 60); // 60 FPS
    return () => clearInterval(intervalId);
  }, [gameStatus, battleState.playerId, sendPlayerInput, gameData.players]);

  const handleCreateBattle = () => {
    createRoom(1); // Always 1v1 for simple battles
  };

  const handleJoinBattle = (battleId: string) => {
    joinRoom(battleId);
  };

  const handleStartBattle = () => {
    setPlayerReady();
  };

  const copyShareableLink = () => {
    if (battleState.shareableLink) {
      navigator.clipboard.writeText(battleState.shareableLink);
      // You could add a toast notification here
    }
  };

  // Check URL for battle ID on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const battleId = urlParams.get('battle');
    if (battleId && socket) {
      console.log('Auto-joining battle:', battleId);
      joinRoom(battleId);
    }
  }, [socket, joinRoom]);

  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg">
          <h1 className="text-4xl font-black mb-4">Connecting...</h1>
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg">
          <h1 className="text-4xl font-black text-red-500 mb-4">Error</h1>
          <p className="text-xl mb-6">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg mr-4"
          >
            Try Again
          </button>
          <button
            onClick={onBackToMenu}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg"
          >
            Back to Menu
          </button>
        </div>
      );
    }

    if (!battleState.battleId) {
      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg max-w-2xl">
          <h1 className="text-6xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mb-8">
            🤺 BATTLE A FRIEND
          </h1>
          
          <p className="text-xl mb-8">Create an instant 1v1 battle and share the link with your friend!</p>
          
          <button
            onClick={handleCreateBattle}
            className="px-12 py-4 bg-green-800 hover:bg-green-700 border-2 border-white text-white font-bold rounded-lg text-2xl transition-transform transform hover:scale-105 mb-8"
          >
            🚀 Create Battle
          </button>

          <div className="text-left space-y-4 max-w-lg mx-auto">
            <p><strong className="text-yellow-300">How it works:</strong></p>
            <p>1. Click "Create Battle" to start</p>
            <p>2. Share the link with your friend</p>
            <p>3. You'll be Team A (Yellow), they'll be Team B (Red)</p>
            <p>4. Click "Start Battle" when ready!</p>
          </div>

          <button
            onClick={onBackToMenu}
            className="mt-8 px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg"
          >
            ← Back to Menu
          </button>
        </div>
      );
    }

    if (gameStatus === GameStatus.Start) {
      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg max-w-4xl">
          <h1 className="text-5xl font-black mb-6">⚔️ BATTLE ARENA</h1>
          
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-yellow-900/30 p-6 rounded-lg border-2 border-yellow-400">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">Team A (You)</h2>
              <div className="text-6xl mb-4">🤺</div>
              <p className="text-xl">Ready to battle!</p>
            </div>

            <div className="bg-red-900/30 p-6 rounded-lg border-2 border-red-400">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Team B (Friend)</h2>
              <div className="text-6xl mb-4">
                {battleState.friendJoined ? '🤺' : '⏳'}
              </div>
              <p className="text-xl">
                {battleState.friendJoined ? 'Ready to battle!' : 'Waiting for friend...'}
              </p>
            </div>
          </div>

          {battleState.isHost && !battleState.friendJoined && (
            <div className="mb-8 p-4 bg-blue-900/30 border-2 border-blue-400 rounded-lg">
              <h3 className="text-xl font-bold mb-4">📋 Share this link with your friend:</h3>
              <div className="flex items-center gap-4 justify-center">
                <input
                  type="text"
                  value={battleState.shareableLink || ''}
                  readOnly
                  className="px-4 py-2 bg-gray-800 border-2 border-white text-white rounded-lg text-center flex-1 max-w-lg"
                />
                <button
                  onClick={copyShareableLink}
                  className="px-6 py-2 bg-blue-800 hover:bg-blue-700 border-2 border-white text-white font-bold rounded-lg"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-sm mt-2 text-blue-300">Your friend will automatically join Team B when they click this link!</p>
            </div>
          )}

          {battleState.friendJoined && (
            <div className="px-12 py-4 bg-green-800 border-2 border-green-400 text-white font-bold rounded-lg text-2xl mb-6">
              🚀 STARTING BATTLE...
            </div>
          )}

          <div className="text-left max-w-2xl mx-auto space-y-2 text-sm mt-8">
            <p><strong className="text-yellow-300">Controls:</strong> Use <kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">W</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">A</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">S</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">D</kbd> to move, mouse to aim and shoot</p>
            <p><strong className="text-white">Objective:</strong> Eliminate your friend or plant/defuse bombs in their base!</p>
          </div>

          <button
            onClick={onBackToMenu}
            className="mt-6 px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg"
          >
            ← Leave Battle
          </button>
        </div>
      );
    }

    if (gameStatus === GameStatus.Playing || gameStatus === GameStatus.RoundOver) {
      // Find visible enemies for fog of war (same as vs AI)
      const myPlayer = gameData.players.find(p => p.id === battleState.playerId);
      const visibleEnemyIds = new Set<number>();
      
      if (myPlayer && myPlayer.health > 0) {
        const enemies = gameData.players.filter(p => p.teamId !== myPlayer.teamId);
        enemies.forEach(enemy => {
          if (enemy.health > 0) {
            const dist = Math.hypot(myPlayer.position.x - enemy.position.x, myPlayer.position.y - enemy.position.y);
            if (dist < 550) { // VISIBILITY_RANGE
              visibleEnemyIds.add(enemy.id);
            }
          }
        });
      }

      return (
        <Game 
          players={gameData.players} 
          bullets={gameData.gameState.bullets} 
          walls={walls} 
          mousePos={mouseRenderPos} 
          bomb={gameData.gameState.bomb}
          scores={gameData.scores}
          bloodParticles={gameData.gameState.bloodParticles}
          bloodSplats={gameData.gameState.bloodSplats}
          powerUp={gameData.gameState.powerUp}
          muzzleFlashes={gameData.gameState.muzzleFlashes}
          explosions={gameData.gameState.explosions}
          visibleEnemyIds={visibleEnemyIds}
          arenaWidth={arenaDimensions.width}
          arenaHeight={arenaDimensions.height}
          baseZones={baseZones}
        />
      );
    }

    if (gameStatus === GameStatus.GameOver) {
      const myPlayer = gameData.players.find(p => p.id === battleState.playerId);
      const myTeam = myPlayer?.teamId || 1;
      const myScore = myTeam === 1 ? gameData.scores.team1 : gameData.scores.team2;
      const enemyScore = myTeam === 1 ? gameData.scores.team2 : gameData.scores.team1;
      const didWin = myScore > enemyScore;

      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg">
          <h1 className="text-6xl font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mb-6">
            {didWin ? '🏆 VICTORY!' : '💀 DEFEAT!'}
          </h1>
          <h2 className="text-4xl font-bold mb-4" style={{color: didWin ? '#10B981' : '#EF4444'}}>
            {didWin ? 'You won the battle!' : 'Better luck next time!'}
          </h2>
          <h3 className="text-3xl mb-8 tabular-nums">
            Final Score: {myScore} - {enemyScore}
          </h3>
          
          <div className="space-x-4">
            <button
              onClick={handleCreateBattle}
              className="px-8 py-3 bg-green-800 hover:bg-green-700 border-2 border-white text-white font-bold rounded-lg text-xl"
            >
              🔄 Battle Again
            </button>
            <button
              onClick={onBackToMenu}
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg text-xl"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      );
    }

    return null;
  };
  
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black font-mono overflow-hidden">
      <div ref={gameContainerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <div style={{width: arenaDimensions.width, height: arenaDimensions.height}} className="relative flex items-center justify-center">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
