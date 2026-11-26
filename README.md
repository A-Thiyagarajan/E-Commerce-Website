# ShopStack

ShopStack is a full stack storefront for everyday essentials, with a React and Vite client, an Express REST API, and MongoDB persistence. It includes customer registration and login, product search and category filters, a persistent cart, server-priced checkout, order history, and a role-protected admin area.

## Stack and layout

- Frontend: React, Vite, React Router, Axios, Context API, Lucide React
- Backend: Node.js, Express, Mongoose, JWT, bcryptjs
- Database: MongoDB Atlas, database name `shopstack`

```text
backend/   Express API, MongoDB models, seed script
frontend/  React storefront and admin UI
```

## Setup

Install Node.js 20.19 or newer and create a MongoDB Atlas database user and cluster. In Atlas, allow connections from the development machine's IP address and grant the user read/write access to `shopstack`.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGO_URI`, `JWT_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` in `backend/.env`. For `MONGO_URI`, use the Atlas connection string supplied in your project brief, with `/shopstack` as the database name. Replace `<db_password>` with your Atlas database user's password. URL encode special characters in the password (for example `@` becomes `%40`). Never commit `.env` or put database credentials in frontend files.
3. Set `CLIENT_URL=http://localhost:5173`.
4. Install and seed the backend:

   ```sh
   cd backend
   npm install
   npm run seed
   npm run dev
   ```

The seed script inserts or refreshes 275 products across 11 categories (25 per category) and creates or updates the admin account only when a non-placeholder `ADMIN_PASSWORD` is configured. Run it again to refresh products or update the admin password.

To clean legacy trailing `₹` characters from product names and descriptions without changing any other product fields, run `npm run clean:products` in `backend`.

5. In a second terminal, configure and run the frontend:

   ```sh
   cd frontend
   # Copy .env.example to .env only if you need to override the API or proxy target
   npm install
   npm run dev
   ```

Open the Vite URL shown in the terminal. In development, Vite proxies `/api` to `http://127.0.0.1:5000`, so the browser can use the same host you used to open the site. Set `VITE_PROXY_TARGET` if the API runs elsewhere. MongoDB Atlas must be reachable for the API and seed command to start. MongoDB transactions require an Atlas replica set, as provided by Atlas clusters.

## Configuration

Backend variables are documented in `backend/.env.example`: `PORT`, `MONGO_URI`, `JWT_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLIENT_URL`, optional `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, and `PAYMENT_DEMO_MODE`.

## API

All responses are JSON. Authenticated routes accept `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register a customer |
| POST | `/api/auth/login` | Public | Sign in |
| GET | `/api/auth/profile` | Signed in | Current profile |
| PUT | `/api/auth/profile` | Signed in | Update profile and saved delivery address |
| GET | `/api/products?search=&category=&sort=` | Public | Browse products; sort is `price-asc` or `price-desc` |
| GET | `/api/products/:id` | Public | Product details |
| POST, PUT, DELETE | `/api/products[/:id]` | Admin | Product management |
| POST | `/api/orders` | Signed in | Place a COD order; server validates prices and stock |
| GET | `/api/orders/mine` | Signed in | Own order history |
| GET | `/api/orders/:id` | Owner or admin | Order details |
| GET | `/api/admin/dashboard` | Admin | Store statistics |
| GET | `/api/admin/users` | Admin | Customer list |
| GET | `/api/admin/orders` | Admin | All orders |
| PATCH | `/api/admin/orders/:id/status` | Admin | Update order status |
| GET | `/api/admin/contact` | Admin | View customer contact requests |
| PATCH | `/api/admin/contact/:id/status` | Admin | Update a contact request |
| POST | `/api/contact` | Public or signed in | Send a customer support request |
| GET | `/api/payments/config` | Public | Check if online checkout is enabled |
| POST | `/api/payments/order` | Signed in | Create a Razorpay checkout session |
| POST | `/api/payments/verify` | Signed in | Verify payment and create or settle an order |
| GET | `/api/health` | Public | API health check |

Checkout supports Cash on Delivery. In local development, `PAYMENT_DEMO_MODE=true` enables a clearly labeled simulation for UPI apps, cards, net banking, and wallets; it records a demo result, charges no money, and does not reduce inventory. Demo mode is disabled when `NODE_ENV=production`. For real online payment, create a Razorpay account, add its API key ID and secret to `backend/.env`, and enable the payment methods available to your account. Razorpay Checkout can present UPI, cards, net banking, and wallets enabled for that merchant. The backend calculates the amount, verifies the gateway signature, and only then records a real payment and reduces stock. Never put the Razorpay secret in the frontend.

## Validation and deployment

Run `npm run build` in `frontend` to produce the static client in `frontend/dist`. Run `npm start` in `backend` for the API. Express serves `/product-images/*` from `frontend/public/product-images` (or the repository `images` folder as a fallback). Configure the hosting provider with the backend variables and set `CLIENT_URL` to the deployed frontend origin. The frontend defaults to the ShopStack Render API in production; set `VITE_API_URL` before building when using a different API. Deploy the frontend as a static site and the backend as a Node service that includes the repository image assets. Use HTTPS, a long random JWT secret, a restricted Atlas network policy, and production-specific origins.

## Notes

- Cart contents are stored in browser local storage. Auth uses a bearer token in local storage; deploy behind HTTPS and protect devices appropriately.
- Checkout uses a MongoDB session transaction so stock changes roll back if order creation fails. Atlas supports transactions; a standalone local MongoDB server does not.
- Admin authorization is enforced by backend middleware. There is no public admin signup route.
