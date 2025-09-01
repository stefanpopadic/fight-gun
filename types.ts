
export interface Vector {
  x: number;
  y: number;
}

export enum AIState {
  THINKING, // Deciding what to do next
  AVOIDING, // Actively avoiding an obstacle
}

export enum AIObjective {
    ELIMINATE,
    PLANT_BOMB,
    DEFUSE_BOMB,
    GET_POWERUP,
}

export type AIAction = 'ATTACK' | 'RETREAT' | 'STRAFE_LEFT' | 'STRAFE_RIGHT' | 'HIDE' | 'PLANTING' | 'DEFUSING' | 'FLANK_LEFT' | 'FLANK_RIGHT';

export type WeaponType = 'Pistol' | 'MachineGun' | 'AK47';

export type PowerUpType = 'WEAPON' | 'HEALTH';

export interface PowerUp {
    id: string;
    position: Vector;
    type: PowerUpType;
    weaponType?: WeaponType; // Only present if type is 'WEAPON'
}

export interface Player {
  id: number;
  teamId: number;
  position: Vector;
  angle: number;
  health: number;
  lastShotTime: number; // Used for shooting rate
  ammo: number;
  isReloading: boolean;
  reloadStartTime: number;
  weapon: WeaponType;
  powerUpEndTime: number;
  // AI-specific properties
  aiState?: AIState;
  aiObjective?: AIObjective;
  aiAction?: AIAction;
  aiStateChangeTime?: number;
  aiAvoidVector?: Vector;
  aiTargetPosition?: Vector;
  aiStuckTime?: number;
}

export interface Bomb {
  position: Vector;
  planterId: number;
  countdown: number;
  isPlanted: boolean;
  plantProgress: number;
  defuseProgress: number;
}


export interface Bullet {
  id: string;
  playerId: number;
  position: Vector;
  velocity: Vector;
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BloodParticle {
    id: string;
    position: Vector;
    velocity: Vector;
    life: number;
    size: number;
}

export interface BloodDroplet {
    offsetX: number;
    offsetY: number;
    size: number;
    opacity: number;
}

export interface BloodSplat {
    id:string;
    position: Vector;
    droplets: BloodDroplet[];
}

export interface MuzzleFlash {
    id: string;
    playerId: number;
    life: number; // in ms
}

export interface Explosion {
    id: string;
    position: Vector;
    life: number; // countdown in ms
    maxLife: number;
}

export enum GameStatus {
  Start,
  Playing,
  RoundOver,
  GameOver,
}

export enum GameMode {
  PVP,
  PVE,
  MULTIPLAYER,
}

export interface MultiplayerRoom {
  id: string;
  players: Array<{ id: number; teamId: number; isReady: boolean }>;
  teamSize: number;
  status: GameStatus;
}

export interface MultiplayerPlayer extends Player {
  socketId?: string;
  isReady?: boolean;
}