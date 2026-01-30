import 'dotenv/config';
import { generalLimiter } from '../middleware/ratelimiter.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import routes from '../routes/routes.js';
import { initSocket } from './socket.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', generalLimiter); //we Made generalLimiter global for all api's 

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

// initialize socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
