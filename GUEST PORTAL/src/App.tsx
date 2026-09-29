import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DevControls } from './components/DevControls';
import { EmergencyButton } from './components/EmergencyButton';
import { EmergencyModal } from './components/EmergencyModal';
import { ServiceRequestModal } from './components/ServiceRequestModal';
import { Toast } from './components/Toast';

import { HomePage } from './pages/HomePage';
import { HotelsPage } from './pages/HotelsPage';
import { HotelDetailPage } from './pages/HotelDetailPage';
import { BookingPage } from './pages/BookingPage';
import { BookingConfirmedPage } from './pages/BookingConfirmedPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { BookingDetailsPage } from './pages/BookingDetailsPage';
import { StayHubPage } from './pages/StayHubPage';
import { ServicesPage } from './pages/ServicesPage';
import { RequestsPage } from './pages/RequestsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ProfilePage } from './pages/ProfilePage';

import {
  api,
  Hotel,
  Room,
  User,
  Reservation,
  ServiceRequest,
  NotificationItem,
  FeedbackEntry,
  getStoredUser,
  getStoredToken
} from './services/api';

const DEPTS: Record<string, string[]> = {
  Housekeeping: ['Room cleaning', 'Fresh towels', 'Room supplies'],
  Maintenance: ['AC', 'Electrical', 'Plumbing', 'Room equipment'],
  'Food & Beverage': ['Breakfast', 'Room service', 'Dining request'],
  Concierge: ['Hotel information', 'Travel assistance', 'Special requests']
};

export const App: React.FC = () => {
  // Routing state
  const [route, setRoute] = useState<string>(() => {
    return window.location.hash.slice(2) || 'home';
  });

  // Entities & session state
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [pendingUser, setPendingUser] = useState<{ name: string; email: string; mobile: string } | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [feedback, setFeedback] = useState<{ hotel: FeedbackEntry | null; req: Record<string, FeedbackEntry> }>({
    hotel: null,
    req: {}
  });

  // UI state
  const [toastMessage, setToastMessage] = useState('');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [serviceModalData, setServiceModalData] = useState<{ dept: string; item: string } | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('');
    }, 2600);
  }, []);

  // Fetch all hotels and rooms from live backend
  const loadHotelData = useCallback(async () => {
    try {
      const fetchedHotels = await api.hotels.getAll();
      if (fetchedHotels.length > 0) {
        setHotels(fetchedHotels);
      }

      // Preload rooms for all hotels
      const allRoomsPromises = fetchedHotels.map(async (h) => {
        try {
          return await api.rooms.getByHotel(h._id || h.hotelCode || h.id);
        } catch {
          return [];
        }
      });
      const roomsArrays = await Promise.all(allRoomsPromises);
      const combinedRooms = roomsArrays.flat();
      if (combinedRooms.length > 0) {
        setRooms(combinedRooms);
      }
    } catch {
      // Backend error fallback
    }
  }, []);

  // Fetch logged-in guest data (reservations, requests, notifications)
  const loadGuestData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      // Profile check
      const profile = await api.auth.getCurrentProfile();
      if (profile?.user) {
        setUser(profile.user);
      }

      // Reservations
      const bookings = await api.reservations.getMyBookings();
      if (bookings.length > 0) {
        // Active or pending reservation takes priority, otherwise most recent
        const activeStay = bookings.find((b) => b.status === 'CHECKED_IN');
        const pendingStay = bookings.find((b) => b.status === 'CHECK_IN_PENDING');
        const bookedStay = bookings.find((b) => b.status === 'BOOKED');
        const latestBooking = activeStay || pendingStay || bookedStay || bookings[0];
        setReservation(latestBooking);
      } else {
        setReservation(null);
      }

      // Service Requests
      const reqList = await api.services.getMyRequests();
      setRequests(reqList);

      // Notifications
      const noteData = await api.notifications.getMyNotifications();
      setNotifications(noteData.notifications);
    } catch {
      // User might be unauthorized or network failed
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadHotelData();
    if (getStoredToken()) {
      loadGuestData();
    }
  }, [loadHotelData, loadGuestData]);

  // Periodic polling for real-time sync with staff actions
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadGuestData();
    }, 4500);
    return () => clearInterval(interval);
  }, [user, loadGuestData]);

  // Hash-based routing listener
  useEffect(() => {
    const handleHashChange = () => {
      const current = window.location.hash.slice(2) || 'home';
      setRoute(current);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((target: string) => {
    window.location.hash = `#/${target}`;
  }, []);

  // Auth guard for protected routes
  const protectedRoutes = [
    'dashboard',
    'my-bookings',
    'booking-details',
    'stay',
    'services',
    'requests',
    'notifications',
    'feedback',
    'profile',
    'confirmed'
  ];

  const routeBase = route.split('/')[0];
  const isCheckedIn = reservation?.status === 'CHECKED_IN';

  useEffect(() => {
    if (protectedRoutes.includes(routeBase) && !user) {
      sessionStorage.setItem('ret', `#/${route}`);
      navigate('login');
    }
  }, [routeBase, user, route, navigate]);

  // API Methods connected to backend
  const handleCheckAvailability = async (
    hotelId: string,
    roomId: string,
    a: string,
    b: string
  ): Promise<string> => {
    try {
      return await api.rooms.checkAvailability(hotelId, roomId, a, b);
    } catch {
      return 'ROOM_BOOKED';
    }
  };

  const handleRegister = async (data: { name: string; email: string; mobile: string }) => {
    setPendingUser(data);
    await api.auth.register(data);
  };

  const handleVerifyOtp = async (code: string) => {
    if (!pendingUser?.email) {
      throw new Error('Email is missing. Please start registration again.');
    }
    const res = await api.auth.verifyOtp(pendingUser.email, code, {
      name: pendingUser.name,
      mobile: pendingUser.mobile
    });
    setUser(res.user);
    await loadGuestData();
  };

  const handleLogin = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setUser(res.user);
    await loadGuestData();
    const returnUrl = sessionStorage.getItem('ret') || '#/dashboard';
    sessionStorage.removeItem('ret');
    window.location.hash = returnUrl;
  };

  const handleLogout = async () => {
    api.auth.logout();
    setUser(null);
    setReservation(null);
    setRequests([]);
    setNotifications([]);
    setFeedback({ hotel: null, req: {} });
    navigate('home');
  };

  const handleConfirmBooking = async (data: {
    hotel: string;
    room: string;
    a: string;
    b: string;
    guests: number;
    name: string;
    email: string;
    mobile: string;
  }) => {
    const newRes = await api.reservations.book(data);
    setReservation(newRes);
    await loadGuestData();
  };

  const handleCreateRequest = async (dept: string, desc: string, priority: string) => {
    if (!reservation || reservation.status !== 'CHECKED_IN') {
      showToast('Requests open once you are checked in.');
      return;
    }
    try {
      await api.services.createRequest(dept, desc, priority);
      showToast(priority === 'EMERGENCY' ? 'Emergency alert sent.' : 'Request sent to hotel staff');
      await loadGuestData();
      navigate('requests');
    } catch (err: any) {
      showToast(err.message || 'Could not send request');
    }
  };

  const handleSubmitServiceFeedback = async (reqId: string, rating: number, comment: string) => {
    try {
      await api.feedback.submitFeedback({ serviceRequestId: reqId, rating, comment });
      setFeedback((prev) => ({
        ...prev,
        req: { ...prev.req, [reqId]: { rating, comment } }
      }));
    } catch (err: any) {
      showToast(err.message || 'Could not submit feedback');
    }
  };

  const handleSubmitHotelFeedback = async (rating: number, comment: string) => {
    try {
      await api.feedback.submitFeedback({ reservationId: reservation?.id, rating, comment });
      setFeedback((prev) => ({
        ...prev,
        hotel: { rating, comment }
      }));
    } catch (err: any) {
      showToast(err.message || 'Could not submit feedback');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  // Dev Controls connected to real backend endpoints
  const handleDevCheckIn = async () => {
    if (reservation?.id) {
      try {
        const updated = await api.reservations.approveCheckIn(reservation.id);
        setReservation(updated);
        await loadGuestData();
        showToast('Backend state updated: Checked in');
      } catch (err: any) {
        showToast(err.message || 'Could not approve check-in');
      }
    } else {
      showToast('No pending reservation to check in');
    }
  };

  const handleDevAdvanceRequest = async () => {
    await loadGuestData();
    showToast('Refreshed state from backend');
  };

  const handleDevCheckOut = async () => {
    if (reservation?.id) {
      try {
        const res = await api.reservations.checkout(reservation.id);
        setReservation(res.reservation);
        await loadGuestData();
        showToast('Backend state updated: Checked out');
      } catch (err: any) {
        showToast(err.message || 'Could not process checkout');
      }
    } else {
      showToast('No active reservation to check out');
    }
  };

  const handleDevResetStay = () => {
    setReservation(null);
    setRequests([]);
    setNotifications([]);
    setFeedback({ hotel: null, req: {} });
    showToast('Local view reset');
  };

  // Route parsing
  const parts = route.split('/');
  const mainRoute = parts[0] || 'home';
  const param1 = parts[1];
  const param2 = parts[2];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const currentHotel = hotels.find((h) => h.id === param1 || h.hotelCode === param1 || h._id === param1) || hotels[0] || {
    id: 'grand',
    name: 'Lemuria Grand',
    city: 'Chennai',
    rating: 5,
    from: 9800,
    blurb: 'Luxury rooms, premium dining and modern guest services.',
    am: ['Pool', 'Spa', 'Fine dining', 'Gym'],
    dining: 'Rooftop grill, all-day café',
    fac: 'Business lounge, valet, airport transfer'
  };

  const currentRoom = rooms.find((r) => r.id === param2 || r._id === param2 || r.roomNumber === param2) || rooms[0] || {
    id: 'g-dlx',
    hotel: currentHotel.id,
    type: 'Deluxe Room',
    bed: 'King bed',
    guests: 2,
    price: 9800,
    units: 3,
    am: ['Wi-Fi', 'Rain shower', 'City view']
  };

  return (
    <>
      <Header
        user={user}
        isCheckedIn={isCheckedIn}
        unreadCount={unreadCount}
        currentRoute={route}
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className={['home', 'login', 'verify-otp'].includes(mainRoute) ? 'wide' : ''}>
        {mainRoute === 'home' && (
          <HomePage
            hotels={hotels.length > 0 ? hotels : [currentHotel]}
            isLoggedIn={!!user}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'hotels' && (
          <HotelsPage
            hotels={hotels.length > 0 ? hotels : [currentHotel]}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'hotel' && param1 && (
          <HotelDetailPage
            hotel={currentHotel}
            rooms={rooms.filter((r) => r.hotel === param1 || r.hotelId === currentHotel._id || r.hotel === currentHotel.id)}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'book' && param1 && param2 && (
          <BookingPage
            hotel={currentHotel}
            room={currentRoom}
            user={user}
            onCheckAvailability={handleCheckAvailability}
            onConfirmBooking={handleConfirmBooking}
            onNavigate={navigate}
            onToast={showToast}
          />
        )}

        {mainRoute === 'confirmed' && (
          <BookingConfirmedPage
            reservation={reservation}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'login' && (
          <LoginPage
            onLogin={handleLogin}
            onNavigate={navigate}
            onToast={showToast}
          />
        )}

        {mainRoute === 'register' && (
          <RegisterPage
            onRegister={handleRegister}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'verify-otp' && (
          <VerifyOtpPage
            pendingEmail={pendingUser?.email || ''}
            onVerify={handleVerifyOtp}
            onResend={() => showToast('A new verification code was requested')}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'dashboard' && user && (
          <DashboardPage
            user={user}
            reservation={reservation}
            onNavigate={navigate}
            onToast={showToast}
          />
        )}

        {mainRoute === 'my-bookings' && (
          <MyBookingsPage
            reservation={reservation}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'booking-details' && (
          <BookingDetailsPage
            reservation={reservation}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'stay' && (
          <StayHubPage
            reservation={reservation}
            onNavigate={navigate}
            onToast={showToast}
          />
        )}

        {mainRoute === 'services' && (
          <ServicesPage
            isCheckedIn={isCheckedIn}
            deptMap={DEPTS}
            onOpenServiceModal={(d, item) => setServiceModalData({ dept: d, item })}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'requests' && (
          <RequestsPage
            requests={requests}
            feedbackMap={feedback.req}
            isCheckedIn={isCheckedIn}
            onSubmitFeedback={handleSubmitServiceFeedback}
            onNavigate={navigate}
            onToast={showToast}
          />
        )}

        {mainRoute === 'notifications' && (
          <NotificationsPage
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
          />
        )}

        {mainRoute === 'feedback' && (
          <FeedbackPage
            reservation={reservation}
            hotelFeedback={feedback.hotel}
            onSubmitHotelFeedback={handleSubmitHotelFeedback}
            onNavigate={navigate}
            onToast={showToast}
          />
        )}

        {mainRoute === 'profile' && user && (
          <ProfilePage
            user={user}
            onToast={showToast}
          />
        )}
      </main>

      <BottomNav
        user={user}
        isCheckedIn={isCheckedIn}
        unreadCount={unreadCount}
        currentRoute={route}
        onNavigate={navigate}
      />

      {/* Floating Emergency button during checked-in active stay */}
      {isCheckedIn && user && (
        <EmergencyButton onClick={() => setIsEmergencyModalOpen(true)} />
      )}

      {/* Modals */}
      {isEmergencyModalOpen && (
        <EmergencyModal
          onClose={() => setIsEmergencyModalOpen(false)}
          onSubmit={(description) => {
            setIsEmergencyModalOpen(false);
            handleCreateRequest('Emergency', description, 'EMERGENCY');
          }}
        />
      )}

      {serviceModalData && (
        <ServiceRequestModal
          initialDept={serviceModalData.dept}
          initialItem={serviceModalData.item}
          deptMap={DEPTS}
          onClose={() => setServiceModalData(null)}
          onSubmit={(dept, desc, priority) => {
            setServiceModalData(null);
            handleCreateRequest(dept, desc, priority);
          }}
        />
      )}

      {/* Demo controls for simulating reception and staff interactions */}
      <DevControls
        onCheckIn={handleDevCheckIn}
        onAdvanceRequest={handleDevAdvanceRequest}
        onCheckOut={handleDevCheckOut}
        onResetStay={handleDevResetStay}
      />

      <Toast message={toastMessage} />
    </>
  );
};
