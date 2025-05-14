import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  FileText, 
  BarChart, 
  AlertTriangle,
  Users,
  ArrowRight
} from 'lucide-react';

const AdminAttendanceIndex = () => {
  const router = useRouter();
  
  const attendanceOptions = [
    {
      title: 'Attendance Settings',
      description: 'Configure attendance policies and parameters',
      icon: <Settings className="h-8 w-8 text-primary" />,
      href: '/admin/attendance/settings'
    },
    {
      title: 'Attendance Reports',
      description: 'Generate and view attendance reports',
      icon: <FileText className="h-8 w-8 text-primary" />,
      href: '/admin/attendance/reports'
    },
    {
      title: 'Attendance Statistics',
      description: 'Analyze attendance patterns across classes',
      icon: <BarChart className="h-8 w-8 text-primary" />,
      href: '/admin/attendance/statistics'
    },
    {
      title: 'Low Attendance',
      description: 'Identify students with attendance issues',
      icon: <AlertTriangle className="h-8 w-8 text-primary" />,
      href: '/admin/attendance/low-attendance'
    },
    {
      title: 'Manage Absences',
      description: 'Approve or reject absence requests',
      icon: <Users className="h-8 w-8 text-primary" />,
      href: '/admin/attendance/absences'
    }
  ];
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <p className="text-gray-500">Administer and configure attendance tracking system</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {attendanceOptions.map((option, index) => (
          <Card key={index} className="group hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push(option.href)}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{option.title}</CardTitle>
              {option.icon}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{option.description}</p>
              <div className="mt-4 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">Manage</span>
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminAttendanceIndex; 