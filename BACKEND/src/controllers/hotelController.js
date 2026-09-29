const { Hotel } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get list of hotels
 */
const getAllHotels = async (req, res, next) => {
  try {
    const hotels = await Hotel.find({ isActive: true });
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
    const { hotelCode, name, city, state, country, address, phone, email, wifiSSID, wifiPassword, amenities, starRating } = req.body;
    const hotel = await Hotel.create({
      hotelCode,
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
      starRating
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
