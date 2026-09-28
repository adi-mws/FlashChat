import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../src/redux/slices/authSlice";
import { CHAT_ROUTES, ADMIN_ROUTES } from "./routes";

export default function PublicRoutes({ children }) {
    const user = useSelector(selectUser);
    if (!user) return children;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    return <Navigate to={isAdmin ? ADMIN_ROUTES.dashboard : CHAT_ROUTES.root} replace />;
}