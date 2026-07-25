-- Merge old system keywords into Supabase categories
-- Combines: old CATEGORY_KEYWORDS_LOCAL + current seed keywords

-- Helper: merge arrays (union, remove duplicates)
CREATE OR REPLACE FUNCTION merge_keywords(arr1 TEXT[], arr2 TEXT[])
RETURNS TEXT[] AS $$
  SELECT ARRAY(
    SELECT DISTINCT unnest FROM (
      SELECT unnest(arr1) UNION SELECT unnest(arr2)
    ) sub WHERE unnest IS NOT NULL AND trim(unnest) != ''
    ORDER BY 1
  );
$$ LANGUAGE sql IMMUTABLE;

-- 1. إلكترونيات → electronics
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['هاتف','جوال','موبايل','phone','samsung','iphone','apple','كمبيوتر','laptop','شاحن','charger','cable','usb','سماعة','headphone','بلوتوث','bluetooth','electronic','جهاز','سامسونج','آيفون','شاومي','هواوي','تابلت','لابتوب','لاب توب','سماعات','bt','الكتروني','ايفون','ios','اندرويد','android','شاشة','lcd','oled','tv','تلفزيون','رسيفر','مكبر','ميكروويف','مكنسة','غسالة','براد','ثلاجة','كاميرا','تصوير','كاميرات','بروجيكتور','برنتر','طابعة','سكانر','ماسح','شواحن','باور بانك','power bank']) WHERE slug = 'electronics';

-- 2. موبايلات وملحقاتها → phones
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['جراب','حافظة موبايل','case','cover','شاحن موبايل','power bank','موبايل','mobile','هاتف','جوال','tablet','samsung','iphone','xiaomi','شاومي','تابلت','ايباد','ipad','سلك','usb','type c','cable','باور بانك','شاحن','كفر']) WHERE slug = 'phones';

-- 3. ملابس وأحذية → clothing
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['قميص','تيشيرت','تي شيرت','بنطلون','جينز','jeans','فستان','dress','حذاء','shoes','sneakers','snickers','شوز','boots','بوت','ملابس','clothes','shirt','jacket','جاكيت','عباية','حجاب','جلابية','رياضي','كاجوال','شورت','short','بلوزة']) WHERE slug = 'clothing';

-- 4. منتجات تجميل وعناية + عطور → beauty (الصحة والجمال)
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['تجميل','عناية','كريم','cream','مكياج','makeup','beauty','skincare','شعر','hair','بشرة','skin','عطور','عطر','perfume','فراجرانس','fragrance','كولونيا','cologne','دهن عود','oud','بخور','ماسك','غسول','مرطب','واقي شمس','مقشر','سيروم','serum','روج','أحمر شفاه','ايلاينر','ظلال','ماسكرا','عدسات','لوشن','صابون','شامبو','بلسم','زيت شعر','صبغة','استشوار']) WHERE slug = 'beauty';

-- 5. عطور → perfume
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['عطر','عطور','perfume','fragrance','كولونيا','cologne','دهن عود','oud','بخور','معطر','جو','مثبت','body spray','بادي سبراي','ديور','dior','شانيل','chanel','ارماني','armani','فيرساتشي','versace','جيفنشي','givenchy','لطافة','lattafa','عود','توباكو','عطر فرنسي','عطر عربي']) WHERE slug = 'perfume';

-- 6. منتجات رياضية → sports
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['رياضي','رياضة','sport','جيم','gym','fitness','football','weights','yoga','لياقة','أجهزة رياضية','مشي','جري','running','دمبل','بار','مشاية','trendmil','عجلة','bike','سباحة','swim','يوجا','تمارين','كرة','قدم','سلة','طائرة','تنس','حبل','مقاومة','بروتين','supplement','مكمل']) WHERE slug = 'sports';

-- 7. منزل ومطبخ → home
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['منزل','home','مطبخ','kitchen','وسادة','pillow','مفروشات','furniture','سجاد','أثاث','ديكور','كنبة','sofa','طاولة','table','سرير','bed','أواني','طنجرة','مقلاة','كاسات','ملاعق','شوك','سكاكين','مواعين','خلاط','غلاية','kettle','محمصة','توستر','أدوات منزلية','ستائر','لحاف','شرشف','مخدة']) WHERE slug = 'home';

-- 8. مستلزمات المنزل → home-supplies
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['أثاث','furniture','كنبة','sofa','طاولة','table','سرير','bed','ديكور','decoration','أواني','مواعين','مطبخ','منزل','منظم','سلة','صابون','منظف','كلور','مسحوق','غسيل','منعم','ممسحة','mop','مكنسة','broom','فرشاة','brush','حافظات','علب']) WHERE slug = 'home-supplies';

-- 9. مكتب ودراسة → office
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['قرطاسية','stationery','قلم','pen','دفتر','notebook','مكتب','office','حقيبة','bag','دراسة','study','لابتوب','laptop','كمبيوتر','computer','طابعة','printer','ورق','paper','أقلام','pens','ألوان','colors','رسم','drawing','اجندة','planner','فايل','file','ماسحة','scanner','بروجيكتور','projector']) WHERE slug = 'office';

-- 10. ساعات → watches
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['ساعة','watch','ساعات','ساعه','smartwatch','ساعة ذكية','apple watch','garmin','casio','سيكو','seiko','رجالي','رجالية','نسائي','حريمي','ماركة','fossil','سواتش','swatch','اوميغا','omega','رولكس','rolex','سويسري','كوارتز','quartz','سوار']) WHERE slug = 'watches';

-- 11. حفاضات وأطفال → baby
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['حفاضات','baby','أطفال','اطفال','diapers','pampers','بامبرز','huggies','مولود','newborn','رضيع','بيبي','رضاعة','bottle','لهاية','pacifier','حليب','عربة','stroller','كرسي سيارة','car seat','سرير اطفال','مناديل مبللة','wipes','بودرة','زيت اطفال','كريم اطفال','بدي','بادي','ملابس اطفال']) WHERE slug = 'baby';

-- 12. ألعاب → toys
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['لعبة','لعبه','toys','games','lego','دمية','doll','ألعاب','أطفال','سيارات','ليجو','ترفيه','باربي','barbie','hot wheel','playstation','xbox','نينتندو','nintendo','سويش','switch','بلايستيشن','درون','drone','robot','روبوت','مكعبات','كيراز']) WHERE slug = 'toys';

-- 13. كتب ومجلات → books
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['كتاب','books','book','مجلة','magazine','رواية','novel','كتب','قصص','قصة','تعليم','ثقافة','مكتبة','study','منهج','مدرسة','جامعة','تطوير','ذاتي','ديني','دين','إسلامي','قرآن','تفسير','أدب','شعر','علمي','عربية','إنجليزية','انجليزي']) WHERE slug = 'books';

-- 14. حيوانات أليفة → pets
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['كلب','dog','قط','cat','حيوانات','pet','طعام كلاب','dog food','حيوان','أليف','طعام قطط','cat food','قفص','cage','مستلزمات','pet supplies','ليتر','litter','رمل','بطانية','مقود','leash','كولار','collar','حقيبة نقل','carrier','عناية','grooming','شامبو كلاب','مشط']) WHERE slug = 'pets';

-- 15. سيارات → cars
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['سيارة','car','زيت محرك','motor oil','بطارية سيارة','إطارات','tires','سيارات','auto','automotive','جنط','rim','ماسحات','wiper','لمبات','lights','ماتور','engine','قطع غيار','spare parts','كاميرا سيارة','dash cam','مسجل','سماعة سيارة','عطر سيارة','ملمع','wax','شمع','مفروشات سيارة','غطاء','cover']) WHERE slug = 'cars';

-- 16. مجوهرات وإكسسوارات → jewelry
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['مجوهرات','jewelry','إكسسوارات','اكسسوارات','accessories','قلادة','necklace','خاتم','ring','نظارات','glasses','سلسال','سوار','bracelet','ابرة','earring','حلق','طوق','أسورة','ذهب','gold','فضة','silver','الماس','diamond','لؤلؤ','pearl','ماركة','فان كليف','van cleef','كارتير','cartier','تيفاني','tiffany','باندورا','pandora']) WHERE slug = 'jewelry';

-- 17. كاميرات وتصوير → cameras
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['كاميرا','camera','تصوير','photography','عدسة','lens','gopro','كاميرات','كانون','canon','نيكون','nikon','فوجي','fuji','dslr','mirrorless','ميرورليس','فلاش','tripod','ترايبود','vlog','فيديو','كاميرا مراقبة','ip camera']) WHERE slug = 'cameras';

-- 18. سماعات → headphones
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['سماعة','سماعات','headphone','earphone','earbuds','airpods','speaker','سماعة بلوتوث','بلوتوث','وايرلس','wireless','samsung buds','apple airpods','سوني','sony','bose','jbl','ميكروفون','مايك','microphone']) WHERE slug = 'headphones';

-- 19. هدايا → gifts
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['هدية','هدايا','gift','طقم هدايا','gift set','مفاجأة','surprise','بوكس','box','هدية عيد','شوكولاتة','chocolate','ورد','flowers','باقة','تغليف','wrapping','كارد','card','بطاقة']) WHERE slug = 'gifts';

-- 20. أثاث وديكور → furniture
UPDATE categories SET keywords = merge_keywords(keywords, ARRAY['أثاث','furniture','ديكور','decoration','كنبة','sofa','طاولة','table','سرير','bed','غرفة نوم','bedroom','خزانة','closet','دولاب','رف','shelf','مكتب','desk','أبجورة','lamp','إنارة','إضاءة','lighting','سجادة','carpet','rug','برواز','إطار','frame','مرآة','mirror','ستارة','curtain','مفروشات','مرتبة','mattress','وسادة','pillow','لحاف','شرشف','غطاء']) WHERE slug = 'furniture';

-- Clean up helper function
DROP FUNCTION IF EXISTS merge_keywords;

-- Show results
SELECT slug, name, cardinality(keywords) as keyword_count FROM categories ORDER BY sort_order;