require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/db');
const { Task, Staff, Hotel, TaskOffer, Room } = require('../src/models');
const taskService = require('../src/services/taskService');

async function debug() {
  await connectDB();

  const task = await Task.findOne({ taskCode: 'TSK-01018' });
  console.log('=== TASK TSK-01018 ===', {
    id: task?._id,
    taskCode: task?.taskCode,
    department: task?.department,
    hotelId: task?.hotelId,
    status: task?.status,
    offerStatus: task?.offerStatus,
    offeredTo: task?.offeredTo,
    declinedBy: task?.declinedBy,
    assignedStaffId: task?.assignedStaffId
  });

  const staff = await Staff.findOne({ staffCode: 'HIL-MT-002' });
  console.log('=== STAFF HIL-MT-002 ===', {
    id: staff?._id,
    staffCode: staff?.staffCode,
    name: staff?.name,
    department: staff?.department,
    hotelId: staff?.hotelId,
    hotel: staff?.hotel,
    duty: staff?.duty,
    dutyStatus: staff?.dutyStatus,
    availability: staff?.availability,
    currentTaskId: staff?.currentTaskId,
    enabled: staff?.enabled,
    accountStatus: staff?.accountStatus
  });

  const hotel = await Hotel.findById(task?.hotelId);
  console.log('=== HOTEL ===', {
    id: hotel?._id,
    hotelCode: hotel?.hotelCode,
    name: hotel?.name
  });

  const offers = await TaskOffer.find({ taskId: task?._id });
  console.log('=== OFFERS FOR TASK ===', offers);

  // Now let's test what offerTaskToNextEligibleStaff does for this task!
  console.log('\n--- TESTING offerTaskToNextEligibleStaff(task._id) ---');
  const result = await taskService.offerTaskToNextEligibleStaff(task._id);
  console.log('Dispatch result:', result);

  const updatedOffers = await TaskOffer.find({ taskId: task?._id });
  console.log('=== OFFERS AFTER DISPATCH ===', updatedOffers);

  // Now test getStaffTasksAndOffers for HIL-MT-002
  const staffOffersAndTasks = await taskService.getStaffTasksAndOffers(staff._id);
  console.log('=== getStaffTasksAndOffers for HIL-MT-002 ===', staffOffersAndTasks);

  await disconnectDB();
}
debug();
