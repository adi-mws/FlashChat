import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../src/redux/slices/authSlice";
import { CHAT_ROUTES, ADMIN_ROUTES } from "./routes";

export default function PublicRoutes({ children }) {
    const user = useSelector(selectUser);
    if (!user) return children;
    return <Navigate to={user.role === 'admin' ? ADMIN_ROUTES.dashboard : CHAT_ROUTES.root} replace />;
}