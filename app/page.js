"use client";
import { useState, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

function PDFChatInterface() {
  const [schemaJson, setSchemaJson] = useState("");
  const [metadata, setMetadata] = useState({});
  const [description, setDescription] = useState(""); // structured markdown
  const [generatedJson, setGeneratedJson] = useState({}); // schema-based JSON
  const [suggestedPrompt, setSuggestedPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [promptResult, setPromptResult] = useState(null);

  const [pdfUrl, setPdfUrl] = useState(null);
  const [fileType, setFileType] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const uploadedFile = useRef(null);

  // Handle file selection + preview
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadedFile.current = file;
      const ext = file.name.split(".").pop().toLowerCase();
      setFileType(ext);

      if (ext === "pdf") {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      } else {
        setPdfUrl(null);
      }
    }
  };

  // Process file with backend
  const handleProcessFile = async () => {
    if (!uploadedFile.current) {
      alert("❌ Please upload a file first.");
      return;
    }
    if (!schemaJson.trim()) {
      alert("❌ Please provide schema JSON in the textarea.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", uploadedFile.current);
      formData.append("schema_json", schemaJson);

      const response = await axios.post(
        "http://localhost:8000/process-document/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.status === "success") {
        setMetadata(response.data.metadata);
        setDescription(response.data.structured_markdown);
        setGeneratedJson(response.data.generated_json);
        setSuggestedPrompt(response.data.suggested_prompt || "");
      } else {
        alert("❌ Error: " + response.data.message);
      }
    } catch (error) {
      console.error(error);
      alert("❌ API call failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Try prompt
  const handleTryPrompt = async () => {
    if (!userPrompt.trim()) return;

    try {
      const response = await axios.post("http://localhost:8000/try-prompt/", {
        prompt: userPrompt,
        structured_markdown: description,
      });

      setPromptResult(response.data.result);
    } catch (err) {
      console.error(err);
      setPromptResult({ error: "Failed to try prompt" });
    }
  };

  // Save prompt
  const handleSavePrompt = async () => {
    if (!userPrompt.trim() || !metadata.layout) {
      alert("❌ Missing prompt or layout");
      return;
    }

    try {
      await axios.post("http://localhost:8000/save-prompt/", {
        layout: metadata.layout,
        prompt: userPrompt,
      });

      alert("✅ Prompt saved to Supabase!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save prompt");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          PDF Intelligence Platform
        </h1>
        <p className="text-gray-600">
          Upload, analyze, and extract structured data from documents
        </p>
      </div>

      {/* Schema JSON Input */}
      <div className="mb-6 p-6 bg-white rounded-2xl shadow-lg">
        <textarea
          value={schemaJson}
          onChange={(e) => setSchemaJson(e.target.value)}
          placeholder='Enter schema JSON (e.g., {"order_id": "", "customer_name": ""})'
          className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 h-24"
        />
        <div className="w-full flex justify-center">
          <button
            onClick={handleProcessFile}
            disabled={loading}
            className={`px-6 mt-4 py-3 ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            } text-white rounded-xl font-medium`}
          >
            {loading ? "Processing..." : "Process File"}
          </button>
        </div>
      </div>

      {/* 4-Panel Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Document Preview */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Document Preview
            </h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            >
              Upload File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
            />
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl h-96 flex items-center justify-center bg-gray-50 overflow-hidden">
            {fileType === "pdf" && pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                frameBorder="0"
                title="PDF Preview"
              />
            ) : uploadedFile.current ? (
              <div className="text-center p-4">
                <div className="w-16 h-20 bg-indigo-500 mx-auto mb-4 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {fileType.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">
                  {uploadedFile.current.name}
                </p>
              </div>
            ) : (
              <div className="text-center p-4">
                <div className="w-16 h-20 bg-gray-400 mx-auto mb-4 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">DOC</span>
                </div>
                <p className="text-gray-600 mb-2">
                  Upload a PDF/Word/Excel to preview
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        
        {/* Description */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Description
          </h2>
          <div style={{overflow:"scroll"}} className="bg-gray-100 rounded-xl p-4 h-96 overflow-y-auto prose prose-sm max-w-none">
            <ReactMarkdown>
              {description || "No structured markdown yet"}
            </ReactMarkdown>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Chat</h2>

          {/* Suggested Prompt */}
          {suggestedPrompt && (
            <div className="bg-gray-100 p-3 rounded-lg mb-3">
              <p className="text-sm text-gray-700">
                💡 Suggested Prompt: <strong>{suggestedPrompt}</strong>
              </p>
            </div>
          )}

          {/* User Prompt */}
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Enter your own prompt..."
            className="w-full px-4 h-[75%] py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-black resize-none h-20"
          />

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleTryPrompt}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Try
            </button>
            <button
              onClick={handleSavePrompt}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
            >
              Save
            </button>
          </div>

          {/* Try Prompt Result */}
          {promptResult && (
            <div className="bg-gray-50 mt-4 p-3 rounded-lg text-sm text-gray-800">
              <strong>Result:</strong>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(promptResult, null, 2)}
              </pre>
            </div>
          )}
        </div>


        {/* Extracted JSON */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Extracted JSON
          </h2>
          <div className="bg-gray-100 rounded-xl p-4 h-96 overflow-y-auto">
            <pre className="text-gray-800 whitespace-pre-wrap text-sm">
              {Object.keys(generatedJson).length > 0
                ? JSON.stringify(generatedJson, null, 2)
                : "No JSON extracted yet"}
            </pre>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <PDFChatInterface />
    </div>
  );
}
