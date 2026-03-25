import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import apiRoutes from './routes/apiRoutes.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import { seedInitialTestData } from './utils/seed.js';

dotenv.config({quiet:true});

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Database connected');

    await seedInitialTestData();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
