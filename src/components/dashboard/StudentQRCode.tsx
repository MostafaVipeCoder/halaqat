import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Download, Printer, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface StudentQRCodeProps {
  student: {
    id: string; // Changed to string
    name: string;
    classes?: { // Changed structure to match new student data
      name: string;
    };
    phone: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StudentQRCode({ student, open, onOpenChange }: StudentQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate unique QR data for student
  const qrData = JSON.stringify({
    studentId: student.id,
    name: student.name,
    className: student.classes?.name || '',
    timestamp: Date.now()
  });

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    // Convert SVG to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = 800;
      canvas.height = 1000;

      if (ctx) {
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        ctx.drawImage(img, 200, 200, 400, 400);

        // Add student info
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(student.name, 400, 100);

        ctx.font = '24px Arial';
        ctx.fillText(`الحلقة: ${student.classes?.name || 'غير معين'}`, 400, 140);

        // Display simplified ID for visual purposes, or full ID if preferred
        const displayId = student.id.slice(0, 8).toUpperCase();
        ctx.fillText(`رقم الطالب: ${displayId}`, 400, 170);

        ctx.font = '20px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText('امسح هذا الرمز لتسجيل الحضور', 400, 650);

        // Download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_${student.name}_${displayId}.png`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('تم تحميل رمز QR بنجاح');
          }
        });
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const displayId = student.id.slice(0, 8).toUpperCase();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>بطاقة QR - ${student.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .card {
              border: 3px solid #f97316;
              border-radius: 20px;
              padding: 40px;
              text-align: center;
              background: white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            h1 {
              color: #000;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .info {
              color: #666;
              margin: 5px 0;
              font-size: 18px;
            }
            .qr-container {
              margin: 30px 0;
              padding: 20px;
              background: #f9f9f9;
              border-radius: 10px;
            }
            .footer {
              color: #999;
              font-size: 14px;
              margin-top: 20px;
            }
            @media print {
              body {
                background: white;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${student.name}</h1>
            <p class="info">الحلقة: ${student.classes?.name || 'غير معين'}</p>
            <p class="info">رقم الطالب: ${displayId}</p>
            <div class="qr-container">
              ${svgData}
            </div>
            <p class="footer">امسح هذا الرمز لتسجيل الحضور</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    toast.success('جاري الطباعة...');
  };

  const displayId = student.id.slice(0, 8).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-orange-500" />
            رمز QR للطالب
          </DialogTitle>
          <DialogDescription>
            استخدم هذا الرمز لتسجيل حضور الطالب
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <h3 className="text-black mb-1">{student.name}</h3>
            <p className="text-sm text-gray-600">الحلقة: {student.classes?.name || 'غير معين'}</p>
            <p className="text-sm text-gray-600">
              رقم الطالب: {displayId}
            </p>
          </div>

          {/* QR Code */}
          <div ref={qrRef} className="flex justify-center p-6 bg-white border-2 border-orange-200 rounded-lg">
            <QRCodeSVG
              value={qrData}
              size={256}
              level="H"
              includeMargin={true}
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>

          {/* Instructions */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-gray-700 text-center">
              قم بطباعة أو تحميل هذا الرمز وتسليمه للطالب
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-50"
            >
              <Download className="ml-2 h-4 w-4" />
              تحميل
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
