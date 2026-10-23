import { ReactNode, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Button } from '../../ui/button';
import { LayoutDashboard, Users, CreditCard, Settings, LogOut, Menu, X, User } from 'lucide-react';
import Logo from '../../brand/Logo';

interface AdminLayoutProps {
    onLogout: () => void;
    userEmail: string;
}

export default function AdminLayout({ onLogout, userEmail }: AdminLayoutProps) {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const menuItems = [
        { name: 'نظرة عامة', icon: LayoutDashboard, path: '/admin' },
        { name: 'إدارة العملاء', icon: Users, path: '/admin/customers' },
        { name: 'الباقات والأسعار', icon: CreditCard, path: '/admin/packages' },
        { name: 'إعدادات النظام', icon: Settings, path: '/admin/settings' },
    ];

    return (
        <div className="min-h-screen bg-gray-50" dir="rtl">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:flex lg:w-64 lg:flex-col brand-surface border-l brand-divider">
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center h-16 flex-shrink-0 px-4 border-b brand-divider">
                        <Link to="/admin" className="flex items-center gap-2">
                            <Logo size={38} subtitle="لوحة إدارة المنصة" />
                        </Link>
                    </div>

                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-orange-500 text-white'
                                        : 'text-gray-300 brand-nav-link'
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex-shrink-0 border-t brand-divider p-4">
                        <div className="flex items-center gap-3 mb-3 px-2">
                            <div className="bg-orange-500 p-2 rounded-full">
                                <User className="h-5 w-5 text-black" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{userEmail}</p>
                                <p className="text-[10px] text-orange-400">مسؤول النظام (Admin)</p>
                            </div>
                        </div>
                        <Button
                            onClick={onLogout}
                            variant="outline"
                            className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent"
                        >
                            <LogOut className="ml-2 h-4 w-4" />
                            تسجيل الخروج
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pr-64">
                <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-8">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden ml-4 text-gray-600 hover:text-black">
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-black">
                            {menuItems.find(item => location.pathname === item.path)?.name || 'لوحة التحكم'}
                        </h1>
                    </div>
                </header>

                <main className="p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
                <div className="lg:hidden">
                    <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    <aside className="fixed inset-y-0 right-0 z-50 w-64 brand-surface border-l brand-divider flex flex-col">
                        <div className="flex items-center justify-between h-16 px-4 border-b brand-divider">
                            <Link to="/admin" className="flex items-center gap-2">
                                <Logo size={38} subtitle="لوحة إدارة المنصة" />
                            </Link>
                            <button onClick={() => setSidebarOpen(false)} className="text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <nav className="flex-1 px-2 py-4 space-y-1">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-orange-500 text-white'
                                            : 'text-gray-300 brand-nav-link'
                                            }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="flex-shrink-0 border-t brand-divider p-4">
                            <div className="flex items-center gap-3 mb-3 px-2">
                                <div className="bg-orange-500 p-2 rounded-full">
                                    <User className="h-5 w-5 text-black" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{userEmail}</p>
                                    <p className="text-[10px] text-orange-400">مسؤول النظام (Admin)</p>
                                </div>
                            </div>
                            <Button
                                onClick={onLogout}
                                variant="outline"
                                className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white bg-transparent"
                            >
                                <LogOut className="ml-2 h-4 w-4" />
                                تسجيل الخروج
                            </Button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
