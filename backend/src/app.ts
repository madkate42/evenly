import express from 'express';
import cors from 'cors';
import parserRouter from './routes/parser';
import itemizerRouter from './routes/itemizer';
import balanceRouter from './routes/balance';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Evenly API' });
});

app.use('/api/parser', parserRouter);
app.use('/api/itemizer', itemizerRouter);
app.use('/api/balance', balanceRouter);

export default app;
