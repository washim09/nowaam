# Nowaam Leather E-Commerce MVP

An end-to-end e-commerce MVP for a leather manufacturer selling wallets and belts to both retail and wholesale customers.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- MongoDB with Mongoose
- Razorpay Checkout

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env.local
```

3. Fill in MongoDB and Razorpay credentials.

4. Start the development server:

```bash
npm run dev
```

## Included Features

- Retail and bulk pricing
- Product catalog with location filtering
- Product detail pages with live total calculation
- Persistent cart using local storage
- Razorpay-backed checkout flow
- Admin dashboard and add-product form
- MongoDB-backed product and order APIs
