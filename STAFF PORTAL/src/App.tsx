import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { TaskOfferModal } from './components/TaskOfferModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TaskCompleteModal } from './components/TaskCompleteModal';
import { AddStaffModal } from './components/AddStaffModal';
import { EditStaffModal } from './components/EditStaffModal';
import { AddFeedbackModal } from './components/AddFeedbackModal';
import { EmergencyModal } from './components/EmergencyModal';
import { VerifyGuestModal } from './components/VerifyGuestModal';
import { AssignStaffModal } from './components/AssignStaffModal';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OperationsPage } from './pages/OperationsPage';
import { TasksPage } from './pages/TasksPage';
import { RoomsPage } from './pages/RoomsPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { RequestsPage } from './pages/RequestsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';

import * as api from './services/api';
import type {
  StaffMember,
  RoomItem,
  ArrivalItem,
  TaskItem,
  TaskOfferItem,
  FeedbackItem,
  EmergencyItem,
  RequestItem,
  NotificationItem
} from './services/api';

const DEPARTMENTS: Record<string, string> = {
  reception: 'Reception',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
  fnb: 'Food & Beverage',
  manager: 'Manager'
};

const DISP = ['housekeeping', 'maintenance', 'fnb'];

function beep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // Ignore audio permission errors
  }
}

export const App: React.FC = () => {
  // Navigation & session state
  const [land, setLand] = useState(true);
  const [selectedDept, setSelectedDept] = useState('reception');
  const [auth, setAuth] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [page, setPage] = useState('Dashboard');
  const [toastMsg, setToastMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [managerBoardDept, setManagerBoardDept] = useState('housekeeping');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    | null
    | { type: 'done'; id: string }
    | { type: 'addStaff' }
    | { type: 'editStaff'; id: string }
    | { type: 'addFeedback' }
    | { type: 'em' }
    | { type: 'detail'; id: string }
    | { type: 'verify'; id: string }
    | { type: 'assignStaff'; id: string }
  >(null);

  // Entities state from real backend
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [arrivals, setArrivals] = useState<ArrivalItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [offers, setOffers] = useState<TaskOfferItem[]>([]);
  const [notes, setNotes] = useState<NotificationItem[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  const toastTimeoutRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMsg('');
    }, 2600);
  }, []);

  // Fetch all live backend data
  const loadBackendData = useCallback(async () => {
    try {
      const [
        fetchedTasks,
        fetchedRooms,
        fetchedArrivals,
        fetchedFeedbacks,
        fetchedRequests,
        fetchedEmergencies,
        fetchedNotes
      ] = await Promise.all([
        api.fetchTasks().catch(() => []),
        api.fetchRooms().catch(() => []),
        api.fetchArrivals().catch(() => []),
        api.fetchFeedbacks().catch(() => []),
        api.fetchServiceRequests().catch(() => []),
        api.fetchActiveEmergencies().catch(() => []),
        api.fetchNotifications().catch(() => [])
      ]);

      setTasks(fetchedTasks);
      setRooms(fetchedRooms);
      setArrivals(fetchedArrivals);
      setFeedbacks(fetchedFeedbacks);
      setRequests(fetchedRequests);
      setEmergencies(fetchedEmergencies);
      setNotes(fetchedNotes);

      // If user is manager, fetch full staff directory
      if (api.getAuthToken()) {
        try {
          const staffList = await api.fetchAllStaff();
          setStaff(staffList);
        } catch {
          // Ignore if not manager
        }

        // Check for personal task offers & assigned tasks
        try {
          const myData = await api.fetchMyTasksAndOffers();
          if (myData.pendingOffers && myData.pendingOffers.length > 0) {
            setOffers(myData.pendingOffers);
            beep();
          } else {
            setOffers([]);
          }
        } catch {
          // Ignore
        }
      }
    } catch (err: unknown) {
      console.warn('Error loading backend data:', err);
    }
  }, []);

  // Check saved session on mount
  useEffect(() => {
    const initSession = async () => {
      const token = api.getAuthToken();
      if (!token) return;

      try {
        setBusy(true);
        setBusyMsg('Connecting to secure Lemuria backend…');
        const profile = await api.fetchMyProfile();
        setCurrentStaff(profile);
        setSelectedDept(profile.department);
        setManagerBoardDept(DISP.includes(profile.department) ? profile.department : 'housekeeping');
        setAuth(true);
        setLand(false);
        await loadBackendData();
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        api.clearAuthSession();
        setAuth(false);
      } finally {
        setBusy(false);
        setBusyMsg('');
      }
    };
    initSession();
  }, [loadBackendData]);

  const seenOfferIdsRef = useRef<Set<string>>(new Set());

  // Safe wrapper to prevent any single API failure from crashing the entire polling cycle
  const safePoll = useCallback(async <T,>(fn: () => Promise<T>, fallback: T, name: string): Promise<T> => {
    try {
      return await fn();
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number };
      console.warn(
        `[Polling] ${name} FAILED:`,
        error?.message || err,
        error?.status ? `(HTTP ${error.status})` : ''
      );
      return fallback;
    }
  }, []);

  // Periodic polling for task offers, emergencies, notifications, staff status, and task status
  useEffect(() => {
    if (!auth) return;

    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      // 1. Fetch personal task offers & my active assignments independently
      const myData = await safePoll(
        () => api.fetchMyTasksAndOffers(),
        { pendingOffers: [], activeTasks: [], completedTasks: [] },
        'fetchMyTasksAndOffers'
      );
      if (!isSubscribed) return;

      const now = Date.now();
      const validOffers = (myData.pendingOffers || []).filter((o) => o.expiresAt > now);

      let hasNewOffer = false;
      for (const off of validOffers) {
        if (!seenOfferIdsRef.current.has(off.id)) {
          seenOfferIdsRef.current.add(off.id);
          hasNewOffer = true;
        }
      }

      if (hasNewOffer) {
        beep();
      }

      setOffers(validOffers);

      // 2. Fetch tasks, notifications, emergencies, rooms, and staff independently
      const [latestTasks, latestNotes, latestEmg, latestRooms, latestStaff] = await Promise.all([
        safePoll(() => api.fetchTasks(), [] as TaskItem[], 'fetchTasks'),
        safePoll(() => api.fetchNotifications(), [] as NotificationItem[], 'fetchNotifications'),
        safePoll(() => api.fetchActiveEmergencies(), [] as EmergencyItem[], 'fetchActiveEmergencies'),
        safePoll(() => api.fetchRooms(), [] as RoomItem[], 'fetchRooms'),
        safePoll(() => api.fetchAllStaff(), [] as StaffMember[], 'fetchAllStaff')
      ]);

      if (!isSubscribed) return;

      console.log(`[Polling] tasks fetched: ${latestTasks.length} | offers fetched: ${validOffers.length}`);

      // Always update task list independently
      setTasks(latestTasks);
      setNotes(latestNotes);
      setEmergencies(latestEmg);
      if (latestRooms.length > 0) setRooms(latestRooms);
      if (latestStaff.length > 0) {
        setStaff(latestStaff);
        // Sync current staff availability / currentTaskId in case of manager assignment
        setCurrentStaff((prev) => {
          if (!prev) return prev;
          const me = latestStaff.find(
            (s) => s.id === prev.id || s._id === prev._id || s.staffCode === prev.staffCode
          );
          if (me && (me.availability !== prev.availability || me.duty !== prev.duty || me.currentTaskId !== prev.currentTaskId)) {
            return {
              ...prev,
              availability: me.availability,
              duty: me.duty,
              dutyStatus: me.dutyStatus,
              currentTaskId: me.currentTaskId
            };
          }
          return prev;
        });
      }
    };

    // Initial poll immediately
    poll();

    // 2-second interval for responsive real-time experience
    const interval = setInterval(poll, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [auth, safePoll]);

  // Actions
  const handlePickDepartment = (dept: string) => {
    setSelectedDept(dept);
    setLand(false);
    setLoginErr('');
  };

  const handleLogin = async (sid: string, pw: string) => {
    if (!sid.trim() || !pw) {
      setLoginErr('Please enter both your Staff ID / Email and password.');
      return;
    }
    setBusy(true);
    setBusyMsg('Authenticating with Lemuria Backend…');
    setLoginErr('');
    try {
      const { staff: loggedInStaff } = await api.loginStaff(sid, pw);

      setCurrentStaff(loggedInStaff);
      setSelectedDept(loggedInStaff.department);
      setManagerBoardDept(
        DISP.includes(loggedInStaff.department) ? loggedInStaff.department : 'housekeeping'
      );
      setPage('Dashboard');
      setAuth(true);
      showToast(`Welcome, ${loggedInStaff.name} · ${DEPARTMENTS[loggedInStaff.department] || loggedInStaff.department}`);

      await loadBackendData();
    } catch (err: unknown) {
      setLoginErr((err as Error).message || 'Invalid staff credentials or account disabled.');
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleLogout = async () => {
    try {
      if (currentStaff && currentStaff.duty === 'ON' && !currentStaff.currentTaskId) {
        await api.endDuty().catch(() => {});
      }
    } finally {
      api.clearAuthSession();
      setCurrentStaff(null);
      setAuth(false);
      setLand(true);
      setLoginErr('');
      setOffers([]);
    }
  };

  const handleDutyToggle = async () => {
    if (!currentStaff) return;
    const nextState = currentStaff.duty === 'OFF' ? 'ON' : 'OFF';

    const activeOffer = offers[0];
    if (nextState === 'OFF' && (currentStaff.currentTaskId || activeOffer)) {
      showToast('Please complete your active task or respond to task offer first.');
      return;
    }

    setBusy(true);
    setBusyMsg(nextState === 'ON' ? 'Starting duty shift…' : 'Ending duty shift…');
    try {
      let updated: StaffMember;
      if (nextState === 'ON') {
        updated = await api.startDuty();
        showToast('Duty shift started. You are now ON DUTY & available for operations.');
      } else {
        updated = await api.endDuty();
        showToast('Duty shift ended. Status set to OFF DUTY.');
      }

      setCurrentStaff((prev) => (prev ? { ...prev, duty: updated.duty, availability: updated.availability } : prev));
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Failed to change duty: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleReceptionDutyPrompt = () => {
    showToast('Front desk is locked. Please click "START DUTY" to access guest operations.');
  };

  const handleAcceptTask = async () => {
    const activeOffer = offers[0];
    if (!activeOffer) return;
    setBusy(true);
    setBusyMsg('Accepting assignment in backend…');
    try {
      await api.acceptTaskOffer(activeOffer.id);
      setOffers([]);
      showToast('Task accepted successfully.');
      if (currentStaff) {
        setCurrentStaff({ ...currentStaff, availability: 'BUSY', currentTaskId: activeOffer.taskId });
      }
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error accepting task: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleDeclineTask = async () => {
    const activeOffer = offers[0];
    if (!activeOffer) return;
    setBusy(true);
    setBusyMsg('Declining assignment…');
    try {
      await api.declineTaskOffer(activeOffer.id);
      setOffers([]);
      showToast('Task offer declined. Reassigned by backend.');
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error declining task: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleTimeoutTask = async () => {
    const activeOffer = offers[0];
    if (!activeOffer) return;
    setOffers([]);
    try {
      await api.timeoutTaskOffer(activeOffer.id);
      showToast('Task offer timed out. Reassigned to next available staff.');
      await loadBackendData();
    } catch (err: unknown) {
      console.warn('Timeout offer error:', err);
    }
  };

  const handleStartTask = async (taskId: string) => {
    const t = tasks.find((tk) => tk.id === taskId || tk._id === taskId);
    if (!t) return;
    setBusy(true);
    setBusyMsg('Starting task execution…');
    try {
      await api.startTask(t._id || t.id);
      showToast(`Started ${t.type}`);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error starting task: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleSubmitCompletion = async (data: {
    before: string | null;
    after: string | null;
    feedback: string;
  }) => {
    if (!activeModal || activeModal.type !== 'done') return;
    const taskId = activeModal.id;
    const t = tasks.find((tk) => tk.id === taskId || tk._id === taskId);
    if (!t) return;
    setBusy(true);
    setBusyMsg('Submitting task completion & proof…');
    try {
      await api.completeTask(t._id || t.id, data);
      if (currentStaff) {
        setCurrentStaff({ ...currentStaff, availability: 'AVAILABLE', currentTaskId: null });
      }
      showToast(`Task completed: ${t.type}`);
      setActiveModal(null);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error completing task: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleAddStaff = async (data: {
    name: string;
    email?: string;
    department: string;
    enabled: string;
  }) => {
    setBusy(true);
    setBusyMsg('Creating new staff account in database…');
    try {
      await api.createStaffMember({
        name: data.name,
        email: data.email,
        department: data.department
      });
      showToast(`Staff member created: ${data.name}`);
      setActiveModal(null);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error creating staff: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleEditStaff = async (data: {
    name: string;
    email: string;
    department: string;
    enabled: string;
  }) => {
    if (!activeModal || activeModal.type !== 'editStaff') return;
    const targetId = activeModal.id;
    const targetMember = staff.find((s) => s.id === targetId || s._id === targetId);
    if (!targetMember) return;
    setBusy(true);
    setBusyMsg('Updating staff details…');
    try {
      await api.updateStaffMember(targetMember._id || targetMember.id, {
        name: data.name,
        email: data.email,
        department: data.department
      });
      if (data.enabled && data.enabled !== targetMember.enabled) {
        await api.setStaffStatus(targetMember._id || targetMember.id, data.enabled);
      }
      showToast(`Staff profile updated: ${data.name}`);
      setActiveModal(null);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error updating staff: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleSetStaffStatus = async (staffId: string, newStatus: string) => {
    const targetMember = staff.find((s) => s.id === staffId || s._id === staffId);
    if (!targetMember) return;
    setBusy(true);
    setBusyMsg(`Setting status to ${newStatus}…`);
    try {
      await api.setStaffStatus(targetMember._id || targetMember.id, newStatus);
      showToast(`Staff ${targetMember.name} status updated to ${newStatus}`);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error updating status: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleAddFeedback = async (data: {
    category: string;
    serviceType: string;
    guest: string;
    resId: string;
    room: string;
    taskName: string;
    staffId: string | null;
    rating: number;
    message: string;
  }) => {
    setBusy(true);
    setBusyMsg('Recording feedback in database…');
    try {
      await api.createFeedback({
        category: data.category,
        rating: data.rating,
        message: data.message,
        room: data.room,
        staffId: data.staffId
      });
      showToast(`Feedback recorded from guest ${data.guest}`);
      setActiveModal(null);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error saving feedback: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleToggleArrivalCheck = (arrivalId: string, key: 'id' | 'res' | 'pay') => {
    setArrivals((prev) =>
      prev.map((a) => (a.id === arrivalId ? { ...a, chk: { ...a.chk, [key]: !a.chk[key] } } : a))
    );
  };

  const handleVerifyIn = async (arrivalId: string) => {
    if (currentStaff?.department === 'reception' && currentStaff.duty !== 'ON') {
      handleReceptionDutyPrompt();
      return;
    }
    const a = arrivals.find((x) => x.id === arrivalId);
    if (!a) return;

    setBusy(true);
    setBusyMsg('Processing guest check-in…');
    try {
      await api.approveGuestCheckIn(a.id);
      showToast(`${a.guest} checked in to Room ${a.room}`);
      setActiveModal(null);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Check-in failed: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleCheckout = async (roomId: string) => {
    if (currentStaff?.department === 'reception' && currentStaff.duty !== 'ON') {
      handleReceptionDutyPrompt();
      return;
    }
    setBusy(true);
    setBusyMsg('Processing check-out in database…');
    try {
      await api.checkoutRoom(roomId);
      showToast(`Room ${roomId} checked out · Housekeeping cleaning task created`);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Checkout failed: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleApproveRoom = async (roomId: string) => {
    setBusy(true);
    setBusyMsg('Approving room readiness…');
    try {
      await api.approveRoomReadiness(roomId);
      showToast(`Room ${roomId} approved & marked READY`);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error approving room: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleRejectRoom = async (roomId: string) => {
    setBusy(true);
    setBusyMsg('Rejecting room & dispatching rework…');
    try {
      await api.rejectRoomRework(roomId);
      showToast(`Room ${roomId} sent back for rework cleaning`);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error rejecting room: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleLogRequest = async (
    targetDept: string,
    targetRoom: string,
    reqText: string,
    pri: string
  ) => {
    if (currentStaff?.department === 'reception' && currentStaff.duty !== 'ON') {
      handleReceptionDutyPrompt();
      return;
    }
    setBusy(true);
    setBusyMsg('Dispatching service request…');
    try {
      await api.createServiceRequest({
        department: targetDept,
        roomNumber: targetRoom,
        description: reqText,
        priority: pri
      });
      showToast(`Guest request dispatched to ${DEPARTMENTS[targetDept] || targetDept}`);
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error dispatching request: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleBroadcastEmergency = async (roomId: string, emText: string) => {
    setBusy(true);
    setBusyMsg('Broadcasting emergency alert…');
    try {
      await api.broadcastEmergency(roomId, emText);
      setActiveModal(null);
      showToast('Emergency alert broadcasted to command center');
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error broadcasting emergency: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleAckEmergency = async (id: string) => {
    try {
      await api.acknowledgeEmergency(id);
      showToast('Emergency acknowledged');
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error acknowledging emergency: ' + (err as Error).message);
    }
  };

  const handleAssignEmergency = async (id: string) => {
    const e = emergencies.find((x) => x.id === id || x._id === id);
    if (!e) return;
    try {
      await api.acknowledgeEmergency(e._id || e.id);
      await api.createNewTask({
        department: 'maintenance',
        type: 'Emergency Response',
        roomNumber: e.room,
        priority: 'EMERGENCY',
        description: e.text
      });
      showToast('Emergency task dispatched to Maintenance');
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Error assigning emergency: ' + (err as Error).message);
    }
  };

  const handleAssignStaff = async (taskId: string, staffId: string) => {
    setBusy(true);
    setBusyMsg('Assigning task to staff…');
    try {
      await api.assignTask(taskId, staffId);
      setActiveModal(null);
      showToast('Task successfully assigned to staff member.');
      await loadBackendData();
    } catch (err: unknown) {
      showToast('Failed to assign task: ' + (err as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg('');
    }
  };

  const handleReadAllNotes = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('All notifications marked as read');
    } catch (err: unknown) {
      showToast('Error updating notifications: ' + (err as Error).message);
    }
  };

  // Nav Items calculation
  const getNavItems = (): [string, string][] => {
    if (!currentStaff) return [];
    const d = currentStaff.department;
    if (d === 'manager') {
      return [
        ['Dashboard', '▦'],
        ['Operations', '◈'],
        ['Tasks', '☑'],
        ['Rooms', '⌂'],
        ['Staff', '☺'],
        ['Feedback', '★'],
        ['Requests', '✉'],
        ['Notifications', '🔔'],
        ['Reports', '▤']
      ];
    }
    if (DISP.includes(d)) {
      return [
        ['Dashboard', '▦'],
        ['Tasks', '☑'],
        ['Rooms', '⌂'],
        ['Notifications', '🔔']
      ];
    }
    // Reception
    return [
      ['Dashboard', '▦'],
      ['Operations', '◈'],
      ['Tasks', '☑'],
      ['Rooms', '⌂'],
      ['Requests', '✉'],
      ['Notifications', '🔔'],
      ['Reports', '▤']
    ];
  };

  // Check if there is an active offer for the logged in user
  const activeOffer = offers[0] || null;
  const offeredTask =
    activeOffer &&
    (activeOffer.task ||
      tasks.find((t) => t.id === activeOffer.taskId || t._id === activeOffer.taskId) || {
        id: activeOffer.taskId,
        type: 'Service Task',
        priority: 'MEDIUM',
        description: 'New task offer awaiting response',
        estimatedDuration: 30
      });

  // Unread notes count
  const unreadNotesCount = notes.filter((n) => !n.read).length;

  const hotelDisplayName = currentStaff?.hotelName || (currentStaff?.hotelCode ? `LEMURIA ${currentStaff.hotelCode}` : 'LEMURIA GRAND HOTEL');

  // Render view
  if (!auth) {
    return (
      <div className={selectedDept}>
        {land ? (
          <LandingPage onPickDepartment={handlePickDepartment} />
        ) : (
          <LoginPage
            department={selectedDept}
            deptName={DEPARTMENTS[selectedDept] || selectedDept}
            staffList={staff}
            busy={busy}
            busyMsg={busyMsg}
            loginErr={loginErr}
            onLogin={handleLogin}
            onBack={() => setLand(true)}
          />
        )}
        <Toast message={toastMsg} />
      </div>
    );
  }

  if (!currentStaff) return null;

  const navItems = getNavItems();

  return (
    <div className={currentStaff.department}>
      <Sidebar
        deptName={DEPARTMENTS[currentStaff.department] || currentStaff.department}
        staff={currentStaff}
        navItems={navItems}
        currentPage={page}
        unreadNotes={unreadNotesCount}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onNavigate={(p) => {
          setPage(p);
          setMobileSidebarOpen(false);
        }}
        onLogout={handleLogout}
      />

      <div className="main">
        <TopBar
          deptName={DEPARTMENTS[currentStaff.department] || currentStaff.department}
          hotelName={hotelDisplayName}
          duty={currentStaff.duty}
          unreadNotes={unreadNotesCount}
          isSidebarOpen={mobileSidebarOpen}
          onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          onOpenNotifications={() => {
            setPage('Notifications');
            setMobileSidebarOpen(false);
          }}
        />

        <div className="wrap">
          {page === 'Dashboard' && (
            <DashboardPage
              staff={currentStaff}
              deptMap={DEPARTMENTS}
              emergencies={emergencies}
              tasks={tasks}
              rooms={rooms}
              arrivals={arrivals}
              feedbacks={feedbacks}
              allStaff={staff}
              notes={notes}
              requests={requests}
              managerBoardDept={managerBoardDept}
              busy={busy}
              onDutyToggle={handleDutyToggle}
              onTaskClick={(id) => setActiveModal({ type: 'detail', id })}
              onStartTask={handleStartTask}
              onCompleteTask={(id) => setActiveModal({ type: 'done', id })}
              onAckEmergency={handleAckEmergency}
              onAssignEmergency={handleAssignEmergency}
              onOpenAssignStaff={(t) => setActiveModal({ type: 'assignStaff', id: t.id || t._id })}
              onOpenEmergencyDetail={(id) => setActiveModal({ type: 'detail', id })}
              onOpenVerifyModal={(id) => setActiveModal({ type: 'verify', id })}
              onSetManagerBoardDept={(d) => setManagerBoardDept(d)}
            />
          )}

          {page === 'Operations' && (
            <OperationsPage
              staff={currentStaff}
              deptMap={DEPARTMENTS}
              tasks={tasks}
              rooms={rooms}
              arrivals={arrivals}
              allStaff={staff}
              managerBoardDept={managerBoardDept}
              busy={busy}
              onDutyToggle={handleDutyToggle}
              onTaskClick={(id) => setActiveModal({ type: 'detail', id })}
              onStartTask={handleStartTask}
              onCompleteTask={(id) => setActiveModal({ type: 'done', id })}
              onOpenAssignStaff={(t) => setActiveModal({ type: 'assignStaff', id: t.id || t._id })}
              onCheckout={handleCheckout}
              onOpenVerifyModal={(id) => setActiveModal({ type: 'verify', id })}
              onSetManagerBoardDept={(d) => setManagerBoardDept(d)}
            />
          )}

          {page === 'Tasks' && (
            <TasksPage
              tasks={tasks}
              deptMap={DEPARTMENTS}
              userDept={currentStaff.department}
              onTaskClick={(id) => setActiveModal({ type: 'detail', id })}
            />
          )}

          {page === 'Rooms' && (
            <RoomsPage
              rooms={rooms}
              tasks={tasks}
              userDept={currentStaff.department}
              isOffDuty={currentStaff.duty === 'OFF'}
              busy={busy}
              onReceptionDutyPrompt={handleReceptionDutyPrompt}
              onCheckout={handleCheckout}
              onApproveRoom={handleApproveRoom}
              onRejectRoom={handleRejectRoom}
            />
          )}

          {page === 'Staff' && (
            <StaffManagementPage
              staffList={staff}
              tasks={tasks}
              deptMap={DEPARTMENTS}
              onOpenAddStaff={() => setActiveModal({ type: 'addStaff' })}
              onOpenEditStaff={(id) => setActiveModal({ type: 'editStaff', id })}
              onSetStaffStatus={handleSetStaffStatus}
            />
          )}

          {page === 'Feedback' && (
            <FeedbackPage
              feedbacks={feedbacks}
              hotelName={hotelDisplayName}
              deptMap={DEPARTMENTS}
              onOpenAddFeedback={() => setActiveModal({ type: 'addFeedback' })}
            />
          )}

          {page === 'Requests' && (
            <RequestsPage
              rooms={rooms}
              requests={requests}
              emergencies={emergencies}
              deptMap={DEPARTMENTS}
              isReception={currentStaff.department === 'reception'}
              isOffDuty={currentStaff.duty === 'OFF'}
              onLogRequest={handleLogRequest}
              onOpenEmergencyModal={() => setActiveModal({ type: 'em' })}
              onOpenEmergencyDetail={(id) => setActiveModal({ type: 'detail', id })}
              onAckEmergency={handleAckEmergency}
              onAssignEmergency={handleAssignEmergency}
            />
          )}

          {page === 'Notifications' && (
            <NotificationsPage
              notes={notes}
              userId={currentStaff.id}
              onReadAll={handleReadAllNotes}
            />
          )}

          {page === 'Reports' && (
            <ReportsPage
              tasks={tasks}
              emergencies={emergencies}
              staffList={staff}
              feedbacks={feedbacks}
              deptMap={DEPARTMENTS}
            />
          )}
        </div>
      </div>

      <BottomNav
        navItems={navItems}
        currentPage={page}
        onNavigate={(p) => {
          setPage(p);
          setMobileSidebarOpen(false);
        }}
      />

      {/* 15-Second Task Offer Modal */}
      {activeOffer && offeredTask && (
        <TaskOfferModal
          task={offeredTask}
          offer={activeOffer}
          busy={busy}
          onAccept={handleAcceptTask}
          onDecline={handleDeclineTask}
          onTimeout={handleTimeoutTask}
        />
      )}

      {/* Modals */}
      {activeModal?.type === 'detail' && (
        <TaskDetailModal
          id={activeModal.id}
          task={tasks.find((t) => t.id === activeModal.id || t._id === activeModal.id)}
          emergency={
            activeModal.id.startsWith('E:')
              ? emergencies.find((e) => e.id === activeModal.id.slice(2) || e._id === activeModal.id.slice(2))
              : undefined
          }
          isMine={
            DISP.includes(currentStaff.department) &&
            (tasks.find((t) => t.id === activeModal.id || t._id === activeModal.id)?.assignedStaffId === currentStaff.id ||
             tasks.find((t) => t.id === activeModal.id || t._id === activeModal.id)?.assignedStaffId === currentStaff.staffCode ||
             tasks.find((t) => t.id === activeModal.id || t._id === activeModal.id)?.assignedStaffId === currentStaff._id)
          }

          onClose={() => setActiveModal(null)}
          onStartTask={handleStartTask}
          onOpenComplete={(id) => setActiveModal({ type: 'done', id })}
        />
      )}

      {activeModal?.type === 'done' && (
        <TaskCompleteModal
          task={tasks.find((t) => t.id === activeModal.id || t._id === activeModal.id) || { id: activeModal.id, type: 'Task', department: currentStaff.department }}
          deptName={DEPARTMENTS[currentStaff.department] || currentStaff.department}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSubmitCompletion}
        />
      )}

      {activeModal?.type === 'addStaff' && (
        <AddStaffModal
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={handleAddStaff}
        />
      )}

      {activeModal?.type === 'editStaff' && (
        <EditStaffModal
          staff={staff.find((s) => s.id === activeModal.id || s._id === activeModal.id) || { id: activeModal.id, name: '', email: '', department: 'housekeeping', enabled: 'ENABLED' }}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={handleEditStaff}
        />
      )}

      {activeModal?.type === 'addFeedback' && (
        <AddFeedbackModal
          rooms={rooms}
          staffList={staff}
          deptMap={DEPARTMENTS}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={handleAddFeedback}
        />
      )}

      {activeModal?.type === 'em' && (
        <EmergencyModal
          rooms={rooms}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onSubmit={handleBroadcastEmergency}
        />
      )}

      {activeModal?.type === 'verify' && (
        <VerifyGuestModal
          arrival={arrivals.find((a) => a.id === activeModal.id)!}
          busy={busy}
          onToggleCheck={(key) => handleToggleArrivalCheck(activeModal.id, key)}
          onClose={() => setActiveModal(null)}
          onConfirm={() => handleVerifyIn(activeModal.id)}
        />
      )}

      {activeModal?.type === 'assignStaff' && (
        <AssignStaffModal
          task={tasks.find((t) => t.id === activeModal.id || t._id === activeModal.id) || { id: activeModal.id, type: 'Task', department: 'housekeeping', priority: 'HIGH', description: '' }}
          allStaff={staff}
          deptMap={DEPARTMENTS}
          busy={busy}
          onClose={() => setActiveModal(null)}
          onAssign={handleAssignStaff}
        />
      )}

      <Toast message={toastMsg} />
    </div>
  );
};
