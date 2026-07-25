-- Fix: Add electronics back (was accidentally deleted)
INSERT INTO categories (name, name_en, slug, image_url, keywords, description, sort_order, is_active, icon)
SELECT * FROM (VALUES
('إلكترونيات', 'Electronics', 'electronics',
 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=400&fit=crop',
 ARRAY['هاتف','موبايل','جوال','سامسونج','آيفون','شاومي','هواوي','تابلت','كمبيوتر','لابتوب','لاب توب','شاحن','سماعة','سماعات','بلوتوث','bt','جهاز','electronic','الكتروني','ايفون','ios','اندرويد','android','شاشة','lcd','oled','tv','تلفزيون','رسيفر','مكبر','ميكروويف','مكنسة','غسالة','براد','ثلاجة','مكنسة','كاميرا','تصوير','كاميرات','لابتوبات','بروجيكتور','برنتر','طابعة','سكانر','ماسح'],
 'أحدث الأجهزة الإلكترونية والذكية', 1, true, 'devices')
) AS v(name, name_en, slug, image_url, keywords, description, sort_order, is_active, icon)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = 'electronics');

-- Add branches for electronics
INSERT INTO category_branches (category_id, branch_name, branch_image, branch_keywords, sort_order, is_active)
SELECT c.id, b.* FROM categories c CROSS JOIN (VALUES
  ('هواتف', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200', ARRAY['هاتف','موبايل','جوال','phone'], 1, true),
  ('لاب توب', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200', ARRAY['لاب توب','لابتوب','laptop','notebook'], 2, true),
  ('تابلت', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200', ARRAY['تابلت','tablet','ipad','ايباد'], 3, true),
  ('أجهزة منزلية', 'https://images.unsplash.com/photo-1544228867-8ed0906b31bb?w=200', ARRAY['مكنسة','غسالة','ثلاجة','ميكروويف','براد'], 4, true),
  ('شواحن', 'https://images.unsplash.com/photo-1583863793215-53cf51ad1dd1?w=200', ARRAY['شاحن','شحن','usb','type c','cable','سلك','باور بانك','power bank'], 5, true)
) b(branch_name, branch_image, branch_keywords, sort_order, is_active)
WHERE c.slug = 'electronics'
AND NOT EXISTS (SELECT 1 FROM category_branches cb WHERE cb.category_id = c.id AND cb.branch_name = b.branch_name);