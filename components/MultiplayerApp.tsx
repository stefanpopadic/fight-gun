import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInput } from '../hooks/useInput';
import { useSocket } from '../hooks/useSocket';
import { GameStatus, MultiplayerRoom } from '../types';
import type { Player, Bullet, Vector, Wall, Bomb, BloodParticle, BloodSplat, PowerUp, MuzzleFlash, Explosion } from '../types';
import { Game } from './Game';
import { PLAYER_SIZE, MAX_ROUNDS } from '../constants';

interface MultiplayerAppProps {
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

export const MultiplayerApp: React.FC<MultiplayerAppProps> = ({ onBackToMenu }) => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Start);
  const [roomState, setRoomState] = useState<{
    roomId: string | null;
    playerId: number | null;
    teamId: number | null;
    players: Array<{ id: number; teamId: number; isReady: boolean }>;
    teamSize: number;
    allReady: boolean;
  }>({
    roomId: null,
    playerId: null,
    teamId: null,
    players: [],
    teamSize: 1,
    allReady: false
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
  const [joinRoomId, setJoinRoomId] = useState('');

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const keysPressedRef = useInput();
  const mousePosRef = useRef<Vector>({ x: 0, y: 0 });
  const p1ShootingRef = useRef(false);
  const spaceHeldRef = useRef(false);

  // Socket event handlers
  const onRoomCreated = useCallback((roomId: string) => {
    setRoomState(prev => ({ ...prev, roomId }));
  }, []);

  const onJoinedRoom = useCallback((data: { roomId: string; playerId: number; teamId: number; room: any }) => {
    setRoomState({
      roomId: data.roomId,
      playerId: data.playerId,
      teamId: data.teamId,
      players: data.room.players,
      teamSize: data.room.teamSize,
      allReady: false
    });
    setError(null);
  }, []);

  const onPlayerJoined = useCallback((data: { player: any }) => {
    setRoomState(prev => ({
      ...prev,
      players: [...prev.players.filter(p => p.id !== data.player.id), data.player]
    }));
  }, []);

  const onPlayerLeft = useCallback((data: { playerId: number }) => {
    setRoomState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== data.playerId)
    }));
  }, []);

  const onPlayerReadyUpdate = useCallback((data: { playerId: number; isReady: boolean; allReady: boolean }) => {
    setRoomState(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === data.playerId ? { ...p, isReady: data.isReady } : p
      ),
      allReady: data.allReady
    }));
  }, []);

  const onGameStarted = useCallback((data: { walls: Wall[]; baseZones: (Wall & { id: number })[]; arenaDimensions: { width: number; height: number } }) => {
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
    onRoomCreated,
    onJoinedRoom,
    onPlayerJoined,
    onPlayerLeft,
    onPlayerReadyUpdate,
    onGameStarted,
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
    if (gameStatus !== GameStatus.Playing || !roomState.playerId) return;

    const gameLoop = () => {
      const keys = keysPressedRef.current;
      let dx = 0;
      let dy = 0;

      if (keys['KeyW']) dy -= 1;
      if (keys['KeyS']) dy += 1;
      if (keys['KeyA']) dx -= 1;
      if (keys['KeyD']) dx += 1;

      const myPlayer = gameData.players.find(p => p.id === roomState.playerId);
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
  }, [gameStatus, roomState.playerId, sendPlayerInput, gameData.players]);

  const handleCreateRoom = (teamSize: number) => {
    createRoom(teamSize);
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      joinRoom(joinRoomId.toUpperCase());
    }
  };

  const handleSetReady = () => {
    setPlayerReady();
  };

  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg">
          <h1 className="text-4xl font-black mb-4">Connecting to server...</h1>
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
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!roomState.roomId) {
      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg max-w-2xl">
          <h1 className="text-6xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mb-8">
            MULTIPLAYER ARENA
          </h1>
          
          <div className="mb-8">
            <h2 className="text-2xl mb-4">Create a Room</h2>
            <div className="flex justify-center gap-4 mb-6">
              {[1, 3, 5].map(size => (
                <button
                  key={size}
                  onClick={() => handleCreateRoom(size)}
                  className="px-6 py-3 bg-blue-800 hover:bg-blue-700 border-2 border-white text-white font-bold rounded-lg transition-transform transform hover:scale-105"
                >
                  {size} vs {size}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/30 pt-6">
            <h2 className="text-2xl mb-4">Join a Room</h2>
            <div className="flex justify-center gap-2 mb-6">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="Room ID"
                className="px-4 py-2 bg-gray-800 border-2 border-white text-white rounded-lg uppercase text-center tracking-wider"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!joinRoomId.trim()}
                className="px-6 py-2 bg-green-800 hover:bg-green-700 disabled:bg-gray-600 border-2 border-white text-white font-bold rounded-lg transition-transform transform hover:scale-105 disabled:scale-100"
              >
                Join
              </button>
            </div>
          </div>

          <button
            onClick={onBackToMenu}
            className="mt-6 px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg"
          >
            Back to Menu
          </button>
        </div>
      );
    }

    if (gameStatus === GameStatus.Start) {
      const myPlayer = roomState.players.find(p => p.id === roomState.playerId);
      const team1Players = roomState.players.filter(p => p.teamId === 1);
      const team2Players = roomState.players.filter(p => p.teamId === 2);

      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg max-w-4xl">
          <h1 className="text-4xl font-black mb-4">Room: {roomState.roomId}</h1>
          <h2 className="text-2xl mb-6">{roomState.teamSize} vs {roomState.teamSize} Match</h2>
          
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-4">Team 1 (Yellow)</h3>
              {team1Players.map(player => (
                <div 
                  key={player.id} 
                  className={`p-2 mb-2 rounded ${player.id === roomState.playerId ? 'bg-yellow-800' : 'bg-gray-800'}`}
                >
                  Player {player.id} {player.isReady ? '✓' : '⏳'}
                </div>
              ))}
              {Array.from({ length: roomState.teamSize - team1Players.length }).map((_, i) => (
                <div key={i} className="p-2 mb-2 rounded bg-gray-600 text-gray-400">
                  Waiting for player...
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xl font-bold text-red-400 mb-4">Team 2 (Red)</h3>
              {team2Players.map(player => (
                <div 
                  key={player.id} 
                  className={`p-2 mb-2 rounded ${player.id === roomState.playerId ? 'bg-red-800' : 'bg-gray-800'}`}
                >
                  Player {player.id} {player.isReady ? '✓' : '⏳'}
                </div>
              ))}
              {Array.from({ length: roomState.teamSize - team2Players.length }).map((_, i) => (
                <div key={i} className="p-2 mb-2 rounded bg-gray-600 text-gray-400">
                  Waiting for player...
                </div>
              ))}
            </div>
          </div>

          {myPlayer && !myPlayer.isReady && (
            <button
              onClick={handleSetReady}
              className="px-8 py-3 bg-green-800 hover:bg-green-700 border-2 border-white text-white font-bold rounded-lg text-xl mb-4"
            >
              Ready!
            </button>
          )}

          {myPlayer?.isReady && !roomState.allReady && (
            <p className="text-xl mb-4">Waiting for other players to ready up...</p>
          )}

          {roomState.allReady && (
            <p className="text-xl text-green-400 mb-4">All players ready! Starting game...</p>
          )}

          <div className="mt-6 text-left max-w-2xl mx-auto space-y-2 text-sm">
            <p><strong className="text-yellow-300">Controls:</strong> Use <kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">W</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">A</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">S</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">D</kbd> to move, mouse to aim and shoot</p>
            <p><strong className="text-white">Bomb:</strong> Hold <kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">Space</kbd> in enemy base to plant/defuse</p>
          </div>

          <button
            onClick={onBackToMenu}
            className="mt-6 px-6 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg"
          >
            Leave Room
          </button>
        </div>
      );
    }

    if (gameStatus === GameStatus.Playing || gameStatus === GameStatus.RoundOver) {
      // Find visible enemies for fog of war
      const myPlayer = gameData.players.find(p => p.id === roomState.playerId);
      const visibleEnemyIds = new Set<number>();
      
      if (myPlayer && myPlayer.health > 0) {
        const enemies = gameData.players.filter(p => p.teamId !== myPlayer.teamId);
        // Simplified visibility - in a full implementation, you'd check line of sight
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
      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg">
          <h1 className="text-6xl font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">GAME OVER</h1>
          <h2 className="mt-4 text-4xl font-bold">
            Final Score: {gameData.scores.team1} - {gameData.scores.team2}
          </h2>
          <button
            onClick={onBackToMenu}
            className="mt-10 px-12 py-4 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg text-2xl transition-transform transform hover:scale-105"
          >
            Back to Menu
          </button>
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
