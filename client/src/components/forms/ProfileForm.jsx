import React, { useState, useRef } from 'react';
import axios from 'axios';

const ProfileForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    pfp: 'uploads/pfps/default-pfp.jpeg', // replace with actual path or blob url
  });

  const [editable, setEditable] = useState({
    name: false,
    email: false,
  });

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFieldClick = (field) => {
    setEditable((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (field, value) => {
    setUser((prev) => ({ ...prev, [field]: value }));
    setIsEdited(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const imageUrl = URL.createObjectURL(file);
      setUser((prev) => ({ ...prev, pfp: imageUrl }));
      setIsEdited(true);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const formData = new FormData();
      formData.append('name', user.name);
      formData.append('email', user.email);
      if (selectedFile) {
        formData.append('pfp', selectedFile);
      }

      // Replace the URL with your actual API endpoint
      const response = await axios.patch('/api/user/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // console.log('User updated:', response.data);
      setIsEdited(false);
      setEditable({ name: false, email: false });
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto mt-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white px-4 py-2 rounded-md w-full text-left"
      >
        Edit Profile ▼
      </button>

      {isOpen && (
        <div className="bg-white shadow-lg rounded-md mt-2 p-4 space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <img
              src={user.pfp}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover cursor-pointer"
              onClick={() => fileInputRef.current.click()}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="hidden"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-zinc-700">Name</label>
              <input
                type="text"
                value={user.name}
                disabled={!editable.name}
                onClick={() => handleFieldClick('name')}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full p-2 rounded-md border ${
                  editable.name ? 'border-blue-500' : 'border-zinc-300'
                } focus:outline-none`}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-700">Email</label>
              <input
                type="email"
                value={user.email}
                disabled={!editable.email}
                onClick={() => handleFieldClick('email')}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full p-2 rounded-md border ${
                  editable.email ? 'border-blue-500' : 'border-zinc-300'
                } focus:outline-none`}
              />
            </div>
          </div>

          {isEdited && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 text-white px-4 py-2 rounded-md w-full flex items-center justify-center"
            >
              {isSaving ? 'Saving...' : '✅ Save Changes'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileForm;
