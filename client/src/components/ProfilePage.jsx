import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../utils/imageUtils';
import { Pencil, X, Check } from 'lucide-react';

export default function ProfilePage({ edit = false }) {
    const [profile, setProfile] = useState({});
    const [editedProfile, setEditedProfile] = useState({});
    const [editingField, setEditingField] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showEnlargedImage, setShowEnlargedImage] = useState(false);
    const { user } = useAuth();
    const { id } = useParams();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const path = `${import.meta.env.VITE_API_URL}/user/${edit ? user.id : id}`;
                const res = await axios.get(path, { withCredentials: true });
                setProfile(res.data.user);
                setEditedProfile(res.data.user);
            } catch (err) {
                console.error("Failed to load profile:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [edit, id, user]);

    const handleEditClick = (field) => setEditingField(field);

    const handleCancel = () => {
        setEditedProfile({ ...profile });
        setEditingField(null);
        setHasChanges(false);
    };

    const handleChange = (field, value) => {
        setEditedProfile(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/user/${user.id}`, editedProfile, {
                withCredentials: true,
            });
            if (res.status === 200) {
                setProfile(res.data.user);
                setEditingField(null);
                setHasChanges(false);
            }
        } catch (err) {
            console.error("Save failed:", err);
        }
    };

    const FieldRow = ({ label, field, editable = true, specialButton = null }) => (
        <div className="flex flex-col gap-2 relative">
            <p className="fields dark:text-zinc-400">{label}</p>
            {editingField === field ? (
                <div className="flex items-center gap-2">
                    <input
                        className="text-sm bg-transparent border-b px-2 py-1 border-zinc-300 dark:border-zinc-700 outline-none dark:text-white"
                        autoFocus
                        value={editedProfile[field] || ''}
                        onChange={(e) => handleChange(field, e.target.value)}
                    />
                    <button onClick={handleSave}><Check size={18} className="text-green-500" /></button>
                    <button onClick={handleCancel}><X size={18} className="text-red-400" /></button>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-sm dark:text-zinc-300">
                    <p>{profile[field]}</p>
                    {edit && editable && (
                        <Pencil size={16} className="cursor-pointer text-zinc-500" onClick={() => handleEditClick(field)} />
                    )}
                    {specialButton}
                </div>
            )}
        </div>
    );

    return (
        <div className="ProfilePage flex-1 p-10 flex flex-col w-full h-full dark:bg-zinc-950">
            <div className="grid grid-cols-3 dark:text-white rounded-xl overflow-hidden text-zinc-700">
                {/* Left Side Avatar */}
                <div className="flex flex-col col-span-1 justify-center dark:bg-zinc-900 items-center gap-4" onClick={() => setShowEnlargedImage(true)}>
                    <img src={getImageUrl(profile.pfp)} alt="profile" className="w-40 h-40 rounded-full object-cover" />
                    {edit && <button className="dark:text-zinc-500 text-sm">Edit Image</button>}
                </div>

                {/* Right Side Fields */}
                <div className="col-span-2 flex flex-col p-5 dark:bg-zinc-900 gap-5">
                    <FieldRow label="Name" field="name" editable={edit} />
                    <FieldRow label="Username" field="username" editable={false} />
                    <FieldRow
                        label="Email"
                        field="email"
                        editable={false}
                        specialButton={edit && (
                            <button
                                onClick={() => alert('Handle email change in next step')}
                                className="text-xs px-2 py-1 rounded bg-neutral-600 text-white hover:bg-neutral-700"
                            >
                                Change
                            </button>
                        )}
                    />
                </div>
            </div>

            {/* About Section */}
            <div className="mt-6 flex flex-col dark:text-white text-zinc-800">
                <p className="fields dark:text-zinc-400 mb-2">About</p>
                {editingField === 'about' ? (
                    <div className="flex flex-col gap-2">
                        <textarea
                            className="bg-transparent border px-3 py-2 dark:border-zinc-600 border-zinc-300 rounded-md resize-none dark:text-white"
                            rows={4}
                            autoFocus
                            value={editedProfile.about || ''}
                            onChange={(e) => handleChange('about', e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSave}><Check size={18} className="text-green-500" /></button>
                            <button onClick={handleCancel}><X size={18} className="text-red-400" /></button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-2 text-sm dark:text-zinc-300">
                        <p>{profile.about || 'No about info'}</p>
                        {edit && <Pencil size={16} className="cursor-pointer text-zinc-500" onClick={() => handleEditClick('about')} />}
                    </div>
                )}
            </div>

            {/* Show Last Message Setting */}
            <div className="mt-6 flex flex-col dark:text-white text-zinc-800 gap-1">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="fields dark:text-zinc-400 mb-1">Show Last Message in Chat List</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Toggle to show or hide your latest message on chat list (helps maintain privacy when disabled).
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-2">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!editedProfile.showLastMessageInList}
                            onChange={(e) => handleChange('showLastMessageInList', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 dark:peer-focus:ring-zinc-800 rounded-full peer dark:bg-gray-600 peer-checked:bg-blue-700 transition duration-200"></div>
                        <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 peer-checked:translate-x-5"></span>
                    </label>
                </div>
            </div>

            {/* Save All Changes Button */}
            {hasChanges && (
                <div className="mt-6 self-end">
                    <button
                        onClick={handleSave}
                        className="bg-green-700 text-sm text-white px-4 py-2 rounded hover:bg-green-800"
                    >
                        Save All Changes
                    </button>
                </div>
            )}

            {/* Enlarged Image View */}
            {showEnlargedImage && (
                <div
                    onClick={() => setShowEnlargedImage(false)}
                    className="overlay grid place-items-center absolute w-full h-full top-0 left-0 z-50 bg-black/60"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative dark:bg-zinc-700 p-6 rounded-xl max-w-[50dvw] max-h-[90dvh]"
                    >
                        <button
                            onClick={() => setShowEnlargedImage(false)}
                            className="absolute top-4 right-4 text-white hover:text-red-400"
                        >
                            Close
                        </button>
                        <img src={getImageUrl(profile.pfp)} alt="Enlarged profile" className="w-full h-auto max-h-[70vh] object-contain" />
                    </div>
                </div>
            )}
        </div>
    );
}
