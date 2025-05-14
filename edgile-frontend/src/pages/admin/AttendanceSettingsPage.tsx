import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import config from '@/config';
import { Loader2, FileDown, Settings, Calendar, BarChart, AlertTriangle, PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import html2pdf from 'html2pdf.js';
import simpleToast from '@/hooks/use-simple-toast';
import DashboardWrapper from '../../components/DashboardWrapper';

// Define interfaces for our data structures
interface ClassData {
  _id: string;
  name: string;
  year: number;
  division: string;
  semester: number;
  students?: StudentData[];
}

interface StudentData {
  _id: string;
  name: string;
  registerNumber: string;
  email?: string;
  class?: string;
}

interface SubjectAttendance {
  _id: string;
  name: string;
  code: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  totalClasses: number;
  attendanceRate: number;
}

interface StudentAttendance {
  _id: string;
  name: string;
  registerNumber: string;
  present: number;
  absent: number;
  attendance: number;
}

interface ClassAttendanceData {
  _id: string;
  id: string;
  name: string;
  year: number;
  semester: number;
  division: string;
  totalStudents: number;
  totalClasses: number;
  attendanceRate: number;
  subjects: SubjectAttendance[];
  students?: StudentAttendance[];
}

interface AttendanceReport {
  dateRange: {
    start: string;
    end: string;
  };
  classes: ClassAttendanceData[];
}

interface AttendanceSettings {
  minAttendancePercentage: number;
  warnAtPercentage: number;
  allowExcusedAbsences: boolean;
  allowSelfMarking: boolean;
  enableAutomatedReporting: boolean;
  reportingFrequency: string;
  graceTimeForLateMarkingMinutes: number;
}

// Update AdminUser to match the context version plus add runtime properties
interface AdminUserRuntime {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  university?: {
    id?: string;
    _id?: string;
    name?: string;
  } | string;
  universityId?: string;
  universityCode?: string;
  [key: string]: any;
}

interface AdminUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'admin';
  permissions?: string[];
  university?: string | { id?: string; _id?: string; name?: string; };
  universityId?: string;
  universityCode?: string;
}

// Add interface definitions for API responses
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  classes?: ClassData[];
  classrooms?: any[];
  students?: StudentData[];
}

const DEFAULT_SETTINGS: AttendanceSettings = {
  minAttendancePercentage: 75,
  warnAtPercentage: 85,
  allowExcusedAbsences: true,
  allowSelfMarking: false,
  enableAutomatedReporting: true,
  reportingFrequency: 'weekly',
  graceTimeForLateMarkingMinutes: 10
};

// Helper to robustly get the university code from the user object
function getUniversityCode(user: any): string | undefined {
  return (
    user.universityCode ||
    (typeof user.university === 'string' ? user.university : undefined) ||
    (typeof user.university === 'object' && user.university?.code) ||
    user.universityId
  );
}

// Helper to get year name
function getYearName(year: number) {
  switch (year) {
    case 1: return 'First Year';
    case 2: return 'Second Year';
    case 3: return 'Third Year';
    case 4: return 'Fourth Year';
    default: return `Year ${year}`;
  }
}

const AttendanceSettingsPage = () => {
  const { user, token } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport>({
    dateRange: {
      start: '',
      end: ''
    },
    classes: []
  });
  
  // Settings states
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS);
  
  // Report filters
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Fetch settings
  useEffect(() => {
    if (activeTab !== 'settings') return;
    
    const fetchSettings = async () => {
      if (!user || !token) return;
      const universityCode = getUniversityCode(user);
      if (!universityCode) {
        setApiError('University code is required for attendance settings.');
        return;
      }
      try {
        setLoading(true);
        setApiError('');
        try {
          const api = await import('../../utils/api').then(module => module.default);
          api.setToken(token);
          const response = await api.get<ApiResponse<AttendanceSettings>>('/api/admin/attendance/settings', {
            universityCode: universityCode
          });
          if (response && response.success && response.data) {
            setSettings(response.data);
            console.log('Successfully fetched attendance settings:', response.data);
          } else {
            console.warn('Unexpected API response format:', response);
          }
        } catch (error: any) {
          if (error.message === 'University ID is required' || error.message === 'University code is required') {
            setApiError('Backend requires a valid university code.');
          } else {
            setApiError(`Error fetching attendance settings: ${error.message}`);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [activeTab, user, token]);
  
  // Fetch classes
  useEffect(() => {
    if (!user || !token) return;
    const universityCode = getUniversityCode(user);
    if (!universityCode) {
      setApiError('University code is required for class list.');
      return;
    }
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setApiError('');
        try {
          const api = await import('../../utils/api').then(module => module.default);
          api.setToken(token);
          const response = await api.get<ApiResponse<never>>('/api/admin/classrooms', {
            universityCode: universityCode
          });
          if (response && response.success && Array.isArray(response.classes)) {
            setClasses(response.classes);
          } else if (response && response.success && Array.isArray(response.classrooms)) {
            const formattedClasses = response.classrooms.map((classroom: any) => ({
              _id: classroom._id,
              name: classroom.name || `Class ${classroom.year || '1'}-${classroom.division || 'A'}`,
              year: classroom.year || 1,
              division: classroom.division || 'A',
              semester: classroom.semester || 1
            }));
            setClasses(formattedClasses);
          } else {
            setApiError('Failed to load classes. Unexpected response format.');
          }
        } catch (error: any) {
          setApiError(`Error fetching classes: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [user, token]);
  
  // Fetch attendance reports
  useEffect(() => {
    if (activeTab !== 'reports') return;
    if (!user || !token) return;
    const universityCode = getUniversityCode(user);
    if (!universityCode) {
      setApiError('University code is required for attendance reports.');
      return;
    }
    const fetchAttendanceReports = async () => {
      try {
        setLoading(true);
        setApiError('');
        try {
          const api = await import('../../utils/api').then(module => module.default);
          api.setToken(token);
          const params: Record<string, string> = {
            universityCode: universityCode
          };
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;
          if (selectedClass) params.classId = selectedClass;
          const response = await api.get<ApiResponse<AttendanceReport>>('/api/admin/attendance/reports', params);
          if (response && response.success && response.data) {
            const normalized = {
              ...response.data,
              classes: response.data.classes?.map(classData => ({
                ...classData,
                subjects: classData.subjects || [],
                attendanceRate: typeof classData.attendanceRate === 'string' ? parseFloat(classData.attendanceRate) : (classData.attendanceRate || 0)
              })) || []
            };
            setAttendanceReports(normalized);
          } else {
            setApiError('Failed to load attendance reports. Unexpected response format.');
          }
        } catch (error: any) {
          setApiError(`Failed to fetch attendance reports: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceReports();
  }, [activeTab, selectedClass, startDate, endDate, user, token]);
  
  // Handle settings changes
  const handleSettingChange = (key: keyof AttendanceSettings, value: number | boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    if (!user || !token) {
      setApiError('Cannot save settings: You are not logged in.');
      return;
    }
    const universityCode = getUniversityCode(user);
    if (!universityCode) {
      setApiError('University code is required to save settings.');
      return;
    }
    try {
      setSaving(true);
      setApiError('');
      try {
        const api = await import('../../utils/api').then(module => module.default);
        api.setToken(token);
        const settingsToSave = {
          ...settings,
          university: universityCode
        };
        const response = await api.put<ApiResponse<AttendanceSettings>>('/api/admin/attendance/settings', settingsToSave);
        if (response && response.success) {
          simpleToast({
            title: 'Success',
            description: 'Attendance settings saved successfully.',
            variant: 'default'
          });
        } else {
          throw new Error(response.message || 'Unknown error saving settings');
        }
      } catch (error: any) {
        setApiError(`Failed to save settings: ${error.message}`);
        simpleToast({
          title: 'Error',
          description: error.message || 'Failed to save attendance settings',
          variant: 'destructive'
        });
      }
    } finally {
      setSaving(false);
    }
  };
  
  // Export attendance report to PDF
  const exportToPDF = () => {
    const element = document.getElementById('attendance-report');
    if (!element) return;
    
    const opt = {
      margin: 10,
      filename: `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };
  
  // Helper function to get percentage value safely
  const getPercentageValue = (value: any) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    return 0;
  };
  
  // Helper function to determine color based on percentage
  const getPercentageColor = (percentage: number) => {
    if (percentage >= settings.minAttendancePercentage) {
      return 'text-green-600';
    } else if (percentage >= settings.warnAtPercentage) {
      return 'text-amber-600';
    } else {
      return 'text-red-600';
    }
  };
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-500 mt-1">Configure and monitor attendance across all classes</p>
        </div>
        
        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{apiError}</p>
          </div>
        )}
        
        <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Settings</CardTitle>
                <CardDescription>Configure how attendance is tracked and managed</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <Label htmlFor="minAttendancePercentage">
                        Minimum Attendance Required ({settings.minAttendancePercentage}%)
                      </Label>
                      <Slider
                        id="minAttendancePercentage"
                        min={0}
                        max={100}
                        step={1}
                        value={[settings.minAttendancePercentage]}
                        onValueChange={(value) => handleSettingChange('minAttendancePercentage', value[0])}
                        className="mt-2"
                      />
                      <Progress value={settings.minAttendancePercentage} className="mt-2" />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="warnAtPercentage">
                        Warning Threshold ({settings.warnAtPercentage}%)
                      </Label>
                      <Slider
                        id="warnAtPercentage"
                        min={0}
                        max={100}
                        step={1}
                        value={[settings.warnAtPercentage]}
                        onValueChange={(value) => handleSettingChange('warnAtPercentage', value[0])}
                        className="mt-2"
                      />
                      <Progress value={settings.warnAtPercentage} className="mt-2" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="allowExcusedAbsences" className="cursor-pointer">
                            Allow Excused Absences
                          </Label>
                          <Switch
                            id="allowExcusedAbsences"
                            checked={settings.allowExcusedAbsences}
                            onCheckedChange={(checked) => handleSettingChange('allowExcusedAbsences', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="allowSelfMarking" className="cursor-pointer">
                            Allow Self Marking
                          </Label>
                          <Switch
                            id="allowSelfMarking"
                            checked={settings.allowSelfMarking}
                            onCheckedChange={(checked) => handleSettingChange('allowSelfMarking', checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="enableAutomatedReporting" className="cursor-pointer">
                            Enable Automated Reporting
                          </Label>
                          <Switch
                            id="enableAutomatedReporting"
                            checked={settings.enableAutomatedReporting}
                            onCheckedChange={(checked) => handleSettingChange('enableAutomatedReporting', checked)}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="reportingFrequency">Reporting Frequency</Label>
                          <Select
                            value={settings.reportingFrequency}
                            onValueChange={(value) => handleSettingChange('reportingFrequency', value)}
                            disabled={!settings.enableAutomatedReporting}
                          >
                            <SelectTrigger id="reportingFrequency">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="graceTimeForLateMarkingMinutes">
                        Grace Period for Late Marking (minutes)
                      </Label>
                      <Input
                        id="graceTimeForLateMarkingMinutes"
                        type="number"
                        min={0}
                        max={60}
                        value={settings.graceTimeForLateMarkingMinutes}
                        onChange={(e) => handleSettingChange('graceTimeForLateMarkingMinutes', parseInt(e.target.value))}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={handleSaveSettings} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Attendance Report Filters</CardTitle>
                <CardDescription>Select parameters to generate attendance reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="classFilter">Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger id="classFilter">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls._id} value={cls._id}>
                            {`${getYearName(cls.year)}, Sem ${cls.semester}, Div ${cls.division}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Attendance Report</h2>
              <Button variant="outline" onClick={exportToPDF} className="flex items-center">
                <FileDown className="mr-2 h-4 w-4" />
                Export to PDF
              </Button>
            </div>
            
            <div id="attendance-report">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : (
                attendanceReports.classes.length > 0 ? (
                  <div className="space-y-6">
                    {attendanceReports.classes.map((classData) => (
                      <Card key={classData._id || classData.id}>
                        <CardHeader className="bg-slate-50">
                          <div className="flex justify-between items-center">
                            <CardTitle>{classData.name}</CardTitle>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">Overall:</span>
                              <Badge className={getPercentageColor(getPercentageValue(classData.attendanceRate))}>
                                {getPercentageValue(classData.attendanceRate).toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {classData.subjects && classData.subjects.length > 0 ? (
                            <div className="p-4">
                              <h3 className="font-medium text-gray-700 mb-2">Subjects</h3>
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subject
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Code
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Present
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Absent
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Attendance
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {classData.subjects.map((subject) => (
                                      <tr key={subject._id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {subject.name}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {subject.code}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {(subject.present || 0) + (subject.late || 0) + (subject.excused || 0)}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {subject.absent || 0}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                          <span className={getPercentageColor(getPercentageValue(subject.attendanceRate))}>
                                            {getPercentageValue(subject.attendanceRate).toFixed(1)}%
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 text-center">
                              <p className="text-gray-500">No subject data available</p>
                            </div>
                          )}
                          
                          {/* Only render student table if we have student data */}
                          {classData.students && classData.students.length > 0 && (
                            <div className="border-t border-gray-200 p-4">
                              <h3 className="font-medium text-gray-700 mb-2">Students</h3>
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Register No.
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Present
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Absent
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Attendance
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {classData.students.map((student) => (
                                      <tr key={student._id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {student.name}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {student.registerNumber}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {student.present || 0}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {student.absent || 0}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                          <span className={getPercentageColor(getPercentageValue(student.attendance))}>
                                            {getPercentageValue(student.attendance).toFixed(1)}%
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-10 text-center">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
                    <p className="text-gray-700">No attendance data found for the selected filters.</p>
                    <p className="text-gray-500 mt-2">Try adjusting your filters or select a different date range.</p>
                  </Card>
                )
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardWrapper>
  );
};

export default AttendanceSettingsPage;