import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { connectDB } from '../config/db.js';
import { cleanProductDescription, cleanProductName } from '../utils/productText.js';

try {
  await connectDB();

  let scanned = 0;
  const operations = [];
  const products = Product.find({}, '_id name description').lean().cursor();

  for await (const product of products) {
    scanned += 1;
    const name = cleanProductName(product.name);
    const description = cleanProductDescription(product.description);

    if (name !== product.name || description !== product.description) {
      operations.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { name, description } }
        }
      });
    }
  }

  if (operations.length) await Product.bulkWrite(operations, { ordered: true });
  console.log(`Scanned ${scanned} products; cleaned ${operations.length} names/descriptions. No other product fields were changed.`);
} catch (error) {
  console.error('Product text cleanup failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
