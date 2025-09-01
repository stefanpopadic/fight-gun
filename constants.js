// Game dimensions - DYNAMIC
export const ARENA_DIMENSIONS_BY_SIZE = {
    1: { width: 900, height: 600 },
    3: { width: 1200, height: 800 },
    5: { width: 1500, height: 1000 },
    10: { width: 1800, height: 1200 },
};
// Player settings
export const PLAYER_SIZE = 30;
export const PLAYER_SPEED = 2.5;
export const PLAYER_HEALTH = 100;
export const RELOAD_TIME = 3000; // 3 seconds
export const VISIBILITY_RANGE = 550;
// Team Settings
export const TEAM_COLORS = {
    1: '#FFFF00', // Yellow for Player's Team
    2: '#FF4136', // Red for Enemy Team
};
// Bullet settings
export const BULLET_WIDTH = 8;
export const BULLET_HEIGHT = 4;
export const BULLET_SPEED = 7;
// Weapon Settings
export const WEAPON_STATS = {
    Pistol: { ammo: 10, damage: 10, cooldown: 1200, name: 'Pistol' },
    MachineGun: { ammo: 40, damage: 7, cooldown: 50, name: 'Machine Gun' },
    AK47: { ammo: 25, damage: 14, cooldown: 400, name: 'AK-47' },
};
// PowerUp Settings
export const POWERUP_DURATION = 15000; // 15 seconds
export const POWERUP_SPAWN_TIME_BY_SIZE = {
    1: 15000,
    3: 12000,
    5: 9000,
    10: 7000,
};
export const POWERUP_SIZE = 25;
export const HEALTH_PACK_AMOUNT = 25;
export const POWERUP_HEALTH_CHANCE = 0.4; // 40% chance to spawn a health pack
// AI Settings
export const AI_SHOOT_COOLDOWN = 300; // AI will try to fire every 300ms if conditions are met
export const AI_TARGET_RANGE = 700;
export const AI_IDEAL_DISTANCE_MIN = 200;
export const AI_IDEAL_DISTANCE_MAX = 300;
export const AI_AVOID_DURATION = 400; // ms to stay in avoiding state
export const AI_ACTION_INTERVAL = 2500; // ms, time between deciding to push/strafe/retreat
export const AI_UNSTUCK_DURATION = 500; // ms, time before AI tries to un-stuck itself
// Bomb settings
export const BOMB_PLANT_TIME = 2000; // 2 seconds to plant
export const BOMB_DEFUSE_TIME = 5000; // 5 seconds to defuse
export const BOMB_COUNTDOWN = 30000; // 30 seconds
export const BOMB_DEFUSE_RADIUS = 50;
export const BOMB_RADIUS = 15;
export const BOMB_EXPLOSION_DURATION = 500; // ms
export const BOMB_EXPLOSION_MAX_RADIUS = 150; // pixels
// UI
export const CROSSHAIR_SIZE = 20;
export const MUZZLE_FLASH_DURATION = 60; // ms
// Game Rules
export const MAX_ROUNDS = 3;
