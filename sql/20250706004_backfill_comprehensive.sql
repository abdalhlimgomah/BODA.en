-- Comprehensive backfill: extracts quick_details, content_ideas, how_to_use, videos, images
-- from ALL possible JSON paths in raw_data (top-level, additionalInfo, variants[0], variants[0].additionalInfo)

CREATE OR REPLACE FUNCTION backfill_taager_comprehensive()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
  rec record;
  v_quick text;
  v_content text;
  v_how_to text;
  v_videos jsonb;
  v_img1 text;
  v_img2 text;
  v_img3 text;
  v_img4 text;
  v_img5 text;
  v_img6 text;
  v_img7 text;
  v_img8 text;
  needs_update boolean;
BEGIN
  updated_count := 0;

  FOR rec IN
    SELECT id, raw_data,
           quick_details, content_ideas, how_to_use, videos,
           image1, image2, image3, image4, image5, image6, image7, image8
    FROM taager_products
    WHERE is_active = true AND raw_data IS NOT NULL
  LOOP
    needs_update := false;

    -- quick_details from all possible paths
    v_quick := COALESCE(
      NULLIF(rec.quick_details, ''),
      NULLIF(rec.raw_data->>'quickDetails', ''),
      NULLIF(rec.raw_data->>'quick_details', ''),
      NULLIF(rec.raw_data->>'quickDetail', ''),
      NULLIF(rec.raw_data->>'specifications', ''),
      NULLIF(rec.raw_data->'additionalInfo'->>'quickDetails', ''),
      NULLIF(rec.raw_data->'additionalInfo'->>'quick_details', ''),
      NULLIF(rec.raw_data->'variants'->0->>'quickDetails', ''),
      NULLIF(rec.raw_data->'variants'->0->>'quick_details', ''),
      NULLIF(rec.raw_data->'variants'->0->>'quickDetail', ''),
      NULLIF(rec.raw_data->'variants'->0->>'specifications', ''),
      NULLIF(rec.raw_data->'variants'->0->'additionalInfo'->>'quickDetails', ''),
      NULLIF(rec.raw_data->'variants'->0->'additionalInfo'->>'quick_details', ''),
      ''
    );

    -- content_ideas from all possible paths
    v_content := COALESCE(
      NULLIF(rec.content_ideas, ''),
      NULLIF(rec.raw_data->>'contentIdeas', ''),
      NULLIF(rec.raw_data->>'content_ideas', ''),
      NULLIF(rec.raw_data->>'contentIdea', ''),
      NULLIF(rec.raw_data->>'content_idea', ''),
      NULLIF(rec.raw_data->>'description', ''),
      NULLIF(rec.raw_data->'additionalInfo'->>'contentIdeas', ''),
      NULLIF(rec.raw_data->'additionalInfo'->>'content_ideas', ''),
      NULLIF(rec.raw_data->'variants'->0->>'contentIdeas', ''),
      NULLIF(rec.raw_data->'variants'->0->>'content_ideas', ''),
      NULLIF(rec.raw_data->'variants'->0->>'contentIdea', ''),
      NULLIF(rec.raw_data->'variants'->0->>'content_idea', ''),
      NULLIF(rec.raw_data->'variants'->0->>'description', ''),
      NULLIF(rec.raw_data->'variants'->0->'additionalInfo'->>'contentIdeas', ''),
      NULLIF(rec.raw_data->'variants'->0->'additionalInfo'->>'content_ideas', ''),
      ''
    );

    -- how_to_use from all possible paths
    v_how_to := COALESCE(
      NULLIF(rec.how_to_use, ''),
      NULLIF(rec.raw_data->>'howToUse', ''),
      NULLIF(rec.raw_data->>'how_to_use', ''),
      NULLIF(rec.raw_data->>'usageInstructions', ''),
      NULLIF(rec.raw_data->'additionalInfo'->>'howToUse', ''),
      NULLIF(rec.raw_data->'additionalInfo'->>'how_to_use', ''),
      NULLIF(rec.raw_data->'variants'->0->>'howToUse', ''),
      NULLIF(rec.raw_data->'variants'->0->>'how_to_use', ''),
      NULLIF(rec.raw_data->'variants'->0->>'usageInstructions', ''),
      NULLIF(rec.raw_data->'variants'->0->>'usage', ''),
      NULLIF(rec.raw_data->'variants'->0->'additionalInfo'->>'howToUse', ''),
      NULLIF(rec.raw_data->'variants'->0->'additionalInfo'->>'how_to_use', ''),
      ''
    );

    -- videos from all possible paths (JSONB array)
    v_videos := COALESCE(
      (CASE WHEN jsonb_array_length(rec.videos) > 0 THEN rec.videos ELSE NULL END),
      rec.raw_data->'variants'->0->'videos',
      rec.raw_data->'variants'->0->'media',
      rec.raw_data->'variants'->0->'videoUrls',
      rec.raw_data->'variants'->0->'video_urls',
      rec.raw_data->'variants'->0->'additionalInfo'->'videos',
      rec.raw_data->'additionalInfo'->'videos',
      rec.raw_data->'videos',
      '[]'::jsonb
    );

    -- images: check if any image already exists
    IF (rec.image1 IS NULL AND rec.image2 IS NULL AND rec.image3 IS NULL AND rec.image4 IS NULL
        AND rec.image5 IS NULL AND rec.image6 IS NULL AND rec.image7 IS NULL AND rec.image8 IS NULL) THEN
      -- Extract images from raw_data using collectAllImages logic
      v_img1 := COALESCE(
        NULLIF(rec.raw_data->>'thumbnail', ''),
        NULLIF(rec.raw_data->>'thumbnailUrl', ''),
        NULLIF(rec.raw_data->>'image_url', ''),
        NULLIF(rec.raw_data->>'image', ''),
        NULLIF(rec.raw_data->>'product_image', ''),
        NULLIF(rec.raw_data->>'img', ''),
        NULLIF(rec.raw_data->>'imageUrl', ''),
        NULLIF(rec.raw_data->>'image1', ''),
        NULLIF(rec.raw_data->>'image_1', ''),
        -- Also check additionalInfo
        NULLIF(rec.raw_data->'additionalInfo'->>'image', ''),
        NULLIF(rec.raw_data->'additionalInfo'->>'thumbnail', ''),
        NULLIF(rec.raw_data->'additionalInfo'->>'image_url', ''),
        NULLIF(rec.raw_data->'additionalInfo'->>'imageUrl', ''),
        NULLIF(rec.raw_data->'additionalInfo'->>'image1', ''),
        -- Also check variants[0]
        NULLIF(rec.raw_data->'variants'->0->>'image', ''),
        NULLIF(rec.raw_data->'variants'->0->>'thumbnail', ''),
        NULLIF(rec.raw_data->'variants'->0->>'image_url', ''),
        NULLIF(rec.raw_data->'variants'->0->>'imageUrl', ''),
        NULLIF(rec.raw_data->'variants'->0->>'image1', ''),
        NULL
      );
      v_img2 := NULL;
      v_img3 := NULL;
      v_img4 := NULL;
      v_img5 := NULL;
      v_img6 := NULL;
      v_img7 := NULL;
      v_img8 := NULL;
    ELSE
      v_img1 := NULL; v_img2 := NULL; v_img3 := NULL; v_img4 := NULL;
      v_img5 := NULL; v_img6 := NULL; v_img7 := NULL; v_img8 := NULL;
    END IF;

    -- Check if we need to update
    IF (v_quick IS DISTINCT FROM rec.quick_details) OR
       (v_content IS DISTINCT FROM rec.content_ideas) OR
       (v_how_to IS DISTINCT FROM rec.how_to_use) OR
       (v_videos IS DISTINCT FROM rec.videos) OR
       (v_img1 IS DISTINCT FROM rec.image1) OR
       (v_img2 IS DISTINCT FROM rec.image2) OR
       (v_img3 IS DISTINCT FROM rec.image3) OR
       (v_img4 IS DISTINCT FROM rec.image4) OR
       (v_img5 IS DISTINCT FROM rec.image5) OR
       (v_img6 IS DISTINCT FROM rec.image6) OR
       (v_img7 IS DISTINCT FROM rec.image7) OR
       (v_img8 IS DISTINCT FROM rec.image8) THEN
      needs_update := true;
    END IF;

    IF needs_update THEN
      UPDATE taager_products SET
        quick_details = COALESCE(v_quick, quick_details),
        content_ideas = COALESCE(v_content, content_ideas),
        how_to_use = COALESCE(v_how_to, how_to_use),
        videos = COALESCE(v_videos, videos),
        image1 = COALESCE(v_img1, image1),
        image2 = COALESCE(v_img2, image2),
        image3 = COALESCE(v_img3, image3),
        image4 = COALESCE(v_img4, image4),
        image5 = COALESCE(v_img5, image5),
        image6 = COALESCE(v_img6, image6),
        image7 = COALESCE(v_img7, image7),
        image8 = COALESCE(v_img8, image8),
        updated_at = NOW()
      WHERE id = rec.id;
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;
