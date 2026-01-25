import { useState, useEffect } from 'react';
import { Report } from '@/types/export';
import { 
  getReports, 
  subscribeToReports, 
  updateReportStatus,
  getReportsByStatus,
  getReportsByCategory,
  getUrgentReports
} from '@/lib/firestore/reports';

export const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToReports((newReports) => {
      setReports(newReports);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateStatus = async (reportId: string, status: string) => {
    try {
      await updateReportStatus(reportId, status);
      // The real-time listener will update the UI automatically
    } catch (err) {
      setError('Failed to update report status');
      console.error('Error updating report status:', err);
    }
  };

  const getByStatus = async (status: string) => {
    try {
      setLoading(true);
      const statusReports = await getReportsByStatus(status);
      return statusReports;
    } catch (err) {
      setError('Failed to fetch reports by status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getByCategory = async (category: string) => {
    try {
      setLoading(true);
      const categoryReports = await getReportsByCategory(category);
      return categoryReports;
    } catch (err) {
      setError('Failed to fetch reports by category');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUrgent = async (threshold?: number) => {
    try {
      const urgentReports = await getUrgentReports(threshold);
      return urgentReports;
    } catch (err) {
      setError('Failed to fetch urgent reports');
      throw err;
    }
  };

  return {
    reports,
    loading,
    error,
    updateStatus,
    getByStatus,
    getByCategory,
    getUrgent
  };
};