import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import useDebounce from '../../hooks/useDebounce';
import { useAuth } from '../../hooks/AuthContext';
import { useNotification } from '../../hooks/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function UserNameForm({ showForm, setShowForm, credentialResponse }) {
  const {
    register,
    handleSubmit,
    formState: {
      isValid
    },
    reset,
    formState: { errors },
    setValue,
    watch
  } = useForm();

  const [checkingUsername, setCheckingUsername] = useState(false);
  const { setUser } = useAuth();
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [username, setUsername] = useState("");
  const debouncedUsername = useDebounce(username, 500);

  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/google`, { token: credentialResponse.credential, username: data.username }, { withCredentials: true });
      if (response.status === 201) {
        // Actually 201 signs that the user is registered for the first time by Google Auth and also 
        // logged in (
        setUser(response.data.user)
        navigate('/chats')
        showNotification("success", "Login Successful!");
      }
    } catch (error) {
      showNotification("error", "Something went wrong!");
    }
  };

  useEffect(() => {
    if (showForm) {
      reset();
      setUsername("");
      setUsernameAvailable(null);
    }
  }, [showForm]);

  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || errors.username) {
        setUsernameAvailable(null);
        return;
      }

      try {
        setCheckingUsername(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/check-username/${debouncedUsername}`);
        setUsernameAvailable(res.data.available);
      } catch (err) {
        console.error("Username check error:", err);
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, errors.username]);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(value);
    setValue("username", value, { shouldValidate: true });
  };

  return (
    <div className={`flex-col items-center w-full h-[calc(100%-60px)] fixed ${showForm ? 'flex' : 'hidden'} bg-white dark:bg-black z-100`}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`UserNameForm w-[90%] rounded-lg max-w-200 h-auto p-4 dark:bg-gray-800 flex top-[${showForm ? '60px' : '-500px'}] flex-col gap-5 fixed transition-all items-center duration-300`}
      >
        <h2 className='text-xl dark:text-white'>Enter Your Username</h2>

        <div className="tag-info text-primary-1 bg-primary-3 p-4 rounded-lg w-full">
          <p className="info-tag-content text-sm">
            Username is a unique value through which you are identified on this platform. Since you are using Google Authentication, please enter your Username.
          </p>
        </div>

        <div className="form-field lg:justify-center flex flex-col justify-start gap-2 w-full lg:flex-row relative">
          <div className="relative w-full lg:w-100">
            <input
              className="py-3 focus:outline-1 w-full dark:bg-gray-950 outline-primary rounded-md bg-gray-100 px-5 dark:text-white pr-10"
              type="text"
              placeholder="Enter Username"
              value={username}
              {...register("username", {
                required: "Username is required",
                pattern: {
                  value: /^[a-z0-9_-]+$/,
                  message: "Only lowercase letters, numbers, _ and - allowed"
                }
              })}
              onChange={handleUsernameChange}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checkingUsername ? (
                <div className="w-4 h-4 border-2 border-primary-1 border-t-transparent rounded-full animate-spin"></div>
              ) : usernameAvailable === true ? (
                <span className="text-green-500 text-xl"><i className="fa-circle-check fas"></i></span>
              ) : usernameAvailable === false ? (
                <span className="text-red-500 text-xl"><i className="fa-circle-xmark fas"></i></span>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={checkingUsername || usernameAvailable === false || !isValid}
            className="bg-primary-1 px-20 py-3 text-white rounded-md hover:bg-primary transition disabled:opacity-50"
          >
            Continue
          </button>
        </div>

        {errors.username && (
          <p className="text-red-500 text-sm">{errors.username.message}</p>
        )}
      </form>
    </div>
  );
}
