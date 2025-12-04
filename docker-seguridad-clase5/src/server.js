// src/server.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import mongoose from 'mongoose';

const {
  PORT = 3000,
  MONGO_URI = 'mongodb://mongo:27017/appdb'
} = process.env;

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// Health endpoint (usado por el healthcheck del Dockerfile)
app.get('/health', async (req, res) => {
  try {
    // Ping simple a Mongo
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'error', error: String(e) });
  }
});

// Listar productos
app.get('/products', async (req, res) => {
  try {
    const items = await Product.find().sort({ _id: 1 }).lean();
    res.json({ data: items });
  } catch (e) {
    res.status(500).json({ error: 'Error al listar productos' });
  }
});

// Crear producto
app.post('/products', async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ error: 'name y price son requeridos' });
    }
    const item = await Product.create({ name, price: Number(price) });
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

async function start() {
  await mongoose.connect(MONGO_URI);
  app.listen(Number(PORT), () => console.log(`Backend en puerto ${PORT}`));
}

start().catch((e) => { console.error('Error iniciando app:', e); process.exit(1); });