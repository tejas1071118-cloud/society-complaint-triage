import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Send, Loader2, UploadCloud, X, PlayCircle, FileVideo, Mic, MicOff, CheckCircle2, Clipboard, ArrowRight, Home } from 'lucide-react';

const CATEGORIES = [
  { id: 'water', label: 'Water', icon: '💧' },
  { id: 'lift', label: 'Lift', icon: '🛗' },
  { id: 'parking', label: 'Parking', icon: '🚗' },
  { id: 'noise', label: 'Noise', icon: '🔊' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { id: 'security', label: 'Security', icon: '🛡️' },
];

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const MAX_DIMENSION = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function ResidentForm() {
  const navigate = useNavigate();
  
  // State
  const [lang, setLang] = useState('en');
  const [formData, setFormData] = useState({ flat_number: '', name: '', phone: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [successData, setSuccessData] = useState(null); // { id, isDuplicate }
  
  // Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const fileInputRef = useRef(null);
  
  const translations = {
    en: {
      hero: "Have an issue?",
      subtext: "Submit it in seconds, and we'll get it sorted.",
      flatNo: "Flat No *",
      name: "Name *",
      phone: "Phone (Optional)",
      whatsWrong: "What's wrong? *",
      descPlaceholder: "Describe the issue...",
      addMedia: "Add photos or videos (Optional)",
      mediaHint: "Up to 4 files. Photos < 5MB, Videos < 25MB",
      mediaWarning: "Please avoid photos showing faces or personal documents.",
      submit: "Submit Complaint",
      submitting: "Submitting...",
      checkStatus: "Check status",
      alreadySubmitted: "Already submitted?",
      success: "Issue Submitted Successfully!",
      copied: "Copied!",
      trackStatus: "Track Status",
      dupMessage: "Others in your society have reported this too. We're on it.",
      step1: "Received",
      step2: "Assigned",
      step3: "Resolved",
    },
    hi: {
      hero: "कोई समस्या है?",
      subtext: "कुछ ही सेकंड में दर्ज करें, हम इसे सुलझा देंगे।",
      flatNo: "फ्लैट नं *",
      name: "नाम *",
      phone: "फोन (वैकल्पिक)",
      whatsWrong: "क्या समस्या है? *",
      descPlaceholder: "समस्या का वर्णन करें...",
      addMedia: "फ़ोटो या वीडियो जोड़ें (वैकल्पिक)",
      mediaHint: "अधिकतम 4 फाइलें। फ़ोटो < 5MB, वीडियो < 25MB",
      mediaWarning: "कृपया चेहरे या व्यक्तिगत दस्तावेज़ों वाली तस्वीरें पोस्ट करने से बचें।",
      submit: "शिकायत दर्ज करें",
      submitting: "दर्ज हो रहा है...",
      checkStatus: "स्थिति जांचें",
      alreadySubmitted: "पहले ही जमा कर चुके हैं?",
      success: "शिकायत सफलतापूर्वक दर्ज की गई!",
      copied: "कॉपी किया गया!",
      trackStatus: "स्थिति ट्रैक करें",
      dupMessage: "आपकी सोसाइटी के अन्य लोगों ने भी यह सूचना दी है। हम इस पर काम कर रहे हैं।",
      step1: "प्राप्त हुई",
      step2: "सौंपी गई",
      step3: "सुलझाई गई",
    }
  };
  const t = translations[lang];

  useEffect(() => {
    // Setup speech recognition if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
      
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setFormData(prev => ({ ...prev, description: prev.description + ' ' + transcript }));
      };
      
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [lang]);

  const toggleSpeech = () => {
    if (!recognitionRef.current) return alert('Speech recognition not supported in your browser.');
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleCategoryClick = (cat) => {
    setFormData(prev => ({
      ...prev,
      description: prev.description ? `${prev.description} [${cat.label}]` : `[${cat.label}] `
    }));
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    e.target.value = '';
    
    if (attachments.length + selectedFiles.length > 4) {
      setError('You can only attach up to 4 files.');
      return;
    }
    setError('');
    
    for (const file of selectedFiles) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) { setError('Unsupported file type.'); continue; }
      if (isImage && file.size > 5 * 1024 * 1024) { setError(`Image ${file.name} > 5MB limit.`); continue; }
      if (isVideo && file.size > 25 * 1024 * 1024) { setError(`Video ${file.name} > 25MB limit.`); continue; }

      const tempId = Math.random().toString(36).substring(7);
      let previewUrl = URL.createObjectURL(file);
      let processedFile = file;

      setAttachments(prev => [...prev, { tempId, file: processedFile, progress: 0, preview: previewUrl, isVideo, uploadedId: null }]);

      try {
        if (isImage && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            processedFile = await compressImage(file);
        }

        const uploadData = new FormData();
        uploadData.append('file', processedFile);

        const res = await axios.post('http://localhost:3001/api/upload', uploadData, {
          onUploadProgress: (e) => {
            const pct = Math.round((e.loaded * 100) / e.total);
            setAttachments(prev => prev.map(a => a.tempId === tempId ? { ...a, progress: pct } : a));
          }
        });

        setAttachments(prev => prev.map(a => a.tempId === tempId ? { ...a, progress: 100, uploadedId: res.data.attachmentId } : a));
      } catch (err) {
        console.error(err);
        setAttachments(prev => prev.map(a => a.tempId === tempId ? { ...a, error: 'Upload failed' } : a));
      }
    }
  };

  const removeAttachment = (tempId) => {
    setAttachments(prev => {
      const att = prev.find(a => a.tempId === tempId);
      if (att && att.preview) URL.revokeObjectURL(att.preview);
      return prev.filter(a => a.tempId !== tempId);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (attachments.some(a => !a.uploadedId && !a.error)) {
        setError('Please wait for uploads to finish.');
        return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
          ...formData,
          attachment_ids: attachments.filter(a => a.uploadedId).map(a => a.uploadedId)
      };
      const res = await axios.post('http://localhost:3001/api/complaints', payload);
      setSuccessData({ id: res.data.complaintId, isDuplicate: res.data.isDuplicate });
    } catch (err) {
      console.error(err);
      setError('Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-md mx-auto min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-surface rounded-3xl p-8 shadow-float text-center max-w-sm w-full animate-slide-in">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-text-main mb-2">{t.success}</h2>
          
          <div className="bg-background border border-border rounded-xl p-4 my-6 flex items-center justify-between">
            <span className="font-mono text-text-muted">{successData.id.substring(0,8).toUpperCase()}</span>
            <button 
              onClick={() => navigator.clipboard.writeText(successData.id)}
              className="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors"
            >
              <Clipboard className="w-5 h-5" />
            </button>
          </div>

          {successData.isDuplicate && (
            <div className="bg-primary-50 text-primary-700 text-sm p-3 rounded-lg mb-6 font-medium">
              {t.dupMessage}
            </div>
          )}

          <div className="flex justify-between items-center mb-8 relative">
             <div className="absolute top-1/2 left-0 w-full h-1 bg-border -z-10 -translate-y-1/2"></div>
             {/* Step 1 */}
             <div className="flex flex-col items-center gap-2 bg-surface px-2">
               <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">1</div>
               <span className="text-[10px] font-semibold text-text-main">{t.step1}</span>
             </div>
             {/* Step 2 */}
             <div className="flex flex-col items-center gap-2 bg-surface px-2">
               <div className="w-8 h-8 rounded-full bg-background border border-border text-text-muted flex items-center justify-center font-bold text-sm">2</div>
               <span className="text-[10px] font-medium text-text-muted">{t.step2}</span>
             </div>
             {/* Step 3 */}
             <div className="flex flex-col items-center gap-2 bg-surface px-2">
               <div className="w-8 h-8 rounded-full bg-background border border-border text-text-muted flex items-center justify-center font-bold text-sm">3</div>
               <span className="text-[10px] font-medium text-text-muted">{t.step3}</span>
             </div>
          </div>

          <button 
            onClick={() => navigate(`/status/${successData.id}`)}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-soft"
          >
            {t.trackStatus} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-24">
      <div className="flex justify-end p-4">
        <div className="bg-surface rounded-full shadow-sm border border-border p-1 flex">
          <button onClick={() => setLang('en')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${lang === 'en' ? 'bg-primary-50 text-primary-700' : 'text-text-muted'}`}>EN</button>
          <button onClick={() => setLang('hi')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${lang === 'hi' ? 'bg-primary-50 text-primary-700' : 'text-text-muted'}`}>हि</button>
        </div>
      </div>

      <div className="bg-surface rounded-3xl shadow-float border border-border overflow-hidden mx-2 sm:mx-0">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 px-8 py-10 text-center border-b border-border">
          <h1 className="text-3xl font-bold text-primary-900 mb-3 tracking-tight">{t.hero}</h1>
          <p className="text-primary-700 text-sm font-medium">{t.subtext}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && <div className="p-4 bg-critical-bg text-critical-text border border-critical-border rounded-xl text-sm font-medium">{error}</div>}
          
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-text-main">{t.flatNo}</label>
              <input
                required
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm"
                placeholder="e.g. A-101"
                value={formData.flat_number}
                onChange={(e) => setFormData({...formData, flat_number: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-text-main">{t.name}</label>
              <input
                required
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm"
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-text-main">{t.phone}</label>
            <input
              type="tel"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm"
              placeholder="For updates"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="block text-sm font-semibold text-text-main">{t.whatsWrong}</label>
              {(window.SpeechRecognition || window.webkitSpeechRecognition) && (
                <button 
                  type="button" 
                  onClick={toggleSpeech}
                  className={`p-2 rounded-full transition-colors ${isListening ? 'bg-critical-bg text-critical-text animate-pulse' : 'bg-background text-text-muted hover:text-text-main'}`}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button 
                  key={c.id} type="button" onClick={() => handleCategoryClick(c)}
                  className="bg-background border border-border hover:border-primary-300 hover:bg-primary-50 text-text-muted text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <span>{c.icon}</span> {c.label}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors resize-none text-sm leading-relaxed"
              placeholder={t.descPlaceholder}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-text-main">{t.addMedia}</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:bg-surface-hover hover:border-primary-300 transition-colors group"
            >
              <UploadCloud className="w-8 h-8 text-primary-400 group-hover:text-primary-500 mx-auto mb-3 transition-colors" />
              <p className="text-sm font-semibold text-text-main">Tap to upload or drag files here</p>
              <p className="text-xs text-text-muted mt-1.5">{t.mediaHint}</p>
              <p className="text-[10px] text-text-muted/70 mt-2 max-w-xs mx-auto leading-tight">{t.mediaWarning}</p>
              
              <input
                type="file" multiple ref={fileInputRef}
                accept="image/jpeg, image/png, image/webp, video/mp4, video/quicktime, video/webm"
                className="hidden" onChange={handleFileSelect}
              />
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {attachments.map((att) => (
                  <div key={att.tempId} className="relative rounded-xl overflow-hidden border border-border aspect-square group bg-background shadow-sm">
                    {att.isVideo ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                        <FileVideo className="w-6 h-6 mb-1 opacity-60" />
                      </div>
                    ) : (
                      <img src={att.preview} alt="preview" className="w-full h-full object-cover" />
                    )}
                    
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeAttachment(att.tempId); }}
                      className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    {att.error ? (
                      <div className="absolute inset-0 bg-critical-bg/90 flex items-center justify-center text-critical-text text-[10px] font-bold px-2 text-center">
                        {att.error}
                      </div>
                    ) : (
                        att.progress < 100 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                <div className="w-3/4 bg-white/30 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-white h-full transition-all duration-300 rounded-full" style={{ width: `${att.progress}%` }} />
                                </div>
                            </div>
                        )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-md border-t border-border sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-t-0 sm:p-0 sm:mt-6 sm:max-w-md sm:mx-auto z-50">
        <button
            onClick={handleSubmit}
            disabled={loading || attachments.some(a => a.progress < 100 && !a.error)}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-float active:scale-[0.98]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {loading ? t.submitting : t.submit}
        </button>
      </div>
      
      <div className="mt-28 sm:mt-6 text-center pb-8">
        <p className="text-sm font-medium text-text-muted">
          {t.alreadySubmitted} <span className="text-primary-600 hover:text-primary-700 cursor-pointer underline underline-offset-4 decoration-primary-200" onClick={() => {
            const id = prompt("Enter your Flat Number or Complaint ID:");
            if (id) navigate(`/status/${id}`);
          }}>{t.checkStatus}</span>
        </p>
      </div>
    </div>
  );
}
