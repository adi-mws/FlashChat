import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser, setUser, updateUser, clearUser, logoutUser } from '../../redux/slices/authSlice';
import { useNotification } from '../../hooks/useNotification';
import { CHAT_ROUTES } from '../../routes/routes';
import { getImageUrl } from '../../lib/imageUtils';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  MessageSquare,
  HardDrive,
  Activity,
  Radio,
  RefreshCw,
  Search,
  Filter,
  Ban,
  CheckCircle2,
  UserCheck,
  Key,
  Lock,
  ArrowUpRight,
  BarChart3,
  Database,
  FileText,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  X,
  SlidersHorizontal,
  ChevronRight,
  MonitorSmartphone,
  Trash2,
  Flame,
  FolderX,
  UserX,
  UserPlus,
  LogOut,
  MessagesSquare,
  MessageSquareX,
  Crown,
} from 'lucide-react';

export default function SupremeAdminPanel() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'deactivated'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Moderation action modal states
  const [actionUser, setActionUser] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('Violation of Community Guidelines');
  const [actionLoading, setActionLoading] = useState(false);

  // Danger / Delete Zones modal states
  const [dangerModal, setDangerModal] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);

  // Direct Admin Credentials Login states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Bootstrap & Master Key states
  const [isBootstrapped, setIsBootstrapped] = useState(null);
  const [masterKey, setMasterKey] = useState('');
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [claimPassword, setClaimPassword] = useState('');
  const [claimConfirmPassword, setClaimConfirmPassword] = useState('');
  const [claimName, setClaimName] = useState('');

  // Password Management modal states
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Secondary Administrator Provisioning modal states (Super Admin only)
  const [createAdminModalOpen, setCreateAdminModalOpen] = useState(false);
  const [regAdminUsername, setRegAdminUsername] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminEmail, setRegAdminEmail] = useState('');
  const [regAdminPassword, setRegAdminPassword] = useState('');
  const [regAdminConfirmPassword, setRegAdminConfirmPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  // Fetch telemetry & metrics
  const fetchMetrics = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/metrics`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  // Fetch user directory
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users`, {
        params: {
          search: searchQuery,
          status: statusFilter,
          page,
          limit: 30,
        },
        withCredentials: true,
      });
      if (res.data.success) {
        setUsersList(res.data.users);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchMetrics(), fetchUsers()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMetrics(), fetchUsers()]);
    setRefreshing(false);
    showNotification('System telemetry updated', 'success');
  };

  useEffect(() => {
    if (isAdmin) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [isAdmin, statusFilter, page]);

  // Handle Search Debounce
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      fetchUsers();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Toggle user activation / deactivation
  const handleConfirmToggleStatus = async () => {
    if (!actionUser) return;
    try {
      setActionLoading(true);
      const isDeactivating = !actionUser.isDeactivated;
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/users/${actionUser._id}/toggle-status`,
        {
          isDeactivated: isDeactivating,
          reason: isDeactivating ? deactivateReason : '',
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        showNotification(res.data.message, 'success');
        // Update list locally
        setUsersList((prev) =>
          prev.map((u) =>
            u._id === actionUser._id
              ? {
                  ...u,
                  isDeactivated: isDeactivating,
                  deactivatedReason: isDeactivating ? deactivateReason : '',
                  activeSessions: isDeactivating ? 0 : u.activeSessions,
                }
              : u
          )
        );
        // Refresh metrics to reflect new status
        fetchMetrics();
        setActionUser(null);
      }
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to update user status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Sign out cleanly, invalidate session and redirect
  const handleSignOut = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      dispatch(clearUser());
      showNotification('Signed out from Supreme Console.', 'info');
      navigate('/', { replace: true });
    }
  };

  // Super Admin: Provision a new secondary Administrator
  const handleCreateAdmin = async (e) => {
    if (e) e.preventDefault();
    if (!regAdminUsername.trim()) {
      showNotification('Username is required.', 'error');
      return;
    }
    if (!regAdminPassword || regAdminPassword.length < 6) {
      showNotification('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (regAdminPassword !== regAdminConfirmPassword) {
      showNotification('Passwords do not match.', 'error');
      return;
    }

    try {
      setCreatingAdmin(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/auth/register`,
        {
          username: regAdminUsername.trim(),
          name: regAdminName.trim() || regAdminUsername.trim(),
          email: regAdminEmail.trim() || undefined,
          password: regAdminPassword,
          confirmPassword: regAdminConfirmPassword,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        showNotification(res.data.message || 'Administrator created successfully!', 'success');
        setCreateAdminModalOpen(false);
        setRegAdminUsername('');
        setRegAdminName('');
        setRegAdminEmail('');
        setRegAdminPassword('');
        setRegAdminConfirmPassword('');
        fetchUsers();
      }
    } catch (err) {
      console.error('Create admin error:', err);
      showNotification(err.response?.data?.message || 'Failed to create administrator.', 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Update or set admin password
  const handleUpdateAdminPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newAdminPassword || newAdminPassword.length < 6) {
      showNotification('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      showNotification('Passwords do not match.', 'error');
      return;
    }
    try {
      setUpdatingPassword(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/set-password`,
        { password: newAdminPassword, confirmPassword: confirmAdminPassword },
        { withCredentials: true }
      );
      if (res.data.success) {
        showNotification(res.data.message || 'Password updated successfully!', 'success');
        setPasswordModalOpen(false);
        setNewAdminPassword('');
        setConfirmAdminPassword('');
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Toggle user role (appoint/revoke admin) - Only Super Admin can perform this!
  const handleToggleRole = async (targetUser) => {
    if (!isSuperAdmin) {
      showNotification('Only the Super Admin can appoint or revoke administrators.', 'error');
      return;
    }
    if (targetUser.role === 'superadmin') {
      showNotification('The Super Admin account cannot be modified.', 'error');
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg =
      newRole === 'admin'
        ? `Grant System Admin privileges to @${targetUser.username}?`
        : `Revoke admin privileges and demote @${targetUser.username} to standard user?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/users/${targetUser._id}/role`,
        { role: newRole },
        { withCredentials: true }
      );
      if (res.data.success) {
        showNotification(res.data.message, 'success');
        setUsersList((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update user role', 'error');
    }
  };

  // Danger Zone / Delete Zones Action Execution
  const handleExecuteDangerAction = async () => {
    if (!dangerModal) return;
    if (confirmInput.trim() !== dangerModal.confirmPhrase) {
      showNotification(`Confirmation phrase must match: "${dangerModal.confirmPhrase}" exactly.`, 'error');
      return;
    }

    try {
      setDangerLoading(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}${dangerModal.endpoint}`,
        { confirmPhrase: dangerModal.confirmPhrase },
        { withCredentials: true }
      );

      if (res.data.success) {
        showNotification(res.data.message, 'success');
        setDangerModal(null);
        setConfirmInput('');
        // Refresh telemetry and users
        await Promise.all([fetchMetrics(), fetchUsers()]);
      }
    } catch (err) {
      console.error('Danger action failed:', err);
      showNotification(err.response?.data?.message || 'Purge action failed', 'error');
    } finally {
      setDangerLoading(false);
    }
  };

  // Fetch bootstrap status on component load
  useEffect(() => {
    let isMounted = true;
    axios
      .get(`${import.meta.env.VITE_API_URL}/admin/auth/bootstrap-status`)
      .then((res) => {
        if (isMounted && res.data?.success) {
          setIsBootstrapped(res.data.isBootstrapped);
        }
      })
      .catch(() => {
        if (isMounted) setIsBootstrapped(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Only redirect non-admins if an admin has ALREADY been bootstrapped
  useEffect(() => {
    if (isBootstrapped === true && user && user.role !== 'admin' && user.role !== 'superadmin') {
      showNotification('Access restricted: Admins only. Redirecting to user chat...', 'error');
      navigate(CHAT_ROUTES.root, { replace: true });
    }
  }, [isBootstrapped, user, navigate]);

  // Master Passkey Initial Bootstrap Claim (One-time only for Super Admin setup)
  const handleClaimAdmin = async (e) => {
    if (e) e.preventDefault();
    if (!masterKey.trim()) {
      showNotification('Please enter the Master Passkey.', 'error');
      return;
    }
    if (!claimPassword || claimPassword.length < 6) {
      showNotification('Please enter a Super Admin password (minimum 6 characters).', 'error');
      return;
    }
    if (claimPassword !== claimConfirmPassword) {
      showNotification('Password and Confirm Password do not match.', 'error');
      return;
    }

    try {
      setClaimingAdmin(true);
      const payload = {
        masterKey: masterKey.trim(),
        password: claimPassword,
        confirmPassword: claimConfirmPassword,
      };

      if (!user) {
        if (!loginUsername.trim()) {
          showNotification('Please enter your chosen username or email.', 'error');
          setClaimingAdmin(false);
          return;
        }
        payload.username = loginUsername.trim();
        if (claimName.trim()) payload.name = claimName.trim();
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/auth/register`,
        payload,
        { withCredentials: true }
      );

      if (res.data.success) {
        showNotification(res.data.message || 'Super Admin initialized successfully!', 'success');
        if (res.data.user) {
          dispatch(setUser(res.data.user));
        } else if (user) {
          dispatch(updateUser({ role: 'superadmin' }));
        }
        setIsBootstrapped(true);
        setMasterKey('');
        setClaimPassword('');
        setClaimConfirmPassword('');
        loadAll();
      }
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to claim Super Admin access. Verify Master Passkey.', 'error');
    } finally {
      setClaimingAdmin(false);
    }
  };

  // Direct Administrator Credentials Login (Dedicated Admin Auth)
  const handleAdminDirectLogin = async (e) => {
    e.preventDefault();
    try {
      setLoggingIn(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/auth/login`,
        { username: loginUsername.trim(), password: loginPassword },
        { withCredentials: true }
      );

      if (res.data.success && res.data.user) {
        const loggedUser = res.data.user;
        dispatch(setUser(loggedUser));

        if (loggedUser.role !== 'admin' && loggedUser.role !== 'superadmin') {
          showNotification('Standard user account authenticated. Redirecting to user chat...', 'info');
          navigate(CHAT_ROUTES.root, { replace: true });
          return;
        }

        showNotification(`Welcome to Supreme Console, @${loggedUser.username}!`, 'success');
        loadAll();
      }
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Authentication failed. Please verify administrator credentials.', 'error');
    } finally {
      setLoggingIn(false);
    }
  };

  // If user is not authenticated at all
  if (!user) {
    const isFirstTimeSetup = isBootstrapped === false;

    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 selection:bg-indigo-500 selection:text-white">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-zinc-900/95 border border-zinc-800 shadow-2xl space-y-6 animate-scale-in backdrop-blur-xl">
          <div className="text-center space-y-2">
            <div className={`h-14 w-14 mx-auto rounded-2xl ${isFirstTimeSetup ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-500/10'} border flex items-center justify-center shadow-lg mb-1`}>
              {isFirstTimeSetup ? <Key size={28} className="animate-pulse" /> : <ShieldCheck size={28} />}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isFirstTimeSetup ? 'Initial Supreme Admin Setup' : 'Supreme Admin Console'}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isFirstTimeSetup
                ? 'No administrator has been initialized yet. Enter credentials & Master Passkey to initialize Supreme Admin authority.'
                : 'Restricted to verified FlashChat system administrators.'}
            </p>
          </div>

          {isFirstTimeSetup && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed flex items-start gap-2">
              <Sparkles size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>First-Time Production Bootstrap:</strong> The Master Passkey option is active. Once an admin is claimed, this option will be permanently disabled.
              </span>
            </div>
          )}

          <form onSubmit={isFirstTimeSetup ? handleClaimAdmin : handleAdminDirectLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">
                {isFirstTimeSetup ? 'Super Admin Username or Email' : 'Username or Email'}
              </label>
              <input
                type="text"
                placeholder={isFirstTimeSetup ? "Enter chosen username (e.g. supreme_admin)" : "Enter registered username or email"}
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>

            {isFirstTimeSetup && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Admin Display Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Master Administrator"
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>
            )}

            {isFirstTimeSetup ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-amber-400">Create Super Admin Password</label>
                  <input
                    type="password"
                    placeholder="Create a strong password (min 6 chars)"
                    value={claimPassword}
                    onChange={(e) => setClaimPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Confirm Super Admin Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter password to confirm"
                    value={claimConfirmPassword}
                    onChange={(e) => setClaimConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <Key size={13} /> Master Passkey
                    </label>
                    <span className="text-[10px] text-amber-500/80 font-mono">One-Time Secret</span>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter FLASHCHAT Master Passkey"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-zinc-950 text-zinc-100 font-mono placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Password</label>
                <input
                  type="password"
                  placeholder="Enter account password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isFirstTimeSetup ? (claimingAdmin || !loginUsername || !masterKey || !claimPassword) : (loggingIn || !loginUsername || !loginPassword)}
              className={`w-full py-3 ${isFirstTimeSetup ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20'} font-semibold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1`}
            >
              {claimingAdmin || loggingIn ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4" />
                  <span>{claimingAdmin ? 'Initializing Super Admin...' : 'Verifying Credentials...'}</span>
                </>
              ) : isFirstTimeSetup ? (
                <>
                  <Key size={16} />
                  <span>Set Password & Claim Super Admin</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Sign In to Supreme Console</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            >
              ← Back to FlashChat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in but does not have the admin role
  if (!isAdmin) {
    // If NO admin exists yet in the entire system, show the one-time claim screen!
    if (isBootstrapped === false) {
      return (
        <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 selection:bg-indigo-500 selection:text-white">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-zinc-900/95 border border-amber-500/40 shadow-2xl space-y-6 animate-scale-in backdrop-blur-xl">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10 mb-1">
                <Key size={32} className="animate-pulse" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                First-Time Setup
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">Initialize Super Admin Authority</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                No administrator exists on this server yet. Set a dedicated password and enter the Master Passkey to elevate <strong className="text-zinc-200">@{user.username}</strong> ({user.name}) as the sole Super Admin.
              </p>
            </div>

            <form onSubmit={handleClaimAdmin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-amber-400">Create Super Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter strong password (min 6 chars)"
                  value={claimPassword}
                  onChange={(e) => setClaimPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Confirm Super Admin Password</label>
                <input
                  type="password"
                  placeholder="Re-enter password to confirm"
                  value={claimConfirmPassword}
                  onChange={(e) => setClaimConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Key size={13} /> Master Passkey
                  </label>
                  <span className="text-[10px] text-amber-500/80 font-mono">One-Time Secret</span>
                </div>
                <input
                  type="password"
                  placeholder="Enter system master passkey"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition"
                />
              </div>

              <button
                type="submit"
                disabled={claimingAdmin || !masterKey.trim() || !claimPassword || !claimConfirmPassword}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {claimingAdmin ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4" />
                    <span>Configuring Super Admin...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Set Password & Claim Super Admin</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => navigate(CHAT_ROUTES.root)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                ← Back to Chats
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="max-w-lg w-full p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl text-center space-y-6">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <ShieldAlert size={34} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight">Access Restricted</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Logged in as <strong className="text-zinc-200">@{user.username}</strong> ({user.name}). This account does not possess Supreme Admin privileges.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleSignOut}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock size={16} /> Sign In with Admin Account
            </button>
            <button
              onClick={() => navigate(CHAT_ROUTES.root)}
              className="w-full py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 text-xs font-semibold transition cursor-pointer"
            >
              Back to FlashChat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Supreme Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 hover:bg-rose-500/10 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Sign out of Supreme Admin"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Sparkles size={16} className="text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  FlashChat Supreme Console
                </h1>
                {isSuperAdmin ? (
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1 shadow-sm shadow-amber-500/10">
                    <Crown size={11} /> Super Admin
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center gap-1">
                    <ShieldCheck size={11} /> System Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">Real-time Telemetry & Global Moderation Control</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator beacon */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {metrics?.users?.liveOnline ?? 0} Sockets Live
            </span>
          </div>

          {/* Secondary Admin Registration (Super Admin Only) */}
          {isSuperAdmin && (
            <button
              onClick={() => setCreateAdminModalOpen(true)}
              className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-600 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Register a new system administrator"
            >
              <UserPlus size={14} className="text-indigo-400" />
              <span className="hidden sm:inline">Register Admin</span>
            </button>
          )}

          {/* Direct Password Management for Admin / Superadmin */}
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Set or update admin account password"
          >
            <Key size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Set Password</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Command Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8 animate-fade-in">
        {/* KPI Command Center */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Activity size={14} className="text-indigo-400" /> Platform Metrics & Footprint
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">Live Sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Users */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Total Registered Users</span>
                <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {metrics?.users?.total?.toLocaleString() ?? '—'}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px]">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> {metrics?.users?.active ?? 0} Active
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <Ban size={12} /> {metrics?.users?.deactivated ?? 0} Banned
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Messages Volume */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Total Chat Messages</span>
                <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {metrics?.messages?.total?.toLocaleString() ?? '—'}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
                  <span>{metrics?.messages?.text?.toLocaleString() ?? 0} Text</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-cyan-400 font-medium">
                    {metrics?.messages?.mediaTotal?.toLocaleString() ?? 0} Media Attachments
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Storage Size */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Disk Storage Used</span>
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <HardDrive size={16} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {metrics?.storage?.formattedUploadSize ?? '0 B'}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
                  <span>{metrics?.storage?.totalUploadsCount ?? 0} Uploaded Files</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-purple-400 font-medium">
                    ~{metrics?.storage?.formattedTextSize ?? '0 B'} Text Payload
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Sessions & Cryptography */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Active E2EE Sessions</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <MonitorSmartphone size={16} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {metrics?.network?.activeSessions?.toLocaleString() ?? '—'}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
                  <span>{metrics?.network?.directChats ?? 0} Direct</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-emerald-400 font-medium">
                    {metrics?.network?.groupChats ?? 0} Groups
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7-Day Activity Chart Visualization */}
        <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-400" /> 7-Day Traffic & Messaging Velocity
              </h3>
              <p className="text-xs text-zinc-500">Daily message dispatch volume across the network</p>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-lg">
              Rolling 7 Days
            </span>
          </div>

          <div className="pt-4 pb-2">
            <div className="h-44 flex items-end gap-3 sm:gap-6 w-full justify-between">
              {metrics?.trafficTimeline?.map((item, idx) => {
                const max = Math.max(...metrics.trafficTimeline.map((t) => t.total), 1);
                const heightPct = Math.max(8, Math.round((item.total / max) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.total} msg
                    </div>
                    <div className="w-full max-w-[48px] bg-zinc-800 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 h-full">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t-lg transition-all duration-500 shadow-lg shadow-indigo-500/20 group-hover:from-indigo-500 group-hover:to-cyan-300"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 truncate w-full text-center">
                      {item.displayDate.split(',')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* User Directory & Supreme Moderation Center */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Users size={16} className="text-cyan-400" /> User Directory & Account Moderation
              </h3>
              <p className="text-xs text-zinc-500">
                Instantly activate, deactivate, or manage roles for any user
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('deactivated')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === 'deactivated' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Deactivated / Banned
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Search user by display name, @username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
            />
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/80 text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Activity</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-zinc-500">
                        No users found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const isSelf = u._id === user.id;

                      return (
                        <tr
                          key={u._id}
                          className="hover:bg-zinc-800/30 transition-colors"
                        >
                          {/* User Identity */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img
                                  src={getImageUrl(u.pfp)}
                                  alt={u.name}
                                  className="h-9 w-9 rounded-xl object-cover border border-zinc-800 bg-zinc-800"
                                />
                                {u.isOnline && (
                                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-zinc-100 truncate">{u.name}</span>
                                  {u.role === 'superadmin' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                      <Crown size={10} /> Super Admin
                                    </span>
                                  )}
                                  {u.role === 'admin' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                      Admin
                                    </span>
                                  )}
                                  {isSelf && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 truncate">@{u.username}</p>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400 truncate max-w-[180px]">
                            {u.email}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {u.isDeactivated ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                <Ban size={10} /> Deactivated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 size={10} /> Active
                              </span>
                            )}
                          </td>

                          {/* Activity: Messages and Sessions */}
                          <td className="py-3.5 px-4 text-zinc-400">
                            <div className="space-y-0.5 text-[11px]">
                              <div>
                                <strong className="text-zinc-200">{u.messageCount || 0}</strong> messages
                              </div>
                              <div className="text-zinc-500">
                                {u.activeSessions || 0} active device(s)
                              </div>
                            </div>
                          </td>

                          {/* Joined */}
                          <td className="py-3.5 px-4 text-[11px] text-zinc-500 whitespace-nowrap">
                            {new Date(u.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>

                          {/* Moderation Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Toggle Admin Role - ONLY Super Admin can appoint/revoke, Super Admin cannot be revoked */}
                              {u.role === 'superadmin' ? (
                                <span className="px-2 py-0.5 text-[11px] font-bold text-amber-400/90 font-mono flex items-center gap-1">
                                  <Crown size={11} /> Owner
                                </span>
                              ) : isSuperAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRole(u)}
                                  disabled={isSelf}
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer disabled:opacity-40 ${
                                    u.role === 'admin'
                                      ? 'border-rose-900/40 text-rose-400 hover:bg-rose-500/10'
                                      : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'
                                  }`}
                                  title={u.role === 'admin' ? 'Revoke admin status and demote to user' : 'Appoint user as system admin'}
                                >
                                  {u.role === 'admin' ? 'Revoke Admin' : 'Appoint Admin'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-zinc-500 font-medium">
                                  {u.role === 'admin' ? 'Admin' : 'Member'}
                                </span>
                              )}

                              {/* Activate / Deactivate Toggle */}
                              {u.isDeactivated ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionUser(u);
                                    handleConfirmToggleStatus();
                                  }}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <UserCheck size={12} /> Activate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => setActionUser(u)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                >
                                  <Ban size={12} /> Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Supreme Danger / Delete Zones */}
        <section className="space-y-4 pt-6 border-t border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                  <Flame size={16} className="text-rose-500 animate-pulse" /> Supreme Delete Zones & System Reset
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                  Danger Area
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Permanent system purge actions to clear messages, purge uploaded files, and prune non-admin users to prepare FlashChat for new releases.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Zone 1: Clear All Messages */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-rose-900/30 hover:border-rose-700/50 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Trash2 size={18} />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                    Database Wipe
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-rose-300 transition">
                    Clear All Chat Messages
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Completely wipes all direct and group chat messages from the database. Resets last message previews.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  {metrics?.messages?.total?.toLocaleString() ?? 0} messages stored
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDangerModal({
                      type: 'messages',
                      title: 'Clear All Chat Messages',
                      badge: 'Database Purge',
                      confirmPhrase: 'CLEAR_ALL_MESSAGES',
                      endpoint: '/admin/danger/clear-messages',
                      buttonText: 'Wipe All Messages',
                      description: 'This will irreversibly delete every message across all 1-on-1 and group chats in FlashChat.',
                      warning: 'All messages, text, and chat history will be immediately deleted from the database. Active chat lists will be reset to empty.',
                    });
                    setConfirmInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Clear Messages
                </button>
              </div>
            </div>

            {/* Zone 2: Delete All Chats & Contacts (Including Admin) */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-rose-900/40 hover:border-rose-700/60 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                    <MessagesSquare size={18} />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                    Chats & Contacts
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-rose-300 transition">
                    Delete All Chats & Contacts
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Deletes all 1-on-1 and group chats, wipes message logs, purges media, and clears contacts & friend requests for all users (including admins).
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  {metrics?.chats?.total ?? 0} chats • {metrics?.users?.total ?? 0} accounts
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDangerModal({
                      type: 'all_chats',
                      title: 'Delete All Chats & Contacts',
                      badge: 'Complete Chat Wipe',
                      confirmPhrase: 'DELETE_ALL_CHATS_AND_CONTACTS',
                      endpoint: '/admin/danger/delete-all-chats',
                      buttonText: 'Delete All Chats & Contacts',
                      description: 'This will irreversibly delete every 1-on-1 chat, group room, message, and wipe contacts & friend requests for all accounts (including admins).',
                      warning: 'All conversations and group memberships will be permanently deleted. Every user (including admins) will have an empty chat list and empty contact list. User accounts and login credentials will be preserved.',
                    });
                    setConfirmInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquareX size={13} /> Delete All Chats
                </button>
              </div>
            </div>

            {/* Zone 2: Clear All Uploads */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-amber-900/30 hover:border-amber-700/50 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <FolderX size={18} />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                    Disk Storage
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition">
                    Purge All Chat Uploads
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Permanently deletes all image attachments, documents, and media files stored on the server disk.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  {metrics?.storage?.totalUploadsCount ?? 0} files ({metrics?.storage?.formattedUploadSize ?? '0 B'})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDangerModal({
                      type: 'uploads',
                      title: 'Purge All Chat Uploads',
                      badge: 'Disk Storage Purge',
                      confirmPhrase: 'CLEAR_ALL_UPLOADS',
                      endpoint: '/admin/danger/clear-uploads',
                      buttonText: 'Purge All Uploads',
                      description: 'This will delete all uploaded media and files in /uploads/attachments and /uploads/media from disk.',
                      warning: 'All uploaded files will be permanently erased from the server disk storage. Disk capacity will be reclaimed immediately.',
                    });
                    setConfirmInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <FolderX size={13} /> Purge Uploads
                </button>
              </div>
            </div>

            {/* Zone 3: Delete All Users Except Admins */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-rose-900/30 hover:border-rose-700/50 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                    <UserX size={18} />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                    User Accounts
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-rose-300 transition">
                    Delete All Non-Admin Users
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Deletes all registered user accounts, active sessions, and direct chats except accounts with the admin role.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  {Math.max(0, (metrics?.users?.total || 0) - (metrics?.users?.admins || 0))} standard users
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDangerModal({
                      type: 'users',
                      title: 'Delete All Non-Admin Users',
                      badge: 'User Accounts Purge',
                      confirmPhrase: 'DELETE_NON_ADMIN_USERS',
                      endpoint: '/admin/danger/delete-users',
                      buttonText: 'Delete All Users',
                      description: 'This will delete all standard user accounts, credentials, companion pairings, and sessions.',
                      warning: 'All non-admin users will have their cryptographic keys, sessions, and accounts permanently removed. Their active connections will be terminated. Admin accounts will NOT be touched.',
                    });
                    setConfirmInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <UserX size={13} /> Delete Users
                </button>
              </div>
            </div>
          </div>

          {/* Zone 4: Master Nuclear Clean Slate */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-zinc-900/80 to-amber-950/40 border border-rose-700/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/20">
                <Flame size={24} className="text-rose-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Supreme Factory Reset (Clean Slate for Newer Version)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-bold">
                    Master Reset
                  </span>
                </div>
                <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                  Performs an all-in-one complete purge: wipes all messages, deletes all disk uploads, clears all non-admin users, revokes all sessions, and resets chats. Leaves only your administrator account intact and primes FlashChat for fresh builds.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDangerModal({
                  type: 'master',
                  title: 'Supreme System Wipe & Factory Reset',
                  badge: 'Nuclear Reset',
                  confirmPhrase: 'PURGE_EVERYTHING_EXCEPT_ADMINS',
                  endpoint: '/admin/danger/purge-all',
                  buttonText: 'Execute Supreme Factory Reset',
                  description: 'This is the master clean slate command. It clears all messages, removes all uploads, deletes all non-admin users, and resets the entire chat system.',
                  warning: 'This will reset the entire application state. Only administrator account(s) will be preserved. All messages, uploaded files, and non-admin users will be permanently deleted.',
                });
                setConfirmInput('');
              }}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <Flame size={16} /> Execute Factory Reset
            </button>
          </div>
        </section>
      </main>

      {/* Moderation Deactivation Modal */}
      {actionUser && !actionUser.isDeactivated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 animate-scale-in text-zinc-100 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">
                    Deactivate @{actionUser.username}?
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Immediately terminates all sessions and blocks future logins
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionUser(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300 leading-relaxed">
              <strong>Moderation Notice:</strong> The user will be instantly logged out from all devices, their active sockets will be disconnected, and they will be banned from signing in until an administrator reactivates their account.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Moderation Reason</label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Reason for suspension (visible to user upon rejection)..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setActionUser(null)}
                className="w-1/2 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmToggleStatus}
                className="w-1/2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone Confirmation Modal */}
      {dangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-zinc-900 border border-rose-800/50 rounded-2xl p-6 space-y-5 animate-scale-in text-zinc-100 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-500/30">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">
                    {dangerModal.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {dangerModal.badge} • Irreversible Administrative Action
                  </p>
                </div>
              </div>
              <button
                disabled={dangerLoading}
                onClick={() => setDangerModal(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-400" /> Caution: Irreversible Operation
              </p>
              <p className="text-rose-200/90 text-[11px]">
                {dangerModal.warning}
              </p>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {dangerModal.description}
            </p>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-zinc-400">
                Type <span className="font-mono text-rose-400 font-bold select-all bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-800/50">{dangerModal.confirmPhrase}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={dangerModal.confirmPhrase}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs text-rose-200 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={dangerLoading}
                onClick={() => setDangerModal(null)}
                className="w-1/2 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dangerLoading || confirmInput.trim() !== dangerModal.confirmPhrase}
                onClick={handleExecuteDangerAction}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {dangerLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Purging...
                  </>
                ) : (
                  <>
                    <Flame size={14} /> {dangerModal.buttonText}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Management Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 animate-scale-in text-zinc-100 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">
                    Admin Password Management
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Set or update your direct login password
                  </p>
                </div>
              </div>
              <button
                disabled={updatingPassword}
                onClick={() => setPasswordModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdminPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">New Password</label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Confirm Password</label>
                <input
                  type="password"
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={updatingPassword}
                  onClick={() => setPasswordModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword || !newAdminPassword || !confirmAdminPassword}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {updatingPassword ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Secondary Administrator Provisioning Modal */}
      {createAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-indigo-500/30 rounded-2xl p-6 space-y-5 animate-scale-in text-zinc-100 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">
                    Register New Administrator
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Provision a secondary admin account with system moderation rights
                  </p>
                </div>
              </div>
              <button
                disabled={creatingAdmin}
                onClick={() => setCreateAdminModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Admin Username *</label>
                <input
                  type="text"
                  value={regAdminUsername}
                  onChange={(e) => setRegAdminUsername(e.target.value)}
                  placeholder="e.g. ops_lead"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Full Name (optional)</label>
                <input
                  type="text"
                  value={regAdminName}
                  onChange={(e) => setRegAdminName(e.target.value)}
                  placeholder="e.g. System Moderator"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Admin Email (optional)</label>
                <input
                  type="email"
                  value={regAdminEmail}
                  onChange={(e) => setRegAdminEmail(e.target.value)}
                  placeholder="e.g. admin@flashchat.internal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Initial Password * (min 6 chars)</label>
                <input
                  type="password"
                  value={regAdminPassword}
                  onChange={(e) => setRegAdminPassword(e.target.value)}
                  placeholder="Assign secure password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Confirm Password *</label>
                <input
                  type="password"
                  value={regAdminConfirmPassword}
                  onChange={(e) => setRegAdminConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={creatingAdmin}
                  onClick={() => setCreateAdminModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin || !regAdminUsername.trim() || !regAdminPassword || !regAdminConfirmPassword}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {creatingAdmin ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Provisioning...
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Register Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

