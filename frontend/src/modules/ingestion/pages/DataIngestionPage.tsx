import React, { useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { IngestionHistory } from '../components/IngestionHistory';
import { Database, FileUp } from 'lucide-react';

export default function DataIngestionPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
           <div className="flex justify-center mb-4">
             <div className="p-3 bg-blue-600 rounded-full">
               <Database className="h-8 w-8 text-white" />
             </div>
           </div>
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Universal Data Ingestion
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Upload CSV, Excel, TXT, or SVG files to ingest and process data.
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
              <FileUp className="mr-2 h-5 w-5 text-gray-400" />
              Upload New File
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Select a file to start the ingestion process. The system will automatically detect the format and apply the appropriate parsing strategy.</p>
            </div>
            <div className="mt-5">
              <FileUploader onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>
        </div>

        <IngestionHistory refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
