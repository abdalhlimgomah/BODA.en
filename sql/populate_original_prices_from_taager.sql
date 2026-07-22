-- Populate product_original_prices from taager_products raw_data JSONB
INSERT INTO public.product_original_prices (product_id, product_name, product_price, fake_original_price)
SELECT
  'taager_' || tp.taager_product_id AS product_id,
  COALESCE(tp.name, '') AS product_name,
  tp.price AS product_price,
  GREATEST(
    COALESCE((tp.raw_data->>'old_price')::numeric, 0),
    COALESCE((tp.raw_data->>'original_price')::numeric, 0),
    COALESCE((tp.raw_data->>'list_price')::numeric, 0),
    COALESCE((tp.raw_data->>'compare_at_price')::numeric, 0),
    COALESCE((tp.raw_data->>'price_before_discount')::numeric, 0),
    COALESCE((tp.raw_data->'financials'->>'originalPrice')::numeric, 0),
    COALESCE((tp.raw_data->'financials'->>'finalPriceBeforeDiscount')::numeric, 0),
    COALESCE((tp.raw_data->'financials'->>'discountedPrice')::numeric, 0),
    0
  ) AS fake_original_price
FROM public.taager_products tp
WHERE tp.is_active = true
  AND tp.price > 0
  AND GREATEST(
    COALESCE((tp.raw_data->>'old_price')::numeric, 0),
    COALESCE((tp.raw_data->>'original_price')::numeric, 0),
    COALESCE((tp.raw_data->>'list_price')::numeric, 0),
    COALESCE((tp.raw_data->>'compare_at_price')::numeric, 0),
    COALESCE((tp.raw_data->>'price_before_discount')::numeric, 0),
    COALESCE((tp.raw_data->'financials'->>'originalPrice')::numeric, 0),
    COALESCE((tp.raw_data->'financials'->>'finalPriceBeforeDiscount')::numeric, 0),
    COALESCE((tp.raw_data->'financials'->>'discountedPrice')::numeric, 0),
    0
  ) > tp.price * 1.05
ON CONFLICT (product_id)
DO UPDATE SET
  product_price = EXCLUDED.product_price,
  fake_original_price = EXCLUDED.fake_original_price,
  updated_at = now()
WHERE EXCLUDED.fake_original_price > 0
  AND EXCLUDED.fake_original_price != product_original_prices.fake_original_price;
