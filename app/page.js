"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from 'react-markdown';

function PDFChatInterface() {
  const [schemaJson, setSchemaJson] = useState(
  JSON.stringify(
    {
      UnitOfMeasure: "",
      NumberOfCartons: "",
      PricePerUnit: "",
      ExtendedAmount: "",
      OrderDetailNotes: "",
      CustomerName: "",
      DeliveryAddress: "",
      OrderDate: "",
      DeliveryDate: "",
      FileName: "",
      Currency: "",
      Language:"",
    },
    null,
    2
  )
);

  const [structuredMarkdown, setStructuredMarkdown] = useState("");
  const [outputJson, setOutputJson] = useState(null);
  const [inputPrompt, setInputPrompt] = useState("");
  const [suggestedPrompt, setSuggestedPrompt] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trying, setTrying] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileType, setFileType] = useState("");
  const [activeTab, setActiveTab] = useState("schema");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");

  const fileInputRef = useRef(null);
  const uploadedFile = useRef(null);

  // Function to convert empty strings to null in JSON
  const convertEmptyStringsToNull = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => convertEmptyStringsToNull(item));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === "") {
        result[key] = null;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = convertEmptyStringsToNull(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  // Show notification
  const showNotificationMessage = (message, type = "success") => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  // File upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadedFile.current = file;
      setFileName(file.name);
      setFileSize((file.size / 1024).toFixed(2) + " KB");
      
      // Extract file extension/type
      const fileNameParts = file.name.split('.');
      const extension = fileNameParts.length > 1 
        ? fileNameParts[fileNameParts.length - 1].toUpperCase() 
        : 'Unknown';
      setFileType(`.${extension}`);
      
      // Animation effect for file upload
      const uploadBtn = document.querySelector('.upload-button');
      if (uploadBtn) {
        uploadBtn.classList.add('upload-success');
        setTimeout(() => uploadBtn.classList.remove('upload-success'), 2000);
      }
    }
  };

  // Process file
  const handleProcessFile = async () => {
    if (!uploadedFile.current) {
      showNotificationMessage("Please upload a file first.", "error");
      return;
    }
    if (!schemaJson.trim()) {
      showNotificationMessage("Please provide schema JSON.", "error");
      return;
    }

    try {
      setLoading(true);
      setOutputJson(null);

      const formData = new FormData();
      formData.append("file", uploadedFile.current);
      formData.append("schema_json", schemaJson);

      const response = await axios.post(
        "/api/process-document",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.status === "success") {
        setStructuredMarkdown(response.data.structured_markdown);
        
        // Convert empty strings to null in the output JSON
        const processedJson = convertEmptyStringsToNull(response.data.generated_json);
        setOutputJson(processedJson);
        
        setDocumentId(response.data.document_id);

        if (response.data.suggested_prompt) {
          setSuggestedPrompt(response.data.suggested_prompt);
        }
        
        showNotificationMessage("File processed successfully!");
      } else {
        showNotificationMessage("Error: " + response.data.message, "error");
      }
    } catch (error) {
      showNotificationMessage("API call failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Try prompt
  const handleTryPrompt = async () => {
    if (!inputPrompt.trim() || !documentId) return;
    try {
      setTrying(true);
      const res = await axios.post("/api/try-prompt", {
        document: structuredMarkdown,
        user_prompt: inputPrompt,
        schema_json: schemaJson,
      });
      
      // Convert empty strings to null in the output JSON
      const processedJson = convertEmptyStringsToNull(res.data.generated_json);
      setOutputJson(processedJson);
    } catch (err) {
      showNotificationMessage("Try prompt failed: " + err.message, "error");
    } finally {
      setTrying(false);
    }
  };

  // Save prompt
  const handleSavePrompt = async () => {
    if (!inputPrompt.trim() || !documentId) return;
    try {
      await axios.post("/api/save-prompt", {
        document_id: documentId,
        user_prompt: inputPrompt,
      });
      setSuggestedPrompt(inputPrompt);
      showNotificationMessage("Prompt saved successfully!");
    } catch (err) {
      showNotificationMessage("Failed to save prompt: " + err.message, "error");
    }
  };

  // Function to get file type icon
  const getFileTypeIcon = (type) => {
    switch(type.toLowerCase()) {
      case '.pdf':
        return (
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
          </svg>
        );
      case '.doc':
      case '.docx':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
          </svg>
        );
      case '.xls':
      case '.xlsx':
        return (
          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V极zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15极414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 极3a1 1 极0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse"></div>
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-200 rounded-full opacity-10 animate-pulse"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-极64 bg-purple-200 rounded-full opacity-10 animate-pulse"></div>
      
      {/* Notification */}
      {showNotification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform ${notificationType === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'} animate-fade-in`}>
          {notificationMessage}
        </div>
      )}
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-10 transform transition-all duration-500 hover:scale-105">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 animate-fade-in-down">
            Document Intelligence Platform
          </h1>
          <p className="text-gray-600 text-lg animate-fade-in-up">
            Upload, analyze, and extract structured data from documents with AI-powered precision
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - File Info and Description */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transform transition-all duration-300 hover:shadow-2xl animate-fade-in-left">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4极h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                File Information
              </h2>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mb-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl w-full flex items-center justify-center upload-button transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor极" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 极0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Upload File
              </button>
              
              {fileName && (
                <div className="mt-4 space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getFileTypeIcon(fileType)}
                      <div className="ml-3">
                        <p className="text-gray-700 font-semibold truncate max-w-xs">
                          {fileName}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {fileType} • {fileSize}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100">
                    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg">
                      <span className="text-xs text-gray-500">Type</span>
                      <span className="text-sm font-medium text-blue-600">{fileType}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg">
                      <span className="text-xs text-gray-500">Size</span>
                      <span className="text-sm font-medium极 text-blue-600">{fileSize}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description Window with Markdown */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transform transition-all duration-300 hover:shadow-2xl animate-fade-in-left">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Documentation
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 h-96 overflow-y-auto border border-gray-200 markdown-content">
                <ReactMarkdown>
                  {structuredMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Right Column - Schema, Chat, and Output */}
          <div className="lg:col-span-2 space-y-6">
            {/* Schema JSON Input */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transform transition-all duration-300 hover:shadow-2xl animate-fade-in">
              <div className="flex border-b border-gray-200 mb-4">
                <button 
                  className={`px-4 py-2 font-medium ${activeTab === 'schema' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('schema')}
                >
                  Schema Editor
                </button>
                <button 
                  className={`px-4 py-2 font-medium ${activeTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>
              </div>
              
              {activeTab === 'schema' ? (
                <textarea
                  value={schemaJson}
                  onChange={(e) => setSchemaJson(e.target.value)}
                  placeholder='Enter schema JSON (e.g., {"order_id": "", "customer_name": ""})'
                  className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 font-mono text-sm"
                />
              ) : (
                <div className="bg-gray-50 p-4 rounded-xl h-32 overflow-auto">
                  <pre className="text-gray-800 text-sm font-mono">
                    {schemaJson}
                  </pre>
                </div>
              )}
              
              <div className="w-full flex justify-center mt-4">
                <button
                  onClick={handleProcessFile}
                  disabled={loading}
                  className={`px-8 py-3 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    loading 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
                  } flex items-center justify-center`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r极="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 极0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Process File
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chat */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col transform transition-all duration-300 hover:shadow-2xl animate-fade-in">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10极h.01M9 16H5a2 2 0 01-2-2极V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                  </svg>
                  Prompt Window
                </h2>
                
                {suggestedPrompt && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">Suggested Prompt:</span> {suggestedPrompt}
                    </p>
                  </div>
                )}
                
                <textarea
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Enter or modify your prompt here..."
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 h-32 resize-none"
                />
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleTryPrompt}
                    disabled={trying}
                    className={`px-5 py-2.5 rounded-xl text-white transition-all duration-300 transform hover:scale-105 active:scale-95 flex-1 flex items-center justify-center ${
                      trying
                        ? "bg-green-400 cursor-wait"
                        : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg"
                    }`}
                  >
                    {trying ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8极V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Trying...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Try Prompt
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleSavePrompt}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md极 hover:shadow-lg flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns极="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                    </svg>
                    Save
                  </button>
                </div>
              </div>

              {/* Output JSON */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transform transition-all duration-300 hover:shadow-2xl animate-fade-in-right">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500极" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                  </svg>
                  Output JSON
                </h2>
                
                <div className="bg-gray-50 rounded-xl p-4 h-96 overflow-y-auto border border-gray-200">
                  {outputJson ? (
                    <pre className="text-gray-800 whitespace-pre-wrap text-sm font-mono animate-fade-in">
                      {JSON.stringify(outputJson, null, 2)}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 animate-pulse">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707极V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p>No JSON generated yet. Process a file to see results.</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {outputJson && (
                  <button 
                    className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-all duration-300 flex items-center ml-auto"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(outputJson, null, 2));
                      showNotificationMessage("JSON copied to clipboard!");
                    }}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2极h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 极0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                    </svg>
                    Copy JSON
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade极InDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-fade-in-left {
          animation: fadeInLeft 0.6s ease-out forwards;
        }
        .animate-fade-in-right {
          animation: fadeInRight 0.6s ease-out forwards;
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.8s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .upload-success {
          animation: pulse 2s;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .markdown-content {
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content h1 {
          font-size: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.3rem;
        }
        .markdown-content h2 {
          font-size: 1.3rem;
        }
        .markdown-content h3 {
          font-size: 1.1rem;
        }
        .markdown-content p {
          margin-bottom: 1rem;
        }
        .markdown-content ul, .markdown-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .markdown-content li {
          margin-bottom: 0.5rem;
        }
        .markdown-content code {
          background-color: #f3f4f6;
          padding: 0.1rem 0.3rem;
          border-radius: 0.25rem;
          font-family: monospace;
        }
        .markdown-content pre {
          background-color: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1rem;
        }
        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  return <PDFChatInterface />;
}
