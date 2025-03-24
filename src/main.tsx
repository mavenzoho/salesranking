import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Get the root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

// Initial render with empty data
root.render(
  <StrictMode>
    <App initialData={{ lastUpdated: new Date().toLocaleString(), rankings: [] }} />
  </StrictMode>
);

// Setup WebSocket connection
const setupWebSocket = () => {
  // Get the current URL
  const url = new URL(window.location.href);
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = url.host;
  
  // Use the current host for WebSocket connection
  const WS_URL = `${wsProtocol}//${host}/ws`;
  
  console.log('Connecting to WebSocket:', WS_URL);
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connection established');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received data:', data);
      root.render(
        <StrictMode>
          <App initialData={data} />
        </StrictMode>
      );
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    // Attempt to reconnect after error with exponential backoff
    setTimeout(setupWebSocket, 5000);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed, attempting to reconnect...');
    setTimeout(setupWebSocket, 5000);
  };

  return ws;
};

// Initialize WebSocket connection
setupWebSocket();