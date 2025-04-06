import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNotification } from "../../hooks/NotificationContext";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { useTheme } from "../../hooks/ThemeContext";
import UserNameForm from "./UserNameForm";
export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "onChange" });
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [googleCredentialResponse, setGoogleCredentialResponse] = useState({});
  const { showNotification } = useNotification();
  const { setUser, setLoading } = useAuth();

  const manualLogin = async (data) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        data,
        { withCredentials: true }
      );

      if (response.status === 200) {
        setUser(response.data.user);
        showNotification("success", response.data.message);
        setLoading(false);
        navigate('/chats');
      }
    } catch (error) {
      console.error("Login failed:", error);
      showNotification(
        "error",
        error.response?.data?.message ?? "Internal Server Error"
      );
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleCredentialResponse(credentialResponse)
    console.log("Google Login Success:", credentialResponse);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/google-check`, { token: credentialResponse.credential }, { withCredentials: true });
      if (response.status === 200) {
        console.log('Pre auth response = ', response.data);
        if (response.data.available) {
          try {
            const r = await axios.post(
              `${import.meta.env.VITE_API_URL}/auth/google`,
              { token: credentialResponse.credential, available: response.data.available },
              { withCredentials: true }
            );

            if (r.status === 200) {
              const user = r.data.user;
              user.name = user.username;
              delete user['username']
              setUser(user);
              showNotification("success", "Login Successful!");
              navigate('/chats')
            } else {
              showNotification("error", "Failed to login");
            }
          } catch (error) {
            console.error("Google Auth API Error:", error);
            showNotification("error", "Authentication failed!");
          }
        } else {
          setShowUsernameForm(true);
        }
      }
    } catch (error) {
      showNotification("error", "Something went wrong!");
    }

  };

  const handleGoogleFailure = () => {
    console.error("Google Login Failed");
    showNotification("error", "Google Login Failed");
  };

  const onSubmit = async (data) => {
    manualLogin(data);
  };

  return (
    <div className="gap-10 w-full flex flex-col items-center justify-center p-5 dark:bg-black">
      <div className="flex align-items flex-col justify-center text-center gap-2">
        <h2 className="dark:text-white text-2xl font-bold">Welcome Back!</h2>
        <p className="dark:text-gray-300 text-gray-600 text-sm">
          Login and start chatting with your dear ones!
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="gap-5 text-sm flex flex-col bg-gray-50 p-7 rounded-lg dark:bg-gray-900"
      >
        <div className="form-group flex gap-2  flex-col">
          <label className="dark:text-white">Username</label>
          <input
            className="py-3 focus:outline-1 w-60 xs:w-70 dark:bg-gray-950 outline-primary rounded-md bg-gray-100 px-5 dark:text-white"
            type="text"
            placeholder="Enter Username"
            {...register("username", {
              required: "Username is required",
              pattern: {
                value: /^[a-z0-9_-]+$/,
                message: "Only lowercase letters, numbers, _ and - allowed"
              }
            })}
          />
          {errors.username && (
            <p className="text-red-500 text-xs">{errors.username.message}</p>
          )}
        </div>

        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">Password</label>
          <input
            className="py-3 w-60 xs:w-70 focus:outline-1 outline-primary rounded-md bg-gray-100 px-5 dark:text-white dark:bg-gray-950"
            placeholder="Enter Password"
            type="password"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && (
            <p className="text-red-500 text-xs">{errors.password.message}</p>
          )}
        </div>

        <Link
          className="text-xs text-primary font-bold"
          to={"/forgot-password"}
        >
          Forgot Password?
        </Link>

        <div className="flex justify-center bg-neutral-800 google-login-button-container rounded-md">
          <GoogleLogin size='large' text="continue_with" theme={`${theme === 'dark' ? 'filled_black' : 'outline'}`}
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFailure}
          />
        </div>

        <button
          type="submit"
          className="py-2 rounded-md bg-primary-1 hover:bg-primary transition duration-300 text-white flex items-center justify-center"
        >
          Login {isSubmitting && (
            <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3 h-3 border-t-transparent"></span>
          )}
        </button>

        <Link
          to="/register"
          className="text-center dark:text-white hover:underline transition duration-300"
        >
          New Here? Create Your Account
        </Link>
      </form>
      <UserNameForm setShowForm={setShowUsernameForm} showForm={showUsernameForm} credentialResponse={googleCredentialResponse}/>
    </div>
  );
}
