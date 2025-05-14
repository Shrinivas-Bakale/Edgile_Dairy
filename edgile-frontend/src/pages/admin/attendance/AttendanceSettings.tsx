import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Loader2, Save, AlertTriangle, Check } from 'lucide-react';
import config from '@/config';

const AttendanceSettings = () => {
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Settings state
  const [settings, setSettings] = useState({
    minAttendancePercentage: 75,
    warnAtPercentage: 85,
    allowExcusedAbsences: true,
    allowSelfMarking: false,
    enableAutomatedReporting: true,
    reportingFrequency: 'weekly',
    graceTimeForLateMarkingMinutes: 10
  });
  
  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/api/admin/attendance/settings`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSettings(data.data);
          }
        } else {
          console.error('Failed to fetch attendance settings');
          setError('Failed to load settings. Please refresh the page.');
        }
      } catch (error) {
        console.error('Error fetching attendance settings:', error);
        setError('An error occurred while loading settings.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [token]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear any success/error messages when user makes changes
    setSuccess(false);
    setError('');
  };
  
  // Handle select changes
  const handleSelectChange = (name, value) => {
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear any success/error messages when user makes changes
    setSuccess(false);
    setError('');
  };
  
  // Handle slider changes
  const handleSliderChange = (name, value) => {
    setSettings(prev => ({
      ...prev,
      [name]: value[0]
    }));
    
    // Clear any success/error messages when user makes changes
    setSuccess(false);
    setError('');
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setSuccess(false);
      setError('');
      
      // Validate settings
      if (settings.minAttendancePercentage < 0 || settings.minAttendancePercentage > 100) {
        setError('Minimum attendance percentage must be between 0 and 100');
        return;
      }
      
      if (settings.warnAtPercentage < 0 || settings.warnAtPercentage > 100) {
        setError('Warning threshold percentage must be between 0 and 100');
        return;
      }
      
      if (settings.graceTimeForLateMarkingMinutes < 0 || settings.graceTimeForLateMarkingMinutes > 60) {
        setError('Grace time for late marking must be between 0 and 60 minutes');
        return;
      }
      
      const response = await fetch(`${config.API_URL}/api/admin/attendance/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(true);
        } else {
          setError(data.message || 'Failed to save settings');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving attendance settings:', error);
      setError('An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance Settings</h1>
        <p className="text-gray-500">Configure attendance policies and parameters</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Thresholds</CardTitle>
            <CardDescription>Set minimum attendance requirements and warning thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="minAttendancePercentage">Minimum Required Attendance</Label>
                <span className="text-sm font-medium">{settings.minAttendancePercentage}%</span>
              </div>
              <Slider
                id="minAttendancePercentage"
                value={[settings.minAttendancePercentage]}
                onValueChange={(value) => handleSliderChange('minAttendancePercentage', value)}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-sm text-gray-500">
                Students must maintain this attendance percentage to qualify for examinations
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="warnAtPercentage">Warning Threshold</Label>
                <span className="text-sm font-medium">{settings.warnAtPercentage}%</span>
              </div>
              <Slider
                id="warnAtPercentage"
                value={[settings.warnAtPercentage]}
                onValueChange={(value) => handleSliderChange('warnAtPercentage', value)}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-sm text-gray-500">
                Students will receive warnings when their attendance falls below this percentage
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Attendance Policies</CardTitle>
            <CardDescription>Configure how attendance is managed and recorded</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowExcusedAbsences"
                name="allowExcusedAbsences"
                checked={settings.allowExcusedAbsences}
                onCheckedChange={(checked) => 
                  handleSelectChange('allowExcusedAbsences', checked)
                }
              />
              <Label htmlFor="allowExcusedAbsences">Allow Excused Absences</Label>
            </div>
            <p className="text-sm text-gray-500 pl-6">
              Excused absences will not count against the student's attendance percentage
            </p>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowSelfMarking"
                name="allowSelfMarking"
                checked={settings.allowSelfMarking}
                onCheckedChange={(checked) => 
                  handleSelectChange('allowSelfMarking', checked)
                }
              />
              <Label htmlFor="allowSelfMarking">Allow Self-Marking</Label>
            </div>
            <p className="text-sm text-gray-500 pl-6">
              Students can mark their own attendance (requires faculty approval)
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="graceTimeForLateMarkingMinutes">Grace Period for Late Marking (minutes)</Label>
              <Input
                id="graceTimeForLateMarkingMinutes"
                name="graceTimeForLateMarkingMinutes"
                type="number"
                value={settings.graceTimeForLateMarkingMinutes}
                onChange={handleChange}
                min={0}
                max={60}
              />
              <p className="text-sm text-gray-500">
                Students arriving within this grace period will be marked as "Late" instead of "Absent"
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Automated Reporting</CardTitle>
            <CardDescription>Configure automated attendance reporting settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableAutomatedReporting"
                name="enableAutomatedReporting"
                checked={settings.enableAutomatedReporting}
                onCheckedChange={(checked) => 
                  handleSelectChange('enableAutomatedReporting', checked)
                }
              />
              <Label htmlFor="enableAutomatedReporting">Enable Automated Reporting</Label>
            </div>
            <p className="text-sm text-gray-500 pl-6">
              System will automatically generate and send attendance reports on schedule
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="reportingFrequency">Reporting Frequency</Label>
              <Select
                value={settings.reportingFrequency}
                onValueChange={(value) => handleSelectChange('reportingFrequency', value)}
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
              <p className="text-sm text-gray-500">
                How often attendance reports will be automatically generated and sent
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Save Settings</CardTitle>
            <CardDescription>Apply changes to attendance settings</CardDescription>
          </CardHeader>
          <CardContent>
            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md flex items-center">
                <Check className="h-5 w-5 mr-2 text-green-500" />
                <span>Settings saved successfully!</span>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                <span>{error}</span>
              </div>
            )}
            
            <p className="text-sm text-gray-500 mb-4">
              Click the button below to save your attendance configuration changes. These settings will apply to all attendance records going forward.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSaveSettings} 
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceSettings; 