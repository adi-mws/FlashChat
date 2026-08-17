import { useSelector, useDispatch } from 'react-redux';
import { selectNotifications, removeNotification } from '../../redux/slices/notificationSlice';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function NotificationDisplay() {
  const notifications = useSelector(selectNotifications);
  const dispatch = useDispatch();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-[90vw] sm:w-[350px] pointer-events-none">
      {notifications.map((n) => {
        let Icon = Info;
        let iconColor = 'text-blue-500 dark:text-blue-400';
        let borderColor = 'border-slate-100 dark:border-zinc-800/80';
        let bgColor = 'bg-white dark:bg-zinc-900';
        let accentColor = 'bg-blue-500';

        if (n.type === 'success') {
          Icon = CheckCircle2;
          iconColor = 'text-emerald-500 dark:text-emerald-400';
          borderColor = 'border-emerald-100 dark:border-emerald-900/30';
          accentColor = 'bg-emerald-500';
        } else if (n.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-red-500 dark:text-red-400';
          borderColor = 'border-red-100 dark:border-red-900/30';
          accentColor = 'bg-red-500';
        } else if (n.type === 'warning') {
          Icon = AlertTriangle;
          iconColor = 'text-amber-500 dark:text-amber-400';
          borderColor = 'border-amber-100 dark:border-amber-900/30';
          accentColor = 'bg-amber-500';
        }

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border ${borderColor} ${bgColor} shadow-xl shadow-slate-100/5 dark:shadow-zinc-950/30 w-full animate-slide-up relative overflow-hidden transition-all duration-300`}
          >
            {/* Left Accent Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

            {/* Icon */}
            <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
              <Icon size={18} />
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 dark:text-zinc-100 leading-normal break-words">
                {n.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => dispatch(removeNotification(n.id))}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
