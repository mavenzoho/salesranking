import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);

// Configure WebSocket server with explicit path
const wss = new WebSocketServer({ 
  noServer: true // Don't attach to server automatically
});

// Configure CORS to accept requests from anywhere since we're testing
app.use(cors());
app.use(express.json());

const clients = new Set<WebSocket>();

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);
  
  // Send initial empty data
  ws.send(JSON.stringify({
    lastUpdated: new Date().toLocaleString(),
    rankings: []
  }));
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Test endpoint to verify the server is running
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Sales Rankings Webhook Server' });
});

app.post('/webhook', (req, res) => {
  console.log('Received webhook data:', req.body);
  
  // Check if we have data in either text or data field
  const textData = req.body.text || req.body.data;
  if (!textData) {
    console.error('Missing text/data in webhook request');
    return res.status(400).json({ error: 'Missing text/data' });
  }
  
  try {
    // Parse the rankings data
    const lines = textData.split('\n').filter(line => line.trim());
    console.log('Processing lines:', lines);
    
    const rankings = lines
      .slice(1) // Skip the title
      .map((line) => {
        const match = line.match(/^\d+\.\s+(.+)$/);
        if (match) {
          return {
            rank: parseInt(line.match(/^\d+/)[0], 10),
            name: match[1].trim()
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 10); // Only keep top 10

    console.log('Parsed rankings:', rankings);

    // Broadcast to all connected clients
    const update = {
      lastUpdated: new Date().toLocaleString(),
      rankings
    };

    let broadcastCount = 0;
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(update));
          broadcastCount++;
        } catch (error) {
          console.error('Error sending to client:', error);
          clients.delete(client);
        }
      }
    });

    console.log(`Broadcasted to ${broadcastCount} clients`);
    res.json({ success: true, rankings, clientCount: broadcastCount });
  } catch (error) {
    console.error('Error processing webhook data:', error);
    res.status(500).json({ error: 'Failed to process rankings data', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is ready for connections on ws://localhost:${PORT}/ws`);
});