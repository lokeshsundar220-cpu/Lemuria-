/**
 * Lemuria Guest Portal - Centralized API Service Layer
 * Fully connected to the live Lemuria Backend REST API
 */

export function getApiBaseUrl(): string {
  const isProd =
    typeof import.meta !== 'undefined' &&
    Boolean(import.meta.env?.PROD);

  const rawEnv =
    (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_BACKEND_URL
      : '') || '';

  let trimmed = String(rawEnv).trim().replace(/\/+$/, '');

  // If in production mode, never allow localhost fallback
  if (isProd) {
    if (!trimmed || trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      return 'https://lemuria.onrender.com/api';
    }
  }

  // Development mode fallback
  if (!trimmed) {
    return 'http://localhost:5000/api';
  }

  if (trimmed.toLowerCase().endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

export const API_BASE_URL = getApiBaseUrl();

// Types
export interface Hotel {
  id: string;
  _id?: string;
  hotelCode?: string;
  code?: string;
  name: string;
  city: string;
  rating: number;
  starRating?: number;
  from: number;
  startingPrice?: number;
  blurb: string;
  description?: string;
  am: string[];
  amenities?: string[];
  dining?: string;
  fac?: string;
  facilities?: string;
}

export interface Room {
  id: string;
  _id?: string;
  hotel: string;
  hotelId?: string;
  type: string;
  roomNumber?: string;
  bed: string;
  guests: number;
  maxOccupancy?: number;
  price: number;
  pricePerNight?: number;
  units: number;
  am: string[];
  amenities?: string[];
  booked?: [string, string][];
  state?: string;
  status?: string;
}

export interface User {
  id: string;
  guestId?: string;
  guestCode?: string;
  name: string;
  fullName?: string;
  email: string;
  mobile: string;
  phone?: string;
}

export interface Reservation {
  id: string;
  _id?: string;
  reservationCode?: string;
  hotel: string;
  hotelId?: any;
  room: string;
  roomId?: any;
  roomNumber?: string | null;
  guest: string;
  guestId?: any;
  a: string;
  b: string;
  checkInDate?: string;
  checkOutDate?: string;
  guests: number;
  guestsCount?: number;
  total: number;
  status: string;
  checkedInAt?: number | null;
  wifi?: { ssid: string; password: string } | null;
}

export interface ServiceRequest {
  id: string;
  _id?: string;
  requestCode?: string;
  dept: string;
  department?: string;
  desc: string;
  description?: string;
  priority: string;
  status: string;
  at: number;
  createdAt?: string;
  staff?: string | null;
  assignedStaffId?: any;
}

export interface NotificationItem {
  id: string;
  _id?: string;
  title: string;
  body: string;
  at: number;
  createdAt?: string;
  read: boolean;
}

export interface FeedbackEntry {
  rating: number;
  comment: string;
}

// Token Storage
const TOKEN_KEY = 'lemuria_guest_jwt_token';
const USER_KEY = 'lemuria_guest_user_profile';

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string | null, persist = true) => {
  try {
    if (token) {
      if (persist) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
};

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User | null, persist = true) => {
  try {
    if (user) {
      const data = JSON.stringify(user);
      if (persist) {
        localStorage.setItem(USER_KEY, data);
      } else {
        sessionStorage.setItem(USER_KEY, data);
      }
    } else {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  } catch {}
};

export const clearSession = () => {
  setStoredToken(null);
  setStoredUser(null);
};

// Generic Fetch Wrapper
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message?: string; data?: T }> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = json.message || json.error || `HTTP ${response.status}: Request failed`;
      const error: any = new Error(errorMsg);
      error.status = response.status;
      error.data = json;
      throw error;
    }

    return json;
  } catch (err: any) {
    if (err.status === 401) {
      if (!endpoint.includes('/auth/guest/login') && !endpoint.includes('/auth/guest/otp')) {
        clearSession();
      }
    }
    throw err;
  }
}

// Normalizers
export function normalizeHotel(raw: any): Hotel {
  const id = raw.hotelCode ? raw.hotelCode.toLowerCase() : raw.code || raw._id || raw.id || 'hotel';
  return {
    id: id.includes('grd') || id.includes('grand') ? 'grand' : id.includes('bay') ? 'bay' : id.includes('hil') || id.includes('hills') ? 'hills' : id,
    _id: raw._id,
    hotelCode: raw.hotelCode || raw.code,
    name: raw.name || 'Lemuria Hotel',
    city: raw.city || 'India',
    rating: raw.starRating || raw.rating || 5,
    starRating: raw.starRating || raw.rating || 5,
    from: raw.startingPrice || raw.from || 8500,
    startingPrice: raw.startingPrice || raw.from || 8500,
    blurb: raw.description || raw.blurb || 'Luxury hospitality with authentic guest experiences.',
    description: raw.description || raw.blurb || '',
    am: Array.isArray(raw.amenities) && raw.amenities.length > 0 ? raw.amenities : (raw.am || ['Wi-Fi', 'Pool', 'Dining', 'Spa']),
    amenities: raw.amenities || raw.am || [],
    dining: raw.dining || 'All-day fine dining and rooftop café',
    fac: raw.facilities || raw.fac || 'Valet parking, wellness spa, concierge'
  };
}

export function normalizeRoom(raw: any, hotelSlug = 'grand'): Room {
  return {
    id: raw._id || raw.id || raw.roomNumber || 'room',
    _id: raw._id,
    hotel: hotelSlug,
    hotelId: raw.hotelId?._id || raw.hotelId || raw.hotel,
    type: raw.type || 'Deluxe Room',
    roomNumber: raw.roomNumber,
    bed: raw.maxOccupancy > 2 ? 'King bed + lounge' : 'King bed',
    guests: raw.maxOccupancy || raw.guests || 2,
    maxOccupancy: raw.maxOccupancy || raw.guests || 2,
    price: raw.pricePerNight || raw.price || 8500,
    pricePerNight: raw.pricePerNight || raw.price || 8500,
    units: 1,
    am: Array.isArray(raw.amenities) && raw.amenities.length > 0 ? raw.amenities : ['Wi-Fi', 'City view', 'Smart TV'],
    amenities: raw.amenities || [],
    state: raw.state || raw.status || 'AVAILABLE',
    status: raw.state || raw.status || 'AVAILABLE',
    booked: []
  };
}

export function normalizeReservation(raw: any): Reservation {
  const hotelName = raw.hotelId?.name || (typeof raw.hotelId === 'string' ? raw.hotelId : (raw.hotel || 'Lemuria Hotel'));
  const roomType = raw.roomId?.type || raw.roomNumber || raw.room || 'Deluxe Room';
  const checkIn = raw.checkInDate ? new Date(raw.checkInDate).toISOString().slice(0, 10) : (raw.a || '');
  const checkOut = raw.checkOutDate ? new Date(raw.checkOutDate).toISOString().slice(0, 10) : (raw.b || '');

  let wifi = null;
  if (raw.status === 'CHECKED_IN') {
    wifi = {
      ssid: raw.hotelId?.wifiSSID || 'Lemuria-Guest-Ultra',
      password: raw.hotelId?.wifiPassword || 'LemuriaGuest2026'
    };
  }

  return {
    id: raw.reservationCode || raw._id || raw.id || 'LEM-00000',
    _id: raw._id,
    reservationCode: raw.reservationCode,
    hotel: hotelName,
    hotelId: raw.hotelId,
    room: roomType,
    roomId: raw.roomId,
    roomNumber: raw.roomNumber || (raw.roomId && typeof raw.roomId === 'object' ? raw.roomId.roomNumber : null),
    guest: raw.guestId?.name || raw.guest || 'Guest',
    guestId: raw.guestId,
    a: checkIn,
    b: checkOut,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guests: raw.guestsCount || raw.guests || 1,
    total: raw.total || raw.subtotal || 0,
    status: raw.status || 'BOOKED',
    checkedInAt: raw.checkedInAt ? new Date(raw.checkedInAt).getTime() : null,
    wifi
  };
}

export function normalizeServiceRequest(raw: any): ServiceRequest {
  return {
    id: raw.requestCode || raw._id || raw.id || 'REQ-0000',
    _id: raw._id,
    requestCode: raw.requestCode,
    dept: raw.department || raw.dept || 'Housekeeping',
    department: raw.department || raw.dept || 'Housekeeping',
    desc: raw.description || raw.desc || '',
    description: raw.description || raw.desc || '',
    priority: raw.priority || 'NORMAL',
    status: raw.status === 'OPEN' ? 'REQUESTED' : raw.status || 'REQUESTED',
    at: raw.createdAt ? new Date(raw.createdAt).getTime() : (raw.at || Date.now()),
    createdAt: raw.createdAt,
    staff: raw.assignedStaffId?.name || raw.staff || null,
    assignedStaffId: raw.assignedStaffId
  };
}

export function normalizeNotification(raw: any): NotificationItem {
  return {
    id: raw._id || raw.id || 'n-' + Math.random().toString(36).slice(2, 7),
    _id: raw._id,
    title: raw.title || 'Notification',
    body: raw.body || '',
    at: raw.createdAt ? new Date(raw.createdAt).getTime() : (raw.at || Date.now()),
    createdAt: raw.createdAt,
    read: raw.read || false
  };
}

// API Service Client
export const api = {
  // Authentication
  auth: {
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
      const res = await apiRequest('/auth/guest/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const data = res.data || (res as any);
      if (data.token) {
        setStoredToken(data.token);
      }
      const user: User = {
        id: data.guest?.guestCode || data.guest?._id || data.user?.id || 'GST-0001',
        guestId: data.guest?.guestCode,
        guestCode: data.guest?.guestCode,
        name: data.guest?.name || data.guest?.fullName || email.split('@')[0],
        fullName: data.guest?.name || data.guest?.fullName,
        email: data.guest?.email || email,
        mobile: data.guest?.mobile || data.guest?.phone || '',
        phone: data.guest?.mobile || data.guest?.phone || ''
      };
      setStoredUser(user);
      return { token: data.token, user };
    },

    async requestOtp(email: string): Promise<{ message: string }> {
      const res = await apiRequest('/auth/guest/otp/request', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      return { message: res.message || 'Verification code sent to your email' };
    },

    async verifyOtp(
      email: string,
      otp: string,
      additionalDetails?: { name?: string; mobile?: string }
    ): Promise<{ token: string; user: User }> {
      const res = await apiRequest('/auth/guest/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          email,
          otp,
          fullName: additionalDetails?.name,
          phone: additionalDetails?.mobile
        })
      });
      const data = res.data || (res as any);
      if (data.token) {
        setStoredToken(data.token);
      }
      const user: User = {
        id: data.guest?.guestCode || data.guest?._id || data.user?.id || 'GST-0001',
        guestId: data.guest?.guestCode,
        guestCode: data.guest?.guestCode,
        name: data.guest?.name || data.guest?.fullName || additionalDetails?.name || email.split('@')[0],
        fullName: data.guest?.name || data.guest?.fullName || additionalDetails?.name,
        email: data.guest?.email || email,
        mobile: data.guest?.mobile || data.guest?.phone || additionalDetails?.mobile || '',
        phone: data.guest?.mobile || data.guest?.phone || additionalDetails?.mobile || ''
      };
      setStoredUser(user);
      return { token: data.token, user };
    },

    async register(data: {
      name: string;
      email: string;
      mobile: string;
      password?: string;
    }): Promise<{ token?: string; user?: User }> {
      if (data.password) {
        try {
          const res = await apiRequest('/auth/guest/register', {
            method: 'POST',
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              mobile: data.mobile,
              password: data.password
            })
          });
          const resData = res.data || (res as any);
          if (resData.token) {
            setStoredToken(resData.token);
            const user: User = {
              id: resData.guest?.guestCode || resData.guest?._id || 'GST-0001',
              name: resData.guest?.name || data.name,
              email: resData.guest?.email || data.email,
              mobile: resData.guest?.mobile || data.mobile
            };
            setStoredUser(user);
            return { token: resData.token, user };
          }
        } catch {}
      }
      await api.auth.requestOtp(data.email);
      return {};
    },

    async getCurrentProfile(): Promise<{ user: User; guest: any } | null> {
      try {
        const res = await apiRequest('/auth/me');
        const data = res.data || (res as any);
        if (data.guest || data.user) {
          const user: User = {
            id: data.guest?.guestCode || data.guest?._id || data.user?._id || 'GST-0001',
            guestId: data.guest?.guestCode,
            guestCode: data.guest?.guestCode,
            name: data.guest?.name || data.guest?.fullName || 'Guest',
            fullName: data.guest?.name || data.guest?.fullName,
            email: data.guest?.email || data.user?.email || '',
            mobile: data.guest?.mobile || data.guest?.phone || '',
            phone: data.guest?.mobile || data.guest?.phone || ''
          };
          setStoredUser(user);
          return { user, guest: data.guest };
        }
        return null;
      } catch {
        return null;
      }
    },

    logout() {
      clearSession();
    }
  },

  // Hotels & Rooms
  hotels: {
    async getAll(): Promise<Hotel[]> {
      const res = await apiRequest('/hotels');
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(normalizeHotel);
    },

    async getById(id: string): Promise<Hotel> {
      const res = await apiRequest(`/hotels/${id}`);
      return normalizeHotel(res.data || res);
    }
  },

  rooms: {
    async getByHotel(hotelId: string): Promise<Room[]> {
      const res = await apiRequest(`/rooms/hotel/${hotelId}`);
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map((r) => normalizeRoom(r, hotelId));
    },

    async checkAvailability(
      hotelId: string,
      roomId: string,
      checkIn: string,
      checkOut: string
    ): Promise<string> {
      try {
        const query = new URLSearchParams({
          checkIn,
          checkOut,
          roomId
        }).toString();
        const res = await apiRequest(`/rooms/availability/${hotelId}?${query}`);
        const data = res.data || (res as any);
        if (data.isHouseFull || data.count === 0) {
          return 'HOUSE_FULL';
        }
        if (Array.isArray(data.availableRooms)) {
          const hasRoom = data.availableRooms.some(
            (r: any) => r._id === roomId || r.roomNumber === roomId || r.type === roomId
          );
          if (!hasRoom && data.availableRooms.length > 0) {
            return 'ROOM_BOOKED';
          }
          if (data.availableRooms.length === 0) {
            return 'HOUSE_FULL';
          }
        }
        return 'AVAILABLE';
      } catch (err: any) {
        if (err.message && err.message.includes('ROOM_ALREADY_BOOKED')) {
          return 'ROOM_BOOKED';
        }
        if (err.message && err.message.includes('HOUSE_FULL')) {
          return 'HOUSE_FULL';
        }
        return 'AVAILABLE';
      }
    }
  },

  // Reservations
  reservations: {
    async book(bookingData: {
      hotel: string;
      room: string;
      a: string;
      b: string;
      guests: number;
      name: string;
      email: string;
      mobile: string;
    }): Promise<Reservation> {
      const res = await apiRequest('/reservations/book', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: bookingData.hotel,
          roomId: bookingData.room,
          checkInDate: bookingData.a,
          checkOutDate: bookingData.b,
          guestsCount: bookingData.guests,
          adults: bookingData.guests,
          guestName: bookingData.name,
          email: bookingData.email,
          mobile: bookingData.mobile
        })
      });
      return normalizeReservation(res.data || res);
    },

    async getMyBookings(): Promise<Reservation[]> {
      const res = await apiRequest('/reservations/my-bookings');
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(normalizeReservation);
    },

    async requestCheckIn(reservationId: string, details?: any): Promise<Reservation> {
      const res = await apiRequest(`/reservations/${reservationId}/request-checkin`, {
        method: 'POST',
        body: JSON.stringify(details || {})
      });
      return normalizeReservation(res.data || res);
    },

    async approveCheckIn(reservationId: string): Promise<Reservation> {
      const res = await apiRequest(`/reservations/${reservationId}/approve-checkin`, {
        method: 'POST'
      });
      return normalizeReservation(res.data || res);
    },

    async checkout(reservationId: string): Promise<{ reservation: Reservation; message?: string }> {
      const res = await apiRequest(`/reservations/${reservationId}/checkout`, {
        method: 'POST'
      });
      const data = res.data || (res as any);
      return {
        reservation: normalizeReservation(data.reservation || data),
        message: res.message
      };
    }
  },

  // Service Requests & Emergency
  services: {
    async createRequest(
      department: string,
      description: string,
      priority: string
    ): Promise<ServiceRequest> {
      if (priority === 'EMERGENCY' || department.toLowerCase() === 'emergency') {
        const emgRes = await api.services.createEmergency(description);
        return {
          id: emgRes.id,
          dept: 'Emergency',
          desc: description,
          priority: 'EMERGENCY',
          status: 'REQUESTED',
          at: Date.now()
        };
      }

      const res = await apiRequest('/service-requests', {
        method: 'POST',
        body: JSON.stringify({
          department: department.toUpperCase().replace(/\s+/g, '_'),
          serviceType: department,
          description,
          priority: priority.toUpperCase()
        })
      });
      return normalizeServiceRequest(res.data || res);
    },

    async getMyRequests(): Promise<ServiceRequest[]> {
      const res = await apiRequest('/service-requests/my-requests');
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(normalizeServiceRequest);
    },

    async createEmergency(freeTextDescription: string): Promise<{ id: string; emergency: any }> {
      const res = await apiRequest('/emergencies', {
        method: 'POST',
        body: JSON.stringify({
          freeTextDescription,
          description: freeTextDescription
        })
      });
      const data = res.data || (res as any);
      return {
        id: data.emergencyId || data._id || 'EMG-0001',
        emergency: data
      };
    }
  },

  // Notifications
  notifications: {
    async getMyNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
      const res = await apiRequest('/notifications');
      const data = res.data || (res as any);
      const list = Array.isArray(data.notifications) ? data.notifications : Array.isArray(data) ? data : [];
      return {
        notifications: list.map(normalizeNotification),
        unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : list.filter((n: any) => !n.read).length
      };
    },

    async markAsRead(id: string): Promise<void> {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    },

    async markAllAsRead(): Promise<void> {
      await apiRequest('/notifications/read-all', { method: 'POST' });
    }
  },

  // Feedback
  feedback: {
    async submitFeedback(data: {
      kind?: string;
      rating: number;
      comment: string;
      reservationId?: string;
      serviceRequestId?: string;
    }): Promise<void> {
      await apiRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          kind: data.kind || (data.serviceRequestId ? 'SERVICE_REQUEST' : 'OVERALL_STAY'),
          rating: data.rating,
          comment: data.comment,
          comments: data.comment,
          reservationId: data.reservationId,
          serviceRequestId: data.serviceRequestId
        })
      });
    }
  }
};
