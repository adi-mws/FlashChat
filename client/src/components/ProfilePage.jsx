import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../utils/imageUtils';
import { useNotification } from '../hooks/NotificationContext';
import { Pencil, X, Check, ArrowLeft, Camera, Calendar, Mail, User, Info, ShieldCheck } from 'lucide-react';

export default function ProfilePage({ edit = false }) {
    const [profile, setProfile] = useState({});
    const [editedProfile, setEditedProfile] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showEnlargedImage, setShowEnlargedImage] = useState(false);
    const { user, setUser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const isOwnProfile = edit || (user && user.id === id);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const targetId = isOwnProfile ? user?.id : id;
                if (!targetId) return;

                const path = `${import.meta.env.VITE_API_URL}/user/${targetId}`;
                const res = await axios.get(path, { withCredentials: true });
                setProfile(res.data.user);
                setEditedProfile(res.data.user);
            } catch (err) {
                console.error("Failed to load profile:", err);
                showNotification("Failed to load profile", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [edit, id, user, isOwnProfile]);

    const handleCancel = () => {
        setEditedProfile({ ...profile });
        setIsEditing(false);
        setImagePreview("");
        setSelectedImageFile(null);
    };

    const handleChange = (field, value) => {
        setEditedProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!editedProfile.name?.trim()) {
            showNotification("Name cannot be empty", "error");
            return;
        }

        try {
            setSaving(true);
            const formData = new FormData();
            formData.append("name", editedProfile.name.trim());
            formData.append("about", (editedProfile.about || "").trim());
            formData.append("showLastMessageInList", editedProfile.showLastMessageInList ?? true);

            if (selectedImageFile) {
                formData.append("pfp", selectedImageFile);
            }

            const res = await axios.put(
                `${import.meta.env.VITE_API_URL}/user/${user.id}`,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (res.status === 200) {
                setProfile(res.data.user);
                setEditedProfile(res.data.user);
                setUser((prev) => ({
                    ...prev,
                    name: res.data.user.name,
                    showLastMessageInList: res.data.user.showLastMessageInList,
                    showLastMessage: res.data.user.showLastMessageInList,
                    pfp: res.data.user.pfp,
                }));
                setIsEditing(false);
                setImagePreview("");
                setSelectedImageFile(null);
                showNotification("Profile updated successfully", "success");
            }
        } catch (err) {
            console.error("Save failed:", err);
            showNotification("Failed to save changes", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/40 p-8">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-zinc-950/40 overflow-y-auto animate-fade-in relative">
            
            {/* Header Navigation */}
            <div className="h-[64px] flex items-center px-4 py-2 sm:px-8 border-b border-slate-200/50 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md sticky top-0 z-10 justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
                        title="Go Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                </div>

                {isOwnProfile && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 py-1.5 px-3.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-medium text-xs rounded-xl shadow-sm transition"
                    >
                        <Pencil size={13} /> Edit Profile
                    </button>
                )}
            </div>

            {/* Profile Content Container */}
            <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
                
                {/* Main Identity Card */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                    
                    {/* Profile Picture */}
                    <div className="relative group flex-shrink-0">
                        <div 
                            onClick={() => !isEditing && setShowEnlargedImage(true)}
                            className={`w-32 h-32 rounded-full overflow-hidden border-2 border-slate-100 dark:border-zinc-800 shadow-sm ${!isEditing ? "cursor-zoom-in" : ""}`}
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

                    {/* Quick Metadata */}
                    <div className="text-center sm:text-left min-w-0 flex-1">
                        <h4 className="text-xl font-bold text-slate-800 dark:text-zinc-100 truncate">
                            {profile.name}
                        </h4>
                        <p className="text-sm text-indigo-500 font-semibold mb-3">
                            @{profile.username}
                        </p>
                        
                        <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-xs text-slate-400 dark:text-zinc-500">
                            <span className="flex items-center gap-1.5">
                                <Calendar size={13} />
                                Joined {profile?.createdAt && new Date(profile.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Fields Card */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-100 dark:border-zinc-800 pb-2">
                        Profile Information
                    </h4>

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
                                value={editedProfile.name || ""}
                                onChange={(e) => handleChange("name", e.target.value)}
                            />
                        ) : (
                            <p className="text-sm text-slate-800 dark:text-zinc-200 bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-900 rounded-xl px-4 py-2.5 font-medium">
                                {profile.name}
                            </p>
                        )}
                    </div>

                    {/* About Section */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Info size={13} /> About
                        </label>
                        {isOwnProfile && isEditing ? (
                            <textarea
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm resize-none"
                                rows={3}
                                placeholder="Write something about yourself..."
                                value={editedProfile.about || ""}
                                onChange={(e) => handleChange("about", e.target.value)}
                            />
                        ) : (
                            <p className="text-sm text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-900 rounded-xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed">
                                {profile.about || "FlashChat User"}
                            </p>
                        )}
                    </div>

                    {/* Read-only details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <User size={13} /> Username
                            </label>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 bg-slate-100/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-900 rounded-xl px-4 py-2.5 font-medium cursor-not-allowed">
                                @{profile.username}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Mail size={13} /> Email Address
                            </label>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 bg-slate-100/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-900 rounded-xl px-4 py-2.5 font-medium cursor-not-allowed truncate">
                                {profile.email || "Private"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Privacy & Settings Card (Visible only on own profile) */}
                {isOwnProfile && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-100 dark:border-zinc-800 pb-2">
                            Privacy & Account Options
                        </h4>

                        <div className="flex items-center justify-between gap-4 py-1">
                            <div className="space-y-0.5">
                                <label className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                    <ShieldCheck size={15} className="text-indigo-500" /> Show Last Message in Chat List
                                </label>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md">
                                    Toggle to show or hide your latest messages in the chat sidebar. Handy for keeping notifications private.
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

                        {/* Contacts view link */}
                        <div 
                            onClick={() => navigate('/chats/contacts')}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 hover:bg-slate-100/50 dark:hover:bg-zinc-950/60 transition cursor-pointer"
                        >
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Manage Contacts</p>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                    View sent or pending friend requests and manage list
                                </p>
                            </div>
                            <i className="fa-solid fa-chevron-right text-xs text-slate-400" />
                        </div>
                    </div>
                )}

                {/* Edit Mode Actions Block */}
                {isEditing && (
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 text-sm font-semibold transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition shadow-md shadow-indigo-500/10 flex items-center justify-center"
                        >
                            {saving ? "Saving Changes..." : "Save Changes"}
                        </button>
                    </div>
                )}
            </div>

            {/* Enlarged Image Overlay Modal */}
            {showEnlargedImage && (
                <div
                    onClick={() => setShowEnlargedImage(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative bg-white dark:bg-zinc-900 p-3 rounded-2xl max-w-lg w-full shadow-2xl animate-scale-in"
                    >
                        <button
                            onClick={() => setShowEnlargedImage(false)}
                            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-red-500 hover:text-white transition p-1.5 rounded-full z-10"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <img
                            src={getImageUrl(profile.pfp)}
                            alt="Enlarged avatar"
                            className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
