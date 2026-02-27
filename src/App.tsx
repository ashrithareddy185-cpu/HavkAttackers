/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Mic, 
  MicOff, 
  Send, 
  Image as ImageIcon, 
  Volume2, 
  VolumeX, 
  RefreshCw,
  MessageSquare,
  Sparkles,
  Trash2,
  Download,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { describeImage, generateSpeech, Message } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LANGUAGES = [
  { label: 'English', value: 'English' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'French', value: 'French' },
  { label: 'German', value: 'German' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Japanese', value: 'Japanese' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'Arabic', value: 'Arabic' },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'speaking'>('idle');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadConversation = () => {
    const content = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visiontalk-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text && !image) return;

    const userMsg: Message = { role: 'user', text: text || "Analyze this image", image: image || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setStatus('analyzing');

    try {
      const responseText = await describeImage(image || "", text || "What do you see in this image?", messages, selectedLanguage) || "I couldn't analyze the image.";

      const modelMsg: Message = { role: 'model', text: responseText };
      setMessages(prev => [...prev, modelMsg]);

      if (isTtsEnabled) {
        setStatus('speaking');
        const audioData = await generateSpeech(responseText);
        if (audioData) {
          const audio = new Audio(`data:audio/wav;base64,${audioData}`);
          audio.play();
          audio.onended = () => setStatus('idle');
        } else {
          setStatus('idle');
        }
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error processing your request." }]);
      setStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // In a real app, we'd send this to Gemini for STT
        // For this demo, we'll simulate STT or just use it as a trigger
        // Gemini 2.5 Flash can handle audio input directly.
        // For now, let's just toggle recording state.
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setImage(null);
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">VisionTalk</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-lg px-2 py-1">
              <Globe size={14} className="text-zinc-500" />
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-xs text-zinc-300 border-none focus:ring-0 cursor-pointer"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value} className="bg-zinc-900 text-white">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={downloadConversation}
              disabled={messages.length === 0}
              className={cn(
                "p-2 rounded-full transition-all",
                messages.length > 0 ? "text-zinc-300 hover:text-white hover:bg-white/5" : "text-zinc-600 cursor-not-allowed"
              )}
              title="Download Conversation"
            >
              <Download size={20} />
            </button>

            <button 
              onClick={() => setIsTtsEnabled(!isTtsEnabled)}
              className={cn(
                "p-2 rounded-full transition-all",
                isTtsEnabled ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {isTtsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button 
              onClick={clearChat}
              className="p-2 text-zinc-500 hover:text-red-400 transition-all"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-24 pb-32 min-h-screen flex flex-col">
        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar"
        >
          {messages.length === 0 && !image && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
                <Camera className="w-10 h-10 text-zinc-500" />
              </div>
              <h2 className="text-3xl font-light text-white">What should we look at?</h2>
              <p className="text-zinc-500 max-w-md mx-auto">
                Upload an image to start an intelligent conversation. I can describe scenes, read text, or help you understand complex visuals.
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-all flex items-center gap-2"
              >
                <ImageIcon size={18} />
                Upload Image
              </button>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-3",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}
              >
                {msg.image && (
                  <div className="max-w-sm rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <img src={msg.image} alt="Uploaded" className="w-full h-auto" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-emerald-600 text-white rounded-tr-none" 
                    : "bg-zinc-900 border border-white/5 text-zinc-200 rounded-tl-none"
                )}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-zinc-500 text-sm"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{status === 'analyzing' ? 'Analyzing vision...' : 'Thinking...'}</span>
            </motion.div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          {image && messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 relative inline-block"
            >
              <img src={image} className="h-24 w-24 object-cover rounded-xl border-2 border-emerald-500 shadow-lg shadow-emerald-500/20" referrerPolicy="no-referrer" />
              <button 
                onClick={() => setImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          )}

          <div className="relative flex items-center gap-2 bg-zinc-900/80 border border-white/10 rounded-2xl p-2 backdrop-blur-xl shadow-2xl">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              title="Upload image"
            >
              <ImageIcon size={22} />
            </button>
            
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={image ? "Ask about this image..." : "Type a message..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-zinc-500 py-3 px-2"
            />

            <div className="flex items-center gap-1">
              <button 
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  isRecording 
                    ? "bg-red-500 text-white animate-pulse" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
                title="Hold to speak"
              >
                {isRecording ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              
              <button 
                onClick={() => handleSend()}
                disabled={isLoading || (!input && !image)}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  (input || image) && !isLoading
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "text-zinc-600 bg-zinc-800 cursor-not-allowed"
                )}
              >
                <Send size={22} />
              </button>
            </div>
          </div>
          
          <p className="text-center text-[10px] text-zinc-600 mt-3 uppercase tracking-widest font-medium">
            Powered by Gemini 3.1 Pro & Vision
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
