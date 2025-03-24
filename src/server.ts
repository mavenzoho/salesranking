import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RankingsState, SalesPerson } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configure WebSocket server
const wss = new WebSocketServer({ 
  noServer: true
});

// Configure CORS and body parsing
app.use(cors());
app.use(express.json());
app.use(express.text({ type: '*/*' })); // Handle all content types as text
app.use(express.urlencoded({ extended: true }));

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
  const initialData: RankingsState = {
    lastUpdated: new Date().toLocaleString(),
    rankings: []
  };
  
  ws.send(JSON.stringify(initialData));
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('Received webhook request:', {
    contentType: req.headers['content-type'],
    body: req.body
  });

  let textData: string;

  // Handle the incoming data based on content type
  if (typeof req.body === 'string') {
    textData = req.body;
  } else if (req.body && typeof req.body === 'object') {
    if (req.body.text || req.body.data) {
      textData = req.body.text || req.body.data;
    } else {
      // If no text/data field, try to use the entire body
      textData = JSON.stringify(req.body);
    }
  } else {
    console.error('Invalid request body format:', req.body);
    return res.status(400).json({ error: 'Invalid request body format' });
  }

  if (!textData) {
    console.error('Missing text data in request body');
    return res.status(400).json({ error: 'Missing text data' });
  }

  try {
    // Split the text into lines and remove empty lines
    const lines = textData.split('\n').map(line => line.trim()).filter(Boolean);
    console.log('Processed lines:', lines);

    // Extract rankings (skip the first line which is the title)
    const rankings: SalesPerson[] = lines
      .slice(1)
      .map((line: string) => {
        // Match lines like "1. Name" or "10. Name"
        const match = line.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
          return {
            rank: parseInt(match[1], 10),
            name: match[2].trim()
          };
        }
        return null;
      })
      .filter((entry): entry is SalesPerson => entry !== null);

    console.log('Parsed rankings:', rankings);

    const update: RankingsState = {
      lastUpdated: new Date().toLocaleString(),
      rankings
    };

    // Broadcast to all connected clients
    let broadcastCount = 0;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(update));
        broadcastCount++;
      }
    });

    console.log(`Broadcasted to ${broadcastCount} clients`);
    res.json({ 
      success: true, 
      rankings,
      clientCount: broadcastCount
    });
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