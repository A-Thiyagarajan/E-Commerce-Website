import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Product from './models/Product.js';
import { productImagePath } from './utils/productImages.js';
import { existsSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This catalogue is the complete ShopStack product inventory.
const catalog = {
  "Electronics": [
    [
      "Samsung Galaxy M15 5G",
      13499
    ],
    [
      "Redmi Note 14 5G",
      17999
    ],
    [
      "iPhone 15",
      54999
    ],
    [
      "OnePlus Nord CE 4",
      22999
    ],
    [
      "Realme Narzo 70 Pro",
      18999
    ],
    [
      "boAt Airdopes 141",
      1299
    ],
    [
      "Sony WH-CH520 Headphones",
      4490
    ],
    [
      "JBL Tune 510BT",
      2999
    ],
    [
      "boAt Stone 350 Speaker",
      1499
    ],
    [
      "Sony Bluetooth Speaker",
      5499
    ],
    [
      "HP Wireless Mouse",
      699
    ],
    [
      "Logitech Keyboard",
      1499
    ],
    [
      "Dell 24-inch Monitor",
      11999
    ],
    [
      "HP Laptop 15",
      48999
    ],
    [
      "Lenovo IdeaPad Slim 3",
      42999
    ],
    [
      "Samsung 1TB SSD",
      7499
    ],
    [
      "SanDisk 128GB Pendrive",
      899
    ],
    [
      "Mi 20000mAh Power Bank",
      2199
    ],
    [
      "Portronics USB Hub",
      799
    ],
    [
      "Apple 20W Charger",
      1699
    ],
    [
      "Samsung 32-inch Smart TV",
      14999
    ],
    [
      "Canon Inkjet Printer",
      5999
    ],
    [
      "TP-Link Wi-Fi Router",
      1799
    ],
    [
      "Fire-Boltt Smartwatch",
      1499
    ],
    [
      "Noise ColorFit Smartwatch",
      2499
    ]
  ],
  "Fashion": [
    [
      "Men's Cotton T-Shirt",
      499
    ],
    [
      "Men's Casual Shirt",
      899
    ],
    [
      "Men's Slim Fit Jeans",
      1299
    ],
    [
      "Men's Formal Trousers",
      1199
    ],
    [
      "Men's Hoodie",
      1499
    ],
    [
      "Men's Denim Jacket",
      1999
    ],
    [
      "Men's Kurta",
      999
    ],
    [
      "Men's Track Pants",
      699
    ],
    [
      "Men's Polo T-Shirt",
      799
    ],
    [
      "Women's Floral Kurti",
      699
    ],
    [
      "Women's Saree",
      1499
    ],
    [
      "Women's Leggings",
      399
    ],
    [
      "Women's Western Dress",
      1299
    ],
    [
      "Women's Jeans",
      1199
    ],
    [
      "Women's Top",
      599
    ],
    [
      "Women's Palazzo Pants",
      799
    ],
    [
      "Women's Winter Sweater",
      1399
    ],
    [
      "Women's Cotton Nightwear",
      699
    ],
    [
      "Men's Casual Shorts",
      499
    ],
    [
      "Women's Denim Jacket",
      1799
    ],
    [
      "Men's Blazer",
      2999
    ],
    [
      "Women's Maxi Dress",
      1599
    ],
    [
      "Men's Ethnic Wear Set",
      1899
    ],
    [
      "Women's Leggings Set",
      999
    ],
    [
      "Unisex Sweatshirt",
      1099
    ]
  ],
  "Home & Kitchen": [
    [
      "Non-Stick Frying Pan",
      899
    ],
    [
      "Stainless Steel Pressure Cooker",
      1799
    ],
    [
      "Electric Kettle",
      999
    ],
    [
      "Mixer Grinder",
      2499
    ],
    [
      "Rice Cooker",
      1899
    ],
    [
      "Air Fryer",
      4999
    ],
    [
      "Microwave Oven",
      7999
    ],
    [
      "Water Purifier",
      8999
    ],
    [
      "Dinner Set 24 Pieces",
      1499
    ],
    [
      "Stainless Steel Water Bottle",
      399
    ],
    [
      "Ceramic Coffee Mug Set",
      499
    ],
    [
      "Kitchen Knife Set",
      799
    ],
    [
      "Food Storage Container Set",
      699
    ],
    [
      "Cotton Bedsheet",
      999
    ],
    [
      "Microfiber Pillow",
      599
    ],
    [
      "Double Bed Comforter",
      1799
    ],
    [
      "LED Table Lamp",
      799
    ],
    [
      "Wall Clock",
      499
    ],
    [
      "Plastic Storage Rack",
      1299
    ],
    [
      "Curtains Set",
      899
    ],
    [
      "Laundry Basket",
      599
    ],
    [
      "Bathroom Organizer",
      499
    ],
    [
      "Non-Stick Cookware Set",
      2499
    ],
    [
      "Vacuum Cleaner",
      3999
    ],
    [
      "Ceiling Fan",
      2199
    ]
  ],
  "Beauty": [
    [
      "Lakme Matte Lipstick",
      499
    ],
    [
      "Maybelline Foundation",
      699
    ],
    [
      "Lakme Kajal",
      199
    ],
    [
      "Maybelline Mascara",
      399
    ],
    [
      "Faces Canada Compact Powder",
      299
    ],
    [
      "Nivea Body Lotion",
      249
    ],
    [
      "Dove Shampoo",
      299
    ],
    [
      "Tresemme Conditioner",
      349
    ],
    [
      "Himalaya Face Wash",
      179
    ],
    [
      "Mamaearth Vitamin C Serum",
      599
    ],
    [
      "Minimalist Niacinamide Serum",
      599
    ],
    [
      "Neutrogena Sunscreen SPF 50",
      499
    ],
    [
      "Garnier Micellar Water",
      299
    ],
    [
      "Biotique Face Scrub",
      199
    ],
    [
      "Plum Green Tea Moisturizer",
      399
    ],
    [
      "L'Oreal Hair Serum",
      499
    ],
    [
      "Gillette Shaving Kit",
      599
    ],
    [
      "Philips Hair Dryer",
      1299
    ],
    [
      "Vega Hair Straightener",
      1499
    ],
    [
      "Renee Perfume",
      699
    ],
    [
      "Engage Body Spray",
      249
    ],
    [
      "Mamaearth Face Cream",
      399
    ],
    [
      "Sugar Makeup Kit",
      999
    ],
    [
      "Colorbar Nail Polish Set",
      499
    ],
    [
      "Cetaphil Gentle Cleanser",
      499
    ]
  ],
  "Books": [
    [
      "Atomic Habits",
      499
    ],
    [
      "Rich Dad Poor Dad",
      299
    ],
    [
      "The Psychology of Money",
      399
    ],
    [
      "Think and Grow Rich",
      249
    ],
    [
      "The Alchemist",
      299
    ],
    [
      "Ikigai",
      349
    ],
    [
      "Deep Work",
      399
    ],
    [
      "The Power of Habit",
      399
    ],
    [
      "Wings of Fire",
      299
    ],
    [
      "India 2020",
      299
    ],
    [
      "Harry Potter and the Philosopher's Stone",
      499
    ],
    [
      "The Jungle Book",
      199
    ],
    [
      "Sherlock Holmes Collection",
      399
    ],
    [
      "The Great Gatsby",
      249
    ],
    [
      "Pride and Prejudice",
      299
    ],
    [
      "NCERT Mathematics Class 10",
      199
    ],
    [
      "NCERT Science Class 10",
      199
    ],
    [
      "Java Programming Guide",
      599
    ],
    [
      "Python Crash Course",
      699
    ],
    [
      "Clean Code",
      799
    ],
    [
      "Introduction to Algorithms",
      999
    ],
    [
      "Operating System Concepts",
      899
    ],
    [
      "Database Management Systems",
      699
    ],
    [
      "Machine Learning for Beginners",
      599
    ],
    [
      "Computer Networking Basics",
      499
    ]
  ],
  "Toys & Games": [
    [
      "LEGO Building Blocks",
      999
    ],
    [
      "Remote Control Car",
      799
    ],
    [
      "Toy Train Set",
      1299
    ],
    [
      "Teddy Bear",
      599
    ],
    [
      "Barbie Doll",
      899
    ],
    [
      "Building Blocks Set",
      499
    ],
    [
      "Rubik's Cube",
      199
    ],
    [
      "Chess Board",
      399
    ],
    [
      "Carrom Board",
      1299
    ],
    [
      "Monopoly Board Game",
      799
    ],
    [
      "Ludo Board Game",
      149
    ],
    [
      "Scrabble Game",
      699
    ],
    [
      "Jigsaw Puzzle 1000 Pieces",
      499
    ],
    [
      "Toy Kitchen Set",
      899
    ],
    [
      "Doctor Play Set",
      499
    ],
    [
      "Cricket Bat Toy Set",
      599
    ],
    [
      "Football Toy",
      399
    ],
    [
      "Nerf Toy Blaster",
      1499
    ],
    [
      "Musical Keyboard Toy",
      999
    ],
    [
      "Baby Rattle Set",
      199
    ],
    [
      "Water Gun",
      299
    ],
    [
      "Dinosaur Toy Set",
      699
    ],
    [
      "RC Helicopter",
      1999
    ],
    [
      "Drawing Board for Kids",
      499
    ],
    [
      "Kids Science Experiment Kit",
      899
    ]
  ],
  "Grocery": [
    [
      "Aashirvaad Atta 5kg",
      299
    ],
    [
      "India Gate Basmati Rice 5kg",
      499
    ],
    [
      "Toor Dal 1kg",
      179
    ],
    [
      "Moong Dal 1kg",
      149
    ],
    [
      "Sugar 1kg",
      49
    ],
    [
      "Tata Salt 1kg",
      28
    ],
    [
      "Fortune Sunflower Oil 1L",
      149
    ],
    [
      "Groundnut Oil 1L",
      189
    ],
    [
      "Amul Butter 500g",
      285
    ],
    [
      "Amul Milk 1L",
      68
    ],
    [
      "Nescafe Coffee 100g",
      299
    ],
    [
      "Tata Tea Premium 500g",
      249
    ],
    [
      "Parle-G Biscuit Pack",
      20
    ],
    [
      "Britannia Good Day",
      40
    ],
    [
      "Maggi Noodles Pack",
      72
    ],
    [
      "Kellogg's Corn Flakes",
      199
    ],
    [
      "Quaker Oats 1kg",
      179
    ],
    [
      "Kissan Tomato Ketchup",
      99
    ],
    [
      "Aashirvaad Spices Combo",
      199
    ],
    [
      "Peanut Butter 1kg",
      299
    ],
    [
      "Honey 500g",
      199
    ],
    [
      "Cashew Nuts 250g",
      249
    ],
    [
      "Almonds 250g",
      299
    ],
    [
      "Chana Dal 1kg",
      109
    ],
    [
      "Green Tea 100g",
      199
    ]
  ],
  "Accessories": [
    [
      "Men's Leather Wallet",
      499
    ],
    [
      "Women's Handbag",
      999
    ],
    [
      "Casual Backpack",
      799
    ],
    [
      "Laptop Backpack",
      1499
    ],
    [
      "Men's Leather Belt",
      399
    ],
    [
      "Women's Sunglasses",
      599
    ],
    [
      "Men's Sunglasses",
      699
    ],
    [
      "Analog Wrist Watch",
      1299
    ],
    [
      "Fashion Bracelet",
      299
    ],
    [
      "Silver-Plated Necklace",
      499
    ],
    [
      "Women's Earrings Set",
      399
    ],
    [
      "Hair Claw Clips Set",
      199
    ],
    [
      "Leather Card Holder",
      299
    ],
    [
      "Travel Duffel Bag",
      1199
    ],
    [
      "Passport Holder",
      299
    ],
    [
      "Keychain Set",
      149
    ],
    [
      "Laptop Sleeve",
      599
    ],
    [
      "Mobile Phone Case",
      299
    ],
    [
      "Mobile Ring Holder",
      149
    ],
    [
      "Reusable Shopping Bag",
      199
    ],
    [
      "Men's Cap",
      299
    ],
    [
      "Women's Scarf",
      399
    ],
    [
      "Winter Gloves",
      299
    ],
    [
      "Unisex Beanie",
      249
    ],
    [
      "Travel Organizer Kit",
      499
    ]
  ],
  "Sports": [
    [
      "Cricket Bat",
      1499
    ],
    [
      "Cricket Ball",
      299
    ],
    [
      "Cricket Kit",
      3999
    ],
    [
      "Football",
      799
    ],
    [
      "Basketball",
      899
    ],
    [
      "Volleyball",
      699
    ],
    [
      "Badminton Racket",
      999
    ],
    [
      "Badminton Shuttlecock Set",
      299
    ],
    [
      "Tennis Racket",
      1499
    ],
    [
      "Table Tennis Bat",
      499
    ],
    [
      "Yoga Mat",
      599
    ],
    [
      "Dumbbell Set 10kg",
      1499
    ],
    [
      "Resistance Bands",
      399
    ],
    [
      "Skipping Rope",
      199
    ],
    [
      "Treadmill",
      18999
    ],
    [
      "Exercise Cycle",
      9999
    ],
    [
      "Gym Gloves",
      399
    ],
    [
      "Sports Water Bottle",
      299
    ],
    [
      "Sports Shoes",
      1499
    ],
    [
      "Running Shorts",
      599
    ],
    [
      "Yoga Block Set",
      399
    ],
    [
      "Fitness Tracker",
      1999
    ],
    [
      "Swimming Goggles",
      499
    ],
    [
      "Cycling Helmet",
      999
    ],
    [
      "Camping Tent",
      2999
    ]
  ],
  "Automotive": [
    [
      "Car Mobile Holder",
      399
    ],
    [
      "Car Phone Charger",
      499
    ],
    [
      "Car Vacuum Cleaner",
      1299
    ],
    [
      "Car Air Freshener",
      199
    ],
    [
      "Car Seat Cover Set",
      1999
    ],
    [
      "Car Floor Mats",
      899
    ],
    [
      "Car Dashboard Polish",
      299
    ],
    [
      "Car Washing Shampoo",
      249
    ],
    [
      "Microfiber Cleaning Cloth",
      199
    ],
    [
      "Bike Helmet",
      1499
    ],
    [
      "Bike Cover",
      599
    ],
    [
      "Bike Mobile Holder",
      399
    ],
    [
      "Bike Gloves",
      499
    ],
    [
      "Tyre Inflator",
      1299
    ],
    [
      "Digital Tyre Pressure Gauge",
      499
    ],
    [
      "Jump Starter Kit",
      2499
    ],
    [
      "Car Dash Camera",
      2999
    ],
    [
      "LED Headlight Bulb",
      799
    ],
    [
      "Bike LED Indicator Set",
      399
    ],
    [
      "Car Sunshade",
      299
    ],
    [
      "Car Emergency Tool Kit",
      999
    ],
    [
      "Motorcycle Chain Lubricant",
      249
    ],
    [
      "Car Steering Wheel Cover",
      399
    ],
    [
      "Portable Car Compressor",
      1799
    ],
    [
      "Car Organizer",
      499
    ]
  ],
  "Baby & Kids": [
    [
      "Baby Cotton Romper",
      399
    ],
    [
      "Baby Clothing Set",
      699
    ],
    [
      "Baby Diapers Pack",
      499
    ],
    [
      "Baby Wipes Pack",
      199
    ],
    [
      "Baby Feeding Bottle",
      299
    ],
    [
      "Baby Sipper Cup",
      249
    ],
    [
      "Baby Blanket",
      599
    ],
    [
      "Baby Mosquito Net",
      399
    ],
    [
      "Baby Bath Tub",
      799
    ],
    [
      "Baby Shampoo",
      199
    ],
    [
      "Baby Body Lotion",
      249
    ],
    [
      "Baby Powder",
      149
    ],
    [
      "Baby Stroller",
      3999
    ],
    [
      "Baby Carrier",
      1499
    ],
    [
      "Baby High Chair",
      2499
    ],
    [
      "Baby Sleeping Pillow",
      399
    ],
    [
      "Kids School Bag",
      799
    ],
    [
      "Kids Water Bottle",
      299
    ],
    [
      "Kids Lunch Box",
      399
    ],
    [
      "Kids Raincoat",
      499
    ],
    [
      "Kids Shoes",
      699
    ],
    [
      "Kids Cartoon T-Shirt",
      399
    ],
    [
      "Kids Study Table",
      1999
    ],
    [
      "Baby Teether",
      199
    ],
    [
      "Baby Musical Toy",
      499
    ]
  ]
};
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imageFolders = {
  Electronics: 'shopstack_electronics_clean_images',
  Fashion: 'shopstack_fashion_images',
  'Home & Kitchen': 'shopstack_home_kitchen_images/home_kitchen',
  Beauty: 'shopstack_beauty_images/beauty',
  Books: '25_book_product_images',
  'Toys & Games': '25_toy_product_images',
  Grocery: '25_grocery_product_images',
  Accessories: 'fashion_product_images',
  Sports: 'sports_fitness_product_images',
  Automotive: 'car_bike_accessories_images',
  'Baby & Kids': 'baby_kids_product_images'
};
const normalizeImageKey = value => value.toLowerCase().replace(/inches/g, 'inch').replace(/[^a-z0-9]/g, '');
const imageUrlFor = (name, category) => {
  const folder = imageFolders[category];
  const imageUrl = productImagePath({ name, category });
  const filename = decodeURIComponent(imageUrl.split('/').pop() || '');
  const sourcePath = folder && filename ? join(projectRoot, 'images', folder, filename) : '';
  const publicPath = folder && filename ? join(projectRoot, 'frontend', 'public', 'product-images', folder, filename) : '';
  if (!folder || !imageUrl.startsWith('/product-images/') || !existsSync(sourcePath) || !existsSync(publicPath)) throw new Error(`No valid existing product photo mapping for ${category}: ${name}`);
  return imageUrl;
};
const products = Object.entries(catalog).flatMap(([category, items]) => items.map(([name, price], index) => ({
  name,
  category,
  description: `${name} from ShopStack's ${category} collection. A quality everyday choice, carefully packed and ready to ship.`,
  price,
  imageUrl: imageUrlFor(name, category),
  stock: 10 + ((index * 7 + category.length * 3) % 41),
  rating: Number((4.1 + ((index + category.length) % 9) * 0.1).toFixed(1)),
  featured: index < 2
})));

try {
  await connectDB();
  const legacySuffix = '\t' + String.fromCodePoint(0x20b9);
  await Product.bulkWrite(products.map(product => ({
    updateOne: {
      filter: { name: { $in: [product.name, `${product.name}${legacySuffix}`] } },
      update: { $set: product, $unset: { image: '' } },
      upsert: true
    }
  })), { ordered: true });
  await Product.deleteMany({ name: { $nin: products.map(product => product.name) } });

  let adminReady = false;
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD !== 'change_this_password') {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    await User.updateOne({ email }, { $set: { name: process.env.ADMIN_NAME || 'Admin', email, password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: 'admin' } }, { upsert: true });
    adminReady = true;
  } else console.warn('Admin not created: configure a strong ADMIN_PASSWORD first.');

  console.log(`Replaced the product catalogue with ${products.length} products across ${Object.keys(catalog).length} categories${adminReady ? ' and configured the admin account' : ''}.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
