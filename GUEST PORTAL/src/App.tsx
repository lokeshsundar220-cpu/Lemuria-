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
  Housekeeping: ['Room cleaning', 'Fresh towels', 'Toiletries refill', 'Bedding change', 'Extra pillows'],
  Maintenance: ['AC / Climate issue', 'Plumbing / Water issue', 'TV / Audio issue', 'Lighting problem', 'Room fixture repair'],
  'Food & Beverage': ['In-room breakfast', 'Dinner service', 'Bottled water & ice', 'Coffee / Tea refill', 'Special dietary order'],
  Concierge: ['Luggage assistance', 'Airport taxi booking', 'Wake-up call', 'Local city guide', 'Late check-out query']
};

export const App: React.FC = () => {
  // Routing state
  const [route, setRoute] = useState<string>(() => {
    return window.location.hash.slice(2) || 'home';
  });

  // Entities & session state
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isHotelsLoading, setIsHotelsLoading] = useState<boolean>(true);
  const [hotelsError, setHotelsError] = useState<string | null>(null);
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
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

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
    setIsHotelsLoading(true);
    setHotelsError(null);
    try {
      const fetchedHotels = await api.hotels.getAll();
      setHotels(fetchedHotels);

      // Preload rooms for all hotels
      if (fetchedHotels.length > 0) {
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
      }
    } catch (err: any) {
      console.error('[Hotel Load Error]', err);
      setHotelsError(err.message || 'Unable to connect to hotel service. Please check connection and retry.');
    } finally {
      setIsHotelsLoading(false);
    }
  }, []);

  // Fetch logged-in guest data (reservations, requests, notifications)
  const loadGuestData = useCallback(async (includeProfile = false) => {
    const token = getStoredToken();
    if (!token) return;

    try {
      const [profileRes, bookings, reqList, noteData] = await Promise.all([
        includeProfile ? api.auth.getCurrentProfile().catch(() => null) : Promise.resolve(null),
        api.reservations.getMyBookings().catch(() => []),
        api.services.getMyRequests().catch(() => []),
        api.notifications.getMyNotifications().catch(() => ({ notifications: [], unreadCount: 0 }))
      ]);

      if (profileRes?.user) {
        setUser(profileRes.user);
      }

      if (bookings && bookings.length > 0) {
        // Active or pending reservation takes priority, otherwise most recent
        const activeStay = bookings.find((b: any) => b.status === 'CHECKED_IN');
        const pendingStay = bookings.find((b: any) => b.status === 'CHECK_IN_PENDING');
        const bookedStay = bookings.find((b: any) => b.status === 'BOOKED');
        const latestBooking = activeStay || pendingStay || bookedStay || bookings[0];
        setReservation(latestBooking);
      } else if (bookings) {
        setReservation(null);
      }

      if (reqList) {
        setRequests(reqList);
      }

      if (noteData?.notifications) {
        setNotifications(noteData.notifications);
      }
    } catch {
      // User might be unauthorized or network failed
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadHotelData();
    if (getStoredToken()) {
      loadGuestData(true);
    }
  }, [loadHotelData, loadGuestData]);

  // Periodic polling for real-time sync with staff actions (visibility-aware)
  useEffect(() => {
    if (!user) return;

    let isPolling = false;
    const poll = async () => {
      if (document.hidden || isPolling) return;
      isPolling = true;
      try {
        await loadGuestData(false);
      } finally {
        isPolling = false;
      }
    };

    const interval = setInterval(poll, 8000);

    const handleVisibility = () => {
      if (!document.hidden) {
        poll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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
    if (isSubmittingRequest) return;
    setIsSubmittingRequest(true);
    try {
      await api.services.createRequest(dept, desc, priority);
      showToast(priority === 'EMERGENCY' ? 'Emergency alert sent.' : 'Request sent to hotel staff');
      await loadGuestData();
      navigate('requests');
    } catch (err: any) {
      showToast(err.message || 'Could not send request');
    } finally {
      setIsSubmittingRequest(false);
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

  const currentHotel = hotels.find((h) => 
    h.id === param1 || 
    h.hotelCode?.toLowerCase() === param1?.toLowerCase() || 
    h.code?.toLowerCase() === param1?.toLowerCase() || 
    h._id === param1
  ) || hotels[0] || {
    id: 'grand',
    hotelCode: 'GRD',
    code: 'grand',
    name: 'Lemuria Grand',
    city: 'Chennai',
    rating: 5,
    starRating: 5,
    from: 9800,
    startingPrice: 9800,
    blurb: 'Luxury rooms, premium dining and modern guest services.',
    am: ['Pool', 'Spa', 'Fine dining', 'Gym'],
    amenities: ['Pool', 'Spa', 'Fine dining', 'Gym'],
    dining: 'Rooftop grill, all-day café',
    fac: 'Business lounge, valet, airport transfer',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
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
            hotels={hotels}
            isLoading={isHotelsLoading}
            error={hotelsError}
            onRetry={loadHotelData}
            isLoggedIn={!!user}
            onNavigate={navigate}
          />
        )}

        {mainRoute === 'hotels' && (
          <HotelsPage
            hotels={hotels}
            isLoading={isHotelsLoading}
            error={hotelsError}
            onRetry={loadHotelData}
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
            requests={requests}
            isCheckedIn={isCheckedIn}
            onOpenServiceModal={(d, item) => setServiceModalData({ dept: d, item: item || '' })}
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
            reservation={reservation}
            feedbackMap={feedback.req}
            isCheckedIn={isCheckedIn}
            onOpenServiceModal={(d, item) => setServiceModalData({ dept: d, item: item || '' })}
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
          roomNumber={reservation?.roomNumber || null}
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
