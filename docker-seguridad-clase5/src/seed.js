// src/seed.js
import mongoose from 'mongoose';

const {
  MONGO_URI = 'mongodb://mongo:27017/appdb'
} = process.env;

const productSchema = new mongoose.Schema({
  name: String,
  price: Number
});
const Product = mongoose.model('Product', productSchema);

async function seed() {
  await mongoose.connect(MONGO_URI);
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      { name: 'Mouse Gamer', price: 15.5 },
      { name: 'Teclado Mecánico', price: 45.0 },
      { name: 'Monitor 24"', price: 120.0 }
    ]);
    console.log('Datos de prueba insertados');
  } else {
    console.log('Ya existen datos, no se insertan nuevos');
  }
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });