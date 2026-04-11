import api from './api';

const studentService = {
  getStudents: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.classLevel) query.append('classLevel', params.classLevel);
    if (params.search) query.append('search', params.search);
    const response = await api.get(`/students?${query.toString()}`);
    return response.data;
  },

  getStudent: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  getStudentByAdmission: async (admissionNumber) => {
    const response = await api.get(`/students/admission/${admissionNumber}`);
    return response.data;
  },

  createStudent: async (studentData) => {
    const response = await api.post('/students', studentData);
    return response.data;
  },

  updateStudent: async (id, studentData) => {
    const response = await api.put(`/students/${id}`, studentData);
    return response.data;
  },

  deleteStudent: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },
};

export default studentService;
