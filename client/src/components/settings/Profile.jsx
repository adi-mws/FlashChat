import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, updateUser, backupE2EEKeys } from '../../redux/slices/authSlice';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../../lib/imageUtils';
import { useNotification } from '../../hooks/useNotification';
import { Pencil, X, Check, ArrowLeft, Camera, Calendar, Mail, User, Info, ShieldCheck, MonitorSmartphone, History, CheckCircle2, ShieldAlert, Key, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { ACCOUNT_ROUTES, SETTINGS_ROUTES } from '../../../routes/routes';
import AppHeader from '../layout/AppHeader';
import Loading from '../global/Loading';

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

    const isOwnProfile = edit || targetUserId === user?.id || (!targetUserId && chatId === user?.id);

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
        if (backupPassphrase.length < 6) {
            showNotification('Passphrase must be at least 6 characters', 'error');
            return;
        }
        try {
            setBackingUp(true);
            await dispatch(backupE2EEKeys({ passphrase: backupPassphrase, user })).unwrap();
            showNotification('E2EE private key backed up successfully!', 'success');
            setBackupPassphrase('');
            setShowBackupForm(false);
        } catch (err) {
            console.error('Backup failed:', err);
            showNotification(err || 'Failed to create E2EE key backup', 'error');
        } finally {
            setBackingUp(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-zinc-950/40 overflow-y-auto animate-fade-in">
            <AppHeader title={"Profile & Settings"}>
                {isOwnProfile && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 py-1.5 px-3.5 dark:bg-zinc-950 active:scale-95 text-white font-medium text-sm rounded-xl shadow-sm transition"
                    >
                        <Pencil size={13} /> Edit
                    </button>
                )}
            </AppHeader>

            {loading ? <Loading /> :
                <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
                    {/* Main Identity Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
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
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-100 dark:border-zinc-800 pb-2">Profile Information</h4>

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
                                <p className="text-sm text-slate-800 dark:text-zinc-200 bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-900 rounded-xl px-4 py-2.5 font-medium">
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
                                <p className="text-sm text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-900 rounded-xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed">
                                    {profile.about || 'FlashChat User'}
                                </p>
                            )}
                        </div>

                        {/* Read-only details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><User size={13} /> Username</label>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 bg-slate-100/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-900 rounded-xl px-4 py-2.5 font-medium cursor-not-allowed">@{profile.username}</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Mail size={13} /> Email Address</label>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 bg-slate-100/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-900 rounded-xl px-4 py-2.5 font-medium cursor-not-allowed truncate">{profile.email || 'Private'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Privacy & Settings Card */}
                    {isOwnProfile && (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-100 dark:border-zinc-800 pb-2">Privacy & Account Options</h4>

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

                            <div onClick={() => navigate(ACCOUNT_ROUTES.contacts)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 hover:bg-slate-100/50 dark:hover:bg-zinc-950/60 transition cursor-pointer">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Manage Contacts</p>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">View sent or pending friend requests and manage list</p>
                                </div>
                                <i className="fa-solid fa-chevron-right text-xs text-slate-400" />
                            </div>

                            <div onClick={() => navigate(SETTINGS_ROUTES.linkedDevices)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 hover:bg-slate-100/50 dark:hover:bg-zinc-950/60 transition cursor-pointer">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Linked Devices</p>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-500">Manage other browser sessions and devices signed into this account</p>
                                </div>
                                <MonitorSmartphone size={16} className="text-slate-400 dark:text-zinc-500" />
                            </div>

                            <div onClick={() => navigate(SETTINGS_ROUTES.updateHistory)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 hover:bg-slate-100/50 dark:hover:bg-zinc-950/60 transition cursor-pointer">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Update History</p>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-500">View FlashChat release notes and version changelog</p>
                                </div>
                                <History size={16} className="text-slate-400 dark:text-zinc-500" />
                            </div>
                        </div>
                    )}

                    {/* E2EE Backup Card */}
                    {isOwnProfile && (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-100 dark:border-zinc-800 pb-2">End-to-End Encryption Backup</h4>
                            
                            {user.encryptedPrivateKey ? (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3.5 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-400">
                                        <div className="h-5 w-5 mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Secure backup is active</p>
                                            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                                                Your private E2EE key is encrypted and stored safely on the server. You can log in on secondary devices and sync your messages by entering your security passphrase.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Option to change passphrase */}
                                    <div className="pt-2">
                                        <button 
                                            onClick={() => setShowBackupForm(!showBackupForm)}
                                            className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition cursor-pointer"
                                        >
                                            {showBackupForm ? "Hide Form" : "Change Passphrase / Update Backup"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3.5 p-4 rounded-xl border border-amber-100 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5 text-amber-800 dark:text-amber-400">
                                        <div className="h-5 w-5 mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            <ShieldAlert size={16} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Backup is missing</p>
                                            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                                                If you log in on another device (such as your phone), you will not be able to decrypt past messages because your private key only exists locally in this browser.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                                        Create a secure, zero-knowledge backup by setting a security passphrase. The server will never know your passphrase or your unencrypted private key.
                                    </p>
                                </div>
                            )}

                            {/* Backup Form */}
                            {(showBackupForm || !user.encryptedPrivateKey) && (
                                <form onSubmit={handleCreateBackup} className="space-y-4 pt-2 border-t border-slate-50 dark:border-zinc-800/40">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                            <Key size={13} /> Set Security Passphrase
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showBackupPass ? "text" : "password"}
                                                placeholder="Choose a strong security passphrase"
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
                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal">
                                            Passphrase must be at least 6 characters. Store this securely; if lost, your backup is unrecoverable.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={backingUp || backupPassphrase.length < 6}
                                        className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/15 active:scale-[0.98] transition-all duration-150 flex items-center justify-center text-sm disabled:opacity-50 cursor-pointer"
                                    >
                                        {backingUp ? (
                                            <>
                                                <RefreshCw className="animate-spin mr-2 h-4 w-4" /> Creating Backup...
                                            </>
                                        ) : (
                                            user.encryptedPrivateKey ? "Update Secure Backup" : "Enable Secure Backup"
                                        )}
                                    </button>
                                </form>
                            )}
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
                        <button onClick={() => setShowEnlargedImage(false)} className="absolute top-4 right-4 text-white bg-black/50 hover:bg-red-500 hover:text-white transition p-1.5 rounded-full z-10">
                            <X className="w-4 h-4" />
                        </button>
                        <img src={getImageUrl(profile.pfp)} alt="Enlarged avatar" className="w-full h-auto max-h-[70vh] object-contain rounded-xl" />
                    </div>
                </div>
            )}
        </div>
    );
}
