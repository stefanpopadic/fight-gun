

import React from 'react';
import type { Player, Bullet, Wall, Vector, Bomb, BloodParticle, BloodSplat, PowerUp, MuzzleFlash, Explosion } from '../types';
import { PLAYER_SIZE, PLAYER_HEALTH, BULLET_WIDTH, BULLET_HEIGHT, CROSSHAIR_SIZE, WEAPON_STATS, BOMB_RADIUS, BOMB_PLANT_TIME, BOMB_DEFUSE_TIME, POWERUP_SIZE, MUZZLE_FLASH_DURATION, BOMB_EXPLOSION_MAX_RADIUS, TEAM_COLORS } from '../constants';
import { PlayerFigure } from './PlayerFigure';

interface GameProps {
  players: Player[];
  bullets: Bullet[];
  walls: Wall[];
  mousePos: Vector;
  bomb: Bomb | null;
  scores: { team1: number; team2: number };
  bloodParticles: BloodParticle[];
  bloodSplats: BloodSplat[];
  powerUp: PowerUp | null;
  muzzleFlashes: MuzzleFlash[];
  explosions: Explosion[];
  visibleEnemyIds: Set<number>;
  arenaWidth: number;
  arenaHeight: number;
  baseZones: (Wall & { id: number })[];
}

const ProgressBar: React.FC<{ progress: number; max: number; text: string }> = ({ progress, max, text }) => {
    const percentage = (progress / max) * 100;
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 text-center">
            <p className="text-2xl font-black text-white mb-2">{text}</p>
            <div className="h-6 bg-gray-800 rounded-sm overflow-hidden border-2 border-white">
                <div className="h-full bg-white" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const BombTimer: React.FC<{ time: number }> = ({ time }) => (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-6xl font-black text-red-500 animate-pulse drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
            {Math.ceil(time / 1000)}
        </p>
    </div>
);


const PlayerStatus: React.FC<{ player: Player }> = ({ player }) => {
    const healthPercentage = (player.health / PLAYER_HEALTH) * 100;
    const weaponStats = WEAPON_STATS[player.weapon];
    const teamColor = TEAM_COLORS[player.teamId as keyof typeof TEAM_COLORS];

    return (
        <div className="w-1/3 text-center">
            <p className="text-lg font-bold" style={{color: teamColor}}>YOU (PLAYER {player.id})</p>
            <div className="h-4 bg-gray-800 rounded-sm overflow-hidden border-2 border-white my-1">
                <div 
                    className="h-full transition-all duration-300 ease-in-out"
                    style={{ width: `${healthPercentage}%`, backgroundColor: teamColor }}
                ></div>
            </div>
            <div className="h-6 text-xl font-semibold text-white">
              {player.isReloading ? (
                <span className="text-red-500 animate-pulse">RELOADING...</span>
              ) : (
                <span>{weaponStats.name.toUpperCase()}: {player.ammo} / {weaponStats.ammo}</span>
              )}
            </div>
        </div>
    );
};


const HUD: React.FC<{ players: Player[]; scores: { team1: number; team2: number } }> = ({ players, scores }) => {
    const humanPlayer = players.find(p => p.id === 1);
    const aliveTeam1 = players.filter(p => p.teamId === 1 && p.health > 0).length;
    const totalTeam1 = players.filter(p => p.teamId === 1).length;
    const aliveTeam2 = players.filter(p => p.teamId === 2 && p.health > 0).length;
    const totalTeam2 = players.filter(p => p.teamId === 2).length;

    return (
        <div className="absolute bottom-4 left-0 right-0 flex justify-around items-center px-8">
            <div className="w-1/3 text-center">
                 <p className="text-lg font-bold" style={{color: TEAM_COLORS[1]}}>TEAM 1 (YELLOW)</p>
                 <p className="text-2xl font-bold">{aliveTeam1} / {totalTeam1} ALIVE</p>
            </div>

            {humanPlayer && <PlayerStatus player={humanPlayer} />}

            <div className="text-white text-5xl font-black px-4 tabular-nums">
                {scores.team1} - {scores.team2}
            </div>
             <div className="w-1/3 text-center">
                 <p className="text-lg font-bold" style={{color: TEAM_COLORS[2]}}>TEAM 2 (RED)</p>
                 <p className="text-2xl font-bold">{aliveTeam2} / {totalTeam2} ALIVE</p>
            </div>
        </div>
    );
};

const Crosshair: React.FC<{ position: Vector }> = ({ position }) => {
    const style: React.CSSProperties = {
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10,
    };
    const lineStyle: React.CSSProperties = {
        position: 'absolute',
        backgroundColor: 'white',
        transformOrigin: 'center center',
    };
    return (
        <div style={style}>
            <div style={{ ...lineStyle, width: '2px', height: `${CROSSHAIR_SIZE}px`, top: `-${CROSSHAIR_SIZE/2}px`, left: '-1px' }} />
            <div style={{ ...lineStyle, width: `${CROSSHAIR_SIZE}px`, height: '2px', left: `-${CROSSHAIR_SIZE/2}px`, top: '-1px' }} />
        </div>
    );
};


export const Game: React.FC<GameProps> = ({ players, bullets, walls, mousePos, bomb, scores, bloodParticles, bloodSplats, powerUp, muzzleFlashes, explosions, visibleEnemyIds, arenaWidth, arenaHeight, baseZones }) => {
  const plantingPlayer = bomb && !bomb.isPlanted ? players.find(p => p.id === bomb.planterId) : null;
  const defusingPlayer = bomb && bomb.isPlanted && bomb.defuseProgress > 0 ? players.find(p => p.id !== bomb.planterId && p.health > 0) : null;
  const humanPlayerTeamId = 1;
  
  return (
    <div
      className="relative bg-black border-2 border-white overflow-hidden cursor-none"
      style={{ width: arenaWidth, height: arenaHeight }}
      id="game-arena"
    >
      {/* Render Base Zones */}
      {baseZones.map(zone => (
         <div key={zone.id} className="absolute border-2 border-dashed"
            style={{ 
                left: zone.x, 
                top: zone.y, 
                width: zone.width, 
                height: zone.height,
                borderColor: TEAM_COLORS[zone.id as keyof typeof TEAM_COLORS] + '40'
            }}
         />
      ))}
      
      {/* Render Blood Splats (permanent) */}
      {bloodSplats.map((splat) => (
        <div
            key={splat.id}
            className="absolute"
            style={{
                left: splat.position.x,
                top: splat.position.y,
                width: 1,
                height: 1,
            }}
        >
            {splat.droplets.map((droplet, index) => (
                <div
                    key={index}
                    className="absolute bg-red-600 rounded-full"
                    style={{
                        left: droplet.offsetX - droplet.size / 2,
                        top: droplet.offsetY - droplet.size / 2,
                        width: droplet.size,
                        height: droplet.size,
                        opacity: droplet.opacity,
                    }}
                />
            ))}
        </div>
      ))}
      
      {/* Render Explosions */}
      {explosions.map((explosion) => {
          const lifeRatio = 1 - (explosion.life / explosion.maxLife); // 0 -> 1
          const radius = lifeRatio * BOMB_EXPLOSION_MAX_RADIUS;
          const opacity = 1 - lifeRatio;

          return (
              <div
                  key={explosion.id}
                  className="absolute bg-white rounded-full pointer-events-none"
                  style={{
                      left: explosion.position.x,
                      top: explosion.position.y,
                      width: radius * 2,
                      height: radius * 2,
                      transform: 'translate(-50%, -50%)',
                      opacity: opacity,
                      boxShadow: `0 0 ${radius * 0.5}px ${radius * 0.2}px rgba(255, 255, 100, 0.7)`,
                  }}
              />
          );
      })}

      {/* Render Walls */}
      {walls.map((wall, i) => (
        <div
          key={i}
          className="absolute bg-white"
          style={{
            left: wall.x,
            top: wall.y,
            width: wall.width,
            height: wall.height,
          }}
        />
      ))}
      
      {/* Render PowerUp */}
      {powerUp && (
        powerUp.type === 'WEAPON' ? (
          <div className="absolute border-2 border-yellow-300 bg-yellow-500/20 rounded-md flex items-center justify-center animate-pulse"
            style={{
                left: powerUp.position.x - POWERUP_SIZE / 2,
                top: powerUp.position.y - POWERUP_SIZE / 2,
                width: POWERUP_SIZE,
                height: POWERUP_SIZE
            }}
          >
            <span className="text-yellow-300 font-black text-xs">
                {powerUp.weaponType === 'MachineGun' ? 'MG' : 'AK'}
            </span>
          </div>
        ) : (
          <div className="absolute border-2 border-green-300 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse"
            style={{
                left: powerUp.position.x - POWERUP_SIZE / 2,
                top: powerUp.position.y - POWERUP_SIZE / 2,
                width: POWERUP_SIZE,
                height: POWERUP_SIZE
            }}
          >
            <div className="relative w-full h-full">
                <div className="absolute bg-green-300" style={{ left: '50%', top: '20%', width: '20%', height: '60%', transform: 'translateX(-50%)' }} />
                <div className="absolute bg-green-300" style={{ left: '20%', top: '50%', width: '60%', height: '20%', transform: 'translateY(-50%)' }} />
            </div>
          </div>
        )
      )}

      {/* Render Players */}
      {players.map((player) => {
          const isVisible = player.teamId === humanPlayerTeamId || visibleEnemyIds.has(player.id);
          return (
            <div
              key={player.id}
              className="absolute transition-opacity duration-300 ease-in-out"
              style={{
                left: player.position.x - PLAYER_SIZE / 2,
                top: player.position.y - PLAYER_SIZE / 2,
                width: PLAYER_SIZE,
                height: PLAYER_SIZE,
                opacity: isVisible ? 1 : 0,
              }}
            >
                <PlayerFigure color={TEAM_COLORS[player.teamId as keyof typeof TEAM_COLORS]} angle={player.angle} />
            </div>
          );
      })}
      
        {/* Render Muzzle Flashes */}
        {muzzleFlashes.map((flash) => {
            const player = players.find(p => p.id === flash.playerId);
            if (!player) return null;
            
            const isVisible = player.teamId === humanPlayerTeamId || visibleEnemyIds.has(player.id);
            if (!isVisible) return null;

            const angleRad = player.angle * (Math.PI / 180);
            const muzzleOffsetX = Math.cos(angleRad) * 15;
            const muzzleOffsetY = Math.sin(angleRad) * 15;
            const flashSize = 12;
            const lifeRatio = flash.life / MUZZLE_FLASH_DURATION;

            return (
                <div
                    key={flash.id}
                    className="absolute bg-yellow-300 rounded-full pointer-events-none"
                    style={{
                        left: player.position.x + muzzleOffsetX - flashSize / 2,
                        top: player.position.y + muzzleOffsetY - flashSize / 2,
                        width: flashSize,
                        height: flashSize,
                        opacity: lifeRatio,
                        transform: `scale(${lifeRatio})`,
                        boxShadow: '0 0 12px 6px rgba(253, 224, 71, 0.7)',
                    }}
                />
            );
        })}


      {/* Render Bullets */}
      {bullets.map((bullet) => (
        <div
          key={bullet.id}
          className="absolute bg-white rounded-full"
           style={{
            left: bullet.position.x - BULLET_WIDTH / 2,
            top: bullet.position.y - BULLET_HEIGHT / 2,
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            transform: `rotate(${Math.atan2(bullet.velocity.y, bullet.velocity.x) * 180 / Math.PI}deg)`
          }}
        />
      ))}

       {/* Render Blood Particles (temporary) */}
      {bloodParticles.map((particle) => (
        <div
            key={particle.id}
            className="absolute bg-red-500 rounded-full"
            style={{
                left: particle.position.x - particle.size / 2,
                top: particle.position.y - particle.size / 2,
                width: particle.size,
                height: particle.size,
                opacity: particle.life / 100,
            }}
        />
      ))}

      {/* Render Bomb */}
      {bomb?.isPlanted && (
          <div className="absolute bg-red-500 border-2 border-white rounded-full animate-pulse"
              style={{
                  left: bomb.position.x - BOMB_RADIUS,
                  top: bomb.position.y - BOMB_RADIUS,
                  width: BOMB_RADIUS * 2,
                  height: BOMB_RADIUS * 2,
              }}
          />
      )}
      
      {plantingPlayer && <ProgressBar progress={bomb.plantProgress} max={BOMB_PLANT_TIME} text="PLANTING" />}
      {defusingPlayer && <ProgressBar progress={bomb.defuseProgress} max={BOMB_DEFUSE_TIME} text="DEFUSING" />}
      {bomb?.isPlanted && <BombTimer time={bomb.countdown} />}
      
      <Crosshair position={mousePos} />
      <HUD players={players} scores={scores} />
    </div>
  );
};