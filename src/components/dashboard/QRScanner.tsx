import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { QrCode, Camera, CheckCircle, XCircle, Clock, Search, UserCheck, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { useAttendance } from '../../hooks/useAttendance';
import { useStudents } from '../../hooks/useStudents';
import { format, isWithinInterval, parse, getDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useSettings } from '../../hooks/useSettings';
import { useClasses } from '../../hooks/useClasses';

const DAYS_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { cn } from '../ui/utils';

interface AttendanceRecord {
  id: number;
  studentId: string;
  studentName: string;
  time: string;
  status: 'success' | 'duplicate' | 'error';
}

export default function QRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [devices, setDevices] = useState<any[]>([]);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");

  const { markAttendance, attendance } = useAttendance();
  const { students } = useStudents();
  const { classes } = useClasses();
  const { settings } = useSettings();

  // Initialize and get available cameras
  useEffect(() => {
    if (!document.getElementById("qr-reader")) return;

    const qrCodeScanner = new Html5Qrcode("qr-reader");
    setHtml5QrCode(qrCodeScanner);

    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length > 0) {
        setDevices(cameras);

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setIsMobileDevice(isMobile);

        if (isMobile) {
          const backCamera = cameras.find(camera =>
            camera.label.toLowerCase().includes('back') ||
            camera.label.toLowerCase().includes('rear') ||
            camera.label.toLowerCase().includes('environment')
          );
          setSelectedDevice(backCamera ? backCamera.id : cameras[cameras.length - 1].id);
        } else {
          setSelectedDevice(cameras[0].id);
        }
      }
    }).catch(err => {
      console.error("Error getting cameras:", err);
      toast.error('لا يمكن الوصول إلى الكاميرا');
    });

    return () => {
      if (qrCodeScanner && qrCodeScanner.isScanning) {
        qrCodeScanner.stop().catch(err => console.error(err));
      }
    };
  }, []);

  const startScanning = async () => {
    if (!html5QrCode || !selectedDevice) {
      toast.error('الرجاء اختيار كاميرا أولاً');
      return;
    }

    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const config = isMobile ? { facingMode: "environment" } : selectedDevice;

      await html5QrCode.start(
        config,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleQRCodeScan(decodedText);
        },
        () => { } // Ignore errors
      );
      setIsScanning(true);
      toast.success('تم تشغيل الماسح الضوئي');
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error('فشل في تشغيل الماسح الضوئي');
    }
  };

  const stopScanning = async () => {
    if (html5QrCode && isScanning) {
      try {
        await html5QrCode.stop();
        setIsScanning(false);
        toast.info('تم إيقاف الماسح الضوئي');
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleQRCodeScan = async (qrData: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let studentId = qrData;
      try {
        const data = JSON.parse(qrData);
        studentId = data.studentId || data.id || qrData;
      } catch (e) { }

      // Verify Student Exists
      const student = students.find(s => s.id === studentId);

      if (!student) {
        toast.error('⚠️ الطالب غير موجود في النظام', {
          description: `رقم الطالب: ${studentId}`,
          duration: 4000,
        });
        addLocalRecord(studentId, 'طالب غير معروف', 'error');
        setTimeout(() => setIsProcessing(false), 2000);
        return;
      }

      // Check Student Status
      if (student.status && student.status !== 'active') {
        const statusMap = {
          'suspended': 'موقوف',
          'expelled': 'مفصول'
        };
        toast.error(`⚠️ لا يمكن تسجيل حضور طالب ${statusMap[student.status as keyof typeof statusMap] || student.status}`, {
          description: `الطالب: ${student.name}`,
          duration: 5000,
        });
        addLocalRecord(studentId, student.name, 'error');
        playWarningSound();
        setTimeout(() => setIsProcessing(false), 2000);
        return;
      }

      // Check School Hours
      const now = new Date();
      const startTime = parse(settings.work_start_time || '08:00', 'HH:mm', now);
      const endTime = parse(settings.work_end_time || '14:00', 'HH:mm', now);

      if (!isWithinInterval(now, { start: startTime, end: endTime })) {
        toast.error('⚠️ خارج أوقات العمل الرسمية', {
          description: `مواعيد العمل: من ${settings.work_start_time} إلى ${settings.work_end_time}`,
          duration: 5000,
        });
        addLocalRecord(studentId, student.name, 'error');
        playWarningSound();
        setTimeout(() => setIsProcessing(false), 2000);
        return;
      }

      // Check Duplicate (Today)
      const today = format(new Date(), 'yyyy-MM-dd');
      const alreadyPresent = attendance.some(a => a.student_id === studentId && a.date === today);

      if (alreadyPresent) {
        toast.warning(`⚠️ تم تسجيل الحضور من قبل`, {
          description: `${student.name} - مسجل مسبقاً اليوم`,
          duration: 5000,
        });
        addLocalRecord(studentId, student.name, 'duplicate');
        playWarningSound();
        setTimeout(() => setIsProcessing(false), 2000);
        return;
      }

      // Check Class Schedule
      const studentClass = classes.find(c => c.id === student.class_id);
      const isUnscheduled = studentClass && studentClass.attendance_type === 'scheduled' &&
        !studentClass.attendance_days?.includes(DAYS_MAP[now.getDay()]);

      if (isUnscheduled) {
        toast.info(`ℹ️ يوم حضور إضافي`, {
          description: `${student.name} - هذا اليوم ليس من أيام الحضور المجدولة لحلقته`,
          duration: 4000,
        });
      }

      // Record Attendance
      await markAttendance({
        student_id: studentId,
        date: today,
        present: true,
        notes: isUnscheduled ? 'QR Scan (يوم إضافي)' : 'QR Scan'
      });

      // UI Success
      toast.success(`✅ تم تسجيل الحضور بنجاح`, {
        description: `${student.name}`,
        duration: 4000,
      });
      addLocalRecord(studentId, student.name, 'success');
      playSuccessSound();

    } catch (error) {
      console.error('Error handling QR scan:', error);
      toast.error('QR Code غير صالح أو حدث خطأ');
      addLocalRecord('UNKNOWN', 'خطأ في المعالجة', 'error');
    } finally {
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  const addLocalRecord = (studentId: string, studentName: string, status: 'success' | 'duplicate' | 'error') => {
    const newRecord: AttendanceRecord = {
      id: Date.now(),
      studentId,
      studentName,
      time: new Date().toLocaleTimeString('ar-SA'),
      status
    };
    setLocalRecords(prev => [newRecord, ...prev]);
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) { }
  };

  const playWarningSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 400;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) { }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 ml-1" />نجح</Badge>;
      case 'duplicate':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 ml-1" />مكرر</Badge>;
      case 'error':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 ml-1" />خطأ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const todaySuccessCount = localRecords.filter(r => r.status === 'success' && r.studentId !== 'UNKNOWN').length;
  const todayDuplicateCount = localRecords.filter(r => r.status === 'duplicate').length;
  const todayErrorCount = localRecords.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-black mb-1">مسح رمز QR للحضور</h2>
        <p className="text-gray-600">استخدم الكاميرا لمسح رموز QR الخاصة بالطلاب لتسجيل الحضور</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>✅ حضور ناجح (جلسة حالية)</CardDescription>
            <CardTitle className="text-3xl text-green-600">{todaySuccessCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>⚠️ محاولات مكررة</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{todayDuplicateCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>❌ أخطاء</CardDescription>
            <CardTitle className="text-3xl text-red-600">{todayErrorCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>📊 إجمالي المحاولات</CardDescription>
            <CardTitle className="text-3xl text-black">{localRecords.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>🔴 حالة الماسح</CardDescription>
            <CardTitle className="text-xl">
              {isScanning ? (
                <span className="text-green-600 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  نشط
                </span>
              ) : (
                <span className="text-gray-600">متوقف</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              تسجيل يدوي
            </CardTitle>
            <CardDescription>البحث عن طالب وتسجيل حضوره يدوياً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Popover open={isManualOpen} onOpenChange={setIsManualOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isManualOpen}
                    className="w-full justify-between text-right h-12"
                  >
                    {manualStudentId
                      ? students.find((s) => s.id === manualStudentId)?.name
                      : "ابحث عن طالب..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="ابحث باسم الطالب..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>لم يتم العثور على طالب.</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.name}
                            onSelect={() => {
                              setManualStudentId(student.id || "");
                              setIsManualOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4",
                                manualStudentId === student.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {student.name} - {student.classes?.name || 'بدون صف'}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                disabled={!manualStudentId || isProcessing}
                onClick={() => handleQRCodeScan(manualStudentId)}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
              >
                <CheckCircle className="ml-2 h-4 w-4" />
                تسجيل حضور الطالب المختار
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-2 italic">
                * استخدم ميزة التسجيل اليدوي في حالة تلف رمز QR الخاص بالطالب أو فقدانه.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-orange-500" />
              كاميرا المسح
              {isMobileDevice && <Badge className="bg-blue-500 text-white text-xs">📱 كاميرا خلفية</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {devices.length > 1 && (
              <div>
                <label className="block text-sm mb-2 text-gray-700">اختر الكاميرا:</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  disabled={isScanning}
                  className="w-full p-2 border rounded-lg text-right"
                >
                  {devices.map((device, index) => (
                    <option key={device.id} value={device.id}>{device.label || `كاميرا ${index + 1}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="relative">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-center text-white">
                    <QrCode className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p>اضغط "بدء المسح" للتشغيل</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={startScanning} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  <Camera className="ml-2 h-4 w-4" />بدء المسح
                </Button>
              ) : (
                <Button onClick={stopScanning} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                  <XCircle className="ml-2 h-4 w-4" />إيقاف المسح
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سجل المسح الأخير (الجلسة الحالية)</CardTitle>
            <CardDescription>آخر عمليات المسح والتسجيل في هذه الجلسة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {localRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <QrCode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>لا توجد عمليات مسح بعد</p>
                </div>
              ) : (
                localRecords.map((record) => (
                  <div
                    key={record.id}
                    className={`p-3 rounded-lg border ${record.status === 'success' ? 'bg-green-50 border-green-200' : record.status === 'duplicate' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-black">{record.studentName}</p>
                        <p className="text-sm text-gray-600">{record.studentId}</p>
                        <p className="text-xs text-gray-500 mt-1">{record.time}</p>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
