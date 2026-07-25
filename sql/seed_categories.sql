-- ============================================
-- Seed all categories for sections page
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Delete bad/duplicate entries
DELETE FROM category_branches WHERE category_id IN (
  SELECT id FROM categories WHERE slug IN ('nike','sa-fashion','sa-electronics','skincare')
);
DELETE FROM categories WHERE slug IN ('nike','sa-fashion','sa-electronics','skincare');

-- Remove duplicate slugs (keep the one with keywords if any)
DELETE FROM categories WHERE id IN (
  SELECT id FROM categories WHERE slug IN ('fashion','shoes','electronics')
  AND COALESCE(keywords, '{}') = '{}'
);

-- 2. Update existing categories with richer keywords & images
UPDATE categories SET
  name = 'إلكترونيات',
  name_en = 'Electronics',
  slug = 'electronics',
  image_url = 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=400&fit=crop',
  keywords = ARRAY['هاتف','موبايل','جوال','سامسونج','آيفون','شاومي','هواوي','تابلت','كمبيوتر','لابتوب','لاب توب','شاحن','سماعة','سماعات','بلوتوث','bt','جهاز','electronic','الكتروني','ايفون','ios','اندرويد','android','شاشة','lcd','oled','tv','تلفزيون','رسيفر','مكبر','ميكروويف','مكنسة','غسالة','براد','ثلاجة','مكنسة'],
  description = 'أحدث الأجهزة الإلكترونية والذكية',
  sort_order = 1,
  is_active = true,
  icon = 'devices',
  updated_at = now()
WHERE slug = 'electronics';

UPDATE categories SET
  name = 'ملابس وأحذية',
  name_en = 'Clothing & Shoes',
  slug = 'clothing',
  image_url = 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop',
  keywords = ARRAY['ملابس','موضة','تيشيرت','تي شيرت','بنطلون','جينز','جاكيت','فساتين','فستان','أزياء','ازياء','قميص','حذاء','احذية','sneakers','snickers','شوز','boots','بوت','جلابية','عباية','حجاب','ترند','صيفي','شتوي','كاجوال','رياضي','شورت','short'],
  description = 'أحدث صيحات الموضة والأزياء',
  sort_order = 2,
  is_active = true,
  icon = 'checkroom',
  updated_at = now()
WHERE slug = 'clothing';

UPDATE categories SET
  name = 'الصحة والجمال',
  name_en = 'Beauty & Health',
  slug = 'beauty',
  image_url = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
  keywords = ARRAY['عطور','عطر','مكياج','makeup','كريم','شعر','بشرة','عناية','جمال','تجميل','perfume','فراجرانس','fragrance','كولونيا','cologne','دهن عود','oud','بخور','ماسك','غسول','مرطب','واقي شمس','مقشر','سيروم','serum','ظلال','روج','أحمر شفاه','ايلاينر','ماسكرا','عدسات','لوشن','صابون','شامبو','بلسم','زيت شعر','صبغة','استشوار','مكواة شعر','مجفف','كلاج','khol','اي شادو'],
  description = 'منتجات التجميل والعناية الشخصية',
  sort_order = 3,
  is_active = true,
  icon = 'spa',
  updated_at = now()
WHERE slug = 'beauty';

UPDATE categories SET
  name = 'المنزل',
  name_en = 'Home',
  slug = 'home',
  image_url = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
  keywords = ARRAY['أثاث','ديكور','مطبخ','منزل','منزلي','مفروشات','ستائر','سجاد','وسادة','مخدة','فرشة','لحاف','شرشف','طاولة','كرسي','كنبة','sofa','مجلس','غرفة نوم','سرير','خزانة','دولاب','رفوف','أبجورة','لمبة','إنارة','إضاءة','سلة','حافظة','ماعون','طنجرة','مقلاة','كاسات','ملاعق','شوك','سكاكين','أواني','مواعين','خلاط','عجانة','غلاية','kettle','محمصة','توستر','صانعة قهوة','سباكة','أدوات منزلية'],
  description = 'كل ما يهم منزلك',
  sort_order = 4,
  is_active = true,
  icon = 'home',
  updated_at = now()
WHERE slug = 'home';

UPDATE categories SET
  name = 'رياضة',
  name_en = 'Sports',
  slug = 'sports',
  image_url = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop',
  keywords = ARRAY['رياضة','رياضي','جيم','gym','لياقة','fitness','أجهزة رياضية','مشي','جري','running','weights','دمبل','بار','مشاية','trendmil','عجلة','bike','سباحة','swim','يوغا','yoga','تمارين','football','كرة','قدم','سلة','طائرة','تنس','ترتان','حبل','مقاومة','بروتين','supplement','مكمل','صديري','نظارة سباحة','زعانف','غطس'],
  description = 'مستلزمات الرياضة واللياقة البدنية',
  sort_order = 5,
  is_active = true,
  icon = 'fitness_center',
  updated_at = now()
WHERE slug = 'sports';

UPDATE categories SET
  name = 'ألعاب',
  name_en = 'Toys',
  slug = 'toys',
  image_url = 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=400&fit=crop',
  keywords = ARRAY['ألعاب','أطفال','لعبة','دمى','دمية','سيارات','ليجو','lego','ترفيه','ملاهي','باربي','barbie','hot wheel','ps5','playstation','xbox','نينتندو','nintendo','سويش','switch','بلايستيشن','فيونكة','طائرة','درون','drone','robot','روبوت','بيبي','رضيع','خشخيشة','مكعبات','كيراز'],
  description = 'ألعاب للأطفال والكبار',
  sort_order = 6,
  is_active = true,
  icon = 'toys',
  updated_at = now()
WHERE slug = 'toys';

UPDATE categories SET
  name = 'كتب',
  name_en = 'Books',
  slug = 'books',
  image_url = 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop',
  keywords = ARRAY['كتب','كتاب','روايات','رواية','قصص','قصة','تعليم','ثقافة','مكتبة','study','دراسة','منهج','مدرسة','جامعة','عربية','إنجليزية','انجليزي','تطوير','ذاتي','ديني','دين','إسلامي','قرآن','تفسير','اطفال','كبار','أدب','شعر','علمي'],
  description = 'عالم الكتب والقراءة',
  sort_order = 7,
  is_active = true,
  icon = 'menu_book',
  updated_at = now()
WHERE slug = 'books';

UPDATE categories SET
  name = 'ساعات',
  name_en = 'Watches',
  slug = 'watches',
  image_url = 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
  keywords = ARRAY['ساعات','ساعة','سويسري','سوار','كوارتز','quartz','أكسسوارات','ساعه','smartwatch','ساعة ذكية','apple watch','garmin','casio','سيكو','seiko','رجالي','رجالية','حريمي','نسائي','ساعات يد','ماركة','fossil','ديزل','ساعات رجالية','سواتش','swatch','اوميغا','omega','رولكس','rolex'],
  description = 'أفخر الساعات والساعات الذكية',
  sort_order = 8,
  is_active = true,
  icon = 'watch',
  updated_at = now()
WHERE slug = 'watches';

UPDATE categories SET
  name = 'حقائب',
  name_en = 'Bags',
  slug = 'bags',
  image_url = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop',
  keywords = ARRAY['حقائب','حقيبة','شنط','شنطة','ظهر','يد','سفر','ماركات','توصيل','ظهرية','backpack','laptop','لابتوب','مدرسة','مدرسية','تسوق','محفظة','بطاقة','نقود','حزام','حافظة','اجندة','جردل','bucket','توت','tote','كروس','crossbody'],
  description = 'أجمل الحقائب والشنط',
  sort_order = 9,
  is_active = true,
  icon = 'backpack',
  updated_at = now()
WHERE slug = 'bags';

-- 3. Insert missing categories that exist in the old system
INSERT INTO categories (name, name_en, slug, image_url, keywords, description, sort_order, is_active, icon)
SELECT * FROM (VALUES
  ('موبايلات وملحقاتها', 'Phones & Accessories', 'phones',
   'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
   ARRAY['موبايل','جوال','هاتف','phone','mobile','جراب','حافظة','كفر','شاحن','شاحن موبايل','power bank','باور بانك','سامسونج','samsung','ايفون','iphone','شاومي','xiaomi','هواوي','huawei','تابلت','tablet','ipad','ايباد','سلك','usb','type c','cable','قطعة','رام','بطارية','سكرين','شاشة','تاتش','غواصة','سلفون','حامي','حماية','ستاند','حامل','منصة','تصوير','سلفي','عدسة'],
   'أحدث الموبايلات وملحقاتها', 10, true, 'smartphone'),

  ('سماعات', 'Headphones & Audio', 'headphones',
   'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
   ARRAY['سماعة','سماعات','سماعه','headphone','earphone','earbuds','ايربودز','airpods','sounds','speaker','سماعة بلوتوث','بلوتوث','سماعة لاسلكية','وايرلس','wireless','samsung buds','apple airpods','جيمو','jamo','سوني','sony','bose','jbl','ميكروفون','مايك','microphone','كارت','صوت','استوديو','studio','سماعة رأس','سماعة أذن','سماعة رياضية'],
   'أفضل السماعات والأجهزة الصوتية', 11, true, 'headphones'),

  ('كاميرات وتصوير', 'Cameras & Photography', 'cameras',
   'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop',
   ARRAY['كاميرا','camera','كاميرات','تصوير','photography','عدسة','lens','gopro','كانون','canon','نيكون','nikon','سوني','sony','فوجي','fuji','dslr','mirrorless','ميرورليس','فلاش','tripod','ترايبود','حامل','منصة تصوير','استوديو','vlog','فيديو','عازل','لاقط','كاميرا مراقبة','ip camera','داي'],
   'كاميرات ومعدات التصوير', 12, true, 'camera_alt'),

  ('عطور', 'Perfumes', 'perfume',
   'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
   ARRAY['عطر','عطور','perfume','فراجرانس','fragrance','كولونيا','cologne','دهن عود','oud','بخور','معطر','جو','مثبت','body spray','بادي سبراي','عطر فرنسي','عطر عربي','ديور','dior','شانيل','chanel','ارماني','armani','فيرساتشي','versace','جيفنشي','givenchy','كرستيان','lattafa','لطافة','عود','عود مروكي','عود كمبودي','توباكو'],
   'أفخم العطور الشرقية والغربية', 13, true, 'air_freshener'),

  ('أطفال وحفاضات', 'Baby & Diapers', 'baby',
   'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop',
   ARRAY['أطفال','اطفال','طفل','رضيع','مولود','بيبي','baby','حفاضات','diapers','pampers','بامبرز','huggies','هاوجيز','مولود','newborn','رضاعة','bottle','لهاية','pacifier','حليب','baby food','اكل اطفال','عربة','stroller','كرسي سيارة','car seat','سرير اطفال','مهد','سرير طفل','مناديل مبللة','wipes','بيبي وايبرز','بودرة','زيت اطفال','كريم اطفال','استحمام اطفال','لعبة اطفال','خشخيشة','عضاضة','ملابس اطفال','بدي','بادي'],
   'مستلزمات الأطفال والحفاضات', 14, true, 'child_care'),

  ('أثاث وديكور', 'Furniture & Decor', 'furniture',
   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
   ARRAY['أثاث','اثاث','ديكور','decoration','furniture','كنبة','sofa','مجلس','طاولة','table','كرسي','chair','سرير','bed','غرفة نوم','bedroom','خزانة','closet','دولاب','رف','shelf','مكتب','desk','أبجورة','lamp','إنارة','اضاءة','lighting','سجادة','carpet','rug','برواز','إطار','frame','مرآة','mirror','ستارة','curtain','مفروشات','فرش','مرتبة','mattress','وسادة','pillow','مخدة','لحاف','شرشف','غطاء'],
   'أثاث وديكور المنزل', 15, true, 'chair'),

  ('مكتب ودراسة', 'Office & Stationery', 'office',
   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
   ARRAY['مكتب','office','دراسة','study','قرطاسية','stationery','قلم','pen','دفتر','notebook','حقيبة','bag','لابتوب','laptop','كمبيوتر','computer','طابعة','printer','ورق','paper','أقلام','pens','ألوان','colors','رسم','drawing','مكتبي','اجندة','planner','day planner','تقويم','calendar','فايل','file','ماسحة','scanner','بروجيكتور','projector','واي فاي','wifi','router','مودم'],
   'مستلزمات المكتب والدراسة', 16, true, 'desk'),

  ('مجوهرات وإكسسوارات', 'Jewelry & Accessories', 'jewelry',
   'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
   ARRAY['مجوهرات','jewelry','إكسسوارات','اكسسوارات','accessories','قلادة','necklace','خاتم','ring','سلسال','سوار','bracelet','نظارات','glasses','نظارة','ابرة','earring','حلق','طوق','أسورة','ذهب','gold','فضة','silver','الماس','diamond','لؤلؤ','pearl','ساعة','watch','دبلة','كوتشي','ماركة','فان كليف','van cleef','كارتير','cartier','تيفاني','tiffany','باندورا','pandora'],
   'أرقى المجوهرات والإكسسوارات', 17, true, 'diamond'),

  ('هدايا', 'Gifts', 'gifts',
   'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop',
   ARRAY['هدية','هدايا','gift','gifts','طقم','set','طقم هدايا','gift set','مفاجأة','surprise','بوكس','box','هدية عيد','هدية زواج','هدية تخرج','هدية مولود','هدية عيد ميلاد','شوكولاتة','chocolate','ورد','flowers','توليب','باقة','كارد','card','بطاقة','تغليف','wrapping'],
   'أفكار هدايا مميزة', 18, true, 'card_giftcard'),

  ('حيوانات أليفة', 'Pets', 'pets',
   'https://images.unsplash.com/photo-1544568100-847a948585b9?w=400&h=400&fit=crop',
   ARRAY['كلب','dog','قط','cat','حيوانات','حيوان','pet','pets','أليف','طعام كلاب','dog food','طعام قطط','cat food','أكل','feed','قفص','cage','مستلزمات','pet supplies','ليتر','litter','رمل','بطانية','فرشة','لعبة','مقود','leash','كولار','collar','حقيبة نقل','carrier','عناية','grooming','شامبو كلاب','مشط','comb'],
   'مستلزمات الحيوانات الأليفة', 19, true, 'pets'),

  ('سيارات', 'Cars & Automotive', 'cars',
   'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=400&fit=crop',
   ARRAY['سيارة','سيارات','car','auto','automotive','زيت محرك','motor oil','بطارية سيارة','car battery','إطارات','tires','جنط','rim','اكسسوارات','accessories','ماسحات','wiper','لمبات','lights','ماتور','engine','قطع غيار','spare parts','كاميرا سيارة','dash cam','مسجل','speaker','سماعة سيارة','عطر سيارة','ملمع','wax','شمع','مفروشات سيارة','غطاء','cover'],
   'كل ما يخص السيارات', 20, true, 'directions_car'),

  ('مستلزمات المنزل', 'Home Supplies', 'home-supplies',
   'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
   ARRAY['منزل','منزلي','أدوات منزلية','أواني','مواعين','مطبخ','ماعون','طنجرة','مقلاة','pan','pot','كاسات','glasses','ملاعق','spoons','شوك','سكاكين','knives','صحون','plates','حافظات','containers','علب','boxes','منظم','organizer','سلة','basket','صابون','soap','منظف','cleaner','كلور','مسحوق','غسيل','laundry','منعم','softener','ممسحة','mop','مكنسة','broom','فرشاة','brush'],
   'مستلزمات وأدوات المنزل', 21, true, 'kitchen')
) AS v(name, name_en, slug, image_url, keywords, description, sort_order, is_active, icon)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = v.slug);

-- 4. Add branches for top categories
-- Electronics branches
INSERT INTO category_branches (category_id, branch_name, branch_image, branch_keywords, sort_order, is_active)
SELECT c.id, b.* FROM categories c CROSS JOIN (VALUES
  ('هواتف', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200', ARRAY['هاتف','موبايل','جوال','phone'], 1, true),
  ('لاب توب', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200', ARRAY['لاب توب','لابتوب','laptop','notebook'], 2, true),
  ('تابلت', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200', ARRAY['تابلت','tablet','ipad','ايباد'], 3, true),
  ('أجهزة منزلية', 'https://images.unsplash.com/photo-1544228867-8ed0906b31bb?w=200', ARRAY['مكنسة','غسالة','ثلاجة','ميكروويف','براد'], 4, true),
  ('شواحن', 'https://images.unsplash.com/photo-1583863793215-53cf51ad1dd1?w=200', ARRAY['شاحن','شحن','usb','type c','cable','سلك'], 5, true)
) b(branch_name, branch_image, branch_keywords, sort_order, is_active)
WHERE c.slug = 'electronics'
AND NOT EXISTS (SELECT 1 FROM category_branches cb WHERE cb.category_id = c.id AND cb.branch_name = b.branch_name);

-- Beauty branches
INSERT INTO category_branches (category_id, branch_name, branch_image, branch_keywords, sort_order, is_active)
SELECT c.id, b.* FROM categories c CROSS JOIN (VALUES
  ('عطور', 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200', ARRAY['عطر','عطور','perfume','فراجرانس'], 1, true),
  ('مكياج', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200', ARRAY['مكياج','makeup','روج','أحمر شفاه','ظلال'], 2, true),
  ('عناية بالبشرة', 'https://images.unsplash.com/photo-1570194065650-d99fb4ee8e39?w=200', ARRAY['بشرة','كريم','مرطب','واقي شمس','سيروم'], 3, true),
  ('عناية بالشعر', 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=200', ARRAY['شعر','شامبو','بلسم','زيت','صبغة'], 4, true),
  ('عدسات', 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=200', ARRAY['عدسات','لاصقة','لون','نظارة'], 5, true)
) b(branch_name, branch_image, branch_keywords, sort_order, is_active)
WHERE c.slug = 'beauty'
AND NOT EXISTS (SELECT 1 FROM category_branches cb WHERE cb.category_id = c.id AND cb.branch_name = b.branch_name);

-- Sports branches
INSERT INTO category_branches (category_id, branch_name, branch_image, branch_keywords, sort_order, is_active)
SELECT c.id, b.* FROM categories c CROSS JOIN (VALUES
  ('أجهزة رياضية', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200', ARRAY['جيم','gym','مشاية','trendmil','عجلة','bike','weights','دمبل'], 1, true),
  ('ملابس رياضية', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200', ARRAY['ملابس رياضية','تيشيرت رياضي','شورت','sport wear'], 2, true),
  ('مكملات غذائية', 'https://images.unsplash.com/photo-1593095948071-474c5cc2c1cf?w=200', ARRAY['بروتين','مكمل','supplement','weight gainer'], 3, true),
  ('سباحة', 'https://images.unsplash.com/photo-1560090995-01632a28895b?w=200', ARRAY['سباحة','swim','مایو','نظارة سباحة'], 4, true)
) b(branch_name, branch_image, branch_keywords, sort_order, is_active)
WHERE c.slug = 'sports'
AND NOT EXISTS (SELECT 1 FROM category_branches cb WHERE cb.category_id = c.id AND cb.branch_name = b.branch_name);

-- Clothing branches
INSERT INTO category_branches (category_id, branch_name, branch_image, branch_keywords, sort_order, is_active)
SELECT c.id, b.* FROM categories c CROSS JOIN (VALUES
  ('رجالي', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3cc7?w=200', ARRAY['رجالي','قميص','تيشيرت','بنطلون','جاكيت'], 1, true),
  ('نسائي', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200', ARRAY['نسائي','فستان','عباية','حجاب','بلوزة'], 2, true),
  ('أحذية', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200', ARRAY['حذاء','sneakers','شوز','boots','رياضي'], 3, true),
  ('أطفال', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200', ARRAY['ملابس أطفال','بيبي','بدي','بادي'], 4, true)
) b(branch_name, branch_image, branch_keywords, sort_order, is_active)
WHERE c.slug = 'clothing'
AND NOT EXISTS (SELECT 1 FROM category_branches cb WHERE cb.category_id = c.id AND cb.branch_name = b.branch_name);

-- Home branches
INSERT INTO category_branches (category_id, branch_name, branch_image, branch_keywords, sort_order, is_active)
SELECT c.id, b.* FROM categories c CROSS JOIN (VALUES
  ('أثاث', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200', ARRAY['أثاث','كنبة','طاولة','كرسي','سرير'], 1, true),
  ('مطبخ', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200', ARRAY['مطبخ','أواني','طنجرة','مقلاة','كاسات'], 2, true),
  ('ديكور', 'https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?w=200', ARRAY['ديكور','إضاءة','أبجورة','ستائر','سجاد'], 3, true),
  ('مفروشات', 'https://images.unsplash.com/photo-1522771739015-7c11a5a3b6e0?w=200', ARRAY['مفروشات','وسادة','لحاف','شرشف','مخدة'], 4, true)
) b(branch_name, branch_image, branch_keywords, sort_order, is_active)
WHERE c.slug = 'home'
AND NOT EXISTS (SELECT 1 FROM category_branches cb WHERE cb.category_id = c.id AND cb.branch_name = b.branch_name);

-- Watches branches
INSERT INTO category_branches (category_id, branch_name, branch_image, branch_keywords, sort_order, is_active)
SELECT c.id, b.* FROM categories c CROSS JOIN (VALUES
  ('ساعات رجالية', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200', ARRAY['ساعة رجالي','ساعات رجالية','رجالي'], 1, true),
  ('ساعات نسائية', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200', ARRAY['ساعة نسائي','ساعات نسائية','حريمي'], 2, true),
  ('ساعات ذكية', 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=200', ARRAY['ساعة ذكية','smartwatch','apple watch','garmin'], 3, true)
) b(branch_name, branch_image, branch_keywords, sort_order, is_active)
WHERE c.slug = 'watches'
AND NOT EXISTS (SELECT 1 FROM category_branches cb WHERE cb.category_id = c.id AND cb.branch_name = b.branch_name);

-- Bags branches
INSERT INTO category_branches (category_id, branch_name, branch_image, branch_keywords, sort_order, is_active)
SELECT c.id, b.* FROM categories c CROSS JOIN (VALUES
  ('شنط يد', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200', ARRAY['شنط يد','حقيبة يد','tote','كروس'], 1, true),
  ('شنط ظهر', 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=200', ARRAY['شنط ظهر','backpack','ظهرية','توصيل'], 2, true),
  ('شنط سفر', 'https://images.unsplash.com/photo-1565022532807-e001c1e2d467?w=200', ARRAY['شنط سفر','حقيبة سفر','suitcase','travel'], 3, true),
  ('محافظ', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=200', ARRAY['محفظة','بطاقة','نقود'], 4, true)
) b(branch_name, branch_image, branch_keywords, sort_order, is_active)
WHERE c.slug = 'bags'
AND NOT EXISTS (SELECT 1 FROM category_branches cb WHERE cb.category_id = c.id AND cb.branch_name = b.branch_name);