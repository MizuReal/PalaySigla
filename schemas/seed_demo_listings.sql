-- Demo listings for the marketplace checkpoint (bypasses RLS via SQL).
-- seller_name is a snapshot column, so no user accounts are needed to view them.
insert into public.listings
  (user_id, title, description, price, unit, category, quantity, lat, lng, location_label, seller_name)
values
  (gen_random_uuid(), 'Freshly harvested palay, dry and clean', 'Harvested this week, sun-dried for 3 days. Low moisture, ready for milling.', 1250.00, 'cavan', 'palay', 40, 15.4905045, 120.9684264, 'Cabanatuan, Nueva Ecija, Central Luzon, Philippines', 'Ka Romy Santos'),
  (gen_random_uuid(), 'Premium local rice — 7% broken', 'Clean, well-milled local rice from the latest harvest. Good for households and small traders.', 52.00, 'kg', 'rice', 500, 15.4856332, 120.966758, 'General Luna, Cabanatuan, Nueva Ecija, Central Luzon, Philippines', 'Bayanihan Rice Trading'),
  (gen_random_uuid(), 'Organic rice seeds (NSIC Rc222)', 'Certified organic seeds, 90% germination rate. Store in a dry, cool place.', 80.00, 'kg', 'seeds', 25, 15.3543, 120.5333, 'Tarlac City, Central Luzon, Philippines', 'Aleng Pacing Farms'),
  (gen_random_uuid(), 'Hand tractor, low hours, maintained', 'Well-maintained hand tractor, recently serviced. Ready to work this season.', 85000.00, 'lot', 'machinery', 1, 16.9792, 121.5627, 'Santiago, Isabela, Cagayan Valley, Philippines', 'Berto del Mundo');
