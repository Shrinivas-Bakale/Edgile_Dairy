import { useSnackbar } from '../../contexts/SnackbarContext';

// Format weekly hours for display
const formatWeeklyHours = (hours: number): string => {
  if (Number.isInteger(hours)) {
    return `${hours} hours per week`;
  } else {
    return `${Math.floor(hours)}-${Math.ceil(hours)} hours per week`;
  }
}; 

                <div className="mb-6">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Weekly Hours:
                  </div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {subject.weeklyHours ? formatWeeklyHours(subject.weeklyHours) : 'Not specified'}
                  </div>
                </div> 

const SubjectEditPage = () => {
  const { showSnackbar } = useSnackbar();
  
  // When updating a subject
  const handleUpdate = async () => {
    try {
      // Existing update logic
      
      // Replace any success message divs with:
      showSnackbar('Subject updated successfully', 'success');
    } catch (error) {
      // Replace any error message divs with:
      showSnackbar(error.message || 'Failed to update subject', 'error');
    }
  };

  // When archiving/deleting a subject
  const handleArchive = async () => {
    try {
      // Existing archive logic
      
      // Replace any success message divs with:
      showSnackbar('Subject archived successfully', 'success');
    } catch (error) {
      // Replace any error message divs with:
      showSnackbar(error.message || 'Failed to archive subject', 'error');
    }
  };
  
  // Component JSX
}; 