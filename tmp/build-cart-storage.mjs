const SUPABASE_URL = "https://msgqzgzoslearaprgiqq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3F6Z3pvc2xlYXJhcHJnaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk3MTIsImV4cCI6MjA4NTkxNTcxMn0.fQu1toCisGIly8FZqHy3yoEwnY-e7vthk8PCmkBMifE";

const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&limit=5`, {
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
});

if (!response.ok) {
  throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
}

const rows = (await response.json()).filter(Boolean);
const cartItems = rows.map((row, index) => ({
  id: String(row.id),
  product_id: row.product_id ?? row.id,
  name: row.name || row.product_name || row.title || "",
  price: Number(row.price || row.price_after_discount || row.discountPrice || 0) || 0,
  originalPrice: Number(row.originalPrice || row.old_price || row.price_before_discount || row.price || 0) || 0,
  old_price: Number(row.old_price || row.price_before_discount || row.originalPrice || 0) || 0,
  quantity: index === 0 ? 2 : 1,
  image: row.image || row.image_url || row.thumbnail || (Array.isArray(row.images) ? row.images[0] : ""),
  image_url: row.image_url || row.image || row.thumbnail || (Array.isArray(row.images) ? row.images[0] : ""),
  category: row.category || "",
  description: row.description || "",
  seller: row.store_name || row.shop_name || row.seller || row.brand || "",
  seller_name: row.seller_name || row.seller || "",
  store_name: row.store_name || row.shop_name || "",
  variant: row.variant || "",
  color: row.color || "",
  size: row.size || "",
  source: row.source || "internal",
}));

const storageState = {
  cookies: [],
  origins: [
    {
      origin: "http://127.0.0.1:4173",
      localStorage: [
        { name: "cart", value: JSON.stringify(cartItems) },
        { name: "isLoggedIn", value: "true" },
        { name: "userPhoneVerified", value: "true" },
      ],
    },
  ],
};

console.log(JSON.stringify({ count: cartItems.length, storageState }, null, 2));
