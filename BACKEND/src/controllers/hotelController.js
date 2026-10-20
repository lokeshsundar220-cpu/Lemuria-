const { Hotel } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get list of hotels
 */
const getAllHotels = async (req, res, next) => {
  try {
    const filter = { isActive: { $ne: false } };
    if (req.query.city) {
      filter.city = new RegExp(String(req.query.city).trim(), 'i');
    }
    if (req.query.starRating) {
      const parsedRating = Number(req.query.starRating);
      if (!isNaN(parsedRating)) {
        filter.starRating = { $gte: parsedRating };
      }
    }
    const hotels = await Hotel.find(filter).sort({ starRating: -1, name: 1 });
    return successResponse(res, 200, 'Hotels fetched successfully', hotels);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get hotel details by ID or code
 */
const getHotelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let hotel = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      hotel = await Hotel.findById(id);
    }
    if (!hotel) {
      hotel = await Hotel.findOne({
        $or: [
          { hotelCode: id.toUpperCase() },
          { code: id.toLowerCase() },
          { name: new RegExp(id, 'i') }
        ]
      });
    }
    if (!hotel) {
      return errorResponse(res, 404, 'Hotel not found');
    }
    return successResponse(res, 200, 'Hotel details fetched', hotel);
  } catch (error) {
    return next(error);
  }
};

/**
 * Create a new hotel (Manager only)
 */
const createHotel = async (req, res, next) => {
  try {
    const {
      hotelCode,
      code,
      name,
      city,
      state,
      country,
      address,
      phone,
      email,
      wifiSSID,
      wifiPassword,
      amenities,
      starRating,
      imageUrl,
      startingPrice,
      description,
      dining,
      facilities
    } = req.body;
    const hotel = await Hotel.create({
      hotelCode,
      code: code || (hotelCode ? hotelCode.toLowerCase() : undefined),
      name,
      city,
      state,
      country,
      address,
      phone,
      email,
      wifiSSID,
      wifiPassword,
      amenities,
      starRating,
      imageUrl: imageUrl || '',
      startingPrice: startingPrice || 8000,
      description: description || '',
      dining: dining || '',
      facilities: facilities || ''
    });
    return successResponse(res, 201, 'Hotel created successfully', hotel);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllHotels,
  getHotelById,
  createHotel
};
