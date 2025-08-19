import axios from "axios";

const API = axios.create({
    baseURL: 'http://localhost:5000/schedule'
})

export const getGeneralSchedule = async () => {
    try {
      const response = await API.get("/")
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return {success: true, data: response.data}
    } catch (error) {
      console.error('Error fetching general schedule:', error);
      return {success: false, data: error}
    }
}