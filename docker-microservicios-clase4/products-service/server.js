// products-service/server.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import mongoose from 'mongoose';
import { createClient } from 'redis';

const {
  PORT = 5001,
  MONGO_URI = 'mongodb://localhost:27017/appdb',
  REDIS_HOST = 'localhost',
  REDIS_PORT = 6379,
  CACHE_TTL_SECONDS = 60
} = process.env;

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// MongoDB models
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// Redis client
const redis = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis conectado'));

const PRODUCTS_ALL_KEY = 'products:all';

async function connectServices() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB conectado');
  await redis.connect();
}

// Health
app.get('/api/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    await redis.ping();
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'error', error: String(e) });
  }
});

// Listar productos (con cache lista)
app.get('/api/products', async (req, res) => {
  try {
    const cached = await redis.get(PRODUCTS_ALL_KEY);
    if (cached) {
      console.log('Cache HIT /api/products');
      return res.json({ source: 'cache', data: JSON.parse(cached) });
    }
    console.log('Cache MISS /api/products');
    const products = await Product.find().sort({ _id: 1 }).lean();
    await redis.set(PRODUCTS_ALL_KEY, JSON.stringify(products), { EX: Number(CACHE_TTL_SECONDS) });
    res.json({ source: 'database', data: products });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener producto por id (cache por id)
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const key = `products:${id}`;
    const cached = await redis.get(key);
    if (cached) {
      console.log(`Cache HIT /api/products/${id}`);
      return res.json({ source: 'cache', data: JSON.parse(cached) });
    }
    console.log(`Cache MISS /api/products/${id}`);
    const product = await Product.findById(id).lean();
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    await redis.set(key, JSON.stringify(product), { EX: Number(CACHE_TTL_SECONDS) });
    res.json({ source: 'database', data: product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// Crear producto (invalida cache)
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    if (!name || price == null || stock == null) {
      return res.status(400).json({ error: 'name, price y stock son requeridos' });
    }
    const product = await Product.create({ name, price: Number(price), stock: Number(stock) });

    // Invalida cache de lista y clave individual por si existe
    await redis.del(PRODUCTS_ALL_KEY);
    await redis.del(`products:${product._id.toString()}`);
    console.log('Cache invalidado: products:all y products:<id>');

    res.status(201).json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

connectServices()
  .then(() => app.listen(Number(PORT), () => console.log(`Products service en puerto ${PORT}`)))
  .catch((err) => {
    console.error('Error inicializando servicios', err);
    process.exit(1);
  });