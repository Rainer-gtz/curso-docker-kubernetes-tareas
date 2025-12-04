// cart-service/server.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import mongoose from 'mongoose';

const {
  PORT = 5002,
  MONGO_URI = 'mongodb://localhost:27017/appdb'
} = process.env;

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Schemas
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  stock: Number
}, { timestamps: true });

const cartItemSchema = new mongoose.Schema({
  cartId: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
  quantity: { type: Number, required: true, min: 1 }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const CartItem = mongoose.model('CartItem', cartItemSchema);

async function connectDB() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB conectado (cart-service)');
}

// Health
app.get('/api/cart/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'error', error: String(e) });
  }
});

// Agregar al carrito
app.post('/api/cart/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const cartId = 'default';

    if (!productId) return res.status(400).json({ error: 'productId es requerido' });
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ error: 'quantity debe ser entero > 0' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Producto no existe' });
    if (product.stock < qty) return res.status(400).json({ error: 'Stock insuficiente' });

    const item = await CartItem.create({ cartId, productId: product._id, quantity: qty });
    res.status(201).json({ item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
});

// Ver carrito
app.get('/api/cart', async (req, res) => {
  try {
    const cartId = 'default';
    const items = await CartItem.find({ cartId }).populate('productId').lean();

    const mapped = items.map(i => ({
      id: i._id,
      product_id: i.productId._id,
      name: i.productId.name,
      price: i.productId.price,
      quantity: i.quantity,
      subtotal: Number(i.productId.price) * Number(i.quantity)
    }));

    const total = mapped.reduce((acc, r) => acc + r.subtotal, 0);

    res.json({ items: mapped, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
});

connectDB()
  .then(() => app.listen(Number(PORT), () => console.log(`Cart service en puerto ${PORT}`)))
  .catch((err) => {
    console.error('Error inicializando cart-service', err);
    process.exit(1);
  });