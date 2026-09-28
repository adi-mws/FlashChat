import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, updateUser, backupE2EEKeys, logoutUser } from '../../redux/slices/authSlice';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../../lib/imageUtils';
import { useNotification } from '../../hooks/useNotification';
import { Pencil, X, Check, ArrowLeft, Camera, Calendar, Mail, User, Info, ShieldCheck, MonitorSmartphone, History, CheckCircle2, ShieldAlert, Key, Lock, Eye, EyeOff, RefreshCw, Copy, Download, Sparkles, RotateCcw, LogOut, ArrowRight, Smartphone, Laptop, Globe, Wifi } from 'lucide-react';
import { ACCOUNT_ROUTES, SETTINGS_ROUTES, MARKETING_ROUTES } from '../../../routes/routes';
import AppHeader from '../layout/AppHeader';
import Loading from '../global/Loading';
import { generate12WordRecoveryPhrase, downloadBackupFile, normalizeRecoveryPhrase } from '../../lib/e2ee';

export default function Profile({ edit = false, targetUserId }) {
    const dispatch = useDispatch();
    const [profile, setProfile] = useState({});
    const [editedProfile, setEditedProfile] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showEnlargedImage, setShowEnlargedImage] = useState(false);
    const user = useSelector(selectUser);
    const { chatId } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [backupPassphrase, setBackupPassphrase] = useState('');
    const [showBackupPass, setShowBackupPass] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [showBackupForm, setShowBackupForm] = useState(false);
    const [showMnemonicModal, setShowMnemonicModal] = useState(false);
    const [generatedMnemonic, setGeneratedMnemonic] = useState(null);
    const [copiedPhrase, setCopiedPhrase] = useState(false);
    const [backupTab, setBackupTab] = useState('words'); // 'words' | 'custom'
    const [loggingOut, setLoggingOut] = useState(false);
    const [currentSession, setCurrentSession] = useState(null);

    const isOwnProfile = edit || targetUserId === user?.id || (!targetUserId && chatId === user?.id);

    useEffect(() => {
        if (!isOwnProfile) return;
        const fetchCurrentSession = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/sessions`, {
                    withCredentials: true,
                });
                const devices = res.data?.devices || [];
                const current = devices.find((d) => d.isCurrent) || devices[0];
                if (current) {
                    setCurrentSession(current);
                }
            } catch (err) {
                console.error('Failed to fetch session details:', err);
            }
        };
        fetchCurrentSession();
    }, [isOwnProfile]);

    const getDetectedBrowser = () => {
        if (currentSession?.browser && currentSession.browser !== 'Unknown') return currentSession.browser;
        const ua = navigator.userAgent;
        if (ua.includes('Edg/')) return 'Edge';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        return 'Web Browser';
    };

    const getDetectedOS = () => {
        if (currentSession?.os && currentSession.os !== 'Unknown') return currentSession.os;
        const ua = navigator.userAgent;
        if (ua.includes('Win')) return 'Windows';
        if (ua.includes('Mac')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
        return 'Desktop';
    };

    const isMobileDevice = () => {
        const os = getDetectedOS().toLowerCase();
        return os.includes('android') || os.includes('ios') || /mobi|iphone|ipad|android/i.test(navigator.userAgent);
    };

    const handleLogout = async () => {
        try {
            setLoggingOut(true);
            await dispatch(logoutUser()).unwrap();
            showNotification('Signed out successfully', 'info');
            navigate(MARKETING_ROUTES.login, { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
            navigate(MARKETING_ROUTES.login, { replace: true });
        } finally {
            setLoggingOut(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const targetId = isOwnProfile ? user?.id : (targetUserId || chatId);
                if (!targetId) return;
                const path = `${import.meta.env.VITE_API_URL}/user/${targetId}`;
                const res = await axios.get(path, { withCredentials: true });
                setProfile(res.data.user);
                setEditedProfile(res.data.user);
            } catch (err) {
                console.error('Failed to load profile:', err);
                showNotification('Failed to load profile', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [edit, chatId, user, isOwnProfile]);

    const handleCancel = () => {
        setEditedProfile({ ...profile });
        setIsEditing(false);
        setImagePreview('');
        setSelectedImageFile(null);
    };

    const handleChange = (field, value) => {
        setEditedProfile((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!editedProfile.name?.trim()) {
            showNotification('Name cannot be empty', 'error');
            return;
        }
        try {
            setSaving(true);
            const formData = new FormData();
            formData.append('name', editedProfile.name.trim());
            formData.append('about', (editedProfile.about || '').trim());
            formData.append('showLastMessageInList', editedProfile.showLastMessageInList ?? true);
            if (selectedImageFile) formData.append('pfp', selectedImageFile);

            const res = await axios.put(
                `${import.meta.env.VITE_API_URL}/user/${user.id}`,
                formData,
                { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
            );

            if (res.status === 200) {
                setProfile(res.data.user);
                setEditedProfile(res.data.user);
                // Update Redux store instead of context setUser
                dispatch(updateUser({
                    name: res.data.user.name,
                    showLastMessageInList: res.data.user.showLastMessageInList,
                    showLastMessage: res.data.user.showLastMessageInList,
                    pfp: res.data.user.pfp,
                }));
                setIsEditing(false);
                setImagePreview('');
                setSelectedImageFile(null);
            }
        } catch (err) {
            console.error('Save failed:', err);
            showNotification('Failed to save changes', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateBackup = async (e) => {
        e.preventDefault();
        const clean = normalizeRecoveryPhrase(backupPassphrase);
        if (clean.length < 6) {
            showNotification('Passphrase must be at least 6 characters', 'error');
            return;
        }
        try {
            setBackingUp(true);
            await dispatch(backupE2EEKeys({ passphrase: clean, user })).unwrap();
            showNotification('E2EE backup key updated successfully!', 'success');
            setBackupPassphrase('');
            setShowBackupForm(false);
        } catch (err) {
            console.error('Backup failed:', err);
            showNotification(err || 'Failed to create E2EE key backup', 'error');
        } finally {
            setBackingUp(false);
        }
    };

    const handleOpenMnemonicModal = () => {
        const generated = generate12WordRecoveryPhrase();
        setGeneratedMnemonic(generated);
        setCopiedPhrase(false);
        setShowMnemonicModal(true);
    };

    const handleRegeneratePhrase = () => {
        const generated = generate12WordRecoveryPhrase();
        setGeneratedMnemonic(generated);
        setCopiedPhrase(false);
    };

    const handleCopyPhrase = () => {
        if (!generatedMnemonic?.phrase) return;
        navigator.clipboard.writeText(generatedMnemonic.phrase);
        setCopiedPhrase(true);
        showNotification('12-word recovery phrase copied to clipboard!', 'success');
        setTimeout(() => setCopiedPhrase(false), 2500);
    };

    const handleDownloadPhrase = () => {
        if (!generatedMnemonic?.phrase) return;
        downloadBackupFile(generatedMnemonic.phrase, user?.username || profile?.username || 'User');
        showNotification('Recovery key file downloaded', 'success');
    };

    const handleSaveMnemonicBackup = async () => {
        if (!generatedMnemonic?.phrase) return;
        try {
            setBackingUp(true);
            await dispatch(backupE2EEKeys({ passphrase: generatedMnemonic.phrase, user })).unwrap();
            showNotification('Recovery phrase activated & backup re-encrypted!', 'success');
            setShowMnemonicModal(false);
            setShowBackupForm(false);
        } catch (err) {
            console.error('Backup failed:', err);
            showNotification(err || 'Failed to activate recovery key', 'error');
        } finally {
            setBackingUp(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 overflow-y-auto animate-fade-in">
            <AppHeader title={"Profile & Settings"}>
                {isOwnProfile && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 active:scale-95 text-slate-800 dark:text-zinc-200 font-medium text-xs sm:text-sm rounded-xl border border-slate-200/60 dark:border-zinc-800/80 transition cursor-pointer"
                    >
                        <Pencil size={13} /> Edit
                    </button>
                )}
            </AppHeader>

            {loading ? <Loading /> :
                <div className="w-full p-4 sm:p-6 md:p-8 space-y-6">
                    {/* Main Identity Card */}
                    <div className="border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative group flex-shrink-0">
                            <div
                                onClick={() => !isEditing && setShowEnlargedImage(true)}
                                className={`w-32 h-32 rounded-full overflow-hidden border-2 border-slate-100 dark:border-zinc-800 shadow-sm ${!isEditing ? 'cursor-zoom-in' : ''}`}
                            >
                                <img
                                    src={imagePreview || getImageUrl(profile.pfp)}
                                    alt={profile.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {isOwnProfile && isEditing && (
                                <>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="pfpInput"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            setSelectedImageFile(file);
                                            setImagePreview(URL.createObjectURL(file));
                                        }}
                                    />
                                    <label
                                        htmlFor="pfpInput"
                                        className="absolute inset-0 bg-black/40 hover:bg-black/50 text-white rounded-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-150"
                                    >
                                        <Camera size={20} />
                                        <span className="text-[10px] font-semibold">Upload</span>
                                    </label>
                                </>
                            )}
                        </div>

                        <div className="text-center sm:text-left min-w-0 flex-1">
                            <h4 className="text-xl font-bold text-slate-800 dark:text-zinc-100 truncate">{profile.name}</h4>
                            <p className="text-sm text-indigo-500 font-semibold mb-3">@{profile.username}</p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-xs text-slate-400 dark:text-zinc-500">
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={13} />
                                    Joined {profile?.createdAt && new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields Card */}
                    <div className="border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/30 rounded-2xl p-6 space-y-5">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-200/60 dark:border-zinc-800 pb-2">Profile Information</h4>

                        {/* Display Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <User size={13} /> Full Name
                            </label>
                            {isOwnProfile && isEditing ? (
                                <input
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
                                    type="text"
                                    placeholder="Enter display name"
                                    value={editedProfile.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            ) : (
                                <p className="text-sm text-slate-800 dark:text-zinc-200 bg-slate-100/60 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800/60 rounded-xl px-4 py-2.5 font-medium">
                                    {profile.name}
                                </p>
                            )}
                        </div>

                        {/* About */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Info size={13} /> About
                            </label>
                            {isOwnProfile && isEditing ? (
                                <textarea
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm resize-none"
                                    rows={3}
                                    placeholder="Write something about yourself..."
                                    value={editedProfile.about || ''}
                                    onChange={(e) => handleChange('about', e.target.value)}
                                />
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-zinc-300 bg-slate-100/60 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800/60 rounded-xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed">
                                    {profile.about || 'FlashChat User'}
                                </p>
                            )}
                        </div>

                        {/* Read-only details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><User size={13} /> Username</label>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 bg-slate-100/40 dark:bg-zinc-900/30 border border-slate-200/50 dark:border-zinc-800/60 rounded-xl px-4 py-2.5 font-medium cursor-not-allowed">@{profile.username}</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Mail size={13} /> Email Address</label>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 bg-slate-100/40 dark:bg-zinc-900/30 border border-slate-200/50 dark:border-zinc-800/60 rounded-xl px-4 py-2.5 font-medium cursor-not-allowed truncate">{profile.email || 'Private'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Privacy & Settings Card */}
                    {isOwnProfile && (
                        <div className="border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/30 rounded-2xl p-6 space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-200/60 dark:border-zinc-800 pb-2">Privacy & Account Options</h4>

                            <div className="flex items-center justify-between gap-4 py-1">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                        <ShieldCheck size={15} className="text-indigo-500" /> Show Last Message in Chat List
                                    </label>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md">
                                        Toggle to show or hide your latest messages in the chat sidebar.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        disabled={!isEditing}
                                        className="sr-only peer"
                                        checked={editedProfile.showLastMessageInList ?? true}
                                        onChange={(e) => handleChange('showLastMessageInList', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-zinc-400 dark:after:border-zinc-600 peer-checked:bg-indigo-500 rounded-full transition-all duration-200"></div>
                                </label>
                            </div>

                            <div onClick={() => navigate(ACCOUNT_ROUTES.contacts)} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 bg-slate-100/40 dark:bg-zinc-900/40 hover:bg-slate-100/80 dark:hover:bg-zinc-900/70 transition cursor-pointer">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Manage Contacts</p>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">View sent or pending friend requests and manage list</p>
                                </div>
                                <i className="fa-solid fa-chevron-right text-xs text-slate-400" />
                            </div>

                            <div onClick={() => navigate(SETTINGS_ROUTES.linkedDevices)} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 bg-slate-100/40 dark:bg-zinc-900/40 hover:bg-slate-100/80 dark:hover:bg-zinc-900/70 transition cursor-pointer">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Linked Devices</p>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-500">Manage other browser sessions and devices signed into this account</p>
                                </div>
                                <MonitorSmartphone size={16} className="text-slate-400 dark:text-zinc-500" />
                            </div>

                            <div onClick={() => navigate(SETTINGS_ROUTES.updateHistory)} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 bg-slate-100/40 dark:bg-zinc-900/40 hover:bg-slate-100/80 dark:hover:bg-zinc-900/70 transition cursor-pointer">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Update History</p>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-500">View FlashChat release notes and version changelog</p>
                                </div>
                                <History size={16} className="text-slate-400 dark:text-zinc-500" />
                            </div>
                        </div>
                    )}

                    {/* E2EE Backup & Key Recovery Card */}
                    {isOwnProfile && (
                        <div className="border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/30 rounded-2xl p-6 space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase">
                                        End-to-End Encryption Backup
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                                        Zero-knowledge recovery to decrypt message history across logins
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                                    user.encryptedPrivateKey
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                }`}>
                                    <Lock size={10} />
                                    {user.encryptedPrivateKey ? "Active & Sealed" : "Unbacked"}
                                </span>
                            </div>
                            
                            {user.encryptedPrivateKey ? (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3.5 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-400">
                                        <div className="h-5 w-5 mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Zero-Knowledge Backup Active</p>
                                            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                                                Your private E2EE key is encrypted and stored safely on the server. If you log in on a new device, entering your 12-word recovery key restores your chat history.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rotation and Update Options */}
                                    <div className="flex items-center gap-3 flex-wrap pt-1">
                                        <button 
                                            type="button"
                                            onClick={handleOpenMnemonicModal}
                                            className="px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <RotateCcw size={13} /> Rotate Recovery Key (12 Words)
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setShowBackupForm(!showBackupForm)}
                                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition cursor-pointer"
                                        >
                                            {showBackupForm ? "Hide Form" : "Custom Passphrase"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3.5 p-4 rounded-xl border border-amber-100 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5 text-amber-800 dark:text-amber-400">
                                        <div className="h-5 w-5 mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            <ShieldAlert size={16} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">No Recovery Backup Found</p>
                                            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                                                If you log out or clear your browser cache, older messages will be unreadable on new sessions because your private key only exists in this browser.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-wrap">
                                        <button 
                                            type="button"
                                            onClick={handleOpenMnemonicModal}
                                            className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-500/15 transition flex items-center gap-2 cursor-pointer"
                                        >
                                            <Sparkles size={14} /> Generate 12-Word Recovery Key
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setShowBackupForm(!showBackupForm)}
                                            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition cursor-pointer"
                                        >
                                            Use Custom Passphrase
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Custom Backup Form */}
                            {showBackupForm && (
                                <form onSubmit={handleCreateBackup} className="space-y-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60 animate-fade-in">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                            <Key size={13} /> Custom Security Passphrase
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showBackupPass ? "text" : "password"}
                                                placeholder="Enter at least 6 characters"
                                                value={backupPassphrase}
                                                onChange={(e) => setBackupPassphrase(e.target.value)}
                                                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
                                                required
                                                minLength={6}
                                                disabled={backingUp}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowBackupPass(!showBackupPass)}
                                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
                                            >
                                                {showBackupPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={backingUp || backupPassphrase.length < 6}
                                        className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/15 active:scale-[0.98] transition-all duration-150 flex items-center justify-center text-sm disabled:opacity-50 cursor-pointer"
                                    >
                                        {backingUp ? (
                                            <>
                                                <RefreshCw className="animate-spin mr-2 h-4 w-4" /> Saving Backup...
                                            </>
                                        ) : (
                                            user.encryptedPrivateKey ? "Update Backup Passphrase" : "Save Backup Passphrase"
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Active Session & Log Out */}
                    {isOwnProfile && (
                        <div className="border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                    {isMobileDevice() ? <Smartphone size={20} /> : <Laptop size={20} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200">
                                            {getDetectedBrowser()} on {getDetectedOS()}
                                        </p>
                                        {currentSession?.ip && (
                                            <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                                                ({currentSession.ip})
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                        Current Session • Signed in as @{profile.username}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-xs rounded-xl border border-rose-200/60 dark:border-rose-900/50 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 flex-shrink-0"
                            >
                                {loggingOut ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin" />
                                        <span>Signing out...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogOut size={13} />
                                        <span>Log Out</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Edit Mode Actions */}
                    {isEditing && (
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <button onClick={handleCancel} disabled={saving} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-semibold transition">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition shadow-md shadow-indigo-500/10 flex items-center justify-center">
                                {saving ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            }

            {/* Enlarged Image Overlay */}
            {showEnlargedImage && (
                <div onClick={() => setShowEnlargedImage(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in">
                    <div onClick={(e) => e.stopPropagation()} className="relative bg-white dark:bg-zinc-900 p-3 rounded-2xl max-w-lg w-full shadow-2xl animate-scale-in">
                        <button onClick={() => setShowEnlargedImage(false)} className="absolute top-4 right-4 text-white bg-black/50 hover:bg-red-500 hover:text-white transition p-1.5 rounded-full z-10 cursor-pointer">
                            <X className="w-4 h-4" />
                        </button>
                        <img src={getImageUrl(profile.pfp)} alt="Enlarged avatar" className="w-full h-auto max-h-[70vh] object-contain rounded-xl" />
                    </div>
                </div>
            )}

            {/* 12-Word Recovery Key Modal */}
            {showMnemonicModal && generatedMnemonic && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-fade-in overflow-y-auto">
                    <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-5 sm:p-7 space-y-4 sm:space-y-5 animate-scale-in text-slate-800 dark:text-zinc-100 max-h-[92vh] overflow-y-auto my-auto">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center flex-shrink-0">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                                        12-Word Recovery Key
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                        Zero-Knowledge E2EE Key Backup
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => !backingUp && setShowMnemonicModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 rounded-lg transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Description */}
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 dark:bg-amber-500/10 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                            <span className="font-bold">Important:</span> Write down or save these 12 words in a safe place. You will need them to decrypt your message history when logging in on other browsers or devices. FlashChat cannot recover this key for you.
                        </div>

                        {/* Words Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-zinc-950/80 p-3.5 rounded-2xl border border-slate-200/70 dark:border-zinc-800/80">
                            {generatedMnemonic.words.map((word, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl shadow-xs"
                                >
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 w-4 select-none">
                                        {idx + 1}.
                                    </span>
                                    <span className="text-xs font-mono font-semibold text-slate-800 dark:text-zinc-200 tracking-wide">
                                        {word}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Action buttons (Copy, Download, Regenerate) */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopyPhrase}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    {copiedPhrase ? (
                                        <>
                                            <Check size={13} className="text-emerald-500" />
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={13} />
                                            <span>Copy Phrase</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadPhrase}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Download size={13} />
                                    <span>Download .txt</span>
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleRegeneratePhrase}
                                title="Regenerate 12 Words"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition cursor-pointer"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>

                        {/* Footer confirmation */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                disabled={backingUp}
                                onClick={() => setShowMnemonicModal(false)}
                                className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={backingUp}
                                onClick={handleSaveMnemonicBackup}
                                className="w-2/3 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-500/15 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {backingUp ? (
                                    <>
                                        <RefreshCw className="animate-spin h-3.5 w-3.5" />
                                        <span>Sealing Backup...</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock size={13} />
                                        <span>Activate & Seal Backup</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
