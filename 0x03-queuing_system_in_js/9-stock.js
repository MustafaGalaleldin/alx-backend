#!/usr/bin/node
const express = require('express');
const { createClient } = require('redis');
const { promisify } = require('util');

const app = express();
const client = createClient();
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

const listProducts = [
  { id: 1, name: 'Suitcase 250', price: 50, stock: 4 },
  // ... other products
];

app.get('/list_products', (req, res) => {
  res.json(listProducts);
});

app.get('/list_products/:itemId', async (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  const product = listProducts.find((item) => item.id === itemId);
  if (!product) return res.json({ status: 'Product not found' });

  const reservedStock = parseInt(await getAsync(`item.${itemId}`)) || 0;
  res.json({ ...product, currentQuantity: product.stock - reservedStock });
});

app.get('/reserve_product/:itemId', async (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  const product = listProducts.find((item) => item.id === itemId);
  if (!product) return res.json({ status: 'Product not found' });

  const reservedStock = parseInt(await getAsync(`item.${itemId}`)) || 0;
  if (reservedStock >= product.stock) {
    return res.json({ status: 'Not enough stock available', itemId });
  }

  await setAsync(`item.${itemId}`, reservedStock + 1);
  res.json({ status: 'Reservation confirmed', itemId });
});

app.listen(1245, () => console.log('Server running on port 1245'));
