// src/services/api.js

const BASE_URL = 'http://localhost:5000'; // Замените на ваш URL бэкенда

export const scheduleApi = {
  // Получение общего расписания
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

  // Получение расписания для конкретного студента
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

  // Экспорт общего расписания в Excel
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

  // Экспорт расписания студента в Excel
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
  }
};