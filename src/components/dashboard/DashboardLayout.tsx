import { ReactNode, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  GraduationCap, Users, School, Award, FileText, LogOut, Menu, User,
  DollarSign, QrCode, Settings, LayoutDashboard, ChevronDown, ChevronRight,
  BarChart3, Wallet, ShieldAlert, BookOpen
} from 'lucide-react';
import ProtectedOverlay from './ProtectedOverlay';
import { useSettings } from '../../hooks/useSettings';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';

interface DashboardLayoutProps {
  onLogout: () => void;
  isVerified: boolean;
  userEmail: string;
  onVerify: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  name: string;
  icon: any;
  path: string;
}

export default function DashboardLayout({ onLogout, isVerified, userEmail, onVerify }: DashboardLayoutProps) {
  const location = useLocation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['الرئيسية', 'التحفيظ', 'إدارة الطلاب']);

  const menuSections: MenuSection[] = [
    {
      title: 'الرئيسية',
      items: [
        { name: 'لوحة التحكم', icon: LayoutDashboard, path: '/dashboard' },
      ]
    },
    {
      title: 'التحفيظ',
      items: [
        { name: 'الحفظ والتسميع', icon: BookOpen, path: '/dashboard/recitations' },
      ]
    },
    {
      title: 'إدارة الطلاب',
      items: [
        { name: 'جميع الطلاب', icon: Users, path: '/dashboard/students' },
        { name: 'الطلاب المفصولين', icon: ShieldAlert, path: '/dashboard/students/expelled' },
        { name: 'الفصول', icon: School, path: '/dashboard/classes' },
        { name: 'المراحل الدراسية', icon: Award, path: '/dashboard/grades' },
      ]
    },
    {
      title: 'المالية',
      items: [
        { name: 'المدفوعات', icon: DollarSign, path: '/dashboard/payments' },
        { name: 'التقارير المالية', icon: Wallet, path: '/dashboard/financial-reports' },
      ]
    },
    {
      title: 'التقارير',
      items: [
        { name: 'تقارير الحضور', icon: FileText, path: '/dashboard/reports' },
        { name: 'تقارير الأداء', icon: BarChart3, path: '/dashboard/performance' },
      ]
    },
    {
      title: 'الأدوات',
      items: [
        { name: 'مسح QR', icon: QrCode, path: '/dashboard/qr-scanner' },
        { name: 'إعدادات المدرسة', icon: Settings, path: '/dashboard/settings' },
      ]
    },
  ];

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const { settings } = useSettings();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-orange-500/20">
        <Link to="/" className="flex items-center gap-2" onClick={() => setIsSheetOpen(false)}>
          <div className="bg-orange-500 p-2 rounded-lg shrink-0">
            <GraduationCap className="h-6 w-6 text-black" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white font-bold text-sm leading-tight">منصة التعليم</span>
            <span className="text-orange-400 text-[10px] truncate leading-tight">{settings.school_name}</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-1 mb-2">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              <span>{section.title}</span>
              {expandedSections.includes(section.title) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {/* Section Items */}
            {expandedSections.includes(section.title) && (
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path ||
                    (item.path === '/dashboard' && location.pathname === '/dashboard');

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSheetOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive
                        ? 'bg-orange-500 text-black font-medium shadow-lg'
                        : 'text-gray-300 hover:bg-gray-900 hover:text-white hover:translate-x-1'
                        }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </ScrollArea>

      {/* User Info & Logout */}
      <div className="flex-shrink-0 border-t border-orange-500/20 p-4 bg-black">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="bg-orange-500 p-2 rounded-full">
            <User className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">
              {userEmail || 'المستخدم'}
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-[10px] ${isVerified ? 'text-green-400' : 'text-orange-400'}`}>
                {isVerified ? 'حساب مفعل' : 'في انتظار التفعيل'}
              </p>
              {isVerified && (
                <Badge variant="outline" className="text-[9px] py-0 h-4 border-orange-500/50 text-orange-400 bg-transparent">
                  {settings.subscription_type}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black"
        >
          <LogOut className="ml-2 h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-black border-l border-orange-500/20 z-50">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pr-64 min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-8 justify-between lg:justify-end">
          {/* Mobile Menu Trigger */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-gray-600 hover:text-black">
                <Menu className="h-6 w-6" />
                <span className="sr-only">القائمة</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 bg-black border-l border-orange-500/20 w-72">
              <SheetTitle className="sr-only">قائمة التنقل</SheetTitle>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          {/* Page Title (Mobile) */}
          <div className="lg:hidden flex-1 text-center">
            <h1 className="text-lg font-semibold text-gray-900 truncate px-2">
              {menuSections.flatMap(s => s.items).find(item =>
                location.pathname === item.path ||
                (item.path === '/dashboard/students' && location.pathname === '/dashboard')
              )?.name || 'لوحة التحكم'}
            </h1>
          </div>

          {/* Desktop Title / Actions */}
          <div className="hidden lg:flex flex-1 items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {menuSections.flatMap(s => s.items).find(item =>
                location.pathname === item.path ||
                (item.path === '/dashboard/students' && location.pathname === '/dashboard')
              )?.name || 'لوحة التحكم'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {!isVerified && (
              <span className="hidden sm:inline-block text-xs md:text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full whitespace-nowrap">
                يرجى تفعيل حسابك
              </span>
            )}
            {/* Add a notification bell or profile quick access here if needed in future */}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Protected Overlay */}
      {!isVerified && (
        <ProtectedOverlay
          email={userEmail}
          onVerify={onVerify}
        />
      )}
    </div>
  );
}
