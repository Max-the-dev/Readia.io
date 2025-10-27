import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ message: 'Penny.io backend is running!' });
});

app.get('/api/articles', (req: Request, res: Response) => {
  res.json([
    {
      id: 1,
      title: "Getting Started with x402 Payments",
      author: "Alice Developer",
      price: 0.05,
      preview: "Learn how to implement x402 micropayments in your web applications..."
    }
  ]);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});