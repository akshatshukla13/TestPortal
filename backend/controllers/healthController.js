import mongoose from 'mongoose';

const stateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export function getHealth(req, res) {
  res.json({
    status: 'ok',
    database: stateMap[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
}
