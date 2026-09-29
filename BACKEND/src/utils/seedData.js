const { Hotel, Room, User, Staff } = require('../models');

const seedDatabase = async () => {
  try {
    const hotelCount = await Hotel.countDocuments();
    if (hotelCount > 0) {
      return; // Already initialized
    }

    console.log('[Seed] Initializing Lemuria Hotels, Rooms & Default Accounts in MongoDB Atlas...');

    // 1. Create Premier Flagship Hotel
    const flagshipHotel = await Hotel.create({
      hotelCode: 'LEM-MUM',
      name: 'Lemuria Luxury Resort & Spa',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      address: 'Seafront Boulevard, Marine Drive, Mumbai 400020',
      phone: '+91 22 8900 1200',
      email: 'mumbai@lemuriaresorts.com',
      wifiSSID: 'Lemuria-Guest-Ultra',
      wifiPassword: 'LemuriaWelcome2026',
      starRating: 5,
      amenities: [
        'Private Oceanfront Balconies',
        '24/7 Infinity Rooftop Pool',
        'Ayurvedic Luxury Spa & Wellness Center',
        'Michelin-Star Signature Dining',
        '24/7 Dedicated Butler Service',
        'Smart Room Automation'
      ]
    });

    const secondHotel = await Hotel.create({
      hotelCode: 'LEM-GOA',
      name: 'Lemuria Palace & Heritage Retreat',
      city: 'Goa',
      state: 'Goa',
      country: 'India',
      address: 'Candolim Coastline, North Goa 403515',
      phone: '+91 832 290 8800',
      email: 'goa@lemuriaresorts.com',
      wifiSSID: 'Lemuria-Goa-Retreat',
      wifiPassword: 'LemuriaGoa2026',
      starRating: 5,
      amenities: [
        'Private Beachfront Cabanas',
        'Lagoon Pool & Sunset Bar',
        'Heritage Spa',
        'Fine Coastal Cuisine'
      ]
    });

    // 2. Create Luxury Rooms for Flagship
    const roomConfigs = [
      { roomNumber: '101', type: 'DELUXE', floor: 1, pricePerNight: 8500, maxOccupancy: 2 },
      { roomNumber: '102', type: 'DELUXE', floor: 1, pricePerNight: 8500, maxOccupancy: 2 },
      { roomNumber: '103', type: 'SUPERIOR', floor: 1, pricePerNight: 12000, maxOccupancy: 2 },
      { roomNumber: '201', type: 'SUPERIOR', floor: 2, pricePerNight: 12000, maxOccupancy: 3 },
      { roomNumber: '202', type: 'EXECUTIVE_SUITE', floor: 2, pricePerNight: 18500, maxOccupancy: 3 },
      { roomNumber: '301', type: 'EXECUTIVE_SUITE', floor: 3, pricePerNight: 18500, maxOccupancy: 4 },
      { roomNumber: '401', type: 'PRESIDENTIAL_SUITE', floor: 4, pricePerNight: 35000, maxOccupancy: 4 },
      { roomNumber: '501', type: 'ROYAL_VILLA', floor: 5, pricePerNight: 55000, maxOccupancy: 6 }
    ];

    for (const r of roomConfigs) {
      await Room.create({
        hotel: flagshipHotel._id,
        roomNumber: r.roomNumber,
        type: r.type,
        floor: r.floor,
        pricePerNight: r.pricePerNight,
        maxOccupancy: r.maxOccupancy,
        status: 'AVAILABLE',
        isClean: true,
        amenities: ['High-speed Wi-Fi', 'Smart Climate Control', 'Nespresso Bar', 'Bose Sound System', 'Marble Bath']
      });
    }

    // 3. Create Default Staff Accounts for each department
    const staffAccounts = [
      {
        email: 'manager@lemuria.com',
        password: 'Password123!',
        fullName: 'Vikramaditya Singhania',
        phone: '+91 98201 11223',
        department: 'MANAGER',
        staffId: 'STF-MGR-001'
      },
      {
        email: 'reception@lemuria.com',
        password: 'Password123!',
        fullName: 'Ananya Deshmukh',
        phone: '+91 98201 22334',
        department: 'RECEPTION',
        staffId: 'STF-REC-101'
      },
      {
        email: 'housekeeping@lemuria.com',
        password: 'Password123!',
        fullName: 'Rameshwar Patil',
        phone: '+91 98201 33445',
        department: 'HOUSEKEEPING',
        staffId: 'STF-HSK-201'
      },
      {
        email: 'maintenance@lemuria.com',
        password: 'Password123!',
        fullName: 'Karthik Rao',
        phone: '+91 98201 44556',
        department: 'MAINTENANCE',
        staffId: 'STF-MNT-301'
      },
      {
        email: 'dining@lemuria.com',
        password: 'Password123!',
        fullName: 'Chef Sanjeev Menon',
        phone: '+91 98201 55667',
        department: 'FOOD_AND_BEVERAGE',
        staffId: 'STF-FNB-401'
      }
    ];

    for (const acc of staffAccounts) {
      const user = await User.create({
        email: acc.email,
        password: acc.password,
        role: 'STAFF',
        isEmailVerified: true
      });

      await Staff.create({
        user: user._id,
        hotel: flagshipHotel._id,
        staffId: acc.staffId,
        fullName: acc.fullName,
        email: acc.email,
        phone: acc.phone,
        department: acc.department,
        accountStatus: 'ENABLED',
        dutyStatus: 'OFF_DUTY',
        availability: 'AVAILABLE'
      });
    }

    console.log('[Seed] Database successfully seeded with hotels, rooms, and department staff!');
  } catch (error) {
    console.error(`[Seed Error] ${error.message}`);
  }
};

module.exports = { seedDatabase };
