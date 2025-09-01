# Stick Figure Arena - Deployment Guide

## Railway Deployment

This game is ready to deploy on Railway with both the client and server components.

### Quick Deploy

1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Connect to Railway**: Go to [railway.app](https://railway.app) and create a new project
3. **Import Repository**: Connect your GitHub repository to Railway
4. **Environment Variables**: Set the following environment variable:
   - `NODE_ENV=production`
   - `PORT` (automatically set by Railway)

### Manual Deploy Steps

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize project**:
   ```bash
   railway init
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

### Build Process

The deployment automatically:
1. Installs dependencies with `npm install`
2. Builds the React client with `vite build`
3. Compiles TypeScript server code
4. Starts the server with `npm start`

### Production Architecture

- **Frontend**: React app built with Vite, served as static files
- **Backend**: Node.js Express server with Socket.IO
- **WebSockets**: Real-time multiplayer communication
- **Static Serving**: Server serves the built React app in production

### Environment Configuration

The app automatically detects the environment:
- **Development**: Connects to `localhost:3001`
- **Production**: Uses the same domain for WebSocket connections

### Domain Configuration

After deployment, update the CORS origins in `server/server.ts`:
```typescript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-railway-domain.railway.app'] // Replace with your actual domain
    : ['http://localhost:5173', 'http://localhost:3000'],
  // ...
};
```

### Features Included

✅ **Online Multiplayer**: Up to 10v10 battles  
✅ **Real-time Synchronization**: 60 FPS game state updates  
✅ **Room System**: Create/join games with room codes  
✅ **Fog of War**: Limited visibility system  
✅ **Bomb Planting**: Strategic objective gameplay  
✅ **Auto-scaling**: Railway handles scaling automatically  

### Development Commands

```bash
# Install dependencies
npm install

# Run development (client + server)
npm run dev:full

# Run only client
npm run dev

# Run only server
npm run dev:server

# Build for production
npm run build

# Start production server
npm start
```

### Troubleshooting

1. **WebSocket Connection Issues**: Ensure Railway domain is added to CORS origins
2. **Build Failures**: Check that all dependencies are in `package.json`
3. **Port Issues**: Railway automatically assigns PORT environment variable
4. **Memory Issues**: Increase Railway service resources if needed

### Cost Optimization

- Railway offers a generous free tier
- The app uses minimal resources (Node.js + static files)
- WebSocket connections are lightweight
- No database required (in-memory game state)

### Scaling Considerations

For high traffic:
1. **Horizontal Scaling**: Multiple Railway instances
2. **Load Balancing**: Use Railway's built-in load balancing
3. **Redis**: Add Redis for session persistence across instances
4. **CDN**: Use Railway's edge caching for static assets
