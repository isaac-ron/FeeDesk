import api from './api';

// Statement-import: upload a bank/M-Pesa statement, map its columns once, and
// reconcile every credit line through the same matching ladder as live payments.
const statementService = {
  // Parse a file server-side and return headers + sample rows for column mapping.
  preview: async (file, delimiter = ',') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('delimiter', delimiter);
    const { data } = await api.post('/statements/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  // Import using a column mapping. Returns a summary { imported, autoMatched, suspense, duplicates, ... }.
  import: async ({ file, mapping, saveAs }) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mapping', JSON.stringify(mapping));
    if (saveAs) fd.append('saveAs', saveAs);
    const { data } = await api.post('/statements/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  listProfiles: async () => {
    const { data } = await api.get('/statements/profiles');
    return data.data || [];
  },
};

export default statementService;
