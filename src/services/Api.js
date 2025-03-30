const BASE_URL = 'http://localhost:5000';

export const scheduleApi = {
  getGeneralSchedule: async () => {
    try {
      const response = await fetch(`${BASE_URL}/schedule`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching general schedule:', error);
      throw error;
    }
  },

  getStudentSchedule: async (studentId) => {
    try {
      const response = await fetch(`${BASE_URL}/schedule/student/${studentId}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching student schedule:', error);
      throw error;
    }
  },

  exportGeneralSchedule: async () => {
    try {
      const response = await fetch(`${BASE_URL}/schedule/export`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'general_schedule.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting schedule:', error);
      throw error;
    }
  },

  exportStudentSchedule: async (studentId) => {
    try {
      const response = await fetch(`${BASE_URL}/schedule/student/${studentId}/export`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_${studentId}_schedule.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting student schedule:', error);
      throw error;
    }
  },

  createExam: async (formData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/init`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  },

  manageDates: async (action, dateData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/manage_dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...dateData }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error managing dates:', error);
      throw error;
    }
  },
  
  getSubjects: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_subjects' }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data.subjects;
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }
  },

  deleteSubject: async (subject) => {
    try {
      const response = await fetch(`${BASE_URL}/api/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'delete_subject', subject }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  },

  deleteSection: async (section) => {
    try {
      const response = await fetch(`${BASE_URL}/api/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'delete_section', section }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting section:', error);
      throw error;
    }
  },

  generateSchedule: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate' }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  },

  // -------------------------------------CreateExamPage---------------------------------------------

  getSessions: async() => {
    try{
      const response = await fetch(`${BASE_URL}/api/sessions`);
      if(!response.ok)
        throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Error fetching exams sessions:', error);
      throw error;
    }
  },

  activateSession: async(sessionId) => {
    try{
      const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}/activate`, {
        method: 'POST',
      });
      if(!response.ok)
        throw new Error('Network response was not ok')
      return await response.json();
    } catch (error){
      console.error('Error fetching exams sessions:', error);
      throw error;
    }
  },

  deleteSession: async (sessionId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },

  // New date management functions
  removeDate: async (date) => {
    try {
      const response = await fetch(`${BASE_URL}/api/manage_dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'remove',
          date: date 
        }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error removing date:', error);
      throw error;
    }
  },

  addCustomDate: async (date) => {
    try {
      const response = await fetch(`${BASE_URL}/api/manage_dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'add_custom',
          custom_date: date 
        }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error adding custom date:', error);
      throw error;
    }
  },

  restoreDates: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/manage_dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restore' }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error restoring dates:', error);
      throw error;
    }
  },

  updateExamStatus: async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/api/update_exam_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // If the server returns an error message, use it
        throw new Error(responseData.message || `Ошибка HTTP: ${response.status}`);
      }
      
      return responseData;
    } catch (error) {
      console.error('Error updating exam status:', error);
      throw error;
    }
  },
  
  updateProctorStatus: async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/api/update_proctor_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // If the server returns an error message, use it
        throw new Error(responseData.message || `Ошибка HTTP: ${response.status}`);
      }
      
      return responseData;
    } catch (error) {
      console.error('Error updating proctor status:', error);
      throw error;
    }
  }
}; 


