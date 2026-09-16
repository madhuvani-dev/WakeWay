import React, { useState } from 'react';
import { Download, FileCode, Folder, CheckCircle, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import { ANDROID_PROJECT_FILES } from '../data/androidFiles';
import { downloadAndroidProjectZip } from '../utils/zipGenerator';

export const ProjectExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState(ANDROID_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setIsZipping(true);
    try {
      await downloadAndroidProjectZip();
    } catch (e) {
      console.error(e);
      alert('Could not package ZIP. You can also export via the AI Studio Settings menu.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-950/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Android Studio Project Codebase
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-[#00B4D8] border border-[#00B4D8]/30 font-mono">
              SDK 35 • Kotlin 2.0 • Compose M3
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete, authentic native Android project ready to build and run in Android Studio.
          </p>
        </div>

        {/* 1-Click ZIP Download Action */}
        <button
          id="btn-download-android-zip"
          onClick={handleDownload}
          disabled={isZipping}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00B4D8] hover:bg-[#0096b4] text-[#0B132B] font-bold text-xs shadow-lg shadow-[#00B4D8]/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isZipping ? 'Packaging ZIP...' : 'Download Project (.zip)'}</span>
        </button>
      </div>

      {/* Main Split Layout: File Tree on left, Code Preview on right */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: File List */}
        <div className="w-full md:w-80 border-r border-slate-800 bg-slate-950/40 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#00B4D8]" />
              <span>Project Files</span>
            </div>
            <div className="space-y-1">
              {ANDROID_PROJECT_FILES.map((file) => {
                const isSelected = selectedFile.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider opacity-60 shrink-0">
                      {file.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Android Studio Quick Guide Box */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Opening in Android Studio</span>
            </div>
            <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal pl-4">
              <li>Click <b>Download Project (.zip)</b> or export via AI Studio menu.</li>
              <li>Extract the ZIP folder on your computer.</li>
              <li>In Android Studio, select <b>Open</b> and choose the extracted folder.</li>
              <li>Wait for Gradle sync, then press <b>Run</b> (<kbd className="bg-slate-800 px-1 rounded">Shift+F10</kbd>).</li>
            </ol>
          </div>
        </div>

        {/* Right Pane: Code Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* File Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60">
            <div>
              <div className="text-xs font-mono text-[#00B4D8]">
                {selectedFile.path}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {selectedFile.description}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Code Content */}
          <div className="flex-1 overflow-auto p-6 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950">
            <pre className="whitespace-pre">{selectedFile.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
