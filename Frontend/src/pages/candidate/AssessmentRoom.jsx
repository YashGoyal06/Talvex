import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import { Play, CheckSquare, Code, Timer, AlertCircle, CheckCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

export default function AssessmentRoom() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Active question index
  const [activeQIndex, setActiveQIndex] = useState(0);

  // Editor states
  const [editorLanguage, setEditorLanguage] = useState('python');
  const [codeContent, setCodeContent] = useState('');
  const [editorCodes, setEditorCodes] = useState({}); // Stores code per question: { [qId]: { [lang]: 'code' } }

  // Console Drawer states
  const [consoleTab, setConsoleTab] = useState('results'); // 'results' or 'stdin'
  const [customStdin, setCustomStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState(null); // { status, stdout, stderr, time }
  const [submitResult, setSubmitResult] = useState({}); // { [qId]: { status, passed_cases, total_cases, details } }

  // Timer states
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const timerRef = useRef(null);

  // Load / initialize assessment session
  const fetchSession = async () => {
    try {
      setLoading(true);
      const data = await api.assessments.getSession(token);

      if (data.completed || data.completed_at) {
        setIsCompleted(true);
        setLoading(false);
        return;
      }

      setAssessment(data);
      setTimeLeft(data.time_remaining_seconds || 3600);

      // Pre-fill code cache from past submissions if any
      const initialCodes = {};
      const initialSubmits = {};
      
      data.questions.forEach(q => {
        const qIdStr = q.id.toString();
        const pastSub = data.submissions && data.submissions[qIdStr];
        const pastResult = data.results && data.results[qIdStr];
        
        initialCodes[q.id] = {
          python: pastSub?.language === 'python' ? pastSub.code : (q.starter_code?.python || '# Write your Python code here\n'),
          javascript: pastSub?.language === 'javascript' ? pastSub.code : (q.starter_code?.javascript || '// Write your JavaScript code here\n'),
          go: pastSub?.language === 'go' ? pastSub.code : (q.starter_code?.go || '// Write your Go code here\n'),
          'c++': pastSub?.language === 'c++' ? pastSub.code : (q.starter_code?.['c++'] || '// Write your C++ code here\n'),
        };

        if (pastResult) {
          initialSubmits[q.id] = pastResult;
        }
      });

      setEditorCodes(initialCodes);
      setSubmitResult(initialSubmits);

      // Set initial code for the first question
      if (data.questions.length > 0) {
        const firstQId = data.questions[0].id;
        const savedLang = data.submissions?.[firstQId.toString()]?.language || 'python';
        setEditorLanguage(savedLang);
        setCodeContent(initialCodes[firstQId]?.[savedLang] || '');
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load assessment. The link may be invalid.');
      setLoading(false);
    }
  };

  // Start countdown timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (hasStarted && !isCompleted && !loading) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, isCompleted, loading]);

  // Load session metadata initially (before started state)
  useEffect(() => {
    fetchSession();
  }, [token]);

  // Handle question click
  const handleSelectQuestion = (index) => {
    // Save current active question's code to cache
    const activeQ = assessment.questions[activeQIndex];
    setEditorCodes(prev => ({
      ...prev,
      [activeQ.id]: {
        ...prev[activeQ.id],
        [editorLanguage]: codeContent
      }
    }));

    // Load next question metadata
    setActiveQIndex(index);
    const nextQ = assessment.questions[index];
    // Find matching language or default to python
    const savedQCode = editorCodes[nextQ.id];
    setCodeContent(savedQCode?.[editorLanguage] || nextQ.starter_code?.[editorLanguage] || '');
  };

  // Handle editor code changes
  const handleCodeChange = (e) => {
    const val = e.target.value;
    setCodeContent(val);

    // Sync back to cache instantly
    const activeQ = assessment.questions[activeQIndex];
    setEditorCodes(prev => ({
      ...prev,
      [activeQ.id]: {
        ...prev[activeQ.id],
        [editorLanguage]: val
      }
    }));
  };

  // Intercept Tab key in editor textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = codeContent.substring(0, start) + "  " + codeContent.substring(end);
      
      setCodeContent(newCode);

      // Save to cache
      const activeQ = assessment.questions[activeQIndex];
      setEditorCodes(prev => ({
        ...prev,
        [activeQ.id]: {
          ...prev[activeQ.id],
          [editorLanguage]: newCode
        }
      }));

      // Reset cursor position
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Handle Language selector changes
  const handleLanguageChange = (e) => {
    const nextLang = e.target.value;
    const activeQ = assessment.questions[activeQIndex];
    
    // Save current language code to cache first
    setEditorCodes(prev => {
      const updated = {
        ...prev,
        [activeQ.id]: {
          ...prev[activeQ.id],
          [editorLanguage]: codeContent
        }
      };

      // Set editor content to cached next language code
      setCodeContent(updated[activeQ.id]?.[nextLang] || activeQ.starter_code?.[nextLang] || '');
      return updated;
    });

    setEditorLanguage(nextLang);
  };

  // Run Code logic
  const getStatusColor = (status) => {
    if (
      status === 'Accepted' ||
      status === 'Executed' ||
      status === 'Manual Review' ||
      status === 'Submitted for Review' ||
      status?.startsWith('Graded: Passed')
    ) {
      return 'text-emerald-600';
    }
    if (status === 'Running...') return 'text-orange-600';
    return 'text-red-600';
  };

  const handleRunCode = async () => {
    setRunning(true);
    setConsoleTab('results');
    setConsoleOutput({ status: 'Running...', stdout: '', stderr: '', time: 0 });

    try {
      const res = await api.assessments.executeCode(
        codeContent,
        editorLanguage,
        customStdin
      );

      setConsoleOutput(res);
    } catch (err) {
      setConsoleOutput({
        status: 'Compilation / Runtime Error',
        stdout: '',
        stderr: err.message || 'Execution failed.',
        time: 0
      });
    } finally {
      setRunning(false);
    }
  };

  // Submit Solution logic
  const handleSubmitSolution = async () => {
    const activeQ = assessment.questions[activeQIndex];
    setSubmitting(true);
    setConsoleTab('results');

    try {
      const res = await api.assessments.submitSolution(
        token,
        activeQ.id,
        codeContent,
        editorLanguage
      );

      setSubmitResult(prev => ({
        ...prev,
        [activeQ.id]: res
      }));

      if (res.requires_manual_review || res.status === 'Manual Review') {
        setConsoleOutput({
          status: 'Submitted for Review',
          stdout: 'No verified expected outputs are available for this question. Your code has been saved for recruiter review.',
          stderr: '',
          time: 0.1
        });
      } else {
        setConsoleOutput({
          status: `Graded: ${res.status}`,
          stdout: `Passed ${res.passed_cases} / ${res.total_cases} test cases.`,
          stderr: res.details?.map(d => d.success ? null : d.stderr).filter(Boolean).join('\n') || '',
          time: 0.1
        });
      }
    } catch (err) {
      setConsoleOutput({
        status: 'Submission Failed',
        stdout: '',
        stderr: err.message || 'Submit failed.',
        time: 0
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Finish Assessment manually
  const handleFinish = async () => {
    const confirmFinish = window.confirm("Are you sure you want to finish the coding assessment? You will not be able to change your solutions.");
    if (!confirmFinish) return;

    try {
      setLoading(true);
      await api.assessments.finish(token);
      setIsCompleted(true);
    } catch (err) {
      setError(err.message || 'Failed to complete assessment.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-finish on timer expiry
  const handleAutoFinish = async () => {
    try {
      setLoading(true);
      await api.assessments.finish(token);
      setIsCompleted(true);
    } catch (err) {
      console.error('Failed to auto-finish assessment:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset to starter code
  const handleResetStarter = () => {
    const activeQ = assessment.questions[activeQIndex];
    const starter = activeQ.starter_code?.[editorLanguage] || '';
    if (window.confirm("Reset editor to starter template? This will erase your current code for this language.")) {
      setCodeContent(starter);
    }
  };

  // Formatting remaining time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Rendering screen layout states
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center flex-col text-white">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-gray-400 font-medium">Preparing assessment playground...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center flex-col text-white p-6">
        <AlertCircle className="text-red-500 mb-4" size={56} />
        <h2 className="text-2xl font-bold mb-2">Access Error</h2>
        <p className="text-gray-400 max-w-md text-center mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="btn-primary py-2 px-6 rounded-lg">Return to Landing Page</button>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center flex-col text-white p-6">
        <CheckCircle className="text-green-500 mb-4" size={64} />
        <h2 className="text-3xl font-bold mb-2">Assessment Finished</h2>
        <p className="text-gray-400 max-w-md text-center mb-6">
          Thank you for completing your evaluation. Your solutions and compile scores have been stored and sent to the recruiter pipeline.
        </p>
        <button onClick={() => navigate('/')} className="btn-primary py-2 px-6 rounded-lg">Go to Home Page</button>
      </div>
    );
  }

  // Welcome Screen (Before candidate clicks start)
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-neutral-800 font-sans">
        <div className="max-w-xl w-full bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
            <img src="/talvax_logo_navbar.png" className="w-9 h-9 object-contain" alt="Talvex" />
            <div>
              <h1 className="text-xl font-black text-neutral-950 tracking-tight">Talvex Pro Coding Evaluation</h1>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{assessment?.job?.title} · {assessment?.job?.company_name || 'Talvex Partner'}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-black text-neutral-950 text-base tracking-tight">Important Rules & Instructions:</h3>
            <ul className="space-y-3 text-xs text-neutral-600 list-disc list-inside font-medium leading-relaxed">
              <li>You have <strong className="text-neutral-950 font-black">{assessment?.duration_minutes} minutes</strong> to complete the coding round.</li>
              <li>This test contains <strong className="text-neutral-950 font-black">{assessment?.questions?.length} programming tasks</strong>.</li>
              <li>You can run your code as many times as needed using custom inputs.</li>
              <li>Click <strong className="text-neutral-950 font-black">Submit Solution</strong> to verify against available expected outputs, or save for recruiter review when outputs are unavailable.</li>
              <li>The timer starts once you click **Start Assessment**. Do not close the browser tab.</li>
            </ul>
          </div>

          <div className="pt-4">
            <button 
              onClick={() => setHasStarted(true)} 
              className="w-full bg-neutral-950 hover:bg-neutral-900 text-white py-3 rounded-full font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              Start Assessment <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeQuestion = assessment.questions[activeQIndex];
  const sampleTestCases = activeQuestion?.test_cases?.filter(c => !c.is_hidden) || [];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col text-neutral-800 font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-neutral-200/80 px-6 flex justify-between items-center bg-white flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/talvax_logo_navbar.png" className="w-7 h-7 object-contain" alt="Talvex Logo" />
          <span className="font-extrabold text-neutral-950 text-sm tracking-tight leading-none">Talvex Assessment</span>
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded-full">
            {assessment.candidate?.first_name} {assessment.candidate?.last_name}
          </span>
        </div>

        {/* Timer countdown view */}
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border font-mono text-xs font-black transition-all ${
            timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-orange-50 border-orange-100 text-orange-600'
          }`}>
            <Timer size={14} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button 
            onClick={handleFinish}
            className="bg-neutral-950 hover:bg-neutral-900 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all shadow-sm cursor-pointer"
          >
            Finish Assessment
          </button>
        </div>
      </header>

      {/* Main split dashboard pane */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left pane: Question Description */}
        <div className="lg:col-span-5 border-r border-neutral-200 flex flex-col overflow-hidden bg-white">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center gap-2 flex-wrap">
            {assessment.questions.map((q, idx) => {
              const qStatus = submitResult[q.id]?.status;
              const isPassed = qStatus === 'Passed';
              const isManualReview = qStatus === 'Manual Review';
              
              return (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuestion(idx)}
                  className={`px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                    activeQIndex === idx
                      ? 'bg-neutral-950 border-neutral-950 text-white font-bold'
                      : isPassed
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600 font-bold'
                      : isManualReview
                      ? 'bg-orange-50 border-orange-100 text-orange-600 font-bold'
                      : qStatus
                      ? 'bg-red-50 border-red-100 text-red-600 font-bold'
                      : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <Code size={12} />
                  Task {idx + 1}
                  {isPassed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-700">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-black text-neutral-950 tracking-tight leading-tight">{activeQuestion?.title}</h2>
                <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full ${
                  activeQuestion?.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                  activeQuestion?.difficulty === 'Medium' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                  'bg-red-50 text-red-600 border border-red-100'
                }`}>
                  {activeQuestion?.difficulty}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Time Limit: {activeQuestion?.time_limit}s | Memory Limit: {Math.round((activeQuestion?.memory_limit || 128000)/1000)}MB</p>
            </div>

            <div className="text-xs text-neutral-600 whitespace-pre-wrap leading-relaxed border-t border-neutral-100 pt-4 font-medium select-text">
              {activeQuestion?.description}
            </div>

            {/* Test Case Samples */}
            <div className="border-t border-neutral-100 pt-6 space-y-4">
              <h3 className="font-black text-xs text-neutral-950 uppercase tracking-tight">Sample Input/Output</h3>
              {sampleTestCases.map((tc, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sample #{idx + 1}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Input:</div>
                      <pre className="bg-neutral-50 font-mono text-[11px] p-3 rounded-2xl border border-neutral-200 max-h-[150px] overflow-auto whitespace-pre-wrap text-neutral-700 font-medium">{tc.input || '(None)'}</pre>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Expected Output:</div>
                      <pre className="bg-neutral-50 font-mono text-[11px] p-3 rounded-2xl border border-neutral-200 max-h-[150px] overflow-auto whitespace-pre-wrap text-neutral-700 font-medium">{tc.expected_output}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right pane: Code Editor & Execution Output Console */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden bg-white">
          {/* Editor Header Tools */}
          <div className="h-12 border-b border-neutral-200 px-4 flex justify-between items-center bg-neutral-50 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Language:</span>
              <select 
                value={editorLanguage} 
                onChange={handleLanguageChange}
                className="bg-white border border-neutral-200 text-neutral-700 rounded-full px-3 py-1 text-xs focus:outline-none focus:border-neutral-400 font-bold shadow-sm cursor-pointer"
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript (NodeJS)</option>
                <option value="go">Go</option>
                <option value="c++">C++ (GCC)</option>
              </select>
            </div>

            <button 
              onClick={handleResetStarter}
              title="Reset code template"
              className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Editor Textarea Input */}
          <div className="flex-1 relative overflow-hidden bg-neutral-950">
            <textarea
              value={codeContent}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              className="w-full h-full bg-transparent text-[#f8f8f2] font-mono text-xs p-6 resize-none focus:outline-none leading-relaxed select-text overflow-y-auto"
              placeholder="// Write your solution here"
              spellCheck="false"
              autoFocus
            />
          </div>

          {/* Bottom Execution Console Output Drawer */}
          <div className="h-[250px] border-t border-neutral-200 flex flex-col flex-shrink-0 bg-white">
            <div className="h-10 border-b border-neutral-200 px-4 flex justify-between items-center bg-neutral-50 flex-shrink-0">
              <div className="flex gap-4">
                <button 
                  onClick={() => setConsoleTab('results')}
                  className={`text-xs font-bold px-1 py-2 border-b-2 transition-colors cursor-pointer ${consoleTab === 'results' ? 'border-orange-500 text-neutral-950 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                  Test Results
                </button>
                <button 
                  onClick={() => setConsoleTab('stdin')}
                  className={`text-xs font-bold px-1 py-2 border-b-2 transition-colors cursor-pointer ${consoleTab === 'stdin' ? 'border-orange-500 text-neutral-950 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                  Custom Stdin
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleRunCode}
                  disabled={running || submitting}
                  className="bg-white hover:bg-neutral-50 text-neutral-700 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-neutral-200 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  Run Code
                </button>

                <button 
                  type="button"
                  onClick={handleSubmitSolution}
                  disabled={running || submitting}
                  className="bg-neutral-950 hover:bg-neutral-900 text-white px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={12} />}
                  Submit Solution
                </button>
              </div>
            </div>

            {/* Console Pane content */}
            <div className="flex-1 overflow-y-auto p-4 bg-neutral-50 font-mono text-[11px] leading-relaxed select-text text-neutral-700 border-b border-neutral-200">
              {consoleTab === 'stdin' ? (
                <div className="h-full flex flex-col space-y-2">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Provide Standard Input (Stdin):</label>
                  <textarea
                    value={customStdin}
                    onChange={e => setCustomStdin(e.target.value)}
                    className="flex-1 bg-white border border-neutral-200 text-neutral-700 p-3 rounded-2xl focus:outline-none focus:border-neutral-450 resize-none font-semibold"
                    placeholder="Enter standard input values here..."
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {consoleOutput ? (
                    <>
                      <div className="flex items-center gap-2 border-b border-neutral-200/50 pb-2">
                        <span className="text-neutral-400">Status:</span>
                        <span className={`font-black uppercase ${getStatusColor(consoleOutput.status)}`}>{consoleOutput.status}</span>
                      </div>
                      
                      {consoleOutput.stdout && (
                        <div>
                          <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Standard Output (Stdout):</div>
                          <pre className="bg-white p-3 rounded-2xl border border-neutral-200/50 text-emerald-600 font-semibold whitespace-pre-wrap">{consoleOutput.stdout}</pre>
                        </div>
                      )}

                      {consoleOutput.stderr && (
                        <div>
                          <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1 text-red-600">Error Logs (Stderr):</div>
                          <pre className="bg-white p-3 rounded-2xl border border-neutral-200/50 text-red-600 font-semibold whitespace-pre-wrap">{consoleOutput.stderr}</pre>
                        </div>
                      )}

                      {!consoleOutput.stdout && !consoleOutput.stderr && (
                        <div className="text-neutral-400 italic">No output received.</div>
                      )}
                    </>
                  ) : (
                    <div className="text-neutral-400 italic">Run or submit code to check console execution results here.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
