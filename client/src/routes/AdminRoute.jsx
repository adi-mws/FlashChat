import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { selectUser } from "../redux/slices/authSlice";
import { CHAT_ROUTES } from "./routes";

/*
  Route guard for Supreme Admin Console (/flsh-ad-pnl).
  Allows initial bootstrap with Master Passkey if no admin exists yet.
  Redirects non-admin users to /app/chats once an admin exists.
*/
export default function AdminRoute({ children }) {
    const user = useSelector(selectUser);
    const [isBootstrapped, setIsBootstrapped] = useState(null);

    useEffect(() => {
        let isMounted = true;
        axios.get(`${import.meta.env.VITE_API_URL}/admin/bootstrap-status`)
            .then((res) => {
                if (isMounted && res.data?.success) {
                    setIsBootstrapped(res.data.isBootstrapped);
                }
            })
            .catch(() => {
                if (isMounted) setIsBootstrapped(true);
            });
        return () => { isMounted = false; };
    }, []);

    // While checking bootstrap status, allow rendering
    if (isBootstrapped === null) {
        return children;
    }

    // Only redirect if an admin already exists AND user is not an admin or superadmin
    const isAnAdmin = user?.role === "admin" || user?.role === "superadmin";
    if (isBootstrapped && user && !isAnAdmin) {
        return <Navigate to={CHAT_ROUTES.root} replace />;
    }

    return children;
}

