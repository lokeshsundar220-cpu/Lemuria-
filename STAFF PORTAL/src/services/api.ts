/**
 * Lemuria Staff Portal — API Service Layer
 * Centralized client for communicating with the real Lemuria Backend Engine.
 * Hotel-scoped, token-authenticated, safe from secret leaks.
 */

export function getApiBaseUrl(): string {
  const rawEnv =
    (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_BACKEND_URL
      : '') || '';

  let trimmed = String(rawEnv).trim().replace(/\/+$/, '');

  if (!trimmed) {
    const isProd =
      typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.PROD;
    return isProd ? 'https://lemuria.onrender.com/api' : 'http://localhost:5000/api';
  }

  if (trimmed.toLowerCase().endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

export const API_BASE_URL = getApiBaseUrl();

export interface StaffMember {
  id: string;
  _id?: string;
  staffCode?: string;
  staffId?: string;
  name: string;
  fullName?: string;
  email: string;
  phone?: string;
  department: string;
  role?: string;
  hotelId: string;
  hotelCode?: string;
  hotelName?: string;
  enabled: string;
  accountStatus?: string;
  duty: string;
  dutyStatus?: string;
  availability: string;
  currentTaskId: string | null;
  shiftStartTime?: string | null;
}

export interface RoomItem {
  id: string;
  _id?: string;
  roomNumber: string;
  type: string;
  state: string;
  status?: string;
  guest: string | null;
  isClean: boolean;
  floor: number;
  pricePerNight: number;
}

export interface ArrivalItem {
  id: string;
  guest: string;
  room: string;
  status: string;
  resId: string;
  phone: string;
  email: string;
  idType: string;
  idNo: string;
  party: string;
  nights: number;
  eta: string;
  rtype: string;
  source: string;
  pay: string;
  req: string;
  chk: {
    id: boolean;
    res: boolean;
    pay: boolean;
  };
}

export interface TaskItem {
  id: string;
  _id?: string;
  taskCode?: string;
  taskNumber?: string;
  hotelId: string;
  department: string;
  type: string;
  roomId?: string | null;
  roomNumber?: string;
  priority: string;
  description: string;
  guestRequest: string;
  status: string;
  assignedStaffId: string | null;
  assignedStaffName?: string;
  offerStatus: string;
  assignmentState?: string;
  declined: string[];
  createdAt: number;
  acceptedAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  beforeImage?: string | null;
  afterImage?: string | null;
  feedback: string;
  estimatedDuration: number;
}

export interface TaskOfferItem {
  id: string;
  _id?: string;
  taskId: string;
  staffId: string;
  expiresAt: number;
  task?: TaskItem;
}

export interface FeedbackItem {
  id: string;
  category: string;
  serviceType: string;
  guest: string;
  resId: string;
  room: string;
  taskName: string;
  staffId: string | null;
  staffName: string;
  rating: number;
  message: string;
  at: number;
}

export interface EmergencyItem {
  id: string;
  _id?: string;
  room: string;
  text: string;
  ack: boolean;
  at: number;
}

export interface RequestItem {
  id: string;
  _id?: string;
  department: string;
  room: string;
  text: string;
  status?: string;
  at: number;
}

export interface NotificationItem {
  id?: string;
  _id?: string;
  type: string;
  msg: string;
  to?: string;
  at: number;
  read: boolean;
}

// Token management in LocalStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('lemuria_staff_token');
};

export const setAuthSession = (token: string, staff: StaffMember): void => {
  localStorage.setItem('lemuria_staff_token', token);
  localStorage.setItem('lemuria_staff_user', JSON.stringify(staff));
};

export const getSavedStaffSession = (): StaffMember | null => {
  const raw = localStorage.getItem('lemuria_staff_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAuthSession = (): void => {
  localStorage.removeItem('lemuria_staff_token');
  localStorage.removeItem('lemuria_staff_user');
};

// Generic HTTP request helper
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuthSession();
    if (!window.location.pathname.includes('/login')) {
      // Allow caller to handle unauthorized redirect
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || `Request failed with status ${response.status}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return data.data !== undefined ? data.data : data;
}

// ==========================================
// AUTHENTICATION APIs
// ==========================================

export async function loginStaff(
  emailOrCode: string,
  password: string
): Promise<{ token: string; staff: StaffMember }> {
  const data = await request<{
    token: string;
    staff: any;
    user: any;
  }>('/auth/staff/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrCode, password })
  });

  const staffData = data.staff || data.user;
  const staff: StaffMember = {
    id: staffData.staffCode || staffData.staffId || staffData.id || staffData._id,
    _id: staffData._id || staffData.id,
    staffCode: staffData.staffCode || staffData.staffId,
    staffId: staffData.staffCode || staffData.staffId,
    name: staffData.name || staffData.fullName || 'Staff Member',
    fullName: staffData.fullName || staffData.name,
    email: staffData.email,
    department: (staffData.department || 'housekeeping').toLowerCase(),
    role: staffData.role,
    hotelId: staffData.hotelId?._id || staffData.hotelId || staffData.hotel || '',
    hotelCode: staffData.hotelCode || staffData.hotelId?.hotelCode || 'GRD',
    hotelName: staffData.hotelId?.name || 'LEMURIA GRAND HOTEL',
    enabled: staffData.enabled === false || staffData.accountStatus === 'DISABLED' ? 'DISABLED' : (staffData.accountStatus || 'ENABLED'),
    duty: (staffData.duty === 'ON' || staffData.duty === 'ON_DUTY' || staffData.dutyStatus === 'ON_DUTY') ? 'ON' : 'OFF',
    availability: staffData.availability || 'AVAILABLE',
    currentTaskId: staffData.currentTaskId?._id || staffData.currentTaskId || null,
    shiftStartTime: staffData.shiftStartTime || staffData.dutyStartedAt
  };

  setAuthSession(data.token, staff);
  return { token: data.token, staff };
}

export async function fetchMyProfile(): Promise<StaffMember> {
  const staffData = await request<any>('/staff/me');
  const staff: StaffMember = {
    id: staffData.staffCode || staffData.staffId || staffData._id,
    _id: staffData._id,
    staffCode: staffData.staffCode || staffData.staffId,
    staffId: staffData.staffCode || staffData.staffId,
    name: staffData.name || staffData.fullName,
    fullName: staffData.fullName || staffData.name,
    email: staffData.email,
    department: (staffData.department || 'housekeeping').toLowerCase(),
    role: staffData.role,
    hotelId: staffData.hotelId?._id || staffData.hotelId || '',
    hotelCode: staffData.hotelCode || staffData.hotelId?.hotelCode || 'GRD',
    hotelName: staffData.hotelId?.name || 'LEMURIA GRAND HOTEL',
    enabled: staffData.enabled === false || staffData.accountStatus === 'DISABLED' ? 'DISABLED' : (staffData.accountStatus || 'ENABLED'),
    duty: (staffData.duty === 'ON' || staffData.duty === 'ON_DUTY' || staffData.dutyStatus === 'ON_DUTY') ? 'ON' : 'OFF',
    availability: staffData.availability || 'AVAILABLE',
    currentTaskId: staffData.currentTaskId?._id || staffData.currentTaskId || null,
    shiftStartTime: staffData.shiftStartTime || staffData.dutyStartedAt
  };
  return staff;
}

// ==========================================
// DUTY SYSTEM APIs
// ==========================================

export async function startDuty(): Promise<StaffMember> {
  const staffData = await request<any>('/staff/duty/start', { method: 'POST' });
  return {
    id: staffData.staffCode || staffData.staffId || staffData._id,
    name: staffData.name || staffData.fullName,
    email: staffData.email,
    department: (staffData.department || 'housekeeping').toLowerCase(),
    hotelId: staffData.hotelId?._id || staffData.hotelId,
    enabled: 'ENABLED',
    duty: 'ON',
    availability: 'AVAILABLE',
    currentTaskId: null
  };
}

export async function endDuty(): Promise<StaffMember> {
  const staffData = await request<any>('/staff/duty/end', { method: 'POST' });
  return {
    id: staffData.staffCode || staffData.staffId || staffData._id,
    name: staffData.name || staffData.fullName,
    email: staffData.email,
    department: (staffData.department || 'housekeeping').toLowerCase(),
    hotelId: staffData.hotelId?._id || staffData.hotelId,
    enabled: 'ENABLED',
    duty: 'OFF',
    availability: 'AVAILABLE',
    currentTaskId: null
  };
}

// ==========================================
// TASK SYSTEM & 15-SEC OFFER APIs
// ==========================================

export async function fetchTasks(department?: string): Promise<TaskItem[]> {
  const query = department ? `?department=${encodeURIComponent(department.toUpperCase())}` : '';
  const rawList = await request<any[]>(`/tasks${query}`);
  return rawList.map((t) => ({
    id: t.taskCode || t.taskNumber || t._id,
    _id: t._id,
    taskCode: t.taskCode || t.taskNumber,
    hotelId: t.hotelId?._id || t.hotelId || '',
    department: (t.department || t.category || 'housekeeping').toLowerCase(),
    type: t.type || t.title || 'Service Task',
    roomId: t.roomId?.roomNumber || t.roomNumber || (t.roomId ? String(t.roomId) : null),
    roomNumber: t.roomNumber || t.roomId?.roomNumber || '',
    priority: t.priority || 'NORMAL',
    description: t.description || t.title || '',
    guestRequest: t.guestRequest || t.description || '—',
    status: t.status === 'IN_PROGRESS' ? 'IN PROGRESS' : (t.status || 'PENDING'),
    assignedStaffId: t.assignedStaffId?.staffCode || t.assignedStaffId?._id || (t.assignedStaffId ? String(t.assignedStaffId) : null),
    assignedStaffName: t.assignedStaffId?.name || t.assignedStaffName || '',
    offerStatus: t.offerStatus || (t.status === 'OFFERED' ? 'OFFERED' : 'NONE'),
    assignmentState: t.assignmentState || 'AUTO',
    declined: (t.offeredTo || []).map((s: any) => s.staffCode || s._id || String(s)),
    createdAt: new Date(t.createdAt).getTime(),
    acceptedAt: t.acceptedAt ? new Date(t.acceptedAt).getTime() : null,
    startedAt: t.startedAt ? new Date(t.startedAt).getTime() : null,
    completedAt: t.completedAt ? new Date(t.completedAt).getTime() : null,
    beforeImage: t.beforeImageUrl || t.beforeImage || null,
    afterImage: t.afterImageUrl || t.proofImageUrl || t.afterImage || null,
    feedback: t.completionNotes || t.completionNote || t.feedback || '',
    estimatedDuration: t.estimatedDuration || 30
  }));
}

export async function fetchMyTasksAndOffers(): Promise<{
  pendingOffers: TaskOfferItem[];
  activeTasks: TaskItem[];
  completedTasks: TaskItem[];
}> {
  const data = await request<{
    pendingOffers: any[];
    activeTasks: any[];
    completedTasks: any[];
  }>('/tasks/my-tasks');

  const mapTask = (t: any): TaskItem => ({
    id: t.taskCode || t.taskNumber || t._id,
    _id: t._id,
    taskCode: t.taskCode || t.taskNumber,
    hotelId: t.hotelId?._id || t.hotelId || '',
    department: (t.department || t.category || 'housekeeping').toLowerCase(),
    type: t.type || t.title || 'Service Task',
    roomId: t.roomId?.roomNumber || t.roomNumber || (t.roomId ? String(t.roomId) : null),
    roomNumber: t.roomNumber || t.roomId?.roomNumber || '',
    priority: t.priority || 'NORMAL',
    description: t.description || t.title || '',
    guestRequest: t.guestRequest || t.description || '—',
    status: t.status === 'IN_PROGRESS' ? 'IN PROGRESS' : (t.status || 'PENDING'),
    assignedStaffId: t.assignedStaffId?.staffCode || t.assignedStaffId?._id || (t.assignedStaffId ? String(t.assignedStaffId) : null),
    assignedStaffName: t.assignedStaffId?.name || t.assignedStaffName || '',
    offerStatus: t.offerStatus || 'NONE',
    assignmentState: t.assignmentState || 'AUTO',
    declined: [],
    createdAt: new Date(t.createdAt).getTime(),
    acceptedAt: t.acceptedAt ? new Date(t.acceptedAt).getTime() : null,
    startedAt: t.startedAt ? new Date(t.startedAt).getTime() : null,
    completedAt: t.completedAt ? new Date(t.completedAt).getTime() : null,
    beforeImage: t.beforeImageUrl || null,
    afterImage: t.afterImageUrl || t.proofImageUrl || null,
    feedback: t.completionNotes || '',
    estimatedDuration: 30
  });

  const pendingOffers: TaskOfferItem[] = (data.pendingOffers || []).map((o: any) => ({
    id: o._id,
    _id: o._id,
    taskId: o.taskId?._id || o.taskId,
    staffId: o.staffId?._id || o.staffId,
    expiresAt: new Date(o.expiresAt).getTime(),
    task: o.taskId && typeof o.taskId === 'object' ? mapTask(o.taskId) : undefined
  }));

  return {
    pendingOffers,
    activeTasks: (data.activeTasks || []).map(mapTask),
    completedTasks: (data.completedTasks || []).map(mapTask)
  };
}

export async function createNewTask(taskData: {
  department: string;
  type: string;
  roomId?: string | null;
  roomNumber?: string;
  priority?: string;
  description?: string;
  guestRequest?: string;
}): Promise<TaskItem> {
  const res = await request<any>('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: taskData.type,
      department: taskData.department.toUpperCase(),
      category: taskData.department.toUpperCase(),
      type: taskData.type,
      roomNumber: taskData.roomNumber || taskData.roomId || '',
      roomId: taskData.roomId || null,
      priority: taskData.priority || 'MEDIUM',
      description: taskData.description || taskData.guestRequest || ''
    })
  });
  return {
    id: res.taskCode || res._id,
    _id: res._id,
    hotelId: res.hotelId,
    department: (res.department || 'housekeeping').toLowerCase(),
    type: res.type || res.title,
    roomId: res.roomNumber || res.roomId,
    priority: res.priority,
    description: res.description,
    guestRequest: res.description,
    status: 'PENDING',
    assignedStaffId: null,
    offerStatus: 'OFFERED',
    declined: [],
    createdAt: Date.now(),
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    feedback: '',
    estimatedDuration: 30
  };
}

export async function acceptTaskOffer(offerId: string): Promise<any> {
  return await request<any>(`/tasks/offers/${offerId}/accept`, { method: 'POST' });
}

export async function declineTaskOffer(offerId: string): Promise<any> {
  return await request<any>(`/tasks/offers/${offerId}/decline`, { method: 'POST' });
}

export async function timeoutTaskOffer(offerId: string): Promise<any> {
  return await request<any>(`/tasks/offers/${offerId}/timeout`, { method: 'POST' });
}

export async function assignTask(taskId: string, staffId: string): Promise<any> {
  return await request<any>(`/tasks/${taskId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ staffId })
  });
}

export async function startTask(taskId: string): Promise<any> {
  return await request<any>(`/tasks/${taskId}/start`, { method: 'POST' });
}

export async function completeTask(
  taskId: string,
  completionData: {
    before?: string | null;
    after?: string | null;
    feedback?: string;
  }
): Promise<any> {
  return await request<any>(`/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      completionNotes: completionData.feedback || 'Task completed successfully',
      proofImageUrl: completionData.after || null,
      beforeImageUrl: completionData.before || null
    })
  });
}

// ==========================================
// ROOMS & ARRIVALS APIs
// ==========================================

export async function fetchRooms(hotelId?: string): Promise<RoomItem[]> {
  const url = hotelId ? `/rooms/hotel/${hotelId}` : '/rooms';
  const rawRooms = await request<any[]>(url);
  return rawRooms.map((r) => ({
    id: r.roomNumber || String(r._id),
    _id: r._id,
    roomNumber: r.roomNumber,
    type: r.type?.name || r.type || 'Deluxe Suite',
    state: r.state || r.status || 'AVAILABLE',
    status: r.status || r.state || 'AVAILABLE',
    guest: r.currentGuestName || null,
    isClean: r.isClean !== false,
    floor: r.floor || 1,
    pricePerNight: r.pricePerNight || 8500
  }));
}

export async function approveRoomReadiness(roomIdOrNumber: string): Promise<any> {
  return await request<any>(`/rooms/${roomIdOrNumber}/approve`, { method: 'POST' });
}

export async function rejectRoomRework(roomIdOrNumber: string): Promise<any> {
  return await request<any>(`/rooms/${roomIdOrNumber}/reject`, { method: 'POST' });
}

export async function checkoutRoom(roomIdOrNumber: string): Promise<any> {
  return await request<any>(`/reservations/${roomIdOrNumber}/checkout`, { method: 'POST' });
}

export async function fetchArrivals(): Promise<ArrivalItem[]> {
  const rawList = await request<any[]>('/reservations/hotel');
  return rawList.map((res) => ({
    id: res._id,
    guest: res.guestId?.name || res.guestId?.fullName || 'Guest',
    room: res.roomNumber || res.roomId?.roomNumber || '—',
    status: res.status === 'CHECKED_IN' ? 'CHECKED IN' : (res.status === 'CHECK_IN_PENDING' ? 'CHECK IN PENDING' : 'EXPECTED'),
    resId: res.reservationCode || String(res._id),
    phone: res.guestId?.mobile || res.guestId?.phone || '+91 98765 00000',
    email: res.guestId?.email || 'guest@example.com',
    idType: res.idType || res.guestId?.idProofType || 'Passport',
    idNo: res.idNumberMasked || (res.guestId?.idProofNumber ? `•••• ${res.guestId.idProofNumber.slice(-4)}` : '•••• 4821'),
    party: `${res.guestsCount || 1} guest(s)`,
    nights: res.nights || 1,
    eta: res.eta || '14:00',
    rtype: res.roomTypeId?.name || res.roomTypeId || 'Deluxe Room',
    source: res.source || 'Direct Booking',
    pay: res.paymentStatus === 'PAID' ? 'Pre-authorised / Paid' : 'Pending',
    req: res.specialRequest || res.partyNote || 'None',
    chk: {
      id: res.verification?.idChecked ?? (res.status === 'CHECKED_IN'),
      res: res.verification?.reservationChecked ?? (res.status === 'CHECKED_IN'),
      pay: res.verification?.paymentChecked ?? (res.status === 'CHECKED_IN')
    }
  }));
}

export async function approveGuestCheckIn(reservationId: string): Promise<any> {
  return await request<any>(`/reservations/${reservationId}/approve-checkin`, { method: 'POST' });
}

// ==========================================
// MANAGER & STAFF DIRECTORY APIs
// ==========================================

export async function fetchHotelStaff(): Promise<StaffMember[]> {
  const rawStaff = await request<any[]>('/staff');
  return rawStaff.map((s) => ({
    id: s.staffCode || s.staffId || s._id,
    _id: s._id,
    staffCode: s.staffCode || s.staffId,
    staffId: s.staffCode || s.staffId,
    name: s.name || s.fullName,
    fullName: s.fullName || s.name,
    email: s.email,
    department: (s.department || 'housekeeping').toLowerCase(),
    role: s.role,
    hotelId: s.hotelId?._id || s.hotelId || '',
    hotelCode: s.hotelCode || 'GRD',
    enabled: s.enabled === false || s.accountStatus === 'DISABLED' ? 'DISABLED' : (s.accountStatus || 'ENABLED'),
    duty: (s.duty === 'ON' || s.duty === 'ON_DUTY' || s.dutyStatus === 'ON_DUTY') ? 'ON' : 'OFF',
    availability: s.availability || 'AVAILABLE',
    currentTaskId: s.currentTaskId?._id || s.currentTaskId || null
  }));
}

export async function fetchAllStaff(): Promise<StaffMember[]> {
  try {
    const rawStaff = await request<any[]>('/manager/staff');
    return rawStaff.map((s) => ({
      id: s.staffCode || s.staffId || s._id,
      _id: s._id,
      staffCode: s.staffCode || s.staffId,
      staffId: s.staffCode || s.staffId,
      name: s.name || s.fullName,
      fullName: s.fullName || s.name,
      email: s.email,
      department: (s.department || 'housekeeping').toLowerCase(),
      role: s.role,
      hotelId: s.hotelId?._id || s.hotelId || '',
      hotelCode: s.hotelCode || 'GRD',
      enabled: s.enabled === false || s.accountStatus === 'DISABLED' ? 'DISABLED' : (s.accountStatus || 'ENABLED'),
      duty: (s.duty === 'ON' || s.duty === 'ON_DUTY' || s.dutyStatus === 'ON_DUTY') ? 'ON' : 'OFF',
      availability: s.availability || 'AVAILABLE',
      currentTaskId: s.currentTaskId?._id || s.currentTaskId || null
    }));
  } catch {
    return await fetchHotelStaff();
  }
}

export async function createStaffMember(data: {
  name: string;
  email?: string;
  department: string;
  password?: string;
}): Promise<any> {
  return await request<any>('/manager/staff', {
    method: 'POST',
    body: JSON.stringify({
      fullName: data.name,
      name: data.name,
      email: data.email,
      department: data.department.toUpperCase(),
      password: data.password || 'Password123!'
    })
  });
}

export async function updateStaffMember(
  id: string,
  data: {
    name: string;
    email: string;
    department: string;
  }
): Promise<any> {
  return await request<any>(`/manager/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      fullName: data.name,
      name: data.name,
      email: data.email,
      department: data.department.toUpperCase()
    })
  });
}

export async function setStaffStatus(id: string, status: string): Promise<any> {
  return await request<any>(`/manager/staff/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: status.toUpperCase(),
      enabled: status.toUpperCase() === 'ENABLED'
    })
  });
}

// ==========================================
// REQUESTS, EMERGENCIES & NOTIFICATIONS APIs
// ==========================================

export async function fetchServiceRequests(): Promise<RequestItem[]> {
  const raw = await request<any[]>('/service-requests/department');
  return raw.map((r) => ({
    id: r.requestCode || r._id,
    _id: r._id,
    department: (r.department || 'housekeeping').toLowerCase(),
    room: r.roomNumber || '—',
    text: r.description || r.requestType || '',
    status: r.status,
    at: new Date(r.createdAt).getTime()
  }));
}

export async function createServiceRequest(reqData: {
  department: string;
  roomNumber: string;
  description: string;
  priority?: string;
}): Promise<any> {
  return await request<any>('/service-requests', {
    method: 'POST',
    body: JSON.stringify({
      department: reqData.department.toUpperCase(),
      roomNumber: reqData.roomNumber,
      description: reqData.description,
      priority: reqData.priority || 'MEDIUM'
    })
  });
}

export async function fetchActiveEmergencies(): Promise<EmergencyItem[]> {
  const raw = await request<any[]>('/emergency/active');
  return raw.map((e) => ({
    id: e.emergencyId || e._id,
    _id: e._id,
    room: e.roomNumber || 'LOBBY',
    text: e.description || 'Medical Emergency',
    ack: e.acknowledged === true,
    at: new Date(e.createdAt).getTime()
  }));
}

export async function broadcastEmergency(roomId: string, text: string): Promise<any> {
  return await request<any>('/emergency', {
    method: 'POST',
    body: JSON.stringify({
      roomNumber: roomId,
      description: text,
      emergencyType: 'CRITICAL'
    })
  });
}

export async function acknowledgeEmergency(id: string): Promise<any> {
  return await request<any>(`/emergency/${id}/respond`, { method: 'POST' });
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const raw = await request<any[]>('/notifications');
  return raw.map((n) => ({
    id: n._id,
    _id: n._id,
    type: n.type || 'System Alert',
    msg: n.title ? `${n.title}: ${n.message || ''}` : (n.message || ''),
    to: n.recipientUser || n.recipientId,
    read: n.isRead === true,
    at: new Date(n.createdAt).getTime()
  }));
}

export async function markNotificationAsRead(id: string): Promise<any> {
  return await request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<any> {
  return await request<any>('/notifications/read-all', { method: 'POST' });
}

// ==========================================
// FEEDBACK & REPORTS APIs
// ==========================================

export async function fetchFeedbacks(): Promise<FeedbackItem[]> {
  const raw = await request<any[]>('/feedback');
  return raw.map((f) => ({
    id: f._id,
    category: f.kind === 'OVERALL_STAY' || f.kind === 'STAY' ? 'OVERALL' : 'SERVICE',
    serviceType: (f.department || f.kind || 'housekeeping').toLowerCase(),
    guest: f.guestId?.name || 'Guest',
    resId: f.reservationId?.reservationCode || 'LEM-STAY',
    room: f.reservationId?.roomNumber || '—',
    taskName: f.serviceRequestId?.requestType || 'Hotel Experience',
    staffId: f.staff?.staffCode || f.staff?._id || null,
    staffName: f.staff?.name || 'Lemuria Operations Team',
    rating: f.rating || 5,
    message: f.comment || f.comments || '',
    at: new Date(f.createdAt || f.submittedAt).getTime()
  }));
}

export async function createFeedback(data: {
  category: string;
  rating: number;
  message: string;
  room?: string;
  staffId?: string | null;
}): Promise<any> {
  return await request<any>('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      kind: data.category === 'OVERALL' ? 'OVERALL_STAY' : 'SERVICE',
      rating: data.rating,
      comment: data.message,
      comments: data.message,
      staff: data.staffId || null
    })
  });
}
