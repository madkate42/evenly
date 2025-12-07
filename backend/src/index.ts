import express from 'express';
import parserRouter from './routes/parser';
import itemizerRouter from './routes/itemizer';
import balanceRouter from './routes/balance';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Evenly API' });
});

app.use('/api/parser', parserRouter);
app.use('/api/itemizer', itemizerRouter);
app.use('/api/balance', balanceRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
