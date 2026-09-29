const { Feedback, Reservation } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

const submitFeedback = async (req, res, next) => {
  try {
    const guest = req.guest;
    const {
      feedbackType,
      kind,
      reservationId,
      serviceRequestId,
      staffId,
      department,
      rating,
      comment,
      comments,
      cleanlinessRating,
      staffRating,
      amenitiesRating
    } = req.body;

    const actualKind = kind || feedbackType || 'OVERALL_STAY';

    if (!rating || rating < 1 || rating > 5) {
      return errorResponse(res, 400, 'Rating is required and must be between 1 and 5.');
    }

    let hotelId = null;
    let resId = reservationId;

    if (reservationId) {
      const reservation = await Reservation.findById(reservationId);
      if (reservation) hotelId = reservation.hotelId;
    } else if (guest) {
      const completed = await Reservation.findOne({ guestId: guest._id, status: 'CHECKED_OUT' }).sort({ checkOutDate: -1 });
      if (completed) {
        resId = completed._id;
        hotelId = completed.hotelId;
      }
    }

    const feedback = await Feedback.create({
      kind: actualKind,
      guestId: guest ? guest._id : req.body.guestId,
      hotelId: hotelId || req.body.hotelId,
      reservationId: resId,
      serviceRequestId: serviceRequestId || null,
      staff: staffId || null,
      department: department || null,
      rating,
      comment: comments || comment || '',
      cleanlinessRating: cleanlinessRating || null,
      staffRating: staffRating || null,
      amenitiesRating: amenitiesRating || null
    });

    return successResponse(res, 201, 'Feedback submitted successfully', feedback);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};

const getHotelFeedback = async (req, res, next) => {
  try {
    const hotelId = req.staff ? (req.staff.hotelId?._id || req.staff.hotelId) : req.query.hotelId;
    const { feedbackType, kind, department } = req.query;

    const query = { hotelId };
    if (kind || feedbackType) query.kind = kind || feedbackType;
    if (department) query.department = department;

    const feedbacks = await Feedback.find(query)
      .populate('guestId')
      .populate('staff')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Feedback records fetched', feedbacks);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submitFeedback,
  getHotelFeedback
};
