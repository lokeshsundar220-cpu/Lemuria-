require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/db');
const { Hotel } = require('../src/models');

const HOTEL_IMAGES = {
  // Lemuria Grand (Chennai Luxury Flagship Resort & Spa)
  GRD: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  grand: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',

  // Lemuria Bay (Goa Beachfront Villas & Sunset Retreat)
  BAY: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
  bay: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',

  // Lemuria Hills (Ooty Misty Mountain Tea Estate Retreat)
  HIL: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
  hills: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80'
};

(async () => {
  try {
    await connectDB();
    console.log('[Hotel Images] Connected to DB. Updating hotel imageUrls...');

    const hotels = await Hotel.find({});
    console.log(`[Hotel Images] Found ${hotels.length} hotels in database.`);

    for (const h of hotels) {
      const codeKey = (h.hotelCode || h.code || '').toUpperCase();
      const codeLower = (h.code || h.hotelCode || '').toLowerCase();
      const imgUrl = HOTEL_IMAGES[codeKey] || HOTEL_IMAGES[codeLower];

      const updateDoc = {};
      if (imgUrl) updateDoc.imageUrl = imgUrl;
      if (!h.address) {
        updateDoc.address = 'Heritage Tea Estate Road, Tiger Hill, Ooty 643001, Tamil Nadu';
      }

      if (Object.keys(updateDoc).length > 0) {
        await Hotel.updateOne({ _id: h._id }, { $set: updateDoc });
        console.log(`[Hotel Images] Updated ${h.name} (${h.hotelCode || h.code}) ->`, updateDoc);
      }
    }

    // Verify
    const verifiedHotels = await Hotel.find({});
    console.log('\n--- VERIFICATION OF ALL HOTELS IN DATABASE ---');
    verifiedHotels.forEach((vh, idx) => {
      console.log(`${idx + 1}. ${vh.name} (${vh.hotelCode || vh.code}) in ${vh.city}`);
      console.log(`   ID: ${vh._id}`);
      console.log(`   isActive: ${vh.isActive}`);
      console.log(`   imageUrl: ${vh.imageUrl}\n`);
    });

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('[Hotel Images] Error updating hotel images:', err);
    process.exit(1);
  }
})();
