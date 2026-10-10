/**
 * Department normalization and comparison utility
 */

function normalizeDepartment(dept) {
  if (!dept || typeof dept !== 'string') return '';
  const clean = dept.trim().toLowerCase().replace(/[\s\-_&]+/g, '');
  if (clean === 'fnb' || clean === 'foodandbeverage' || clean === 'foodbeverage' || clean === 'dining' || clean === 'diningandbar') {
    return 'fnb';
  }
  if (clean === 'housekeeping' || clean === 'hk' || clean === 'rooms' || clean === 'roomssuites') {
    return 'housekeeping';
  }
  if (clean === 'maintenance' || clean === 'maint' || clean === 'engineering' || clean === 'facilities') {
    return 'maintenance';
  }
  if (clean === 'reception' || clean === 'frontdesk' || clean === 'rc') {
    return 'reception';
  }
  if (clean === 'manager' || clean === 'gm' || clean === 'generalmanager' || clean === 'admin' || clean === 'command') {
    return 'manager';
  }
  return clean;
}

function getDepartmentVariants(dept) {
  const norm = normalizeDepartment(dept);
  if (norm === 'fnb') {
    return ['FNB', 'FOOD_AND_BEVERAGE', 'fnb', 'food_and_beverage', 'Food & Beverage', 'Dining'];
  }
  if (norm === 'housekeeping') {
    return ['HOUSEKEEPING', 'housekeeping', 'Housekeeping', 'ROOMS', 'rooms'];
  }
  if (norm === 'maintenance') {
    return ['MAINTENANCE', 'maintenance', 'Maintenance', 'FACILITIES', 'facilities'];
  }
  if (norm === 'reception') {
    return ['RECEPTION', 'reception', 'Reception', 'FRONT_DESK', 'front_desk', 'FRONT DESK'];
  }
  if (norm === 'manager') {
    return ['MANAGER', 'manager', 'Manager', 'COMMAND', 'command', 'ADMIN', 'admin'];
  }
  return [dept, norm, norm.toUpperCase()];
}

module.exports = {
  normalizeDepartment,
  getDepartmentVariants
};
