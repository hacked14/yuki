# Enchanted Daydreams by Yuki

A custom, self-hosted e-commerce site for a boutique handcrafted jewelry brand — built with Node.js/Express, MongoDB, vanilla JS, and Three.js. No Shopify, no payment gateway: checkout happens over **WhatsApp**.

## How WhatsApp checkout works

There's no Razorpay/Stripe integration. Instead:

1. A shopper adds items to their bag (or hits "Buy Now" on a product page).
2. On checkout, the frontend calls `POST /api/checkout/create-order`.
3. The backend re-prices the order from the database (never trusts client-side prices), saves it to MongoDB with status `Pending Confirmation`, and builds a formatted message listing every item, quantity, price, and the shopper's contact details.
4. The API returns a `https://wa.me/<ADMIN_WHATSAPP_NUMBER>?text=<message>` link. The frontend opens it in a new tab — WhatsApp launches (app or web) with that message already typed into the chat with your business number.
5. The shopper just hits send. You confirm availability and arrange payment however you like, then update the order's status (`Confirmed` → `Shipped` → `Completed`) from the admin dashboard's Orders tab.

Set your business WhatsApp number in `.env` as `ADMIN_WHATSAPP_NUMBER` (international format, digits only — e.g. `919876543210` for an Indian +91 number).

## Project structure

```
enchanted-daydreams/
├── server/
│   ├── server.js            # Express app entry point
│   ├── seed.js               # creates the permanent default admin on boot
│   ├── config/
│   │   ├── db.js             # MongoDB connection
│   │   └── cloudinary.js     # image + .glb upload storage config
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── Order.js
│   ├── middleware/
│   │   ├── auth.js           # JWT protect + adminOnly guards
│   │   └── errorHandler.js
│   └── routes/
│       ├── auth.js           # register / login / me
│       ├── products.js       # public product listing + detail
│       ├── admin.js          # product CRUD, order management, create-admin
│       ├── checkout.js       # builds the order + WhatsApp message
│       └── orders.js         # a user's own order history
├── public/
│   ├── index.html            # homepage: hero, Three.js Top Picks viewer, featured grid
│   ├── shop.html             # full shop with filters/sort/search
│   ├── product.html          # product detail + Add to Bag + Buy Now via WhatsApp
│   ├── admin.html            # protected admin dashboard
│   ├── account.html          # logged-in user's order history
│   ├── css/style.css         # brand design system (tokens, components)
│   ├── css/admin.css         # admin dashboard styles
│   └── js/
│       ├── config.js
│       ├── auth.js           # sign-in/register modal + timed 10-15s auto-trigger
│       ├── cart.js           # cart drawer + WhatsApp checkout
│       ├── three-viewer.js   # Three.js Top Picks 3D canvas (OrbitControls + hotspots)
│       ├── main.js           # homepage data loading
│       ├── shop.js           # shop page filtering/sorting/pagination
│       ├── product.js        # product detail page
│       └── admin.js          # admin dashboard logic
├── package.json
└── .env.example
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **MongoDB** — install locally or use MongoDB Atlas (free tier is fine). Copy `.env.example` to `.env` and set `MONGO_URI`.

3. **Cloudinary** — create a free account at cloudinary.com for image and `.glb` model hosting. Fill in `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env`.

4. **Set your WhatsApp number and JWT secret** in `.env`:
   ```
   ADMIN_WHATSAPP_NUMBER=919876543210
   JWT_SECRET=<generate a long random string>
   ```

5. **Run the server**
   ```bash
   npm run dev     # with nodemon, auto-restarts on changes
   # or
   npm start
   ```
   On first boot, the server automatically seeds a permanent admin account using `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` from `.env`. **Log in and change that password immediately** (there's no "change password" endpoint yet — add one, or update it directly in MongoDB, before going live).

6. Visit `http://localhost:5000`. Log in with the seeded admin account — you'll be redirected to `/admin.html` automatically (the smart login redirect checks `role` and sends admins to the dashboard, regular users stay in the store).

## Adding your first products

From the Admin Dashboard → **Add Product**: upload photos, optionally a `.glb` 3D model, mark it "Featured on Landing Page" to show it in the shop grid, or "Replace Top Pick 3D Model" to make it the interactive Three.js hero piece on the homepage (only one product can hold that spot at a time — checking it on a new product automatically unchecks it elsewhere).

## Notes & things to harden before going fully live

- **Hotspot annotations** on the 3D viewer are stored on the `Product.hotspots` array (`x`/`y` normalized 0–1 canvas coordinates + a label/note) but there's no admin UI to place them yet — add them directly via the API or a MongoDB client for now.
- **Guest checkout** uses `prompt()` for name/phone as a minimal placeholder — swap in a proper inline form for production.
- **Rate limiting / CSRF / helmet** aren't wired in — add them before deploying publicly.
- The **"Wear View"** bust is a simple procedural cylinder placeholder; swap in a real bust/mannequin `.glb` for a polished look.
