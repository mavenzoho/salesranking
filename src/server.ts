import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configure WebSocket server
const wss = new WebSocketServer({ 
  noServer: true
});

// Configure CORS
app.use(cors());
app.use(express.json());

// Serve static files from the client build directory
app.use(express.static(path.join(__dirname, '../dist/client')));

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  if (!request.url) {
    socket.destroy();
    return;
  }

  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Send initial empty data
  ws.send(JSON.stringify({
    lastUpdated: new Date().toLocaleString(),
    rankings: []
  }));
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

interface RankingEntry {
  rank: number;
  name: string;
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
  const textData = req.body.text || req.body.data;
  if (!textData) {
    return res.status(400).json({ error: 'Missing text/data' });
  }
  
  try {
    const lines = textData.split('\n').filter((line: string) => line.trim());
    const rankings = lines
      .slice(1)
      .map((line: string) => {
        const match = line.match(/^\d+\.\s+(.+)$/);
        if (match) {
          return {
            rank: parseInt(line.match(/^\d+/)?.[0] ?? '0', 10),
            name: match[1].trim()
          };
        }
        return null;
      })
      .filter((entry: RankingEntry | null): entry is RankingEntry => entry !== null)
      .slice(0, 10);

    const update = {
      lastUpdated: new Date().toLocaleString(),
      rankings
    };

    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(update));
      }
    });

    res.json({ success: true, rankings });
  } catch (error) {
    console.error('Error processing webhook data:', error);
    res.status(500).json({ 
      error: 'Failed to process rankings data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/client/index.html'));
});

const PORT = process.env.PORT || 3000;

// Wait for the server to start before resolving
await new Promise<void>((resolve) => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`);
    resolve();
  });
});