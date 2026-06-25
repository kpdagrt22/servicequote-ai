-- ===========================================================================
-- ServiceQuote AI — demo seed (optional)
--
-- Seeds a starter electrical + HVAC price book into EVERY organization that
-- currently has no price book items. Safe to run multiple times.
--
-- Run AFTER the migrations and AFTER you have created at least one account +
-- organization through the app. From the Supabase SQL editor or psql:
--   \i supabase/seed/demo.sql
--
-- The same items are available in-app via the price book page's
-- "Load example items" button (src/lib/price-book/examples.ts).
-- ===========================================================================

insert into public.price_book_items
  (organization_id, trade, category, name, description, unit, default_quantity, material_cost, labor_minutes, markup_percent, source)
select o.id, t.trade, t.category, t.name, t.description, t.unit, t.default_quantity, t.material_cost, t.labor_minutes, t.markup_percent, 'seed'
from public.organizations o
cross join (
  values
    ('electrical','Service','Service call / diagnostic','Travel + on-site diagnosis.','job',1,0,60,0),
    ('electrical','Devices','Install GFCI receptacle','Supply + install GFCI outlet and plate.','each',1,18,45,20),
    ('electrical','Fixtures','Install light fixture','Mount + wire customer-supplied fixture.','each',1,15,40,15),
    ('electrical','Rough-in','Run new 20A circuit','New circuit from panel incl. wire.','each',1,60,150,25),
    ('electrical','Service','200A panel upgrade','Replace panel, incl. permit coordination.','job',1,900,480,20),
    ('hvac','Service','AC/Furnace tune-up','Inspect, clean + tune; replace filter.','job',1,25,60,10),
    ('hvac','Controls','Smart thermostat install','Install + configure smart thermostat.','each',1,120,45,20),
    ('hvac','Equipment','Condenser (AC) replacement','Remove + install condenser, refrigerant, startup.','each',1,2200,360,18),
    ('hvac','Equipment','Furnace replacement','Remove + install furnace incl. connections.','each',1,1800,360,18)
) as t(trade, category, name, description, unit, default_quantity, material_cost, labor_minutes, markup_percent)
where not exists (
  select 1 from public.price_book_items p where p.organization_id = o.id
);
