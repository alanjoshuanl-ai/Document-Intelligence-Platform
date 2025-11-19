"use client";

import { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  FileText, 
  AlertCircle, 
  FolderOpen,
  User,
  Calendar,
  MessageSquare,
  Download,
  Eye,
  Filter,
  ChevronRight,
  Users,
  MessageCircle,
  Bot,
  FileCode
} from 'lucide-react';

const DOCUMENTS_ENDPOINT = "http://localhost:8080/documents/";

function formatDate(dateString) {
  if (!dateString) return 'NULL';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD-MM-YYYY format
  } catch {
    return 'NULL';
  }
}

function DocumentCard({ document, index, isSelected, onClick }) {
  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border transition-all duration-300 hover:shadow-xl cursor-pointer transform hover:-translate-y-1 ${
        isSelected 
          ? 'border-blue-500/60 ring-2 ring-blue-500/20 scale-[1.02] bg-slate-800/70' 
          : 'border-slate-700/50 hover:border-blue-400/40 hover:bg-slate-800/70'
      }`}
      onClick={onClick}
      style={{ 
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out both'
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white line-clamp-1">
                {document.filename || 'Unnamed File'}
              </h3>
              <p className="text-sm text-slate-400 capitalize">
                {document.file_type || 'Unknown type'}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
            isSelected 
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
              : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
          }`}>
            <Calendar className="w-3 h-3" />
            <span>{formatDate(document.created_at)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center space-x-1 text-slate-400 mb-1">
              <User className="w-3 h-3" />
              <span className="text-xs">Client</span>
            </div>
            <p className="font-medium text-white">
              {document.client_name || 'NULL'}
            </p>
          </div>
          <div>
            <div className="flex items-center space-x-1 text-slate-400 mb-1">
              <MessageSquare className="w-3 h-3" />
              <span className="text-xs">Language</span>
            </div>
            <p className="font-medium text-white">
              {document.language || 'NULL'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentDetails({ document, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Document Details</h2>
                <p className="text-slate-400 text-sm">Complete file information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors duration-200 group"
            >
              <X className="w-4 h-4 text-slate-300 group-hover:text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Filename</span>
              </label>
              <p className="text-lg font-semibold text-white bg-slate-700/50 p-3 rounded-lg border border-slate-600/50">
                {document.filename || 'NULL'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>File Type</span>
              </label>
              <p className="text-lg font-semibold text-white bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 capitalize">
                {document.file_type || 'NULL'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Client Name</span>
              </label>
              <p className="text-lg font-semibold text-white bg-slate-700/50 p-3 rounded-lg border border-slate-600/50">
                {document.client_name || 'NULL'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Language</span>
              </label>
              <p className="text-lg font-semibold text-white bg-slate-700/50 p-3 rounded-lg border border-slate-600/50">
                {document.language || 'NULL'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Created Date</span>
              </label>
              <p className="text-lg font-semibold text-white bg-slate-700/50 p-3 rounded-lg border border-slate-600/50">
                {formatDate(document.created_at)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>User Prompt</span>
            </label>
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
              <p className="text-white whitespace-pre-wrap">
                {document.user_prompt || (
                  <span className="text-slate-400 italic">NULL</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchBar({ searchTerm, onSearchChange, resultsCount, totalCount }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by client name or filename..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 bg-slate-700/50 text-white placeholder-slate-400 focus:bg-slate-700/70"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-medium border border-blue-500/30">
            {resultsCount} of {totalCount} documents
          </span>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ icon: Icon, title, value, description, gradient, delay }) {
  return (
    <div 
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${gradient}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="h-8 bg-slate-700 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-slate-700 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 max-w-4xl">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-xl"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-700 rounded w-20"></div>
                  <div className="h-6 bg-slate-700 rounded w-12"></div>
                  <div className="h-3 bg-slate-700 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="h-12 bg-slate-700 rounded-xl animate-pulse"></div>
      </div>

      <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-6 bg-slate-700 rounded w-40 animate-pulse"></div>
            <div className="h-4 bg-slate-700 rounded w-60 animate-pulse"></div>
          </div>
          <div className="h-4 bg-slate-700 rounded w-16 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-32"></div>
                    <div className="h-3 bg-slate-700 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-6 bg-slate-700 rounded w-16"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="h-3 bg-slate-700 rounded w-12"></div>
                  <div className="h-4 bg-slate-700 rounded w-20"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-slate-700 rounded w-16"></div>
                  <div className="h-4 bg-slate-700 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState({
    totalProcessed: 0,
    documents: [],
    error: null,
    loading: true,
    stats: {
      totalClients: 0,
      userPromptDocuments: 0,
      systemPromptDocuments: 0
    }
  });

  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await fetch(DOCUMENTS_ENDPOINT);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const result = await res.json();
        if (result.status !== "success") {
          throw new Error("API returned error status");
        }
        
        const documents = Array.isArray(result.documents) ? result.documents : [];
        
        // Calculate statistics
        const uniqueClients = new Set(documents.map(doc => doc.client_name).filter(Boolean));
        const userPromptDocs = documents.filter(doc => doc.user_prompt && doc.user_prompt.trim() !== '').length;
        const systemPromptDocs = documents.filter(doc => !doc.user_prompt || doc.user_prompt.trim() === '').length;
        
        setData({
          totalProcessed: result.total_processed ?? 0,
          documents: documents,
          error: null,
          loading: false,
          stats: {
            totalClients: uniqueClients.size,
            userPromptDocuments: userPromptDocs,
            systemPromptDocuments: systemPromptDocs
          }
        });
      } catch (error) {
        console.error("Failed to load documents:", error);
        setData({
          totalProcessed: 0,
          documents: [],
          error: "Failed to load documents. Please check if the server is running.",
          loading: false,
          stats: {
            totalClients: 0,
            userPromptDocuments: 0,
            systemPromptDocuments: 0
          }
        });
      }
    }

    loadDocuments();
  }, []);

  const { totalProcessed, documents, error, loading, stats } = data;

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const filename = (doc.filename || '').toLowerCase();
    const clientName = (doc.client_name || '').toLowerCase();
    
    return filename.includes(searchLower) || clientName.includes(searchLower);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
      {/* Custom animations */}
      <style jsx global>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out both;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Document Dashboard
            </h1>
            <p className="text-slate-400 text-lg">
              Overview of processed documents and saved prompts.
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={FileCode}
              title="Total Processed Files"
              value={totalProcessed}
              description={totalProcessed === 1 ? "1 document" : `${totalProcessed} documents`}
              gradient="bg-gradient-to-br from-blue-500 to-purple-600"
              delay={0}
            />
            <StatsCard
              icon={Users}
              title="Total Clients"
              value={stats.totalClients}
              description={stats.totalClients === 1 ? "1 unique client" : `${stats.totalClients} unique clients`}
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              delay={100}
            />
            <StatsCard
              icon={MessageCircle}
              title="User Prompts"
              value={stats.userPromptDocuments}
              description={stats.userPromptDocuments === 1 ? "1 document" : `${stats.userPromptDocuments} documents`}
              gradient="bg-gradient-to-br from-orange-500 to-red-600"
              delay={200}
            />
            <StatsCard
              icon={Bot}
              title="System Prompts"
              value={stats.systemPromptDocuments}
              description={stats.systemPromptDocuments === 1 ? "1 document" : `${stats.systemPromptDocuments} documents`}
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
              delay={300}
            />
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          resultsCount={filteredDocuments.length}
          totalCount={documents.length}
        />

        {/* Documents Grid */}
        <div className="space-y-6">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                  <span>Processing History</span>
                </h2>
                <p className="text-slate-400 mt-1">
                  Recent files with metadata. Click on any card to view details.
                </p>
              </div>
              <div className="text-sm text-slate-400">
                {filteredDocuments.length} of {documents.length} items
              </div>
            </div>

            {error ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 font-medium">{error}</p>
                <p className="text-slate-400 text-sm mt-2">
                  Make sure the backend server is running on http://localhost:8080
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-600/50">
                  <FolderOpen className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  {searchTerm ? 'No documents found' : 'No documents processed yet'}
                </h3>
                <p className="text-slate-400">
                  {searchTerm 
                    ? 'Try adjusting your search terms to find what you\'re looking for.'
                    : 'Processed documents will appear here.'
                  }
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear search</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc, idx) => (
                  <DocumentCard
                    key={idx}
                    document={doc}
                    index={idx}
                    isSelected={selectedDocument === doc}
                    onClick={() => setSelectedDocument(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Details Modal */}
      <DocumentDetails
        document={selectedDocument}
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  );
}