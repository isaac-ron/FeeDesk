import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studentService from '../services/studentService';
import api from '../services/api';

const STUDENTS_KEY = 'students';

export const useStudents = (params = {}) =>
  useQuery({
    queryKey: [STUDENTS_KEY, params],
    queryFn: () => studentService.getStudents(params),
  });

export const useStudent = (id) =>
  useQuery({
    queryKey: [STUDENTS_KEY, id],
    queryFn: () => studentService.getStudent(id),
    enabled: !!id,
  });

export const useStudentByAdmission = (admissionNumber) =>
  useQuery({
    queryKey: [STUDENTS_KEY, 'admission', admissionNumber],
    queryFn: () => studentService.getStudentByAdmission(admissionNumber),
    enabled: !!admissionNumber?.trim(),
  });

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => studentService.createStudent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STUDENTS_KEY] }),
  });
};

export const useUpdateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => studentService.updateStudent(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STUDENTS_KEY] }),
  });
};

export const useDeleteStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => studentService.deleteStudent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STUDENTS_KEY] }),
  });
};

export const useImportStudents = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (csv) => api.post('/students/import', { csv }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STUDENTS_KEY] }),
  });
};
