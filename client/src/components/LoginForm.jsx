import React from "react";
import { useForm } from "react-hook-form";
import axios from 'axios'
import { useNotification } from '../contexts/NotificationContext'
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
export default function LoginForm() {

  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  const onSubmit = async (data) => {
    try {

      const from = location.state?.from?.pathname || "/chat";
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/login-admin`, data);
      if (response.status === 200) {
        const { token, admin } = response.data
        console.log(admin)
        login(token, admin);
        showNotification("success", response.data.message)
        navigate(from, { replace: true })


      } else {
        console.error(response.data.message)
        showNotification('error', response.data.message);
      }

    } catch (e) {
      showNotification('error', e.response?.data?.message)
      console.error(e);
    }
  }

  return (
    <div className="gap-10 w-full flex flex-col items-center justify-center p-5 dark:bg-black">
      <div className="flex align-items flex-col justify-center text-center gap-2">
        <h2 className="dark:text-white text-2xl font-bold">Welcome Back!</h2>
        <p className="dark:text-gray-300 text-gray-600 text-sm">Login and start chatting to your dear ones!</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="gap-5 text-sm flex flex-col bg-gray-50 2xs:p-10 p-5 rounded-lg dark:bg-gray-900">
        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white ">Email</label>
          <input className="py-3 focus:outline-1 dark:bg-gray-950 outline-primary rounded-md bg-gray-100 px-5 dark:text-white"
            type="email"
            placeholder="Enter Email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="error">{errors.email.message}</p>}
        </div>

        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">Password</label>
          <input className="py-3 2xs:w-70 w-60 focus:outline-1 outline-primary rounded-md bg-gray-100 px-5 dark:text-white dark:bg-gray-950"
            placeholder="Enter Password"
            type="password"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && <p className="error">{errors.password.message}</p>}
        </div>

        <Link className="text-xs text-primary font-bold">Forgot Password?</Link>
        <Link className="text-xs text-black py-1 dark:text-white flex items-center gap-1 justify-center bg-gray-100 rounded-md dark:bg-gray-950"><img src="/imgs/google-icon.webp" alt="google-icon" className="w-10 h-10" />Continue With Google</Link>

        <button type="submit" className="py-2 rounded-md bg-primary-1 hover:bg-primary trasnsition duration-300 text-white">Login</button>
        <Link className=" text-center dark:text-white hover:underline transition duration-300">New Here? Create Your Account</Link>
      </form>
    </div>
  );
}
