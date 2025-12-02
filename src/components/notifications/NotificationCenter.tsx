import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, User, Calendar, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications, Notification } from '../../hooks/useNotifications';

export default function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'task_assigned':
                return <CheckCircle className="w-4 h-4 text-blue-500" />;
            case 'mention':
                return <User className="w-4 h-4 text-purple-500" />;
            case 'reminder':
                return <Calendar className="w-4 h-4 text-orange-500" />;
            default:
                return <Info className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Notificaciones"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                Marcar todo leído
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">No tienes notificaciones</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors relative group ${!notification.read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3 items-start">
                                            <div className={`mt-0.5 p-1.5 rounded-full ${!notification.read ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {new Date(notification.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                {notification.link && (
                                                    <Link
                                                        to={notification.link}
                                                        onClick={() => {
                                                            markAsRead(notification.id);
                                                            setIsOpen(false);
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block"
                                                    >
                                                        Ver detalles
                                                    </Link>
                                                )}
                                            </div>
                                            {!notification.read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(notification.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full transition-all"
                                                    title="Marcar como leída"
                                                >
                                                    <Check className="w-3 h-3 text-gray-500" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
