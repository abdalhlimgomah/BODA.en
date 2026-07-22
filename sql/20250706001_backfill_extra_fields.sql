-- Improved backfill: checks ALL possible JSON paths in raw_data

CREATE OR REPLACE FUNCTION backfill_taager_extra_fields()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE taager_products
  SET
    quick_details = COALESCE(
      NULLIF(quick_details, ''),
      NULLIF(raw_data->>'quickDetails', ''),
      NULLIF(raw_data->>'quick_details', ''),
      NULLIF(raw_data->>'quickDetail', ''),
      NULLIF(raw_data->>'specifications', ''),
      NULLIF(raw_data->'additionalInfo'->>'quickDetails', ''),
      NULLIF(raw_data->'additionalInfo'->>'quick_details', ''),
      NULLIF(raw_data->'variants'->0->>'quickDetails', ''),
      NULLIF(raw_data->'variants'->0->>'quick_details', ''),
      NULLIF(raw_data->'variants'->0->>'quickDetail', ''),
      NULLIF(raw_data->'variants'->0->>'specifications', ''),
      NULLIF(raw_data->'variants'->0->'additionalInfo'->>'quickDetails', ''),
      NULLIF(raw_data->'variants'->0->'additionalInfo'->>'quick_details', ''),
      ''
    ),
    content_ideas = COALESCE(
      NULLIF(content_ideas, ''),
      NULLIF(raw_data->>'contentIdeas', ''),
      NULLIF(raw_data->>'content_ideas', ''),
      NULLIF(raw_data->>'contentIdea', ''),
      NULLIF(raw_data->>'content_idea', ''),
      NULLIF(raw_data->>'description', ''),
      NULLIF(raw_data->'additionalInfo'->>'contentIdeas', ''),
      NULLIF(raw_data->'additionalInfo'->>'content_ideas', ''),
      NULLIF(raw_data->'variants'->0->>'contentIdeas', ''),
      NULLIF(raw_data->'variants'->0->>'content_ideas', ''),
      NULLIF(raw_data->'variants'->0->>'contentIdea', ''),
      NULLIF(raw_data->'variants'->0->>'content_idea', ''),
      NULLIF(raw_data->'variants'->0->>'description', ''),
      NULLIF(raw_data->'variants'->0->'additionalInfo'->>'contentIdeas', ''),
      NULLIF(raw_data->'variants'->0->'additionalInfo'->>'content_ideas', ''),
      ''
    ),
    how_to_use = COALESCE(
      NULLIF(how_to_use, ''),
      NULLIF(raw_data->>'howToUse', ''),
      NULLIF(raw_data->>'how_to_use', ''),
      NULLIF(raw_data->>'usageInstructions', ''),
      NULLIF(raw_data->'additionalInfo'->>'howToUse', ''),
      NULLIF(raw_data->'additionalInfo'->>'how_to_use', ''),
      NULLIF(raw_data->'variants'->0->>'howToUse', ''),
      NULLIF(raw_data->'variants'->0->>'how_to_use', ''),
      NULLIF(raw_data->'variants'->0->>'usageInstructions', ''),
      NULLIF(raw_data->'variants'->0->>'usage', ''),
      NULLIF(raw_data->'variants'->0->'additionalInfo'->>'howToUse', ''),
      NULLIF(raw_data->'variants'->0->'additionalInfo'->>'how_to_use', ''),
      ''
    ),
    videos = COALESCE(
      (CASE WHEN jsonb_array_length(videos) > 0 THEN videos ELSE NULL END),
      raw_data->'variants'->0->'videos',
      raw_data->'variants'->0->'media',
      raw_data->'variants'->0->'videoUrls',
      raw_data->'variants'->0->'video_urls',
      raw_data->'variants'->0->'additionalInfo'->'videos',
      raw_data->'additionalInfo'->'videos',
      raw_data->'videos',
      '[]'::jsonb
    ),
    updated_at = NOW()
  WHERE is_active = true
    AND raw_data IS NOT NULL
    AND (
      quick_details IS NULL OR quick_details = '' OR
      content_ideas IS NULL OR content_ideas = '' OR
      how_to_use IS NULL OR how_to_use = '' OR
      videos IS NULL OR jsonb_array_length(videos) = 0
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
