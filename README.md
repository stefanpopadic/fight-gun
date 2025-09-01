# 🎮 Stick Figure Arena - Online Multiplayer

A fast-paced online multiplayer arena shooter featuring stick figures, bomb planting mechanics, and tactical gameplay. Built with React, TypeScript, Socket.IO, and deployable on Railway.

![Stick Figure Arena](https://img.shields.io/badge/Game-Multiplayer%20Arena%20Shooter-green)
![React](https://img.shields.io/badge/React-19.1.1-blue)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue)

## 🚀 Features

### 🎯 Game Modes
- **🤖 vs AI**: Single-player against intelligent AI bots
- **🌐 Online Multiplayer**: Real-time matches with players worldwide

### ⚡ Multiplayer Features
- **Real-time Synchronization**: 60 FPS game state updates
- **Room System**: Create or join games with 6-character room codes
- **Team Balancing**: Automatic team assignment
- **Fog of War**: Limited visibility adds tactical depth
- **Spectator Mode**: Watch ongoing matches

### 🎮 Gameplay
- **Multiple Game Sizes**: 1v1, 3v3, 5v5, or 10v10 battles
- **Bomb Planting**: Strategic objective-based gameplay
- **Weapon Variety**: Pistol, Machine Gun, AK-47
- **Power-ups**: Health packs and weapon upgrades
- **Dynamic Maps**: Procedurally generated arenas with rooms and cover

### 🎨 Visual Effects
- **Muzzle Flashes**: Dynamic shooting effects
- **Blood Particles**: Realistic hit feedback
- **Explosions**: Spectacular bomb detonations
- **Screen Shake**: Immersive impact effects

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd stick-figure-arena
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development servers**:
   ```bash
   # Start both client and server
   npm run dev:full
   
   # Or start separately:
   npm run dev        # Client only (http://localhost:5173)
   npm run dev:server # Server only (http://localhost:3001)
   ```

4. **Open your browser**:
   Navigate to `http://localhost:5173`

## 🎮 How to Play

### Controls
- **Movement**: `W` `A` `S` `D` keys
- **Aim**: Mouse cursor
- **Shoot**: Left mouse button
- **Bomb Plant/Defuse**: Hold `Space` in enemy base or near planted bomb
- **Reload**: Automatic when ammo depleted

### Game Objective
- **Elimination**: Eliminate all enemy team members
- **Bomb Mission**: Plant bomb in enemy base or defuse enemy bombs
- **Rounds**: First team to win 3 rounds wins the match

### Multiplayer Quick Start
1. Choose "🌐 Online Multiplayer" from main menu
2. **Create Room**: Select team size (1v1, 3v3, 5v5)
3. **Join Room**: Enter a 6-character room code
4. Wait for players to join and ready up
5. Battle begins automatically when all players are ready!

## 🚀 Deployment

### Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

1. **One-Click Deploy**: Click the Railway button above
2. **Environment Variables**: Set `NODE_ENV=production`
3. **Custom Domain**: Configure your domain in Railway dashboard

### Manual Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

3. **Environment Variables**:
   - `NODE_ENV=production`
   - `PORT` (automatically set by hosting providers)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🏗️ Project Structure

```
stick-figure-arena/
├── components/          # React components
│   ├── Game.tsx        # Main game renderer
│   ├── PlayerFigure.tsx # Player visualization
│   └── MultiplayerApp.tsx # Multiplayer interface
├── hooks/              # Custom React hooks
│   ├── useInput.ts     # Keyboard input handling
│   └── useSocket.ts    # Socket.IO client logic
├── server/             # Backend server
│   └── server.ts       # Express + Socket.IO server
├── types.ts            # TypeScript definitions
├── constants.ts        # Game configuration
└── App.tsx            # Main application component
```

## 🔧 Technical Architecture

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Socket.IO Client** for real-time communication
- **Tailwind CSS** for styling

### Backend
- **Node.js** with Express
- **Socket.IO Server** for WebSocket management
- **In-memory game state** (no database required)
- **Real-time game loop** at 60 FPS

### Communication
- **WebSocket Events**: Player input, game state, room management
- **Real-time Synchronization**: Client prediction with server authority
- **Optimized Networking**: Efficient state updates and interpolation

## 🎯 Game Features Deep Dive

### AI Behavior
- **Dynamic Decision Making**: AI chooses between attack, retreat, flank, hide
- **Objective-Based**: AI prioritizes bomb planting/defusing
- **Tactical Movement**: Smart pathfinding and cover usage
- **Weapon Management**: AI handles reloading and weapon switching

### Multiplayer Synchronization
- **Client-Side Prediction**: Smooth movement despite network latency
- **Server Authority**: Server validates all actions
- **Lag Compensation**: Interpolation and extrapolation techniques
- **Fog of War**: Limited visibility system

### Performance Optimization
- **60 FPS Updates**: Optimized game loop
- **Efficient Rendering**: Canvas-based graphics with React components
- **Memory Management**: Proper cleanup of game objects
- **Network Optimization**: Compressed state updates

## 🐛 Troubleshooting

### Common Issues

1. **Connection Problems**:
   - Check if server is running on port 3001
   - Verify firewall settings
   - Ensure WebSocket support in browser

2. **Build Failures**:
   - Run `npm install` to update dependencies
   - Clear `node_modules` and reinstall if needed
   - Check Node.js version (18+ required)

3. **Game Performance**:
   - Close unnecessary browser tabs
   - Disable browser extensions
   - Check system resources

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🎉 Credits

- **Game Design**: Inspired by classic arena shooters
- **Graphics**: Minimalist stick figure aesthetic  
- **Networking**: Socket.IO for real-time multiplayer
- **Deployment**: Railway for seamless hosting

---

**Ready to battle?** 🎯 Deploy your own arena and challenge players worldwide!