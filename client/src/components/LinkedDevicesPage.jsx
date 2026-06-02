import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Laptop, MonitorSmartphone, RefreshCw, Smartphone, LogOut } from 'lucide-react';
import { useNotification } from '../hooks/NotificationContext';

const providerBadge = (provider) => {
    const normalized = (provider || 'credentials').toLowerCase();

    if (normalized === 'google') {
        return (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 border border-slate-200 shadow-sm">
                G
            </span>
        );
    }

    return (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/70">
            <KeyRound size={15} />
        </span>
    );
};

const deviceIcon = (os) => {
    const normalized = (os || '').toLowerCase();
    if (normalized.includes('android') || normalized.includes('ios')) {
        return <Smartphone size={18} />;
    }
    return <Laptop size={18} />;
};

const formatDate = (date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function LinkedDevicesPage() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    const fetchDevices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/sessions`, {
                withCredentials: true,
            });
            setDevices(res.data.devices || []);
        } catch (error) {
            console.error('Failed to load linked devices:', error);
            showNotification('Failed to load linked devices', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    const revokeDeviceSession = async (deviceId) => {
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/auth/sessions/${deviceId}`, {
                withCredentials: true,
            });
            showNotification('Session revoked successfully', 'success');
            
            const revokedDevice = devices.find(d => d.id === deviceId);
            if (revokedDevice?.isCurrent) {
                navigate('/login');
            } else {
                fetchDevices();
            }
        } catch (error) {
            console.error('Failed to revoke session:', error);
            showNotification(error.response?.data?.message || 'Failed to revoke session', 'error');
        }
    };

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    return (
        <div className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-zinc-950/40 overflow-y-auto animate-fade-in">
            <div className="h-[64px] flex items-center px-4 py-2 sm:px-8 border-b border-slate-200/50 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md sticky top-0 z-10 justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
                        title="Go Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Linked Devices</h3>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-500">Sessions currently signed in to your account</p>
                    </div>
                </div>

                <button
                    onClick={fetchDevices}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
                    title="Refresh"
                >
                    <RefreshCw size={17} />
                </button>
            </div>

            <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/70">
                            <MonitorSmartphone size={20} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-base font-bold text-slate-800 dark:text-zinc-100">Your Signed-In Devices</h4>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
                                Devices are grouped by browser session. Multiple tabs in the same browser share one session.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
                    {loading && (
                        <div className="flex flex-col gap-3">
                            {[...Array(3)].map((_, index) => (
                                <div key={index} className="h-20 rounded-xl bg-slate-100 dark:bg-zinc-950 animate-pulse" />
                            ))}
                        </div>
                    )}

                    {!loading && devices.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">No linked devices found</p>
                            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Your current session may have expired.</p>
                        </div>
                    )}

                    {!loading && devices.map((device) => (
                        <div
                            key={device.id}
                            className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20"
                        >
                            <div className="h-11 w-11 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 flex-shrink-0">
                                {deviceIcon(device.os)}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">
                                        {device.browser} on {device.os}
                                    </p>
                                    {device.isCurrent && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold">
                                            Current
                                        </span>
                                    )}
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${device.isOnline ? 'text-emerald-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                                        <span className={`h-2 w-2 rounded-full ${device.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'}`} />
                                        {device.isOnline ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-500 dark:text-zinc-500">
                                    <span>Last seen {formatDate(device.lastSeenAt)}</span>
                                    <span>Signed in {formatDate(device.createdAt)}</span>
                                    {device.ip && <span>IP {device.ip}</span>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="flex flex-col items-center gap-1">
                                    {providerBadge(device.provider)}
                                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 capitalize">{device.provider}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm(device.isCurrent ? 'Are you sure you want to log out of your current session?' : 'Are you sure you want to log out this device?')) {
                                            revokeDeviceSession(device.id);
                                        }
                                    }}
                                    className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-150 cursor-pointer"
                                    title={device.isCurrent ? 'Log Out' : 'Revoke Session'}
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
