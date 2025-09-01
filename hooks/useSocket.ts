import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, GameStatus } from '../types';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  createRoom: (teamSize: number) => void;
  joinRoom: (roomId: string) => void;
  setPlayerReady: () => void;
  sendPlayerInput: (input: {
    movement: { dx: number; dy: number };
    angle: number;
    shooting: boolean;
    spacePressed: boolean;
  }) => void;
}

interface RoomState {
  roomId: string | null;
  playerId: number | null;
  teamId: number | null;
  players: Array<{ id: number; teamId: number; isReady: boolean }>;
  teamSize: number;
  status: GameStatus;
}

interface GameData {
  players: Player[];
  gameState: any;
  scores: { team1: number; team2: number };
  status: GameStatus;
}

export const useSocket = (
  onRoomCreated?: (roomId: string) => void,
  onJoinedRoom?: (data: { roomId: string; playerId: number; teamId: number; room: any }) => void,
  onPlayerJoined?: (data: { player: any }) => void,
  onPlayerLeft?: (data: { playerId: number }) => void,
  onPlayerReadyUpdate?: (data: { playerId: number; isReady: boolean; allReady: boolean }) => void,
  onGameStarted?: (data: { walls: any; baseZones: any; arenaDimensions: any }) => void,
  onGameStateUpdate?: (data: GameData) => void,
  onError?: (data: { message: string }) => void
): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to server
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? '' // Use same domain in production
      : 'http://localhost:3001';
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Room events
    newSocket.on('roomCreated', (data) => {
      console.log('Room created:', data);
      onRoomCreated?.(data.roomId);
    });

    newSocket.on('joinedRoom', (data) => {
      console.log('Joined room:', data);
      onJoinedRoom?.(data);
    });

    newSocket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      onPlayerJoined?.(data);
    });

    newSocket.on('playerLeft', (data) => {
      console.log('Player left:', data);
      onPlayerLeft?.(data);
    });

    newSocket.on('playerReadyUpdate', (data) => {
      console.log('Player ready update:', data);
      onPlayerReadyUpdate?.(data);
    });

    // Game events
    newSocket.on('gameStarted', (data) => {
      console.log('Game started:', data);
      onGameStarted?.(data);
    });

    newSocket.on('gameStateUpdate', (data) => {
      onGameStateUpdate?.(data);
    });

    newSocket.on('error', (data) => {
      console.error('Socket error:', data);
      onError?.(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = (teamSize: number) => {
    if (socket) {
      socket.emit('createRoom', { teamSize });
    }
  };

  const joinRoom = (roomId: string) => {
    if (socket) {
      socket.emit('joinRoom', { roomId });
    }
  };

  const setPlayerReady = () => {
    if (socket) {
      socket.emit('playerReady');
    }
  };

  const sendPlayerInput = (input: {
    movement: { dx: number; dy: number };
    angle: number;
    shooting: boolean;
    spacePressed: boolean;
  }) => {
    if (socket) {
      socket.emit('playerInput', input);
    }
  };

  return {
    socket,
    isConnected,
    createRoom,
    joinRoom,
    setPlayerReady,
    sendPlayerInput
  };
};
