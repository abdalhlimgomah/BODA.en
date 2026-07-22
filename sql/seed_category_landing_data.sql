-- ============================================
-- Full Setup: Schema + Seed Data
-- Run this in Supabase SQL Editor
-- آمن للتشغيل المتكرر
-- ============================================

-- 1. CATEGORIES
INSERT INTO public.categories (id, name, name_en, slug, description, image_url, icon, sort_order, is_active) VALUES
('a0000001-0000-0000-0000-000000000001', 'الأزياء والموضة', 'Fashion', 'fashion', 'أحدث صيحات الموضة والأزياء الرجالية والنسائية', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'checkroom', 1, true),
('a0000001-0000-0000-0000-000000000002', 'الإلكترونيات', 'Electronics', 'electronics', 'أحدث الأجهزة الإلكترونية والذكية', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800', 'devices', 2, true),
('a0000001-0000-0000-0000-000000000003', 'الأحذية', 'Shoes', 'shoes', 'تشكيلة واسعة من الأحذية لكافة الأذواق', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800', 'footwear', 3, true),
('a0000001-0000-0000-0000-000000000004', 'العناية بالبشرة', 'Skincare', 'skincare', 'منتجات العناية بالبشرة والتجميل', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800', 'spa', 4, true)
ON CONFLICT (id) DO NOTHING;

-- 2. CATEGORY BANNERS
INSERT INTO public.category_banners (id, category_id, image_url, title, subtitle, button_text, button_link, sort_order, is_active) VALUES
('b1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200', 'تخفيضات تصل إلى 70%', 'على مجموعة الصيف الجديدة', 'تسوق الآن', '#', 1, true),
('b1000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', 'تشكيلة الخريف', 'أحدث التصاميم العصرية', 'استكشف', '#', 2, true),
('b1000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1200', 'أحدث الإلكترونيات', 'بتقنية لا تُضاهى', 'تسوق الآن', '#', 1, true)
ON CONFLICT (id) DO NOTHING;

-- 3. BRANDS
INSERT INTO public.brands (id, name, name_en, slug, description, logo_url, cover_url, website, sort_order, is_active) VALUES
('b0000001-0000-0000-0000-000000000001', 'نايك', 'Nike', 'nike', 'العلامة الرياضية الأولى عالمياً', 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'https://nike.com', 1, true),
('b0000001-0000-0000-0000-000000000002', 'أديداس', 'Adidas', 'adidas', 'العلامة الرياضية الألمانية', 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'https://adidas.com', 2, true),
('b0000001-0000-0000-0000-000000000003', 'زارا', 'Zara', 'zara', 'أزياء عصرية للجميع', 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Zara_Logo.svg', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'https://zara.com', 3, true),
('b0000001-0000-0000-0000-000000000004', 'سامسونج', 'Samsung', 'samsung', 'التكنولوجيا التي تلهم العالم', 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800', 'https://samsung.com', 4, true)
ON CONFLICT (id) DO NOTHING;

-- 4. BRAND BANNERS
INSERT INTO public.brand_banners (id, brand_id, image_url, title, subtitle, button_text, button_link, sort_order, is_active) VALUES
('b2000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200', 'تشكيلة نايك الرياضية', 'أداء لا يتوقف', 'تسوق الآن', '#', 1, true),
('b2000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200', 'الجديد من نايك', 'ابتكار يغير قواعد اللعبة', 'اكتشف', '#', 2, true)
ON CONFLICT (id) DO NOTHING;

-- 5. CATEGORY SECTIONS
INSERT INTO public.category_sections (id, category_id, section_type, title, subtitle, badge, sort_order, is_active, display_count, selection_mode, auto_rules) VALUES
('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'products', 'الأكثر مبيعاً', 'منتجات نالت إعجاب الآلاف', 'حصري', 1, true, 6, 'auto', '{}'::jsonb),
('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'products', 'وصل حديثاً', 'أحدث المنتجات لهذا الموسم', 'جديد', 2, true, 6, 'auto', '{"sort_by": "rating"}'::jsonb),
('c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 'products', 'الأكثر توفيراً', 'عروض لا تُفوّت', 'عرض', 1, true, 6, 'auto', '{"sort_by": "rating"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 6. BRAND SECTIONS
INSERT INTO public.brand_sections (id, brand_id, section_type, title, subtitle, badge, sort_order, is_active, display_count, selection_mode, auto_rules) VALUES
('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'products', 'الأكثر مبيعاً من نايك', 'المنتجات الأكثر طلباً', 'الأفضل', 1, true, 6, 'auto', '{}'::jsonb),
('d0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'products', 'وصل حديثاً من نايك', 'أحدث إصدارات نايك', 'جديد', 2, true, 6, 'auto', '{"sort_by": "rating"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. CATEGORY-BRAND RELATIONS
INSERT INTO public.category_brands (category_id, brand_id, sort_order) VALUES
('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 1),
('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 2),
('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003', 3),
('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000004', 1)
ON CONFLICT (category_id, brand_id) DO NOTHING;

-- 8. SMART CATEGORY SHOWCASE
INSERT INTO public.smart_category_showcase (id, category_id, title, subtitle, image_url, link_url, gradient_from, gradient_to, sort_order, is_active) VALUES
('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'أزياء الصيف', 'أحدث صيحات 2025', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400', 'category-landing.html?slug=fashion', '#667eea', '#764ba2', 1, true),
('e0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'إلكترونيات', 'تقنية متطورة', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400', 'category-landing.html?slug=electronics', '#f093fb', '#f5576c', 2, true),
('e0000001-0000-0000-0000-000000000003', NULL, 'أحذية رياضية', 'لأداء أفضل', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'category-landing.html?slug=shoes', '#4facfe', '#00f2fe', 3, true)
ON CONFLICT (id) DO NOTHING;

-- 9. PROMOTIONAL BANNERS
INSERT INTO public.promotional_banners (id, title, image_url, link_url, badge_text, position, sort_order, is_active) VALUES
('f0000001-0000-0000-0000-000000000001', 'خصم 30% على أول طلب', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', '#', 'وفر أكثر', 'hero', 1, true),
('f0000001-0000-0000-0000-000000000002', 'توصيل مجاني للطلبات فوق 200 ريال', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800', '#', 'شحن مجاني', 'sidebar', 2, true)
ON CONFLICT (id) DO NOTHING;

-- 11. CATEGORY SECTION PRODUCTS
INSERT INTO public.category_section_products (section_id, product_id, sort_order) VALUES
('c0000001-0000-0000-0000-000000000001', 'prod-001', 1),
('c0000001-0000-0000-0000-000000000001', 'prod-002', 2),
('c0000001-0000-0000-0000-000000000002', 'prod-003', 1)
ON CONFLICT (section_id, product_id) DO NOTHING;

-- 12. BRAND SECTION PRODUCTS
INSERT INTO public.brand_section_products (section_id, product_id, sort_order) VALUES
('d0000001-0000-0000-0000-000000000001', 'prod-001', 1),
('d0000001-0000-0000-0000-000000000001', 'prod-002', 2),
('d0000001-0000-0000-0000-000000000002', 'prod-003', 1)
ON CONFLICT (section_id, product_id) DO NOTHING;

-- 10. FEATURED COLLECTIONS
INSERT INTO public.featured_collections (id, title, subtitle, image_url, link_url, sort_order, is_active) VALUES
('f0000001-0000-0000-0000-000000000003', 'تشكيلة الصيف', 'أجمل إطلالاتك الصيفية', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600', '#', 1, true),
('f0000001-0000-0000-0000-000000000004', 'العودة للمدارس', 'كل ما تحتاج لأولادك', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', '#', 2, true)
ON CONFLICT (id) DO NOTHING;
