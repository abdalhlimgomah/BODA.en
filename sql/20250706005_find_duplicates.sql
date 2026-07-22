CREATE OR REPLACE FUNCTION find_duplicate_products()
RETURNS TABLE(taager_product_id TEXT, ids TEXT[], best_id TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH dupes AS (
    SELECT tp.taager_product_id, array_agg(tp.id ORDER BY tp.id) AS ids
    FROM taager_products tp
    WHERE tp.taager_product_id IS NOT NULL AND tp.taager_product_id != ''
    GROUP BY tp.taager_product_id
    HAVING COUNT(*) > 1
  ),
  scored AS (
    SELECT
      d.taager_product_id,
      d.ids,
      (
        SELECT p2.id
        FROM taager_products p2
        WHERE p2.id = ANY(d.ids)
        ORDER BY
          (CASE WHEN p2.name IS NOT NULL AND p2.name != '' THEN 1 ELSE 0 END) DESC,
          (CASE WHEN p2.description IS NOT NULL AND p2.description != '' THEN 1 ELSE 0 END) DESC,
          (CASE WHEN p2.quick_details IS NOT NULL AND p2.quick_details != '' THEN 1 ELSE 0 END) DESC,
          (CASE WHEN p2.content_ideas IS NOT NULL AND p2.content_ideas != '' THEN 1 ELSE 0 END) DESC,
          (CASE WHEN p2.how_to_use IS NOT NULL AND p2.how_to_use != '' THEN 1 ELSE 0 END) DESC,
          (CASE WHEN p2.videos IS NOT NULL AND jsonb_array_length(p2.videos::jsonb) > 0 THEN 1 ELSE 0 END) DESC,
          (CASE WHEN p2.image1 IS NOT NULL AND p2.image1 != '' THEN 1 ELSE 0 END +
           CASE WHEN p2.image2 IS NOT NULL AND p2.image2 != '' THEN 1 ELSE 0 END +
           CASE WHEN p2.image3 IS NOT NULL AND p2.image3 != '' THEN 1 ELSE 0 END +
           CASE WHEN p2.image4 IS NOT NULL AND p2.image4 != '' THEN 1 ELSE 0 END +
           CASE WHEN p2.image5 IS NOT NULL AND p2.image5 != '' THEN 1 ELSE 0 END +
           CASE WHEN p2.image6 IS NOT NULL AND p2.image6 != '' THEN 1 ELSE 0 END +
           CASE WHEN p2.image7 IS NOT NULL AND p2.image7 != '' THEN 1 ELSE 0 END +
           CASE WHEN p2.image8 IS NOT NULL AND p2.image8 != '' THEN 1 ELSE 0 END) DESC,
          p2.updated_at DESC NULLS LAST
        LIMIT 1
      )::TEXT AS best_id
    FROM dupes d
  )
  SELECT s.taager_product_id, s.ids, s.best_id FROM scored s;
END;
$$;
