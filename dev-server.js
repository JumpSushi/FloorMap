#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Serve static files from current directory
app.use(express.static(__dirname));

// CORS headers for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'manual-route-editor.html'));
});

app.listen(PORT, () => {
  console.log(`🎨 Manual Route Editor running at http://localhost:${PORT}`);
  console.log(`📍 Open your browser and navigate to the URL above`);
  console.log(`📂 Make sure reissG.geojson is in the same directory`);
  console.log(`🏗️  Building data will be loaded from ./app/mock/building.json`);
});
