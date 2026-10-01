import { Navigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../redux/slices/authSlice";
import { CHAT_ROUTES, ADMIN_ROUTES } from "./routes";

export default function PublicRoutes({ children }) {
    const user = useSelector(selectUser);
    const [searchParams] = useSearchParams();

    if (!user) return children;

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (isAdmin) {
        return <Navigate to={ADMIN_ROUTES.dashboard} replace />;
    }

    const redirectUrl = searchParams.get('redirect');
    if (redirectUrl && redirectUrl.startsWith('/')) {
        return <Navigate to={redirectUrl} replace />;
    }

    return <Navigate to={CHAT_ROUTES.root} replace />;
}