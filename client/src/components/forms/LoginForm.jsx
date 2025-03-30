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
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="error">{errors.email.message}</p>}
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input
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
