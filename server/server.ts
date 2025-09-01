import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  Player, 
  Bullet, 
  Vector, 
  Wall, 
  Bomb, 
  BloodParticle, 
  BloodSplat, 
  PowerUp, 
  MuzzleFlash, 
  Explosion,
  GameStatus,
  WeaponType
} from '../types.js';
import {
  ARENA_DIMENSIONS_BY_SIZE,
  PLAYER_SIZE,
  PLAYER_SPEED,
  PLAYER_HEALTH,
  RELOAD_TIME,
  BULLET_SPEED,
  WEAPON_STATS,
  BULLET_WIDTH,
  BULLET_HEIGHT,
  AI_TARGET_RANGE,
  AI_ACTION_INTERVAL,
  BOMB_PLANT_TIME,
  BOMB_DEFUSE_TIME,
  BOMB_COUNTDOWN,
  BOMB_DEFUSE_RADIUS,
  MAX_ROUNDS,
  AI_UNSTUCK_DURATION,
  POWERUP_DURATION,
  POWERUP_SPAWN_TIME_BY_SIZE,
  POWERUP_SIZE,
  HEALTH_PACK_AMOUNT,
  POWERUP_HEALTH_CHANCE,
  MUZZLE_FLASH_DURATION,
  VISIBILITY_RANGE,
  BOMB_EXPLOSION_DURATION,
  AI_IDEAL_DISTANCE_MIN
} from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// CORS configuration for development and production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://stick-figure-arena-production.up.railway.app'] // Replace with your Railway domain
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // In production, serve the built React app
  app.use(express.static(path.join(__dirname, '../../')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../index.html'));
  });
} else {
  // In development, just serve a simple message
  app.get('/', (req, res) => {
    res.json({ message: 'Stick Figure Arena Server is running!' });
  });
}

const io = new Server(server, {
  cors: corsOptions
});

interface GameRoom {
  id: string;
  players: Map<string, Player & { socketId: string; isReady: boolean }>;
  gameState: {
    bullets: Bullet[];
    bomb: Bomb | null;
    bloodParticles: BloodParticle[];
    bloodSplats: BloodSplat[];
    powerUp: PowerUp | null;
    muzzleFlashes: MuzzleFlash[];
    explosions: Explosion[];
  };
  walls: Wall[];
  scores: { team1: number; team2: number };
  status: GameStatus;
  teamSize: number;
  arenaDimensions: { width: number; height: number };
  baseZones: (Wall & { id: number })[];
  roundWinnerTeamId: number | null;
  winnerTeamId: number | null;
  lastUpdate: number;
  powerupTimeout: NodeJS.Timeout | null;
  gameLoop: NodeJS.Timeout | null;
}

const rooms = new Map<string, GameRoom>();

// Helper functions (simplified versions from client)
const checkCollision = (
  item: { position: Vector, width: number, height: number },
  wall: Wall
) => {
  const itemLeft = item.position.x - item.width / 2;
  const itemRight = item.position.x + item.width / 2;
  const itemTop = item.position.y - item.height / 2;
  const itemBottom = item.position.y + item.height / 2;

  return itemLeft < wall.x + wall.width &&
         itemRight > wall.x &&
         itemTop < wall.y + wall.height &&
         itemBottom > wall.y;
};

const isPlayerInZone = (player: Player, zone: Wall) => {
  return player.position.x > zone.x &&
         player.position.x < zone.x + zone.width &&
         player.position.y > zone.y &&
         player.position.y < zone.y + zone.height;
};

const generateWalls = (arenaWidth: number, arenaHeight: number): Wall[] => {
  const walls: Wall[] = [];
  const wallThickness = 10;
  const padding = 150;

  const addSymWall = (wall: Wall) => {
    walls.push(wall);
    walls.push({ ...wall, x: arenaWidth - wall.x - wall.width });
  };

  // Generate side rooms
  const numRoomPairs = 2;
  for (let i = 0; i < numRoomPairs; i++) {
    const roomWidth = 100 + Math.random() * 80;
    const roomHeight = 100 + Math.random() * 120;
    const doorSize = 50;

    const x = padding + Math.random() * (arenaWidth / 2 - padding - roomWidth);
    const y = 40 + Math.random() * (arenaHeight - 80 - roomHeight);

    const topWall = { x, y, width: roomWidth, height: wallThickness };
    const bottomWall = { x, y: y + roomHeight - wallThickness, width: roomWidth, height: wallThickness };
    const leftWall = { x, y, width: wallThickness, height: roomHeight };
    const rightWall = { x: x + roomWidth - wallThickness, y, width: wallThickness, height: roomHeight };

    if (Math.random() > 0.4) {
      addSymWall(topWall);
    } else {
      const doorStart = x + (roomWidth - doorSize) / 2;
      addSymWall({ ...topWall, width: doorStart - x });
      addSymWall({ ...topWall, x: doorStart + doorSize, width: roomWidth - (doorStart - x) - doorSize });
    }

    if (Math.random() > 0.4) {
      addSymWall(bottomWall);
    } else {
      const doorStart = x + (roomWidth - doorSize) / 2;
      addSymWall({ ...bottomWall, width: doorStart - x });
      addSymWall({ ...bottomWall, x: doorStart + doorSize, width: roomWidth - (doorStart - x) - doorSize });
    }

    if (Math.random() > 0.4) {
      addSymWall(leftWall);
    } else {
      const doorStart = y + (roomHeight - doorSize) / 2;
      addSymWall({ ...leftWall, height: doorStart - y });
      addSymWall({ ...leftWall, y: doorStart + doorSize, height: roomHeight - (doorStart - y) - doorSize });
    }

    if (x + roomWidth < arenaWidth / 2 - 40) {
      if (Math.random() > 0.4) {
        addSymWall(rightWall);
      } else {
        const doorStart = y + (roomHeight - doorSize) / 2;
        addSymWall({ ...rightWall, height: doorStart - y });
        addSymWall({ ...rightWall, y: doorStart + doorSize, height: roomHeight - (doorStart - y) - doorSize });
      }
    }
  }

  // Generate central structure
  const centralWidth = 100 + Math.random() * 80;
  const centralHeight = 150 + Math.random() * 100;
  const cx = arenaWidth / 2 - centralWidth / 2;
  const cy = arenaHeight / 2 - centralHeight / 2;
  
  const cTop = { x: cx, y: cy, width: centralWidth, height: wallThickness };
  const cBottom = { x: cx, y: cy + centralHeight - wallThickness, width: centralWidth, height: wallThickness };
  const cLeft = { x: cx, y: cy, width: wallThickness, height: centralHeight };
  const cRight = { x: cx + centralWidth - wallThickness, y: cy, width: wallThickness, height: centralHeight };
  const doorSize = 60;
  
  const doorStartX = cx + (centralWidth - doorSize) / 2;
  walls.push({ ...cTop, width: doorStartX - cx });
  walls.push({ ...cTop, x: doorStartX + doorSize, width: (cx + centralWidth) - (doorStartX + doorSize) });
  walls.push({ ...cBottom, width: doorStartX - cx });
  walls.push({ ...cBottom, x: doorStartX + doorSize, width: (cx + centralWidth) - (doorStartX + doorSize) });

  const doorStartY = cy + (centralHeight - doorSize) / 2;
  walls.push({ ...cLeft, height: doorStartY - cy });
  walls.push({ ...cLeft, y: doorStartY + doorSize, height: (cy + centralHeight) - (doorStartY + doorSize) });
  walls.push({ ...cRight, height: doorStartY - cy });
  walls.push({ ...cRight, y: doorStartY + doorSize, height: (cy + centralHeight) - (doorStartY + doorSize) });

  return walls;
};

const createRoom = (roomId: string, teamSize: number): GameRoom => {
  const dimensions = ARENA_DIMENSIONS_BY_SIZE[teamSize as keyof typeof ARENA_DIMENSIONS_BY_SIZE];
  const newBaseZones: (Wall & {id: number})[] = [
    { id: 1, x: 0, y: dimensions.height / 2 - 100, width: 120, height: 200 },
    { id: 2, x: dimensions.width - 120, y: dimensions.height / 2 - 100, width: 120, height: 200 },
  ];
  const newWalls = generateWalls(dimensions.width, dimensions.height);

  return {
    id: roomId,
    players: new Map(),
    gameState: {
      bullets: [],
      bomb: null,
      bloodParticles: [],
      bloodSplats: [],
      powerUp: null,
      muzzleFlashes: [],
      explosions: [],
    },
    walls: newWalls,
    scores: { team1: 0, team2: 0 },
    status: GameStatus.Start,
    teamSize,
    arenaDimensions: dimensions,
    baseZones: newBaseZones,
    roundWinnerTeamId: null,
    winnerTeamId: null,
    lastUpdate: Date.now(),
    powerupTimeout: null,
    gameLoop: null
  };
};

const generatePlayerSpawn = (teamId: number, baseZones: (Wall & {id: number})[], existingPlayers: Player[]): Vector => {
  const base = baseZones[teamId - 1];
  const teamPlayers = existingPlayers.filter(p => p.teamId === teamId);
  const yOffset = base.height / (teamPlayers.length + 2); // +2 for padding
  
  return {
    x: base.x + 60,
    y: base.y + (teamPlayers.length + 1) * yOffset
  };
};

const startGameLoop = (room: GameRoom) => {
  if (room.gameLoop) {
    clearInterval(room.gameLoop);
  }

  room.gameLoop = setInterval(() => {
    if (room.status !== GameStatus.Playing) return;

    const now = Date.now();
    const delta = now - room.lastUpdate;
    room.lastUpdate = now;

    // Update game state here (simplified for multiplayer)
    // This would include bullet movement, collision detection, etc.
    
    // Emit game state to all players in room
    io.to(room.id).emit('gameStateUpdate', {
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        teamId: p.teamId,
        position: p.position,
        angle: p.angle,
        health: p.health,
        weapon: p.weapon,
        ammo: p.ammo,
        isReloading: p.isReloading
      })),
      gameState: room.gameState,
      scores: room.scores,
      status: room.status
    });
  }, 1000 / 60); // 60 FPS
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (data: { teamSize: number; currentUrl?: string }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = createRoom(roomId, data.teamSize);
    rooms.set(roomId, room);
    
    socket.join(roomId);
    
    // Create shareable link using the current page URL
    let shareableLink = '';
    if (data.currentUrl) {
      const url = new URL(data.currentUrl);
      shareableLink = `${url.origin}?battle=${roomId}`;
    } else {
      // Fallback for local development
      shareableLink = `http://localhost:3001?battle=${roomId}`;
    }
    
    socket.emit('roomCreated', { roomId, shareableLink });
    console.log(`Room ${roomId} created with team size ${data.teamSize}`);
  });

  socket.on('joinRoom', (data: { roomId: string; playerName?: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      socket.emit('error', { message: 'Battle not found' });
      return;
    }

    // Check if room is full
    if (room.players.size >= room.teamSize * 2) {
      socket.emit('error', { message: 'Battle is full' });
      return;
    }

    // For simple battles: First player is always Team A (host), second player is Team B
    const isHost = room.players.size === 0;
    const teamId = isHost ? 1 : 2;

    // Create player
    const playerId = Math.floor(Math.random() * 10000);
    const spawnPosition = generatePlayerSpawn(teamId, room.baseZones, Array.from(room.players.values()));
    
    const newPlayer: Player & { socketId: string; isReady: boolean } = {
      id: playerId,
      teamId,
      position: spawnPosition,
      angle: teamId === 1 ? 0 : 180,
      health: PLAYER_HEALTH,
      lastShotTime: 0,
      ammo: WEAPON_STATS.Pistol.ammo,
      isReloading: false,
      reloadStartTime: 0,
      weapon: 'Pistol' as WeaponType,
      powerUpEndTime: 0,
      socketId: socket.id,
      isReady: false
    };

    room.players.set(socket.id, newPlayer);
    socket.join(data.roomId);

    socket.emit('joinedRoom', { 
      roomId: data.roomId, 
      playerId,
      teamId,
      isHost,
      room: {
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          teamId: p.teamId,
          isReady: p.isReady
        })),
        teamSize: room.teamSize,
        status: room.status
      }
    });

    // If this is the second player (friend), notify the host
    if (!isHost) {
      socket.to(data.roomId).emit('playerJoined', { 
        player: {
          id: newPlayer.id,
          teamId: newPlayer.teamId,
          isReady: newPlayer.isReady
        }
      });
    }

    console.log(`Player ${playerId} joined room ${data.roomId} on team ${teamId} ${isHost ? '(host)' : '(friend)'}`);
  });

  socket.on('playerReady', () => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // For simple battles, only need the host to be ready and have 2 players
    const hasEnoughPlayers = room.players.size >= 2;
    
    if (hasEnoughPlayers) {
      // Start the game immediately
      room.status = GameStatus.Playing;
      startGameLoop(room);
      
      io.to(room.id).emit('gameStarted', {
        walls: room.walls,
        baseZones: room.baseZones,
        arenaDimensions: room.arenaDimensions
      });
    } else {
      socket.emit('error', { message: 'Waiting for your friend to join!' });
    }
  });

  socket.on('playerInput', (data: { 
    movement: { dx: number; dy: number }; 
    angle: number; 
    shooting: boolean;
    spacePressed: boolean;
  }) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if (!room || room.status !== GameStatus.Playing) return;

    const player = room.players.get(socket.id);
    if (!player || player.health <= 0) return;

    // Update player position
    if (data.movement.dx !== 0 || data.movement.dy !== 0) {
      const magnitude = Math.hypot(data.movement.dx, data.movement.dy);
      const velocityX = (data.movement.dx / magnitude) * PLAYER_SPEED;
      const velocityY = (data.movement.dy / magnitude) * PLAYER_SPEED;
      const nextPos = { 
        x: player.position.x + velocityX, 
        y: player.position.y + velocityY 
      };
      
      // Check collision with walls and arena bounds
      if (!room.walls.some(wall => checkCollision({ position: nextPos, width: PLAYER_SIZE, height: PLAYER_SIZE }, wall)) && 
          nextPos.x > PLAYER_SIZE / 2 && nextPos.x < room.arenaDimensions.width - PLAYER_SIZE / 2 &&
          nextPos.y > PLAYER_SIZE / 2 && nextPos.y < room.arenaDimensions.height - PLAYER_SIZE / 2
      ) {
        player.position = nextPos;
      }
    }

    // Update angle
    player.angle = data.angle;

    // Handle shooting
    if (data.shooting && !player.isReloading && player.ammo > 0) {
      const now = Date.now();
      const weaponStats = WEAPON_STATS[player.weapon];
      
      if (now - player.lastShotTime > weaponStats.cooldown) {
        // Create bullet
        const angleRad = player.angle * (Math.PI / 180);
        const bullet: Bullet = {
          id: `${player.id}-${now}-${Math.random()}`,
          playerId: player.id,
          position: { ...player.position },
          velocity: {
            x: Math.cos(angleRad) * BULLET_SPEED,
            y: Math.sin(angleRad) * BULLET_SPEED,
          },
        };

        room.gameState.bullets.push(bullet);
        room.gameState.muzzleFlashes.push({
          id: `mf-${now}-${player.id}`,
          playerId: player.id,
          life: MUZZLE_FLASH_DURATION
        });

        player.lastShotTime = now;
        player.ammo -= 1;
        
        if (player.ammo === 0) {
          player.isReloading = true;
          player.reloadStartTime = now;
        }
      }
    }

    // Handle bomb planting/defusing with space
    if (data.spacePressed && room.gameState.bomb) {
      // Handle bomb interactions
      // Implementation would go here
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove player from any room
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        room.players.delete(socket.id);
        
        // Notify other players
        socket.to(roomId).emit('playerLeft', { playerId: player?.id });
        
        // Clean up empty rooms
        if (room.players.size === 0) {
          if (room.gameLoop) clearInterval(room.gameLoop);
          if (room.powerupTimeout) clearTimeout(room.powerupTimeout);
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
