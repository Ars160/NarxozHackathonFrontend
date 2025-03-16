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
};