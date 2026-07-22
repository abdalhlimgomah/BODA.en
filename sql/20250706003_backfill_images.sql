create or replace function backfill_taager_images()
returns integer
language plpgsql
as $$
declare
  updated_count integer;
  rec record;
begin
  updated_count := 0;

  for rec in
    select
      id,
      raw_data->>'thumbnail' as src0,
      raw_data->>'thumbnailUrl' as src1,
      raw_data->>'image_url' as src2,
      raw_data->>'image' as src3,
      raw_data->>'product_image' as src4,
      raw_data->>'img' as src5,
      raw_data->>'imageUrl' as src6,
      raw_data->>'image1' as src7,
      raw_data->>'image_1' as src8,
      raw_data->>'image2' as src9,
      raw_data->>'image_2' as src10,
      raw_data->>'image3' as src11,
      raw_data->>'image_3' as src12,
      raw_data->>'image4' as src13,
      raw_data->>'image_4' as src14,
      raw_data->>'image5' as src15,
      raw_data->>'image_5' as src16,
      raw_data->>'image6' as src17,
      raw_data->>'image_6' as src18,
      raw_data->>'image7' as src19,
      raw_data->>'image_7' as src20,
      raw_data->>'image8' as src21,
      raw_data->>'image_8' as src22,
      raw_data->>'images' as src23,
      raw_data->>'gallery' as src24,
      raw_data->>'extra_images' as src25,
      raw_data->>'additional_images' as src26
    from taager_products
    where is_active = true
      and raw_data is not null
      and (image1 is null and image2 is null and image3 is null and image4 is null
           and image5 is null and image6 is null and image7 is null and image8 is null)
  loop
    update taager_products
    set
      image1 = coalesce(nullif(rec.src0,''), nullif(rec.src1,''), nullif(rec.src2,''), nullif(rec.src3,''), nullif(rec.src4,''), nullif(rec.src5,''), nullif(rec.src6,''), nullif(rec.src7,''), nullif(rec.src8,'')),
      image2 = coalesce(nullif(rec.src9,''), nullif(rec.src10,'')),
      image3 = coalesce(nullif(rec.src11,''), nullif(rec.src12,'')),
      image4 = coalesce(nullif(rec.src13,''), nullif(rec.src14,'')),
      image5 = coalesce(nullif(rec.src15,''), nullif(rec.src16,'')),
      image6 = coalesce(nullif(rec.src17,''), nullif(rec.src18,'')),
      image7 = coalesce(nullif(rec.src19,''), nullif(rec.src20,'')),
      image8 = coalesce(nullif(rec.src21,''), nullif(rec.src22,'')),
      updated_at = now()
    where id = rec.id;
    updated_count := updated_count + 1;
  end loop;

  return updated_count;
end;
$$;
