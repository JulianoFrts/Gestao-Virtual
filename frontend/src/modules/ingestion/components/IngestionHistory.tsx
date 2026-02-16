import React, { useEffect, useState } from 'react';
import { FileUp, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

interface IngestionRecord {
  id: string;
  filename: string;
  fileType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  recordsProcessed: number;
  errorMessage?: string;
  createdAt: string;
}

export function IngestionHistory({ refreshTrigger }: { refreshTrigger: number }) {
  const [ingestions, setIngestions] = useState<IngestionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIngestions();
  }, [refreshTrigger]);

  const fetchIngestions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/ingestion`);
      if (response.ok) {
        const data = await response.json();
        setIngestions(data);
      }
    } catch (error) {
      console.error('Failed to fetch ingestions', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PROCESSING': return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) return <div className="text-center py-4">Loading history...</div>;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Ingestion History</h3>
      </div>
      <div className="border-t border-gray-200">
        <ul role="list" className="divide-y divide-gray-200">
          {ingestions.length === 0 ? (
             <li className="px-4 py-4 sm:px-6 text-gray-500 text-center">No files ingested yet.</li>
          ) : (
            ingestions.map((ingestion) => (
              <li key={ingestion.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-blue-600 truncate">
                        {ingestion.filename}
                      </div>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span className="mr-2 px-2 py-0.5 rounded bg-gray-100 uppercase font-bold text-xxs tracking-wide">
                          {ingestion.fileType}
                        </span>
                        <span>{new Date(ingestion.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {ingestion.errorMessage ? (
                      <div className="text-right mr-4">
                        <p className="text-sm font-medium text-red-600">Failed</p>
                        <p className="text-xs text-red-400 max-w-xs truncate" title={ingestion.errorMessage}>
                          {ingestion.errorMessage}
                        </p>
                      </div>
                    ) : (
                      <div className="text-right mr-4">
                         <p className="text-sm text-gray-900">
                           {ingestion.recordsProcessed} records
                         </p>
                         <p className="text-xs text-gray-500">Processed</p>
                      </div>
                    )}
                    <div>
                      {getStatusIcon(ingestion.status)}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
