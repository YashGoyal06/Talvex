import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, AlertCircle, CheckCircle2, User, Phone, FileText } from 'lucide-react';
import { api } from '../../api/api';

export default function FirstProfileSetup() {
  const navigate = useNavigate();
  const storedEmail = localStorage.getItem('userEmail') || '';
  const storedName = localStorage.getItem('userName') || '';

  const [fullName, setFullName] = useState(storedName);
  const [phone, setPhone] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!storedEmail) {
      navigate('/login');
    }
  }, [storedEmail, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      setError('Please upload your resume to complete your profile.');
      return;
    }

    setLoading(true);
    setError('');
    setParsingProgress(10);

    try {
      // Step 1: Upload resume to Supabase Storage
      setParsingProgress(30);
      const uploadRes = await api.auth.uploadFile(resumeFile, 'resumes');
      if (!uploadRes.url) {
        throw new Error('Failed to upload resume to storage.');
      }

      setParsingProgress(60);
      
      // Step 2: Split full name into first and last name
      const nameParts = fullName.trim().split(' ', 2);
      const firstName = nameParts[0] || '';
      const lastName = nameParts[1] || '';

      const newDoc = {
        name: resumeFile.name,
        url: uploadRes.url,
        uploadedAt: new Date().toLocaleDateString()
      };

      // Step 3: Update and trigger parsing on the backend
      setParsingProgress(80);
      const res = await api.candidates.updateProfile(storedEmail, {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        parsed_resume: {
          documents: [newDoc]
        }
      });

      setParsingProgress(100);
      setSuccess(true);

      // Save updated details locally
      const updatedCandidate = res.candidate;
      if (updatedCandidate) {
        const fullCandidateName = `${updatedCandidate.first_name} ${updatedCandidate.last_name}`.trim();
        localStorage.setItem('userName', fullCandidateName);
        if (updatedCandidate.phone) {
          localStorage.setItem('userPhone', updatedCandidate.phone);
        }
      }

      setTimeout(() => {
        navigate('/candidate/dashboard');
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete profile setup.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex items-center justify-center p-4 md:p-8 antialiased selection:bg-orange-100">
      
      {/* Background ambient canvas */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-neutral-200/30 blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100/40 blur-[130px]"></div>
      </div>

      {/* Setup Card */}
      <div className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white border border-neutral-200/70 shadow-2xl relative z-10 p-8 md:p-12">
        
        {loading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-30 space-y-6">
            {success ? (
              <div className="flex flex-col items-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-lg border border-emerald-100">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-neutral-950 font-black text-xl">Profile Setup Complete!</h3>
                <p className="text-xs text-neutral-500 font-bold">Redirecting to candidate hub...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-orange-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
                <div className="space-y-1 px-8">
                  <h3 className="text-neutral-950 font-black text-lg flex items-center justify-center gap-1.5">
                    <Sparkles className="text-orange-500" size={18} />
                    AI ATS Parser Active
                  </h3>
                  <p className="text-xs text-neutral-500 font-bold animate-pulse leading-relaxed">
                    Uploading resume, mapping skills taxonomies, and building candidate profile...
                  </p>
                </div>
                
                {/* Progress bar */}
                <div className="w-64 h-1.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50 mt-4">
                  <div 
                    className="h-full bg-orange-500 transition-all duration-300"
                    style={{ width: `${parsingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-8">
          <div>
            <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
              Onboarding
            </span>
            <h1 className="text-3xl font-black tracking-tight text-neutral-950 mt-4 mb-2">
              Setup Your Candidate Profile
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed font-medium">
              Upload your resume and complete details. Our AI will automatically parse your skills, certifications, and experience to qualify you for open opportunities.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1">
                  <User size={13} /> Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                  placeholder="e.g. Yash Goyal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1">
                  <Phone size={13} /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-950 font-medium placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-2xs"
                  placeholder="e.g. +91 98974 22911"
                />
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1">
                <FileText size={13} /> Resume File *
              </label>
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  resumeFile 
                    ? 'border-orange-500 bg-orange-50/10' 
                    : 'border-neutral-200 hover:border-orange-500 hover:bg-neutral-50/50'
                }`}
              >
                <input
                  type="file"
                  id="resume"
                  required
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="resume" className="cursor-pointer block space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                    <Upload size={24} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-800">
                      {resumeFile ? resumeFile.name : 'Choose a file or drag it here'}
                    </span>
                    <p className="text-xs text-neutral-400 font-medium mt-1">
                      Supports PDF, DOCX, DOC, and TXT files
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-neutral-950/10 cursor-pointer"
            >
              Complete Setup & Parse Resume <Sparkles size={16} className="text-orange-500" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
