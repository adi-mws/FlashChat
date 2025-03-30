import React from "react";
import { useForm } from "react-hook-form";
import axios from 'axios'
import { useNotification } from '../../contexts/NotificationContext'
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
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
    <div className="container gap-10 w-full flex flex-col items-center justify-center p-5">
      <h2 className="dark:text-white text-2xl font-bold">Login</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="gap-5 flex flex-col items">
        <div className="form-group flex flex-col">
          <label>Email:</label>
          <input className="px-2 py-3"
            type="email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="error">{errors.email.message}</p>}
        </div>

        <div className="form-group flex flex-col">
          <label>Password:</label>
          <input className="px-2 py-3 w-70"
            type="password"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && <p className="error">{errors.password.message}</p>}
        </div>

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
