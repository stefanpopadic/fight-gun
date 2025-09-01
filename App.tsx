




import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInput } from './hooks/useInput';
import { GameStatus, AIState, AIObjective, GameMode } from './types';
import type { Player, Bullet, Vector, Wall, AIAction, Bomb, BloodParticle, BloodSplat, PowerUp, WeaponType, MuzzleFlash, Explosion } from './types';
import { Game } from './components/Game';
import { MultiplayerApp } from './components/MultiplayerApp';
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
} from './constants';

const generateInitialPlayers = (teamSize: number, baseZones: (Wall & {id: number})[]): Player[] => {
    const players: Player[] = [];
    const team1Base = baseZones[0];
    const team2Base = baseZones[1];
    let playerIdCounter = 1;

    const yOffset = team1Base.height / (teamSize + 1);

    for (let i = 0; i < teamSize; i++) {
        // Team 1
        players.push({
            id: playerIdCounter++,
            teamId: 1,
            position: { x: team1Base.x + 60, y: team1Base.y + (i + 1) * yOffset },
            angle: 0, 
            health: PLAYER_HEALTH, 
            lastShotTime: 0, 
            ammo: WEAPON_STATS.Pistol.ammo, 
            isReloading: false, 
            reloadStartTime: 0, 
            weapon: 'Pistol', 
            powerUpEndTime: 0,
            aiState: AIState.THINKING, 
            aiObjective: AIObjective.ELIMINATE, 
            aiAction: 'ATTACK', 
            aiStateChangeTime: 0, 
            aiStuckTime: 0
        });

        // Team 2
        players.push({
            id: playerIdCounter++,
            teamId: 2,
            position: { x: team2Base.x + 60, y: team2Base.y + (i + 1) * yOffset },
            angle: 180, 
            health: PLAYER_HEALTH, 
            lastShotTime: 0,
            ammo: WEAPON_STATS.Pistol.ammo, 
            isReloading: false, 
            reloadStartTime: 0, 
            weapon: 'Pistol', 
            powerUpEndTime: 0,
            aiState: AIState.THINKING, 
            aiObjective: AIObjective.ELIMINATE, 
            aiAction: 'ATTACK', 
            aiStateChangeTime: 0, 
            aiStuckTime: 0
        });
    }
    return players;
};


const generateWalls = (arenaWidth: number, arenaHeight: number): Wall[] => {
    const walls: Wall[] = [];
    const wallThickness = 10;
    const padding = 150; // Keep away from player spawns

    // Helper to add a symmetrical pair of walls
    const addSymWall = (wall: Wall) => {
        walls.push(wall);
        walls.push({ ...wall, x: arenaWidth - wall.x - wall.width });
    };

    // --- Generate Side Rooms ---
    const numRoomPairs = 2;
    for (let i = 0; i < numRoomPairs; i++) {
        const roomWidth = 100 + Math.random() * 80;
        const roomHeight = 100 + Math.random() * 120;
        const doorSize = 50;

        // Ensure rooms don't overlap too much or go off-screen
        const x = padding + Math.random() * (arenaWidth / 2 - padding - roomWidth);
        const y = 40 + Math.random() * (arenaHeight - 80 - roomHeight);

        // Define the four walls of the room
        const topWall =    { x, y, width: roomWidth, height: wallThickness };
        const bottomWall = { x, y: y + roomHeight - wallThickness, width: roomWidth, height: wallThickness };
        const leftWall =   { x, y, width: wallThickness, height: roomHeight };
        const rightWall =  { x: x + roomWidth - wallThickness, y, width: wallThickness, height: roomHeight };

        // Add walls, creating doors randomly
        
        // Top/Bottom walls with vertical doors
        if (Math.random() > 0.4) {
            addSymWall(topWall);
        } else { // Create a door
            const doorStart = x + (roomWidth - doorSize) / 2;
            addSymWall({ ...topWall, width: doorStart - x });
            addSymWall({ ...topWall, x: doorStart + doorSize, width: roomWidth - (doorStart - x) - doorSize });
        }
        if (Math.random() > 0.4) {
            addSymWall(bottomWall);
        } else { // Create a door
            const doorStart = x + (roomWidth - doorSize) / 2;
            addSymWall({ ...bottomWall, width: doorStart - x });
            addSymWall({ ...bottomWall, x: doorStart + doorSize, width: roomWidth - (doorStart - x) - doorSize });
        }

        // Left/Right walls with horizontal doors
        if (Math.random() > 0.4) {
            addSymWall(leftWall);
        } else { // Create a door
            const doorStart = y + (roomHeight - doorSize) / 2;
            addSymWall({ ...leftWall, height: doorStart - y });
            addSymWall({ ...leftWall, y: doorStart + doorSize, height: roomHeight - (doorStart - y) - doorSize });
        }

        // Only add right wall if it's not too close to the center
        if (x + roomWidth < arenaWidth / 2 - 40) {
            if (Math.random() > 0.4) {
                addSymWall(rightWall);
            } else { // Create a door
                const doorStart = y + (roomHeight - doorSize) / 2;
                addSymWall({ ...rightWall, height: doorStart - y });
                addSymWall({ ...rightWall, y: doorStart + doorSize, height: roomHeight - (doorStart - y) - doorSize });
            }
        }
    }

    // --- Generate Central Structure ---
    const centralWidth = 100 + Math.random() * 80;
    const centralHeight = 150 + Math.random() * 100;
    const cx = arenaWidth / 2 - centralWidth / 2;
    const cy = arenaHeight / 2 - centralHeight / 2;
    
    // Central room walls
    const cTop = { x: cx, y: cy, width: centralWidth, height: wallThickness };
    const cBottom = { x: cx, y: cy + centralHeight - wallThickness, width: centralWidth, height: wallThickness };
    const cLeft = { x: cx, y: cy, width: wallThickness, height: centralHeight };
    const cRight = { x: cx + centralWidth - wallThickness, y: cy, width: wallThickness, height: centralHeight };
    const doorSize = 60;
    
    // Top and Bottom walls with doors
    const doorStartX = cx + (centralWidth - doorSize) / 2;
    walls.push({ ...cTop, width: doorStartX - cx });
    walls.push({ ...cTop, x: doorStartX + doorSize, width: (cx + centralWidth) - (doorStartX + doorSize) });
    walls.push({ ...cBottom, width: doorStartX - cx });
    walls.push({ ...cBottom, x: doorStartX + doorSize, width: (cx + centralWidth) - (doorStartX + doorSize) });

    // Left and Right walls with doors
    const doorStartY = cy + (centralHeight - doorSize) / 2;
    walls.push({ ...cLeft, height: doorStartY - cy });
    walls.push({ ...cLeft, y: doorStartY + doorSize, height: (cy + centralHeight) - (doorStartY + doorSize) });
    walls.push({ ...cRight, height: doorStartY - cy });
    walls.push({ ...cRight, y: doorStartY + doorSize, height: (cy + centralHeight) - (doorStartY + doorSize) });

    return walls;
};


//#region Collision and Geometry Helpers
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
}

const onSegment = (p: Vector, q: Vector, r: Vector) => {
    return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y));
}

const orientation = (p: Vector, q: Vector, r: Vector) => {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0;
    return (val > 0) ? 1 : 2;
}

const segmentsIntersect = (p1: Vector, q1: Vector, p2: Vector, q2: Vector) => {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;

    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
}

const hasLineOfSight = (p1: Vector, p2: Vector, walls: Wall[]): boolean => {
    for (const wall of walls) {
        const corners = [
            { x: wall.x, y: wall.y }, { x: wall.x + wall.width, y: wall.y },
            { x: wall.x + wall.width, y: wall.y + wall.height }, { x: wall.x, y: wall.y + wall.height },
        ];
        if (segmentsIntersect(p1, p2, corners[0], corners[1])) return false;
        if (segmentsIntersect(p1, p2, corners[1], corners[2])) return false;
        if (segmentsIntersect(p1, p2, corners[2], corners[3])) return false;
        if (segmentsIntersect(p1, p2, corners[3], corners[0])) return false;
    }
    return true;
}

const findCover = (player: Player, enemy: Player, walls: Wall[], arenaWidth: number, arenaHeight: number): Vector | null => {
    let bestCoverSpot: Vector | null = null;
    let minCombinedDist = Infinity;

    const enemyToPlayerDir = {
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y,
    };
    const mag = Math.hypot(enemyToPlayerDir.x, enemyToPlayerDir.y);
    if (mag === 0) return null;
    enemyToPlayerDir.x /= mag;
    enemyToPlayerDir.y /= mag;

    for (const wall of walls) {
        const wallCenter = { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 };
        const coverSpot = {
            x: wallCenter.x + enemyToPlayerDir.x * 30,
            y: wallCenter.y + enemyToPlayerDir.y * 30,
        };

        if (coverSpot.x < 0 || coverSpot.x > arenaWidth || coverSpot.y < 0 || coverSpot.y > arenaHeight) continue;
        if (walls.some(w => checkCollision({ position: coverSpot, width: 1, height: 1 }, w))) continue;

        if (!hasLineOfSight(enemy.position, coverSpot, walls)) {
            const distToCover = Math.hypot(player.position.x - coverSpot.x, player.position.y - coverSpot.y);
            const distEnemyToCover = Math.hypot(enemy.position.x - coverSpot.x, enemy.position.y - coverSpot.y);
            
            const combinedDist = distToCover + distEnemyToCover * 0.5;

            if (combinedDist < minCombinedDist) {
                minCombinedDist = combinedDist;
                bestCoverSpot = coverSpot;
            }
        }
    }
    return bestCoverSpot;
};

const findFlankPosition = (player: Player, enemy: Player, flankDirection: 'LEFT' | 'RIGHT'): Vector => {
    const enemyToPlayerDir = {
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y
    };
    const dist = Math.hypot(enemyToPlayerDir.x, enemyToPlayerDir.y);
    
    const dir = {
        x: dist > 0 ? enemyToPlayerDir.x / dist : 0,
        y: dist > 0 ? enemyToPlayerDir.y / dist : 0
    };

    const perpDir = flankDirection === 'LEFT' ? { x: -dir.y, y: dir.x } : { x: dir.y, y: -dir.x };
    
    const flankDistance = 200;

    return {
        x: enemy.position.x + perpDir.x * flankDistance,
        y: enemy.position.y + perpDir.y * flankDistance
    };
};
//#endregion

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Start);
  const [teamSize, setTeamSize] = useState(1);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [gameState, setGameState] = useState({ 
      players: [] as Player[], 
      bullets: [] as Bullet[], 
      bomb: null as Bomb | null,
      bloodParticles: [] as BloodParticle[],
      bloodSplats: [] as BloodSplat[],
      powerUp: null as PowerUp | null,
      muzzleFlashes: [] as MuzzleFlash[],
      explosions: [] as Explosion[],
  });
  const [scores, setScores] = useState({ team1: 0, team2: 0 });
  const [roundWinnerTeamId, setRoundWinnerTeamId] = useState<number | null>(null);
  const [winnerTeamId, setWinnerTeamId] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [mouseRenderPos, setMouseRenderPos] = useState<Vector>({ x: 0, y: 0 });
  const [screenShake, setScreenShake] = useState({ magnitude: 0, duration: 0 });
  const [visibleEnemyIds, setVisibleEnemyIds] = useState<Set<number>>(new Set());
  
  const defaultDims = ARENA_DIMENSIONS_BY_SIZE[1];
  const [arenaDimensions, setArenaDimensions] = useState(defaultDims);
  const [baseZones, setBaseZones] = useState<(Wall & { id: number })[]>([]);
  const [powerupSpawnTime, setPowerupSpawnTime] = useState(POWERUP_SPAWN_TIME_BY_SIZE[1]);


  const gameContainerRef = useRef<HTMLDivElement>(null);
  const keysPressedRef = useInput();
  const mousePosRef = useRef<Vector>({ x: 0, y: 0 });
  const p1ShootingRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const lastFrameTime = useRef(Date.now());
  const powerupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnPowerUp = useCallback((currentWalls: Wall[], arenaWidth: number, arenaHeight: number) => {
    const validPosition = () => {
        let pos: Vector;
        let isInvalid = true;
        while(isInvalid){
            pos = {
                x: Math.random() * (arenaWidth - 200) + 100,
                y: Math.random() * (arenaHeight - 100) + 50,
            };
            isInvalid = currentWalls.some(wall => checkCollision({position: pos, width: POWERUP_SIZE, height: POWERUP_SIZE}, wall))
        }
        return pos;
    };
    
    setGameState(prev => {
        const isHealth = Math.random() < POWERUP_HEALTH_CHANCE;
        const newPowerUp: PowerUp = isHealth
            ? {
                id: `pu-${Date.now()}`,
                position: validPosition(),
                type: 'HEALTH',
              }
            : {
                id: `pu-${Date.now()}`,
                position: validPosition(),
                type: 'WEAPON',
                weaponType: Math.random() > 0.5 ? 'MachineGun' : 'AK47',
              };
        return { ...prev, powerUp: newPowerUp };
    });

  }, []);

  const startNextRound = useCallback(() => {
    if(powerupTimeoutRef.current) clearTimeout(powerupTimeoutRef.current);
    powerupTimeoutRef.current = setTimeout(() => spawnPowerUp(walls, arenaDimensions.width, arenaDimensions.height), powerupSpawnTime / 2);

    setGameState(prev => ({
        ...prev,
        players: generateInitialPlayers(teamSize, baseZones),
        bullets: [],
        bomb: null,
        bloodParticles: [],
        muzzleFlashes: [],
        powerUp: null,
        explosions: [],
    }));
    setRoundWinnerTeamId(null);
    setGameStatus(GameStatus.Playing);
  }, [spawnPowerUp, teamSize, baseZones, powerupSpawnTime, walls, arenaDimensions]);
  
  const startGame = useCallback((size: number) => {
    const dimensions = ARENA_DIMENSIONS_BY_SIZE[size as keyof typeof ARENA_DIMENSIONS_BY_SIZE];
    const spawnTime = POWERUP_SPAWN_TIME_BY_SIZE[size as keyof typeof POWERUP_SPAWN_TIME_BY_SIZE];
    const newBaseZones: (Wall & {id: number})[] = [
        { id: 1, x: 0, y: dimensions.height / 2 - 100, width: 120, height: 200 },
        { id: 2, x: dimensions.width - 120, y: dimensions.height / 2 - 100, width: 120, height: 200 },
    ];
    const newWalls = generateWalls(dimensions.width, dimensions.height);

    setTeamSize(size);
    setArenaDimensions(dimensions);
    setBaseZones(newBaseZones);
    setPowerupSpawnTime(spawnTime);
    setWalls(newWalls);
    setScores({ team1: 0, team2: 0 });

    if(powerupTimeoutRef.current) clearTimeout(powerupTimeoutRef.current);
    powerupTimeoutRef.current = setTimeout(() => spawnPowerUp(newWalls, dimensions.width, dimensions.height), spawnTime / 2);

    setGameState({
        players: generateInitialPlayers(size, newBaseZones),
        bullets: [],
        bomb: null,
        bloodParticles: [],
        bloodSplats: [],
        powerUp: null,
        muzzleFlashes: [],
        explosions: [],
    });
    setRoundWinnerTeamId(null);
    setGameStatus(GameStatus.Playing);
  }, [spawnPowerUp]);

  const resetGame = useCallback(() => {
    startGame(teamSize);
  }, [teamSize, startGame]);


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
      }

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

  const createBullet = (player: Player): Bullet => {
    const angleRad = player.angle * (Math.PI / 180);
    return {
      id: `${player.id}-${Date.now()}-${Math.random()}`,
      playerId: player.id,
      position: { ...player.position },
      velocity: {
        x: Math.cos(angleRad) * BULLET_SPEED,
        y: Math.sin(angleRad) * BULLET_SPEED,
      },
    };
  };

  useEffect(() => {
      if (gameStatus === GameStatus.RoundOver) {
          if (roundWinnerTeamId) {
            const newScores = {...scores};
            if(roundWinnerTeamId === 1) newScores.team1++;
            else newScores.team2++;
            setScores(newScores);

            if(newScores.team1 >= MAX_ROUNDS || newScores.team2 >= MAX_ROUNDS) {
                setWinnerTeamId(roundWinnerTeamId);
                setGameStatus(GameStatus.GameOver);
            } else {
                startNextRound();
            }
          } else { 
              startNextRound();
          }
      }
  }, [gameStatus, roundWinnerTeamId, scores, startNextRound]);

  useEffect(() => {
    if (gameStatus !== GameStatus.Playing) return;

    let animationFrameId: number;

    const gameLoop = () => {
      const now = Date.now();
      const delta = now - lastFrameTime.current;
      lastFrameTime.current = now;
      
      setMouseRenderPos(mousePosRef.current);
      setScreenShake(prev => prev.duration > 0 ? { ...prev, duration: Math.max(0, prev.duration - delta) } : prev);


      setGameState(
        (currentState) => {
            let nextPlayers = currentState.players.map(p => ({...p}));
            let nextBullets = [...currentState.bullets];
            let nextBomb: Bomb | null = currentState.bomb ? {...currentState.bomb} : null;
            let nextBloodParticles = [...currentState.bloodParticles];
            let nextBloodSplats = [...currentState.bloodSplats];
            let nextPowerUp: PowerUp | null = currentState.powerUp ? {...currentState.powerUp} : null;
            let nextMuzzleFlashes = [...currentState.muzzleFlashes];
            let nextExplosions = [...currentState.explosions];

            const bulletsToAdd: Bullet[] = [];
            const bloodToAdd: BloodParticle[] = [];
            const splatsToAdd: BloodSplat[] = [];
            const muzzleFlashesToAdd: MuzzleFlash[] = [];
            const explosionsToAdd: Explosion[] = [];

            const keys = keysPressedRef.current;
            const humanPlayer = nextPlayers.find((p: Player) => p.id === 1);

            // Update Players
            for(const p of nextPlayers){
                if (p.health <= 0) continue;

                if (p.powerUpEndTime && now > p.powerUpEndTime) {
                    p.weapon = 'Pistol';
                    p.powerUpEndTime = 0;
                    p.ammo = Math.min(p.ammo, WEAPON_STATS.Pistol.ammo);
                }
                const weaponStats = WEAPON_STATS[p.weapon];

                if (p.isReloading && now - p.reloadStartTime > RELOAD_TIME) {
                    p.isReloading = false;
                    p.ammo = weaponStats.ammo;
                }

                let dx = 0;
                let dy = 0;
                
                // --- Player 1 (Human) Input ---
                if (p.id === 1) {
                    if (keys['KeyW']) dy -= 1;
                    if (keys['KeyS']) dy += 1;
                    if (keys['KeyA']) dx -= 1;
                    if (keys['KeyD']) dx += 1;
                    p.angle = Math.atan2(mousePosRef.current.y - p.position.y, mousePosRef.current.x - p.position.x) * 180 / Math.PI;
                    if (p1ShootingRef.current && !p.isReloading && p.ammo > 0 && now - p.lastShotTime > weaponStats.cooldown) {
                        bulletsToAdd.push(createBullet(p));
                        muzzleFlashesToAdd.push({ id: `mf-${now}-${p.id}`, playerId: p.id, life: MUZZLE_FLASH_DURATION });
                        p.lastShotTime = now;
                        p.ammo -= 1;
                        if (p.ammo === 0) { p.isReloading = true; p.reloadStartTime = now; }
                    }
                } 
                // --- AI Logic ---
                else { 
                    const enemies = nextPlayers.filter(e => e.teamId !== p.teamId && e.health > 0);
                    const allies = nextPlayers.filter(a => a.teamId === p.teamId && a.id !== p.id && a.health > 0);
                    const closestEnemy = enemies.length > 0 ? enemies.reduce((prev, curr) => Math.hypot(p.position.x - prev.position.x, p.position.y - prev.position.y) < Math.hypot(p.position.x - curr.position.x, p.position.y - curr.position.y) ? prev : curr) : null;

                    if (closestEnemy) {
                        const dxToEnemy = closestEnemy.position.x - p.position.x;
                        const dyToEnemy = closestEnemy.position.y - p.position.y;
                        const distToEnemy = Math.hypot(dxToEnemy, dyToEnemy);
                        
                         // --- Objective Selection ---
                        if (now - (p.aiStateChangeTime ?? 0) > AI_ACTION_INTERVAL / 2) {
                            let newObjective: AIObjective = AIObjective.ELIMINATE;
                            const enemyTeamId = p.teamId === 1 ? 2 : 1;
                            
                            if (nextBomb?.isPlanted && nextPlayers.find(pl => pl.id === nextBomb.planterId)?.teamId === enemyTeamId) {
                                newObjective = AIObjective.DEFUSE_BOMB;
                            } else if (nextPowerUp && ((nextPowerUp.type === 'HEALTH' && p.health < 75) || (nextPowerUp.type === 'WEAPON' && p.weapon === 'Pistol'))) {
                                newObjective = AIObjective.GET_POWERUP;
                            } else if (!nextBomb) {
                                const aliveEnemies = enemies.length;
                                const aliveAllies = allies.length + 1;
                                const shouldPlant = (aliveAllies > aliveEnemies && Math.random() < 0.4) || (distToEnemy > arenaDimensions.width / 2 && Math.random() < 0.2);
                                if (shouldPlant) {
                                     newObjective = AIObjective.PLANT_BOMB;
                                }
                            }
                            if (p.aiObjective !== newObjective) {
                                p.aiObjective = newObjective;
                                p.aiStateChangeTime = now;
                            }
                        }

                        // --- Target Position ---
                        const enemyBase = baseZones[p.teamId === 1 ? 1 : 0];
                        if (p.aiObjective === AIObjective.DEFUSE_BOMB && nextBomb) p.aiTargetPosition = nextBomb.position;
                        else if (p.aiObjective === AIObjective.GET_POWERUP && nextPowerUp) p.aiTargetPosition = nextPowerUp.position;
                        else if (p.aiObjective === AIObjective.PLANT_BOMB) p.aiTargetPosition = { x: enemyBase.x + enemyBase.width / 2, y: enemyBase.y + enemyBase.height / 2 };
                        else p.aiTargetPosition = closestEnemy.position;

                        const dxToTarget = (p.aiTargetPosition?.x ?? closestEnemy.position.x) - p.position.x;
                        const dyToTarget = (p.aiTargetPosition?.y ?? closestEnemy.position.y) - p.position.y;
                        const distToTarget = Math.hypot(dxToTarget, dyToTarget);
                        
                        p.angle = Math.atan2(dyToEnemy, dxToEnemy) * 180 / Math.PI;

                        let moveVector = {x: 0, y: 0};
                        
                        if (p.aiObjective === AIObjective.ELIMINATE && now - (p.aiStateChangeTime ?? 0) > AI_ACTION_INTERVAL) {
                            p.aiStateChangeTime = now;
                            const weights: { action: AIAction; weight: number }[] = [
                                { action: 'ATTACK', weight: 10 }, { action: 'RETREAT', weight: 5 },
                                { action: 'STRAFE_LEFT', weight: 8 }, { action: 'STRAFE_RIGHT', weight: 8 },
                                { action: 'HIDE', weight: 6 }, { action: 'FLANK_LEFT', weight: 7 },
                                { action: 'FLANK_RIGHT', weight: 7 },
                            ];

                            if (p.health < 40) {
                                weights.find(w => w.action === 'RETREAT')!.weight *= 3;
                                weights.find(w => w.action === 'HIDE')!.weight *= 3;
                                weights.find(w => w.action === 'ATTACK')!.weight /= 2;
                            }
                            if (p.weapon !== 'Pistol') weights.find(w => w.action === 'ATTACK')!.weight *= 1.5;
                            if (closestEnemy.weapon !== 'Pistol') {
                                weights.find(w => w.action === 'HIDE')!.weight *= 2;
                                weights.find(w => w.action === 'ATTACK')!.weight /= 1.5;
                            }
                            if (!hasLineOfSight(p.position, closestEnemy.position, walls)) {
                                weights.find(w => w.action === 'ATTACK')!.weight *= 2;
                                weights.find(w => w.action === 'HIDE')!.weight = 0;
                            }
                            if (distToEnemy < AI_IDEAL_DISTANCE_MIN) weights.find(w => w.action === 'RETREAT')!.weight *= 2;

                            const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
                            let random = Math.random() * totalWeight;
                            for (const weightedAction of weights) {
                                if (random < weightedAction.weight) {
                                    p.aiAction = weightedAction.action;
                                    break;
                                }
                                random -= weightedAction.weight;
                            }
                        } else if (p.aiObjective !== AIObjective.ELIMINATE) {
                             p.aiAction = 'ATTACK';
                        }

                        p.aiAction = (p.aiObjective === AIObjective.DEFUSE_BOMB && distToTarget < BOMB_DEFUSE_RADIUS) ? 'DEFUSING' :
                                     (p.aiObjective === AIObjective.PLANT_BOMB && isPlayerInZone(p, enemyBase)) ? 'PLANTING' : p.aiAction;
                        
                        if (p.aiAction !== 'PLANTING' && p.aiAction !== 'DEFUSING') {
                            const targetDir = distToTarget > 0 ? { x: dxToTarget / distToTarget, y: dyToTarget / distToTarget } : { x: 0, y: 0 };
                            const enemyDir = distToEnemy > 0 ? { x: dxToEnemy / distToEnemy, y: dyToEnemy / distToEnemy } : { x: 0, y: 0 };
                            const perpDir = { x: -enemyDir.y, y: enemyDir.x };

                            if (p.aiAction === 'ATTACK') moveVector = targetDir;
                            else if (p.aiAction === 'RETREAT') moveVector = { x: -enemyDir.x, y: -enemyDir.y };
                            else if (p.aiAction === 'STRAFE_LEFT') moveVector = perpDir;
                            else if (p.aiAction === 'STRAFE_RIGHT') moveVector = { x: -perpDir.x, y: -perpDir.y };
                            else if (p.aiAction === 'HIDE') {
                                const coverSpot = findCover(p, closestEnemy, walls, arenaDimensions.width, arenaDimensions.height);
                                if (coverSpot) {
                                    p.aiTargetPosition = coverSpot;
                                    const dxToCover = coverSpot.x - p.position.x;
                                    const dyToCover = coverSpot.y - p.position.y;
                                    const distToCover = Math.hypot(dxToCover, dyToCover);
                                    moveVector = distToCover > 0 ? { x: dxToCover / distToCover, y: dyToCover / distToCover } : { x: 0, y: 0 };
                                } else { moveVector = perpDir; }
                            } else if (p.aiAction === 'FLANK_LEFT' || p.aiAction === 'FLANK_RIGHT') {
                                const flankSpot = findFlankPosition(p, closestEnemy, p.aiAction === 'FLANK_LEFT' ? 'LEFT' : 'RIGHT');
                                p.aiTargetPosition = flankSpot;
                                const dxToFlank = flankSpot.x - p.position.x;
                                const dyToFlank = flankSpot.y - p.position.y;
                                const distToFlank = Math.hypot(dxToFlank, dyToFlank);
                                moveVector = distToFlank > 0 ? { x: dxToFlank / distToFlank, y: dyToFlank / distToFlank } : { x: 0, y: 0 };
                            }
                        }
                        
                        dx = moveVector.x; dy = moveVector.y;
                        
                        if (!p.isReloading && p.ammo > 0 && now - p.lastShotTime > weaponStats.cooldown && distToEnemy < AI_TARGET_RANGE && hasLineOfSight(p.position, closestEnemy.position, walls)) {
                            p.lastShotTime = now;
                            bulletsToAdd.push(createBullet(p));
                            muzzleFlashesToAdd.push({ id: `mf-${now}-${p.id}`, playerId: p.id, life: MUZZLE_FLASH_DURATION });
                            p.ammo -= 1;
                            if (p.ammo === 0) { p.isReloading = true; p.reloadStartTime = now; }
                        }
                    }
                }

                if (dx !== 0 || dy !== 0) {
                    const magnitude = Math.hypot(dx, dy);
                    const velocityX = (dx / magnitude) * PLAYER_SPEED;
                    const velocityY = (dy / magnitude) * PLAYER_SPEED;
                    const prevPos = { ...p.position };
                    const nextPos = { x: p.position.x + velocityX, y: p.position.y + velocityY };
                    
                    if (!walls.some(wall => checkCollision({ position: nextPos, width: PLAYER_SIZE, height: PLAYER_SIZE }, wall)) && 
                        nextPos.x > PLAYER_SIZE / 2 && nextPos.x < arenaDimensions.width - PLAYER_SIZE / 2 &&
                        nextPos.y > PLAYER_SIZE / 2 && nextPos.y < arenaDimensions.height - PLAYER_SIZE / 2
                    ) {
                        p.position = nextPos;
                    }

                    if (p.id !== 1 && (dx !== 0 || dy !== 0) && Math.hypot(p.position.x - prevPos.x, p.position.y - prevPos.y) < 0.1) {
                         p.aiStuckTime = (p.aiStuckTime || 0) + delta;
                    } else if (p.id !== 1) {
                        p.aiStuckTime = 0;
                    }
                    if (p.aiStuckTime > AI_UNSTUCK_DURATION) { p.aiStateChangeTime = now - AI_ACTION_INTERVAL; p.aiStuckTime = 0; }
                }

                if (nextPowerUp && Math.hypot(p.position.x - nextPowerUp.position.x, p.position.y - nextPowerUp.position.y) < (PLAYER_SIZE + POWERUP_SIZE) / 2) {
                    if(nextPowerUp.type === 'WEAPON' && nextPowerUp.weaponType){
                        p.weapon = nextPowerUp.weaponType;
                        p.powerUpEndTime = now + POWERUP_DURATION;
                        p.ammo = WEAPON_STATS[p.weapon].ammo;
                        p.isReloading = false;
                    } else if (nextPowerUp.type === 'HEALTH') {
                        p.health = Math.min(PLAYER_HEALTH, p.health + HEALTH_PACK_AMOUNT);
                    }
                    nextPowerUp = null;
                    if(powerupTimeoutRef.current) clearTimeout(powerupTimeoutRef.current);
                    powerupTimeoutRef.current = setTimeout(() => spawnPowerUp(walls, arenaDimensions.width, arenaDimensions.height), powerupSpawnTime);
                }
            }
            
            nextMuzzleFlashes.push(...muzzleFlashesToAdd);
            const finalMuzzleFlashes = nextMuzzleFlashes.map(f => ({ ...f, life: f.life - delta })).filter(f => f.life > 0);

            nextBullets.push(...bulletsToAdd);
            const bulletsToRemove = new Set<string>();
            for(const bullet of nextBullets) {
                bullet.position.x += bullet.velocity.x;
                bullet.position.y += bullet.velocity.y;
                const shooter = nextPlayers.find((p: Player) => p.id === bullet.playerId);

                if (walls.some(wall => checkCollision({ position: bullet.position, width: BULLET_WIDTH, height: BULLET_HEIGHT }, wall))) {
                    bulletsToRemove.add(bullet.id);
                }
                for (const player of nextPlayers) {
                    if (player.health > 0 && shooter && player.teamId !== shooter.teamId && Math.hypot(bullet.position.x - player.position.x, bullet.position.y - player.position.y) < PLAYER_SIZE / 2) {
                        const damage = WEAPON_STATS[shooter.weapon].damage;
                        const previousHealth = player.health;
                        player.health = Math.max(0, player.health - damage);
                        bulletsToRemove.add(bullet.id);
                        
                        for(let i = 0; i < 10; i++){
                            bloodToAdd.push({ id: `bp-${now}-${i}`, position: { ...bullet.position }, velocity: { x: Math.cos(Math.random() * 2 * Math.PI) * (Math.random() * 3 + 1), y: Math.sin(Math.random() * 2 * Math.PI) * (Math.random() * 3 + 1) }, life: 100, size: Math.random() * 2 + 1 });
                        }

                        if (previousHealth > 0 && player.health <= 0) {
                           const newSplat = { id: `bs-${now}-${player.id}`, position: { ...player.position }, droplets: [] };
                           for(let i = 0; i < 20; i++) {
                               const angle = Math.random() * Math.PI * 2;
                               const radius = Math.random() * PLAYER_SIZE * 1.5 * 0.7;
                               newSplat.droplets.push({ offsetX: Math.cos(angle) * radius, offsetY: Math.sin(angle) * radius, size: Math.random() * 12 + 4, opacity: Math.random() * 0.5 + 0.4 });
                           }
                           splatsToAdd.push(newSplat);
                        }
                    }
                }
            }
            const finalBullets = nextBullets.filter(b => !bulletsToRemove.has(b.id) && b.position.x > 0 && b.position.x < arenaDimensions.width && b.position.y > 0 && b.position.y < arenaDimensions.height);
            
            nextBloodParticles.push(...bloodToAdd);
            const finalBloodParticles = nextBloodParticles.map(p => ({...p, position: {x: p.position.x + p.velocity.x, y: p.position.y + p.velocity.y}, life: p.life - 4})).filter(p => p.life > 0);
            nextBloodSplats.push(...splatsToAdd);

            nextExplosions.push(...explosionsToAdd);
            const finalExplosions = nextExplosions.map(e => ({ ...e, life: e.life - delta })).filter(e => e.life > 0);

             if (nextBomb) {
                const planter = nextPlayers.find(p => p.id === nextBomb.planterId);
                const planterTeamId = planter?.teamId;

                if (nextBomb.isPlanted) {
                    nextBomb.countdown -= delta;
                    const defuser = nextPlayers.find((p: Player) => p.teamId !== planterTeamId && p.health > 0 && Math.hypot(p.position.x - nextBomb.position.x, p.position.y - nextBomb.position.y) < BOMB_DEFUSE_RADIUS);
                    
                    if (defuser) {
                        const isDefusing = (defuser.id === 1 && spaceHeldRef.current) || (defuser.id !== 1 && defuser.aiAction === 'DEFUSING');
                        if (isDefusing) nextBomb.defuseProgress += delta;
                        else if (!isDefusing) nextBomb.defuseProgress = 0;
                    } else {
                       nextBomb.defuseProgress = 0;
                    }
                } else { // Not planted, check if still planting
                    const enemyBase = baseZones[planterTeamId === 1 ? 1 : 0];
                    const isPlanting = (planter?.id === 1 && spaceHeldRef.current) || (planter?.id !== 1 && planter?.aiAction === 'PLANTING');
                    if (planter && planter.health > 0 && isPlayerInZone(planter, enemyBase) && isPlanting) {
                        nextBomb.plantProgress += delta;
                    } else {
                        nextBomb = null;
                    }
                }
            } else { // Check for new plants
                for(const p of nextPlayers) {
                    if (p.health > 0) {
                        const enemyBase = baseZones[p.teamId === 1 ? 1 : 0];
                        const isPlanting = (p.id === 1 && spaceHeldRef.current) || (p.id !== 1 && p.aiAction === 'PLANTING');
                        if (isPlayerInZone(p, enemyBase) && isPlanting) {
                            nextBomb = { planterId: p.id, position: { ...p.position }, countdown: BOMB_COUNTDOWN, isPlanted: false, plantProgress: 0, defuseProgress: 0 };
                            break;
                        }
                    }
                }
            }
             
            if (nextBomb?.plantProgress >= BOMB_PLANT_TIME && !nextBomb.isPlanted) {
                nextBomb.isPlanted = true;
                const planter = nextPlayers.find((p: Player) => p.id === nextBomb.planterId);
                if(planter) nextBomb.position = {...planter.position};
            }
            if (nextBomb?.countdown <= 0) { 
                const planter = nextPlayers.find((p: Player) => p.id === nextBomb.planterId);
                setRoundWinnerTeamId(planter?.teamId ?? null); 
                setGameStatus(GameStatus.RoundOver); 
                setScreenShake({ magnitude: 8, duration: 500 });
                explosionsToAdd.push({ id: `exp-${now}`, position: { ...nextBomb.position }, life: BOMB_EXPLOSION_DURATION, maxLife: BOMB_EXPLOSION_DURATION, });
            }
            if (nextBomb?.defuseProgress >= BOMB_DEFUSE_TIME) { 
                const planter = nextPlayers.find((p: Player) => p.id === nextBomb.planterId);
                setRoundWinnerTeamId(planter?.teamId === 1 ? 2 : 1); 
                setGameStatus(GameStatus.RoundOver); 
            }

            const aliveTeam1 = nextPlayers.filter((p: Player) => p.teamId === 1 && p.health > 0).length;
            const aliveTeam2 = nextPlayers.filter((p: Player) => p.teamId === 2 && p.health > 0).length;
            const wasTeam1Alive = currentState.players.filter((p: Player) => p.teamId === 1 && p.health > 0).length > 0;
            const wasTeam2Alive = currentState.players.filter((p: Player) => p.teamId === 2 && p.health > 0).length > 0;
            
            if (wasTeam1Alive && aliveTeam1 === 0) { setRoundWinnerTeamId(2); setGameStatus(GameStatus.RoundOver); }
            else if (wasTeam2Alive && aliveTeam2 === 0) { setRoundWinnerTeamId(1); setGameStatus(GameStatus.RoundOver); }
            
            return { players: nextPlayers, bullets: finalBullets, bomb: nextBomb, bloodParticles: finalBloodParticles, bloodSplats: nextBloodSplats, powerUp: nextPowerUp, muzzleFlashes: finalMuzzleFlashes, explosions: finalExplosions };
        }
      );
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
        cancelAnimationFrame(animationFrameId);
        if(powerupTimeoutRef.current) clearTimeout(powerupTimeoutRef.current);
    }
  }, [gameStatus, scale, walls, spawnPowerUp, arenaDimensions, baseZones, powerupSpawnTime]);

  // Visibility Calculation
  useEffect(() => {
    if (gameStatus !== GameStatus.Playing) return;
    const humanPlayer = gameState.players.find(p => p.id === 1);
    if (!humanPlayer || humanPlayer.health <= 0) {
        setVisibleEnemyIds(new Set());
        return;
    }
    const newVisibleIds = new Set<number>();
    const enemies = gameState.players.filter(p => p.teamId !== humanPlayer.teamId);

    for (const enemy of enemies) {
        if (enemy.health > 0) {
            const dist = Math.hypot(humanPlayer.position.x - enemy.position.x, humanPlayer.position.y - enemy.position.y);
            if (dist < VISIBILITY_RANGE && hasLineOfSight(humanPlayer.position, enemy.position, walls)) {
                newVisibleIds.add(enemy.id);
            }
        }
    }
    setVisibleEnemyIds(newVisibleIds);
  }, [gameState.players, walls, gameStatus]);


  const renderContent = () => {
    if (gameMode === null) {
      return (
        <div className="text-center text-white bg-black/70 p-10 rounded-lg max-w-2xl">
          <h1 className="text-6xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mb-8">STICK FIGURE ARENA</h1>
          <h2 className="text-2xl mb-10">Choose your game mode</h2>
          
          <div className="space-y-6">
            <button
              onClick={() => setGameMode(GameMode.PVE)}
              className="w-full px-8 py-4 bg-blue-800 hover:bg-blue-700 border-2 border-white text-white font-bold rounded-lg text-xl transition-transform transform hover:scale-105"
            >
              🤖 vs AI (Single Player)
            </button>
            
            <button
              onClick={() => setGameMode(GameMode.MULTIPLAYER)}
              className="w-full px-8 py-4 bg-green-800 hover:bg-green-700 border-2 border-white text-white font-bold rounded-lg text-xl transition-transform transform hover:scale-105"
            >
              🌐 Online Multiplayer
            </button>
          </div>
          
          <div className="mt-10 text-lg text-left space-y-4">
            <p><strong className="text-yellow-300">Controls:</strong> Use <kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">W</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">A</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">S</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">D</kbd> to move, mouse to aim and shoot.</p>
            <p><strong className="text-white">Objective:</strong> Hold <kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">Space</kbd> in enemy base to plant/defuse bombs.</p>
          </div>
        </div>
      );
    }

    if (gameMode === GameMode.MULTIPLAYER) {
      return null; // Handled by MultiplayerApp component
    }

    const TeamButton: React.FC<{size: number}> = ({size}) => (
        <button
            onClick={() => startGame(size)}
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg text-xl transition-transform transform hover:scale-105"
        >
            {size} vs {size}
        </button>
    );

    switch (gameStatus) {
      case GameStatus.Start:
        return (
          <div className="text-center text-white bg-black/70 p-10 rounded-lg">
            <button
              onClick={() => setGameMode(null)}
              className="absolute top-4 left-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg"
            >
              ← Back
            </button>
            <h1 className="text-5xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">vs AI MODE</h1>
            <h2 className="text-2xl mt-2 mb-8">Choose your battle size. First team to {MAX_ROUNDS} wins!</h2>
            <div className="flex justify-center gap-6 mt-10">
                <TeamButton size={1} />
                <TeamButton size={3} />
                <TeamButton size={5} />
                <TeamButton size={10} />
            </div>
            <div className="mt-10 text-lg text-left max-w-2xl mx-auto space-y-4">
               <p><strong className="text-yellow-300">Your Controls:</strong> Use <kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">W</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">A</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">S</kbd><kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded">D</kbd> to move. <strong className="text-white">Mouse</strong> to aim, <strong className="text-white">Click</strong> to shoot.</p>
               <p><strong className="text-white">Bomb Mission:</strong> Hold <kbd className="font-sans bg-gray-700 text-white py-1 px-2 rounded w-24 inline-block text-center">Space</kbd> in the enemy base to plant or defuse the bomb.</p>
            </div>
          </div>
        );
      case GameStatus.Playing:
      case GameStatus.RoundOver:
        return <Game 
            players={gameState.players} 
            bullets={gameState.bullets} 
            walls={walls} 
            mousePos={mouseRenderPos} 
            bomb={gameState.bomb}
            scores={scores}
            bloodParticles={gameState.bloodParticles}
            bloodSplats={gameState.bloodSplats}
            powerUp={gameState.powerUp}
            muzzleFlashes={gameState.muzzleFlashes}
            explosions={gameState.explosions}
            visibleEnemyIds={visibleEnemyIds}
            arenaWidth={arenaDimensions.width}
            arenaHeight={arenaDimensions.height}
            baseZones={baseZones}
        />;
      case GameStatus.GameOver:
        return (
          <div className="text-center text-white bg-black/70 p-10 rounded-lg">
            <h1 className="text-6xl font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">GAME OVER</h1>
            {winnerTeamId ? <h2 className="mt-4 text-4xl font-bold" style={{color: winnerTeamId === 1 ? '#FFFF00' : '#FF4136'}}>TEAM {winnerTeamId} WINS THE MATCH!</h2> : <h2 className="mt-4 text-4xl font-bold text-white">IT'S A DRAW!</h2>}
            <h3 className="text-3xl mt-4 font-bold tabular-nums">{scores.team1} - {scores.team2}</h3>
            <button
              onClick={resetGame}
              className="mt-10 px-12 py-4 bg-gray-800 hover:bg-gray-700 border-2 border-white text-white font-bold rounded-lg text-2xl transition-transform transform hover:scale-105"
            >
              Play Again
            </button>
          </div>
        );
      default:
        return null;
    }
  };
  
  if (gameMode === GameMode.MULTIPLAYER) {
    return <MultiplayerApp onBackToMenu={() => setGameMode(null)} />;
  }

  const shakeX = screenShake.duration > 0 ? (Math.random() - 0.5) * screenShake.magnitude : 0;
  const shakeY = screenShake.duration > 0 ? (Math.random() - 0.5) * screenShake.magnitude : 0;

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black font-mono overflow-hidden">
        <div ref={gameContainerRef} style={{ transform: `scale(${scale}) translate(${shakeX}px, ${shakeY}px)`, transformOrigin: 'center' }}>
            <div style={{width: arenaDimensions.width, height: arenaDimensions.height}} className="relative flex items-center justify-center">
                {renderContent()}
            </div>
        </div>
    </div>
  );
};

export default App;