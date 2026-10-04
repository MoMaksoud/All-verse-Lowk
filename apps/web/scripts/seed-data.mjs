// Realistic sample data for the local sandbox (see seed-local.mjs).
// Categories/conditions match the values the sell form stores.
// All accounts use the same password (PASSWORD in seed-local.mjs).

export const USERS = [
  { uid: 'seed-seller-1', email: 'seller1@test.local', displayName: 'Maya Chen', username: 'maya', role: 'seller', city: 'Oakland, CA',
    bio: 'Clearing out my apartment before a move. Everything works and is from a smoke-free home. Local pickup in Rockridge or I can ship.' },
  { uid: 'seed-seller-2', email: 'seller2@test.local', displayName: 'Omar Haddad', username: 'omarv', role: 'seller', city: 'Austin, TX',
    bio: 'Vintage camera and audio collector. I test everything before listing and describe flaws honestly.' },
  { uid: 'seed-seller-3', email: 'seller3@test.local', displayName: 'Priya Raman', username: 'priyar', role: 'seller', city: 'Seattle, WA',
    bio: 'Outdoor gear and bikes. Ships within 2 business days.' },
  { uid: 'seed-seller-4', email: 'seller4@test.local', displayName: 'Jake Morrison', username: 'jakem', role: 'seller', city: 'Denver, CO',
    bio: 'Weekend garage cleanouts: tools, car parts, and the occasional appliance.' },
  { uid: 'seed-buyer-1', email: 'buyer1@test.local', displayName: 'Lina Alvarez', username: 'lina', role: 'buyer', city: 'San Jose, CA',
    bio: 'Always hunting for good deals on electronics and home stuff.' },
  { uid: 'seed-buyer-2', email: 'buyer2@test.local', displayName: 'Sam Okafor', username: 'samo', role: 'buyer', city: 'Chicago, IL',
    bio: 'Gamer, reader, occasional cyclist.' },
];

// id is the Firestore doc suffix (seed-listing-<id>); daysAgo spreads createdAt over the last month.
// photo is the Wikimedia Commons search used by fetch-seed-images.mjs (image saved as seed-images/<id>.jpg).
export const LISTINGS = [
  // Electronics
  { id: 'iphone-14-pro', photo: 'iPhone 14 Pro', sellerId: 'seed-seller-1', category: 'electronics', condition: 'good', price: 649, daysAgo: 1,
    title: 'iPhone 14 Pro 256GB Deep Purple (Unlocked)', brand: 'Apple', model: 'iPhone 14 Pro',
    description: 'Unlocked, works on all carriers. Battery health 89%. Light scuffs on the frame, screen has had a protector since day one. Comes with original box and USB-C to Lightning cable.' },
  { id: 'macbook-air-m2', photo: 'MacBook Air M2', sellerId: 'seed-seller-1', category: 'electronics', condition: 'like-new', price: 849, daysAgo: 3,
    title: 'MacBook Air M2 13" 16GB/512GB Midnight', brand: 'Apple', model: 'MacBook Air M2',
    description: 'Bought in 2024, 41 battery cycles. No dents or scratches. Factory reset and ready to go. Includes 35W dual charger.' },
  { id: 'sony-xm5', photo: 'Sony WH-1000XM3', sellerId: 'seed-seller-2', category: 'electronics', condition: 'like-new', price: 239, daysAgo: 2,
    title: 'Sony WH-1000XM5 Noise Cancelling Headphones', brand: 'Sony', model: 'WH-1000XM5',
    description: 'Silver. Used on a handful of flights. Ear pads are spotless. Includes carrying case, cable, and airplane adapter.' },
  { id: 'ipad-air-5', photo: 'iPad Air', sellerId: 'seed-seller-3', category: 'electronics', condition: 'good', price: 399, daysAgo: 9,
    title: 'iPad Air 5th Gen 64GB Wi-Fi + Apple Pencil 2', brand: 'Apple', model: 'iPad Air 5',
    description: 'Space gray. Minor wear on corners, screen is perfect. Pencil holds charge fine. Selling because I upgraded.' },
  { id: 'canon-ae1', photo: 'Canon AE-1 Program', sellerId: 'seed-seller-2', category: 'electronics', condition: 'good', price: 215, daysAgo: 5,
    title: 'Canon AE-1 Program 35mm Film Camera w/ 50mm f/1.8', brand: 'Canon', model: 'AE-1 Program',
    description: 'Shutter fires at all speeds, light meter accurate, no squeal. Lens is clean with no haze or fungus. New light seals installed last month.' },
  { id: 'dell-monitor', photo: '3x Dell Ultrasharps', sellerId: 'seed-seller-1', category: 'electronics', condition: 'good', price: 180, daysAgo: 12,
    title: 'Dell UltraSharp 27" 4K USB-C Monitor (U2723QE)', brand: 'Dell', model: 'U2723QE',
    description: 'No dead pixels. USB-C charges my laptop at 90W. Stand included. Pickup preferred since it is bulky.' },
  { id: 'gopro-11', photo: 'GoPro HERO', sellerId: 'seed-seller-3', category: 'electronics', condition: 'fair', price: 160, daysAgo: 20,
    title: 'GoPro HERO11 Black + 3 Batteries', brand: 'GoPro', model: 'HERO11 Black',
    description: 'Lens cover has a small scratch that does not show in footage. Includes 3 batteries, dual charger, and helmet mount.' },
  { id: 'kindle-paperwhite', photo: 'Kindle Paperwhite', sellerId: 'seed-seller-1', category: 'electronics', condition: 'like-new', price: 95, daysAgo: 6,
    title: 'Kindle Paperwhite 11th Gen 16GB (No Ads)', brand: 'Amazon', model: 'Paperwhite 11',
    description: 'Barely used, with fabric cover. Deregistered and ready for a new account.' },

  // Toys & games
  { id: 'switch-oled', photo: 'Nintendo Switch OLED', sellerId: 'seed-seller-1', category: 'toys', condition: 'like-new', price: 265, daysAgo: 4,
    title: 'Nintendo Switch OLED White + Zelda TOTK', brand: 'Nintendo', model: 'Switch OLED',
    description: 'Includes dock, both Joy-Cons, and Tears of the Kingdom cartridge. No drift. Screen protector installed.' },
  { id: 'ps5-disc', photo: 'PlayStation 5 DualSense', sellerId: 'seed-seller-4', category: 'toys', condition: 'good', price: 380, daysAgo: 8,
    title: 'PlayStation 5 Disc Edition + 2 Controllers', brand: 'Sony', model: 'PS5',
    description: 'Runs quiet, no overheating. Second DualSense has slight stick wear. All cables included.' },
  { id: 'lego-falcon', photo: 'Lego Millennium Falcon', sellerId: 'seed-seller-2', category: 'toys', condition: 'new', price: 760, daysAgo: 15,
    title: 'LEGO Star Wars UCS Millennium Falcon 75192 (Sealed)', brand: 'LEGO', model: '75192',
    description: 'Factory sealed, box has minor shelf wear on one corner. Will ship double-boxed.' },
  { id: 'catan', photo: 'Catan board game', sellerId: 'seed-seller-3', category: 'toys', condition: 'good', price: 30, daysAgo: 22,
    title: 'Catan Board Game + Seafarers Expansion', brand: 'Catan',
    description: 'All pieces counted and present. Played maybe ten times.' },

  // Fashion
  { id: 'schott-jacket', photo: 'Schott Perfecto leather jacket', sellerId: 'seed-seller-1', category: 'fashion', condition: 'good', price: 280, daysAgo: 7,
    title: 'Schott Perfecto 618 Leather Motorcycle Jacket, Size 40', brand: 'Schott', model: '618',
    description: 'Steerhide, nicely broken in. All zippers work. Fits like a men\'s medium.' },
  { id: 'levis-501', photo: "Levi's 501 jeans", sellerId: 'seed-seller-2', category: 'fashion', condition: 'good', price: 45, daysAgo: 10,
    title: 'Vintage Levi\'s 501 Jeans 32x30, Made in USA', brand: 'Levi\'s', model: '501',
    description: '90s pair with great natural fading. No rips or stains.' },
  { id: 'patagonia-nano', photo: 'Patagonia jacket', sellerId: 'seed-seller-3', category: 'fashion', condition: 'like-new', price: 110, daysAgo: 3,
    title: 'Patagonia Nano Puff Jacket Women\'s M, Black', brand: 'Patagonia', model: 'Nano Puff',
    description: 'Worn twice. Packs into its own pocket.' },
  { id: 'jordan-1', photo: 'Air Jordan 1', sellerId: 'seed-seller-4', category: 'fashion', condition: 'new', price: 210, daysAgo: 2,
    title: 'Air Jordan 1 Retro High OG "Chicago Lost & Found" Size 10', brand: 'Nike', model: 'Air Jordan 1',
    description: 'Deadstock with original box and receipt.' },
  { id: 'rayban-wayfarer', photo: 'Ray-Ban Wayfarer', sellerId: 'seed-seller-1', category: 'fashion', condition: 'good', price: 85, daysAgo: 18,
    title: 'Ray-Ban Original Wayfarer Classic Sunglasses', brand: 'Ray-Ban', model: 'RB2140',
    description: 'Black frame, G-15 lenses. Light micro-scratches. Comes with case.' },

  // Home
  { id: 'kitchenaid-mixer', photo: 'KitchenAid stand mixer', sellerId: 'seed-seller-2', category: 'home', condition: 'like-new', price: 240, daysAgo: 6,
    title: 'KitchenAid Artisan 5-Qt Stand Mixer, Empire Red', brand: 'KitchenAid', model: 'KSM150PS',
    description: 'Used for a few holiday bakes. Includes bowl, flat beater, dough hook, and whisk.' },
  { id: 'kallax', photo: 'IKEA Kallax', sellerId: 'seed-seller-1', category: 'home', condition: 'fair', price: 50, daysAgo: 14,
    title: 'IKEA Kallax 4x2 Shelf Unit, White', brand: 'IKEA', model: 'Kallax',
    description: 'Some scuffs on the top. Already disassembled for easy transport. Pickup only.' },
  { id: 'walnut-table', photo: 'G Plan Teak Nest of 3 Tables', sellerId: 'seed-seller-2', category: 'home', condition: 'good', price: 225, daysAgo: 11,
    title: 'Mid-Century Modern Walnut Side Table',
    description: 'Solid walnut with a small drawer. Refinished top. Found at an estate sale, likely 1960s.' },
  { id: 'dyson-v11', photo: 'Dyson cordless vacuum', sellerId: 'seed-seller-4', category: 'appliances', condition: 'good', price: 260, daysAgo: 5,
    title: 'Dyson V11 Torque Drive Cordless Vacuum', brand: 'Dyson', model: 'V11',
    description: 'Battery still gets around 45 minutes on eco. Includes wall dock and 4 attachments.' },
  { id: 'nespresso', photo: 'Nespresso machine', sellerId: 'seed-seller-3', category: 'appliances', condition: 'like-new', price: 120, daysAgo: 13,
    title: 'Nespresso Vertuo Next + Aeroccino Milk Frother', brand: 'Nespresso', model: 'Vertuo Next',
    description: 'Descaled and cleaned. Includes a sleeve of pods.' },
  { id: 'instant-pot', photo: 'Instant Pot', sellerId: 'seed-seller-1', category: 'appliances', condition: 'good', price: 55, daysAgo: 25,
    title: 'Instant Pot Duo 6-Quart 7-in-1', brand: 'Instant Pot', model: 'Duo',
    description: 'Works perfectly. New sealing ring included.' },

  // Sports
  { id: 'trek-marlin', photo: 'Trek hardtail mountain bike', sellerId: 'seed-seller-3', category: 'sports', condition: 'good', price: 520, daysAgo: 4,
    title: 'Trek Marlin 7 Mountain Bike, Size M (29")', brand: 'Trek', model: 'Marlin 7',
    description: 'Tuned up last month: new chain and brake pads. Hydraulic disc brakes, RockShox fork.' },
  { id: 'peloton-shoes', photo: 'cycling shoes', sellerId: 'seed-seller-3', category: 'sports', condition: 'like-new', price: 70, daysAgo: 16,
    title: 'Peloton Cycling Shoes Size 42 with Cleats', brand: 'Peloton',
    description: 'Used for about a month. Delta cleats attached.' },
  { id: 'bowflex-dumbbells', photo: 'adjustable dumbbells', sellerId: 'seed-seller-4', category: 'sports', condition: 'good', price: 280, daysAgo: 9,
    title: 'Bowflex SelectTech 552 Adjustable Dumbbells (Pair)', brand: 'Bowflex', model: '552',
    description: '5 to 52.5 lbs each. Dial mechanism works smoothly. Stands not included.' },
  { id: 'burton-snowboard', photo: 'Burton snowboard', sellerId: 'seed-seller-3', category: 'sports', condition: 'fair', price: 190, daysAgo: 28,
    title: 'Burton Custom Snowboard 158 + Bindings', brand: 'Burton', model: 'Custom',
    description: 'Base has a few repaired scratches. Edges sharpened this season.' },

  // Automotive & tools
  { id: 'thule-box', photo: 'Thule roof box', sellerId: 'seed-seller-4', category: 'automotive', condition: 'good', price: 350, daysAgo: 7,
    title: 'Thule Motion XT L Rooftop Cargo Box', brand: 'Thule', model: 'Motion XT L',
    description: 'Titan glossy. Both keys included. Fits most crossbar setups.' },
  { id: 'weathertech', photo: 'car floor mat', sellerId: 'seed-seller-4', category: 'automotive', condition: 'like-new', price: 95, daysAgo: 19,
    title: 'WeatherTech Floor Liners for 2021-2024 Toyota RAV4', brand: 'WeatherTech',
    description: 'Front and rear set, black. Used for one winter.' },
  { id: 'dewalt-drill', photo: 'DeWalt drill', sellerId: 'seed-seller-4', category: 'tools', condition: 'good', price: 140, daysAgo: 3,
    title: 'DeWalt 20V MAX Drill + Impact Driver Combo Kit', brand: 'DeWalt', model: 'DCK240C2',
    description: 'Two batteries, charger, and bag. Batteries hold a full charge.' },
  { id: 'milwaukee-saw', photo: 'Makita 5703R Circular Saw', sellerId: 'seed-seller-4', category: 'tools', condition: 'fair', price: 110, daysAgo: 21,
    title: 'Milwaukee M18 Circular Saw (Tool Only)', brand: 'Milwaukee', model: '2730-20',
    description: 'Cosmetic wear but runs strong. Blade is fresh.' },

  // Books, beauty, music
  { id: 'harry-potter-set', photo: 'Harry Potter hardcover books', sellerId: 'seed-seller-1', category: 'books', condition: 'good', price: 60, daysAgo: 17,
    title: 'Harry Potter Complete Hardcover Box Set (1-7)',
    description: 'All seven hardcovers in the original box. Spines in great shape.' },
  { id: 'dyson-airwrap', photo: 'Dyson hair dryer', sellerId: 'seed-seller-3', category: 'beauty', condition: 'like-new', price: 380, daysAgo: 8,
    title: 'Dyson Airwrap Complete Long, Nickel/Copper', brand: 'Dyson', model: 'Airwrap',
    description: 'Used a few times, all attachments and case included. Registered warranty transferable.' },
  { id: 'fender-strat', photo: 'Fender Stratocaster sunburst', sellerId: 'seed-seller-2', category: 'other', condition: 'good', price: 650, daysAgo: 12,
    title: 'Fender Player Stratocaster, 3-Color Sunburst', brand: 'Fender', model: 'Player Stratocaster',
    description: 'Mexican made. Fresh strings and setup. A few small dings on the back. Gig bag included.' },
  { id: 'yamaha-keyboard', photo: 'Yamaha digital piano', sellerId: 'seed-seller-2', category: 'other', condition: 'good', price: 320, daysAgo: 24,
    title: 'Yamaha P-125 88-Key Digital Piano', brand: 'Yamaha', model: 'P-125',
    description: 'Weighted keys, all working. Includes sustain pedal and stand.' },
];

// Orders mark their listing as sold. buyer1 has history in every status; seller1 drives /sales.
export const ORDERS = [
  { id: 'seed-order-1', buyerId: 'seed-buyer-1', listing: 'kindle-paperwhite', status: 'delivered', daysAgo: 6 },
  { id: 'seed-order-2', buyerId: 'seed-buyer-1', listing: 'canon-ae1', status: 'shipped', daysAgo: 2 },
  { id: 'seed-order-3', buyerId: 'seed-buyer-1', listing: 'switch-oled', status: 'paid', daysAgo: 0 },
  { id: 'seed-order-4', buyerId: 'seed-buyer-2', listing: 'catan', status: 'delivered', daysAgo: 12 },
  { id: 'seed-order-5', buyerId: 'seed-buyer-2', listing: 'instant-pot', status: 'shipped', daysAgo: 1 },
];

export const FAVORITES = {
  'seed-buyer-1': ['trek-marlin', 'fender-strat', 'macbook-air-m2', 'dyson-v11'],
  'seed-buyer-2': ['ps5-disc', 'jordan-1', 'bowflex-dumbbells'],
  'seed-seller-1': ['sony-xm5', 'levis-501'],
  'seed-seller-2': ['switch-oled'],
};

export const CHATS = [
  { id: 'seed-chat-1', participants: ['seed-buyer-1', 'seed-seller-1'], listing: 'switch-oled', messages: [
    { from: 'seed-buyer-1', text: 'Hi! Is the Switch OLED still available?' },
    { from: 'seed-seller-1', text: 'Yes! Comes with the dock, both Joy-Cons and Zelda.' },
    { from: 'seed-buyer-1', text: 'Any Joy-Con drift?' },
    { from: 'seed-seller-1', text: 'None at all, they were barely used.' },
    { from: 'seed-buyer-1', text: 'Perfect, just ordered it.' },
  ] },
  { id: 'seed-chat-2', participants: ['seed-buyer-1', 'seed-seller-2'], listing: 'canon-ae1', messages: [
    { from: 'seed-buyer-1', text: 'Does the AE-1 come with the lens?' },
    { from: 'seed-seller-2', text: 'Yes, the 50mm f/1.8. Shipped it this morning, tracking is in your order.' },
  ] },
  { id: 'seed-chat-3', participants: ['seed-buyer-2', 'seed-seller-4'], listing: 'ps5-disc', messages: [
    { from: 'seed-buyer-2', text: 'Would you take $340 for the PS5?' },
    { from: 'seed-seller-4', text: 'Could do $360 if you can pick up this weekend.' },
    { from: 'seed-buyer-2', text: 'I am in Chicago, so I would need it shipped. $360 shipped?' },
  ] },
  { id: 'seed-chat-4', participants: ['seed-buyer-1', 'seed-seller-3'], listing: 'trek-marlin', messages: [
    { from: 'seed-buyer-1', text: 'What height is the size M good for?' },
    { from: 'seed-seller-3', text: 'I am 5\'9" and it fits me well. Roughly 5\'7" to 5\'11".' },
  ] },
];

export const SHIPPING_ADDRESSES = {
  'seed-buyer-1': { name: 'Lina Alvarez', street: '425 Market St Apt 12', city: 'San Jose', state: 'CA', zip: '95113', country: 'US' },
  'seed-buyer-2': { name: 'Sam Okafor', street: '1550 N Damen Ave', city: 'Chicago', state: 'IL', zip: '60622', country: 'US' },
};
