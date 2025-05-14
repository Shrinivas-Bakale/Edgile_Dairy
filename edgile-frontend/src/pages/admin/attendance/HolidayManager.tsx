import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import config from '@/config';
import simpleToast from '@/hooks/use-simple-toast';

interface Holiday {
  _id: string;
  date: string;
  name: string;
  description?: string;
}

const HolidayManager = () => {
  const navigate = useNavigate();
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [holidayName, setHolidayName] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/api/admin/holidays`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setHolidays(data.data?.holidays || []);
          } else {
            throw new Error(data.message || 'Failed to fetch holidays');
          }
        } else {
          throw new Error('Failed to fetch holidays');
        }
      } catch (error) {
        console.error('Error fetching holidays:', error);
        simpleToast({
          title: 'Error',
          description: 'Failed to fetch holidays. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchHolidays();
  }, [token]);
  
  // Add holiday
  const handleAddHoliday = async () => {
    if (!selectedDate || !holidayName.trim()) {
      simpleToast({
        title: 'Missing Information',
        description: 'Please select a date and enter a holiday name.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setSaving(true);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      const response = await fetch(`${config.API_URL}/api/admin/holidays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: formattedDate,
          name: holidayName,
          description: holidayDescription
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          simpleToast({
            title: 'Success',
            description: 'Holiday added successfully.',
            variant: 'default'
          });
          
          // Reset form
          setHolidayName('');
          setHolidayDescription('');
          setIsDialogOpen(false);
          
          // Refresh holidays
          const updatedHolidays = [...holidays, data.data.holiday];
          setHolidays(updatedHolidays);
        } else {
          throw new Error(data.message || 'Failed to add holiday');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add holiday');
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      simpleToast({
        title: 'Error',
        description: error.message || 'Failed to add holiday',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Delete holiday
  const handleDeleteHoliday = async (holidayId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${config.API_URL}/api/admin/holidays/${holidayId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          simpleToast({
            title: 'Success',
            description: 'Holiday deleted successfully.',
            variant: 'default'
          });
          
          // Update holidays list
          const updatedHolidays = holidays.filter(h => h._id !== holidayId);
          setHolidays(updatedHolidays);
        } else {
          throw new Error(data.message || 'Failed to delete holiday');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete holiday');
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      simpleToast({
        title: 'Error',
        description: error.message || 'Failed to delete holiday',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy (EEEE)');
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/admin/attendance')}
          className="text-gray-500 hover:text-gray-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Attendance Settings
        </Button>
      </div>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Holiday Management</h1>
        <p className="text-gray-500">Manage holidays and class-free days</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Holidays</CardTitle>
                <CardDescription>List of holidays and class-free days</CardDescription>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Holiday
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Holiday</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date</Label>
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="h-4 w-4 text-gray-500" />
                        <span>
                          {selectedDate ? format(selectedDate, 'MMMM dd, yyyy (EEEE)') : 'Select a date'}
                        </span>
                      </div>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="border rounded-md"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="name">Holiday Name</Label>
                      <Input
                        id="name"
                        value={holidayName}
                        onChange={(e) => setHolidayName(e.target.value)}
                        placeholder="e.g., Independence Day"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        value={holidayDescription}
                        onChange={(e) => setHolidayDescription(e.target.value)}
                        placeholder="Additional details about the holiday"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddHoliday}
                      disabled={saving || !selectedDate || !holidayName.trim()}
                    >
                      {saving ? 'Adding...' : 'Add Holiday'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : holidays.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Holiday Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((holiday) => (
                          <TableRow key={holiday._id}>
                            <TableCell className="font-medium">
                              {formatDate(holiday.date)}
                            </TableCell>
                            <TableCell>{holiday.name}</TableCell>
                            <TableCell>{holiday.description || '-'}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteHoliday(holiday._id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <CalendarIcon className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-1">No Holidays Set</h3>
                  <p className="text-gray-500 mb-4">There are no holidays or class-free days defined yet.</p>
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Your First Holiday
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>About Holidays</CardTitle>
              <CardDescription>How holidays affect attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <p>
                  Holidays and class-free days are dates when no classes are scheduled 
                  and no attendance is recorded. This helps in:
                </p>
                
                <ul className="list-disc pl-5 space-y-2">
                  <li>Preventing faculty from marking attendance on holidays</li>
                  <li>Ensuring attendance reports exclude holiday dates</li>
                  <li>Properly calculating attendance percentages</li>
                  <li>Showing holiday information on timetables and calendars</li>
                </ul>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <h4 className="font-medium text-blue-700 mb-1">Automatic Holidays</h4>
                  <p className="text-blue-600">
                    The system automatically recognizes all Sundays as non-working days.
                    You don't need to add these manually.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Holiday Calendar</CardTitle>
              <CardDescription>Visual view of holidays</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="multiple"
                selected={holidays.map(h => new Date(h.date))}
                className="border rounded-md"
                disabled
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HolidayManager; 