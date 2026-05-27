import React, { useState, useEffect, useRef } from 'react';
import { Mic, Video, PhoneMissed, MessageSquare, PenTool, MicOff, VideoOff, Send, Eraser, Globe, ChevronDown, Edit3, Check, X, FileText, Code2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api';

export default function LiveInterviewRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  // Role detection
  const userRole = localStorage.getItem('userRole') || 'candidate';
  const isRecruiter = userRole === 'recruiter' || userRole === 'admin';

  // Tabs layout
  const [activeTab, setActiveTab] = useState('problem');
  const [rightActiveTab, setRightActiveTab] = useState(isRecruiter ? 'notes-right' : 'chat-right');
  const [editorTheme, setEditorTheme] = useState('black');
  const [editorLanguage, setEditorLanguage] = useState('javascript');

  // Recruiter question editing/importing states
  const [pdfUploading, setPdfUploading] = useState(false);
  const [cfImporting, setCfImporting] = useState(false);
  const [cfCount, setCfCount] = useState(5);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDiff, setEditDiff] = useState('Medium');
  const [editDesc, setEditDesc] = useState('');

  const languageMeta = {
    javascript: { label: 'JavaScript', ext: 'js', mono: 'JS' },
    python: { label: 'Python', ext: 'py', mono: 'PY' },
    typescript: { label: 'TypeScript', ext: 'ts', mono: 'TS' },
    java: { label: 'Java', ext: 'java', mono: 'JV' },
    'c++': { label: 'C++', ext: 'cpp', mono: 'C+' },
    go: { label: 'Go', ext: 'go', mono: 'GO' },
    rust: { label: 'Rust', ext: 'rs', mono: 'RS' }
  };

  const defaultStarterCodes = {
    javascript: `function solution() {\n  // Write JavaScript solution here\n}`,
    python: `def solution():\n    # Write Python solution here\n    pass`,
    typescript: `function solution(): any {\n  // Write TypeScript solution here\n}`,
    java: `public class Solution {\n    public static void main(String[] args) {\n        // Write Java solution here\n    }\n}`,
    'c++': `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write C++ solution here\n    return 0;\n}`,
    go: `package main\nimport "fmt"\n\nfunc main() {\n    // Write Go solution here\n}`,
    rust: `fn main() {\n    // Write Rust solution here\n}`
  };

  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // Media states
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);


  // Dynamic Session Details
  const [session, setSession] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [code, setCode] = useState('// Select a question to get started.');


  // Chat & Socket
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [note, setNote] = useState('');
  const [socket, setSocket] = useState(null);
  const userName = localStorage.getItem('userName') || (isRecruiter ? 'Interviewer' : 'Candidate');

  // Canvas Whiteboard
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const lastCoords = useRef({ x: 0, y: 0 });

  // WebRTC & Media stream refs/states
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  const [remoteCamOn, setRemoteCamOn] = useState(true);
  const [remoteMicOn, setRemoteMicOn] = useState(true);

  // Ratings (Recruiter only)
  const [ratings, setRatings] = useState({
    understanding: 4,
    algorithm: 3,
    quality: 4,
    communication: 4,
    fit: 5
  });
  const [recommendation, setRecommendation] = useState('Yes');

  // Focus Mode (Anti-Cheating)
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusWarning, setFocusWarning] = useState(false);

  // Console Drawer states for Run/Submit
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState('results'); // 'results' or 'stdin'
  const [customStdin, setCustomStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState(null); // { status, stdout, stderr, time }
  const [submitResult, setSubmitResult] = useState(null); // { passed, total }

  // 1. Load Session & Problems on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch session
        const sessionData = await api.interviews.getDetail(roomId);
        setSession(sessionData);
        if (sessionData.private_notes) {
          setNote(sessionData.private_notes);
        }

        // Fetch questions for this specific interview room
        const questionsList = await api.interviews.getQuestions(roomId);
        setProblems(questionsList);
        if (questionsList.length > 0) {
          setSelectedProblem(questionsList[0]);
          setCode(questionsList[0].starter_code?.javascript || `function solution() {\n  // Write your code here\n}`);
          
          setEditTitle(questionsList[0].title || '');
          setEditDiff(questionsList[0].difficulty || 'Medium');
          setEditDesc(questionsList[0].description || '');
        }
      } catch (err) {
        console.error("Failed to load interview room details:", err);
      }
    }
    loadData();
  }, [roomId]);


  // 2. Setup Local Media Stream
  useEffect(() => {
    let active = true;
    async function startLocalWebcam() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn("Webcam/microphone access is not supported in this browser environment.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Sync tracks with state
        stream.getVideoTracks().forEach(track => { track.enabled = camOn; });
        stream.getAudioTracks().forEach(track => { track.enabled = micOn; });
      } catch (err) {
        console.error("Error accessing camera/microphone:", err);
      }
    }
    startLocalWebcam();
    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Sync camOn changes
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = camOn;
      });
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'peer_cam_status',
        camOn
      }));
    }
  }, [camOn, socket]);

  // Sync micOn changes
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = micOn;
      });
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'peer_mic_status',
        micOn
      }));
    }
  }, [micOn, socket]);

  // Cheating Prevention / Focus Mode
  useEffect(() => {
    if (isRecruiter) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(prev => {
          const newCount = prev + 1;
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'chat_message',
              from: 'System',
              text: `⚠️ Candidate switched tabs/minimized window (Warning #${newCount})`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
          }
          setFocusWarning(true);
          return newCount;
        });
      }
    };

    const handleWindowBlur = () => {
      setTabSwitches(prev => {
        const newCount = prev + 1;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'chat_message',
            from: 'System',
            text: `⚠️ Candidate moved focus away from the test window (Warning #${newCount})`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
        }
        setFocusWarning(true);
        return newCount;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isRecruiter, socket]);

  // 3. Setup WebSocket Connection & WebRTC Signaling
  useEffect(() => {
    if (!roomId) return;

    const wsUrl = api.getWebSocketUrl(roomId);
    const ws = new WebSocket(wsUrl);

    const handleIceCandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc_signal',
          candidate: event.candidate
        }));
      }
    };

    const handleTrack = (event) => {
      console.log("Received remote track:", event.streams);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteStreamActive(true);
      }
    };

    const createPeerConnection = (stream) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      });

      pc.onicecandidate = handleIceCandidate;
      pc.ontrack = handleTrack;

      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      peerConnectionRef.current = pc;
      return pc;
    };

    ws.onopen = () => {
      console.log('Connected to WebSocket room');
      // Notify other peers that you joined
      ws.send(JSON.stringify({
        type: 'peer_status',
        action: 'join',
        message: `${userName} has joined the room.`
      }));

      // Send initial camera and microphone states
      ws.send(JSON.stringify({
        type: 'peer_cam_status',
        camOn
      }));
      ws.send(JSON.stringify({
        type: 'peer_mic_status',
        micOn
      }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'code_edit') {
        setCode(data.code);
      } else if (data.type === 'chat_message') {
        setChatMessages(prev => [...prev, { from: data.from, text: data.text, time: data.time }]);
      } else if (data.type === 'language_change') {
        setEditorLanguage(data.language);
      } else if (data.type === 'problems_update') {
        setProblems(data.problems);
        // Find matching active problem
        if (data.problems.length > 0) {
          const currentActive = data.problems.find(p => p.title === selectedProblem?.title) || data.problems[0];
          setSelectedProblem(currentActive);
          setCode(currentActive.starter_code?.[editorLanguage] || defaultStarterCodes[editorLanguage] || '');
        }
      } else if (data.type === 'problem_change') {
        setSelectedProblem(data.problem);
        setCode(data.code);
      } else if (data.type === 'peer_status') {

        setChatMessages(prev => [...prev, { from: 'System', text: data.message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        
        if (data.action === 'join') {
          console.log("Peer joined, creating WebRTC offer...");
          const pc = createPeerConnection(localStreamRef.current);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({
              type: 'webrtc_signal',
              sdp: pc.localDescription
            }));
          } catch (err) {
            console.error("Error creating WebRTC offer:", err);
          }
        } else if (data.action === 'leave') {
          console.log("Peer left, cleaning up WebRTC connection...");
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          setRemoteStreamActive(false);
        }
      } else if (data.type === 'peer_cam_status') {
        setRemoteCamOn(data.camOn);
      } else if (data.type === 'peer_mic_status') {
        setRemoteMicOn(data.micOn);
      } else if (data.type === 'webrtc_signal') {
        if (data.sdp) {
          if (data.sdp.type === 'offer') {
            console.log("Received WebRTC offer, creating answer...");
            const pc = createPeerConnection(localStreamRef.current);
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(JSON.stringify({
                type: 'webrtc_signal',
                sdp: pc.localDescription
              }));
            } catch (err) {
              console.error("Error creating WebRTC answer:", err);
            }
          } else if (data.sdp.type === 'answer') {
            console.log("Received WebRTC answer, setting remote description...");
            const pc = peerConnectionRef.current;
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              } catch (err) {
                console.error("Error setting remote description from answer:", err);
              }
            }
          }
        } else if (data.candidate) {
          console.log("Received WebRTC ICE candidate...");
          const pc = peerConnectionRef.current;
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.error("Error adding received ICE candidate:", err);
            }
          }
        }
      } else if (data.type === 'whiteboard_draw') {
        drawOnCanvasLocal(data.x0, data.y0, data.x1, data.y1, data.color);
      } else if (data.type === 'whiteboard_clear') {
        clearCanvasLocal();
      } else if (data.type === 'peer_code_run') {
        if (data.status === 'Running...' || data.status === 'Evaluating...') {
          setRunning(data.status === 'Running...');
          setSubmitting(data.status === 'Evaluating...');
          setConsoleOpen(true);
          setConsoleTab('results');
          setConsoleOutput({ status: data.status, stdout: '', stderr: '', time: 0 });
          setSubmitResult(null);
        } else {
          setRunning(false);
          setSubmitting(false);
          setConsoleOpen(data.consoleOpen || false);
          if (data.consoleTab) setConsoleTab(data.consoleTab);
          setConsoleOutput(data.consoleOutput || null);
          setSubmitResult(data.submitResult || null);
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setRemoteStreamActive(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [roomId, userName]);

  // 3. Drawing whiteboard functions
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Support mouse and touch
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDrawing = (e) => {
    const coords = getCanvasPos(e);
    lastCoords.current = coords;
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const coords = getCanvasPos(e);
    const x0 = lastCoords.current.x;
    const y0 = lastCoords.current.y;
    const x1 = coords.x;
    const y1 = coords.y;

    // Draw locally
    drawOnCanvasLocal(x0, y0, x1, y1, brushColor);

    // Sync to other peers
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'whiteboard_draw',
        x0, y0, x1, y1,
        color: brushColor
      }));
    }

    lastCoords.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawOnCanvasLocal = (x0, y0, x1, y1, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const clearCanvas = () => {
    clearCanvasLocal();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'whiteboard_clear'
      }));
    }
  };

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Resize canvas to match layout bounds on whiteboard active
  useEffect(() => {
    if (activeTab === 'whiteboard' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }
  }, [activeTab]);

  // Close language dropdown on outside click
  useEffect(() => {
    if (!showLangDropdown) return;
    const handler = () => setShowLangDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showLangDropdown]);

  // Code & Problem sync handlers
  const handleCodeChange = (newCode) => {
    if (isRecruiter) return; // Recruiter is read-only for solving
    setCode(newCode);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'code_edit',
        code: newCode
      }));
    }
  };

  const handleProblemChange = (p) => {
    setSelectedProblem(p);
    
    setEditTitle(p.title || '');
    setEditDiff(p.difficulty || 'Medium');
    setEditDesc(p.description || '');

    const starter = p.starter_code?.[editorLanguage] || defaultStarterCodes[editorLanguage] || `function solution() {\n  // Write solution\n}`;
    setCode(starter);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'problem_change',
        problem: p,
        code: starter
      }));
    }
  };

  // Language change handler
  const handleLanguageChange = (lang) => {
    setEditorLanguage(lang);
    setShowLangDropdown(false);
    // Update code with new language starter
    if (selectedProblem) {
      const starter = selectedProblem.starter_code?.[lang] || defaultStarterCodes[lang] || '';
      setCode(starter);
    } else {
      setCode(defaultStarterCodes[lang] || '');
    }
    // Broadcast language change
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'language_change', language: lang }));
    }
  };

  // Recruiter: Save edited question
  const handleSaveQuestion = async () => {
    if (!selectedProblem) return;
    const updatedProblems = problems.map(p =>
      p.id === selectedProblem.id
        ? { ...p, title: editTitle, difficulty: editDiff, description: editDesc }
        : p
    );
    try {
      await api.interviews.saveQuestions(roomId, updatedProblems);
      setProblems(updatedProblems);
      const updatedCurrent = updatedProblems.find(p => p.id === selectedProblem.id);
      setSelectedProblem(updatedCurrent);
      setIsEditingQuestion(false);
      // Broadcast
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'problems_update', problems: updatedProblems }));
      }
    } catch (e) {
      alert('Failed to save question: ' + e.message);
    }
  };

  // Recruiter: Import from PDF
  const handlePdfImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.interviews.importQuestionsPdf(roomId, formData);
      const newProblems = result.questions || result;
      setProblems(newProblems);
      if (newProblems.length > 0) {
        setSelectedProblem(newProblems[0]);
        setEditTitle(newProblems[0].title || '');
        setEditDiff(newProblems[0].difficulty || 'Medium');
        setEditDesc(newProblems[0].description || '');
        setCode(newProblems[0].starter_code?.[editorLanguage] || defaultStarterCodes[editorLanguage] || '');
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'problems_update', problems: newProblems }));
      }
    } catch (err) {
      alert('PDF import failed: ' + err.message);
    } finally {
      setPdfUploading(false);
      e.target.value = '';
    }
  };

  // Recruiter: Import from Codeforces
  const handleCodeforcesImport = async () => {
    setCfImporting(true);
    try {
      const result = await api.interviews.importCodeforces(roomId, cfCount);
      const newProblems = result.questions || result;
      setProblems(newProblems);
      if (newProblems.length > 0) {
        setSelectedProblem(newProblems[0]);
        setEditTitle(newProblems[0].title || '');
        setEditDiff(newProblems[0].difficulty || 'Medium');
        setEditDesc(newProblems[0].description || '');
        setCode(newProblems[0].starter_code?.[editorLanguage] || defaultStarterCodes[editorLanguage] || '');
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'problems_update', problems: newProblems }));
      }
    } catch (err) {
      alert('Codeforces import failed: ' + err.message);
    } finally {
      setCfImporting(false);
    }
  };


  const handleRunCode = async () => {
    if (isRecruiter) return;
    setRunning(true);
    setConsoleOpen(true);
    setConsoleTab('results');
    setConsoleOutput({ status: 'Running...', stdout: '', stderr: '', time: 0 });
    
    // Broadcast run event to recruiter
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'peer_code_run',
        status: 'Running...'
      }));
    }

    try {
      const res = await api.assessments.executeCode(code, editorLanguage, customStdin);
      setConsoleOutput(res);
      
      // Broadcast execution results to recruiter
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'peer_code_run',
          status: res.status,
          consoleOutput: res,
          submitResult: null,
          consoleOpen: true,
          consoleTab: 'results'
        }));
      }
    } catch (err) {
      const errRes = { status: 'Execution Error', stdout: '', stderr: err.message || 'Failed to execute code.', time: 0 };
      setConsoleOutput(errRes);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'peer_code_run',
          status: 'Execution Error',
          consoleOutput: errRes,
          submitResult: null,
          consoleOpen: true,
          consoleTab: 'results'
        }));
      }
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (isRecruiter) return;
    if (!selectedProblem) return;
    
    setSubmitting(true);
    setConsoleOpen(true);
    setConsoleTab('results');
    setConsoleOutput({ status: 'Evaluating solution...', stdout: '', stderr: '', time: 0 });
    setSubmitResult(null);

    // Broadcast submission event to recruiter
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'peer_code_run',
        status: 'Evaluating...'
      }));
    }

    const testCases = selectedProblem.test_cases || [];
    if (testCases.length === 0) {
      try {
        const res = await api.assessments.executeCode(code, editorLanguage, '');
        const outRes = {
          status: 'Submitted',
          stdout: res.stdout || 'Code executed successfully.',
          stderr: res.stderr,
          time: res.time
        };
        setConsoleOutput(outRes);
        setSubmitResult({ passed: 1, total: 1 });
        
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'peer_code_run',
            status: 'Submitted',
            consoleOutput: outRes,
            submitResult: { passed: 1, total: 1 },
            consoleOpen: true,
            consoleTab: 'results'
          }));
        }
      } catch (err) {
        const errRes = { status: 'Execution Error', stdout: '', stderr: err.message, time: 0 };
        setConsoleOutput(errRes);
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'peer_code_run',
            status: 'Execution Error',
            consoleOutput: errRes,
            submitResult: null,
            consoleOpen: true
          }));
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    let passedCount = 0;
    let failed = false;
    let lastOutput = null;

    try {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const res = await api.assessments.executeCode(code, editorLanguage, tc.input);
        lastOutput = res;
        
        const cleanOut = (res.stdout || '').trim().replace(/\r\n/g, '\n');
        const cleanExpected = (tc.expected_output || '').trim().replace(/\r\n/g, '\n');

        if (res.success || cleanOut === cleanExpected) {
          passedCount++;
        } else {
          failed = true;
        }
      }

      const finalStatus = passedCount === testCases.length ? 'Accepted' : 'Wrong Answer';
      const outputRes = {
        status: finalStatus,
        stdout: `Passed ${passedCount} / ${testCases.length} test cases.`,
        stderr: lastOutput?.stderr || '',
        time: lastOutput?.time || 0.1
      };
      setConsoleOutput(outputRes);
      setSubmitResult({ passed: passedCount, total: testCases.length });

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'peer_code_run',
          status: finalStatus,
          consoleOutput: outputRes,
          submitResult: { passed: passedCount, total: testCases.length },
          consoleOpen: true,
          consoleTab: 'results'
        }));
      }
    } catch (err) {
      const errRes = { status: 'Evaluation Failed', stdout: '', stderr: err.message, time: 0 };
      setConsoleOutput(errRes);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'peer_code_run',
          status: 'Evaluation Failed',
          consoleOutput: errRes,
          submitResult: null,
          consoleOpen: true
        }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Chat message send
  const sendChat = () => {
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'chat_message',
        text: chatInput,
        from: userName,
        time
      }));
    } else {
      setChatMessages(prev => [...prev, { from: 'You', text: chatInput, time }]);
    }
    setChatInput('');
  };

  // Save notes & Submit feedback (Recruiter only)
  const handleSaveNotes = async () => {
    try {
      await api.interviews.updateNotes(roomId, note);
      alert('Private interview notes saved successfully!');
    } catch (e) {
      alert('Failed to save notes: ' + e.message);
    }
  };

  const submitScorecard = async () => {
    try {
      await api.interviews.submitFeedback(roomId, {
        technical_skills: ratings.quality,
        communication: ratings.communication,
        problem_solving: ratings.algorithm,
        culture_fit: ratings.fit,
        recommendation: recommendation
      });
      alert('Scorecard submitted and interview finished successfully!');
      navigate('/recruiter/interviews');
    } catch (e) {
      alert('Failed to submit scorecard: ' + e.message);
    }
  };

  // Dynamic names
  const candidateName = session?.candidate ? `${session.candidate.first_name} ${session.candidate.last_name}` : 'Candidate';
  const jobTitle = session?.job ? session.job.title : 'Live Interview';

  return (
    <div className="h-screen w-full bg-neutral-50 flex flex-col text-xs text-neutral-500 overflow-y-auto lg:overflow-hidden font-sans select-none relative">
      
      {/* ── TOP SECTION (Increased to 64vh height): The largest screen on the page, covers full width ── */}
      <div className="min-h-[50vh] lg:h-[64vh] flex flex-col bg-white border-b border-neutral-200/80 shrink-0 shadow-sm">
        
        {/* Sleek Workspace Header */}
        <header className="border-b border-neutral-200/80 flex flex-wrap items-center justify-between px-3 sm:px-6 py-2 sm:py-0 sm:h-12 bg-white shrink-0 text-neutral-800 select-none gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src="/talvax_logo_navbar.png" className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0" alt="Talvex Logo" />
            <span className="font-extrabold text-neutral-950 text-xs sm:text-sm tracking-tight leading-none whitespace-nowrap">Talvex Live</span>
            <div className="h-3.5 w-[1px] bg-neutral-200 mx-0.5 sm:mx-1 hidden sm:block"></div>
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-500 hidden md:inline truncate max-w-[200px]">{jobTitle} Workspace</span>
            <span className="bg-orange-100 text-orange-600 px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] font-black tracking-wider flex items-center gap-1 border border-orange-200 ml-1 sm:ml-2 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              LIVE
            </span>
          </div>

          {/* Dynamic tabs of workspace in header */}
          <div className="flex items-center bg-white gap-0.5 sm:gap-1 h-full order-last sm:order-none w-full sm:w-auto justify-center sm:justify-end">
            {['problem', 'code', 'whiteboard'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 sm:px-4 py-2 sm:py-0 sm:h-full text-[9px] sm:text-[10px] font-bold capitalize transition-all border-b-2 cursor-pointer ${
                  activeTab === tab 
                    ? 'border-orange-500 text-neutral-950 font-extrabold bg-neutral-50/50' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-750'
                }`}
              >
                {tab === 'code' ? 'Code' : tab === 'whiteboard' ? 'Board' : 'Problem'}
              </button>
            ))}

          </div>
        </header>

        {/* Tab contents (Takes full width and full remaining top height) */}
        <div className="flex-1 w-full relative overflow-hidden bg-white">
          
          {/* Problem description */}
          {activeTab === 'problem' && selectedProblem && (
            <div className="absolute inset-0 overflow-y-auto p-6 text-neutral-700 select-text scrollbar-none">
              <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start w-full">
                
                {/* Left Column: Questions List or Edit Form */}
                <div className="flex-1 w-full space-y-6">
                  {/* ── Recruiter Edit Mode ── */}
                  {isRecruiter && isEditingQuestion ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 flex items-center gap-1.5"><Edit3 size={12}/> Editing Question</span>
                        <div className="flex gap-2">
                          <button onClick={handleSaveQuestion} className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-950 text-white rounded-full text-[10px] font-bold hover:bg-neutral-800 transition-all cursor-pointer shadow-sm"><Check size={11}/> Save</button>
                          <button onClick={() => setIsEditingQuestion(false)} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-neutral-200 text-neutral-600 rounded-full text-[10px] font-bold hover:bg-neutral-50 transition-all cursor-pointer"><X size={11}/> Cancel</button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Title</label>
                          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Difficulty</label>
                          <select value={editDiff} onChange={e => setEditDiff(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-700 focus:outline-none focus:border-orange-400 cursor-pointer transition-colors">
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Description</label>
                          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={8} className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs font-medium text-neutral-700 focus:outline-none focus:border-orange-400 resize-none leading-relaxed transition-colors" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Read-Only Problem View (both roles) ── */
                    <div className="space-y-8 divide-y divide-neutral-100">
                      {!problems || problems.length === 0 ? (
                        <div className="text-center py-10 text-neutral-400 text-xs font-bold">
                          No questions in this interview room. Use the actions on the right to import questions.
                        </div>
                      ) : (
                        problems.map((prob, idx) => (
                          <div key={prob.id || idx} className={`space-y-4 ${idx > 0 ? 'pt-6' : ''}`}>
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-extrabold text-orange-600 font-mono">Q{idx + 1}.</span>
                              <h2 className="text-base font-extrabold text-neutral-950 tracking-tight">{prob.title}</h2>
                              <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                                prob.difficulty?.toLowerCase() === 'easy' 
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                  : prob.difficulty?.toLowerCase() === 'hard'
                                    ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                    : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                              }`}>
                                {prob.difficulty}
                              </span>

                              {/* Solve/Active Button */}
                              <button
                                onClick={() => {
                                  handleProblemChange(prob);
                                  setActiveTab('code');
                                }}
                                className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold transition-all cursor-pointer shadow-sm ${
                                  selectedProblem?.id === prob.id
                                    ? 'bg-orange-500 text-white hover:bg-orange-600 font-extrabold'
                                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                }`}
                              >
                                {selectedProblem?.id === prob.id ? 'Active in Editor' : 'Solve in Editor'}
                              </button>

                              {isRecruiter && (
                                <button
                                  onClick={() => {
                                    setSelectedProblem(prob);
                                    setEditTitle(prob.title || '');
                                    setEditDiff(prob.difficulty || 'Medium');
                                    setEditDesc(prob.description || '');
                                    setIsEditingQuestion(true);
                                  }}
                                  className="ml-2 flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 text-neutral-500 rounded-full text-[9px] font-bold hover:bg-neutral-50 hover:text-neutral-800 transition-all cursor-pointer shadow-sm"
                                >
                                  <Edit3 size={10}/> Edit
                                </button>
                              )}
                            </div>

                            <p className="text-neutral-500 text-xs leading-relaxed whitespace-pre-wrap font-medium">{prob.description}</p>

                            {prob.test_cases && prob.test_cases.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                                {prob.test_cases.slice(0, 2).map((ex, i) => (
                                  <div key={i} className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-2">
                                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Example {i + 1}</div>
                                    <div className="text-xs font-mono space-y-1">
                                      <div><span className="text-neutral-500">Input: </span><span className="text-orange-600">{ex.input}</span></div>
                                      <div><span className="text-neutral-600">Output: </span><span className="text-emerald-600">{ex.expected_output}</span></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Sticky Recruiter Import Actions (sidebar) */}
                {isRecruiter && !isEditingQuestion && (
                  <div className="w-full lg:w-80 shrink-0 bg-neutral-50 border border-neutral-200/60 rounded-3xl p-5 space-y-4 lg:sticky lg:top-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Import Questions</div>
                    <p className="text-neutral-500 text-[10px] font-medium leading-relaxed">
                      Add new coding problems to the interview room by uploading a PDF or fetching from Codeforces.
                    </p>
                    
                    <div className="space-y-3 pt-2">
                      {/* PDF Import */}
                      <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-sm border w-full ${
                        pdfUploading 
                          ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-wait'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-orange-300 hover:text-orange-600 hover:shadow-md'
                      }`}>
                        {pdfUploading ? (
                          <><Loader2 className="animate-spin" size={13}/> Parsing PDF...</>
                        ) : (
                          <><FileText size={13}/> Import from PDF</>
                        )}
                        <input type="file" accept=".pdf" onChange={handlePdfImport} className="hidden" disabled={pdfUploading} />
                      </label>

                      <div className="h-[1px] bg-neutral-200/80 my-2"></div>

                      {/* Codeforces Import Container */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-full px-3.5 py-1.5 shadow-sm">
                          <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Count:</span>
                          <input 
                            type="number" min={1} max={20} value={cfCount} 
                            onChange={e => setCfCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))} 
                            className="w-10 text-right text-[10px] font-bold text-neutral-900 bg-transparent outline-none"
                          />
                        </div>
                        
                        <button 
                          onClick={handleCodeforcesImport} 
                          disabled={cfImporting}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-sm border w-full ${
                            cfImporting
                              ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-wait'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md'
                          }`}
                        >
                          {cfImporting ? (
                            <><Loader2 className="animate-spin" size={13}/> Importing...</>
                          ) : (
                            <><Globe size={13}/> Import from Codeforces</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* IDE workspace absolute black */}
          {activeTab === 'code' && (
            <div className="absolute inset-0 flex flex-col bg-white">
              {/* Code subheader */}
              <div className="bg-neutral-50 border-b border-neutral-200/80 flex flex-wrap items-center px-2 sm:px-4 py-1.5 sm:py-0 sm:h-9 shrink-0 justify-between gap-1">
                <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap min-w-0">
                  {/* Dynamic filename */}
                  <div className="flex items-center text-orange-600 text-[8px] sm:text-[9px] font-extrabold tracking-wider font-mono truncate max-w-[120px] sm:max-w-none">
                    <Code2 size={11} className="mr-1 sm:mr-1.5 text-orange-400 shrink-0"/>
                    <span className="truncate">{selectedProblem ? `Q${problems.findIndex(p => p.id === selectedProblem.id) + 1}: ${selectedProblem.title}` : 'solution'}.{languageMeta[editorLanguage]?.ext || 'js'}</span>
                  </div>

                  <div className="h-3.5 w-[1px] bg-neutral-200"></div>

                  {/* Question Selector inside editor toolbar */}
                  {problems.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {problems.map((p, idx) => (
                        <button
                          key={p.id}
                          onClick={() => handleProblemChange(p)}
                          className={`px-2 py-0.5 text-[8px] rounded-full font-mono font-bold transition-all cursor-pointer ${
                            selectedProblem?.id === p.id 
                              ? 'bg-orange-500 text-white shadow-sm' 
                              : 'bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
                          }`}
                        >
                          Q{idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="h-3.5 w-[1px] bg-neutral-200"></div>

                  {/* ── Language Selector Dropdown ── */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowLangDropdown(v => !v); }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-full text-[9px] font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-600 transition-all cursor-pointer shadow-sm"
                    >
                      <span className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center text-[7px] font-black leading-none">
                        {languageMeta[editorLanguage]?.mono || 'JS'}
                      </span>
                      {languageMeta[editorLanguage]?.label || 'JavaScript'}
                      <ChevronDown size={10} className={`transition-transform ${showLangDropdown ? 'rotate-180' : ''}`}/>
                    </button>

                    {showLangDropdown && (
                      <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 py-1.5 animate-fade-in">
                        {Object.entries(languageMeta).map(([key, meta]) => (
                          <button
                            key={key}
                            onClick={() => handleLanguageChange(key)}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[10px] font-bold transition-all cursor-pointer ${
                              editorLanguage === key 
                                ? 'bg-orange-50 text-orange-600'
                                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black leading-none ${
                              editorLanguage === key
                                ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                                : 'bg-neutral-100 text-neutral-500'
                            }`}>
                              {meta.mono}
                            </span>
                            {meta.label}
                            {editorLanguage === key && <Check size={10} className="ml-auto text-orange-500"/>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-wider">Theme:</span>
                    <button
                      onClick={() => setEditorTheme(t => t === 'black' ? 'white' : 'black')}
                      className="px-2.5 py-0.5 rounded-full text-[8px] font-bold border transition-colors bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-50 cursor-pointer shadow-sm"
                    >
                      {editorTheme === 'black' ? 'Light Editor' : 'Dark Editor'}
                    </button>
                  </div>
                  <span className="text-[8px] sm:text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest font-mono hidden md:inline">
                    {isRecruiter ? 'Recruiter View (Read-Only)' : 'Candidate Workspace'}
                  </span>
                </div>
              </div>

              {/* textarea */}
              <textarea
                className={`w-full flex-1 p-6 font-mono text-xs focus:outline-none resize-none leading-relaxed select-text overflow-y-auto transition-colors duration-200 ${
                  editorTheme === 'black' ? 'bg-neutral-950 text-[#f8f8f2]' : 'bg-white text-neutral-900'
                }`}
                value={code}
                onChange={e => handleCodeChange(e.target.value)}
                readOnly={isRecruiter}
                spellCheck={false}
                placeholder="// Start writing your collaborative solution..."
              />

              {/* Collapsible Console Drawer */}
              {consoleOpen && (
                <div className="h-[180px] border-t border-neutral-200 bg-neutral-50 flex flex-col shrink-0 text-[10px] font-mono">
                  {/* Console Header Tabs */}
                  <div className="h-8 border-b border-neutral-200/80 bg-white flex items-center justify-between px-4 shrink-0">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setConsoleTab('results')}
                        className={`font-extrabold pb-0.5 transition-colors border-b-2 cursor-pointer ${
                          consoleTab === 'results' ? 'border-orange-500 text-neutral-950' : 'border-transparent text-neutral-400'
                        }`}
                      >
                        Test Results
                      </button>
                      <button
                        onClick={() => setConsoleTab('stdin')}
                        className={`font-extrabold pb-0.5 transition-colors border-b-2 cursor-pointer ${
                          consoleTab === 'stdin' ? 'border-orange-500 text-neutral-950' : 'border-transparent text-neutral-400'
                        }`}
                      >
                        Custom Stdin
                      </button>
                    </div>
                    <button
                      onClick={() => setConsoleOpen(false)}
                      className="text-neutral-400 hover:text-neutral-700 font-bold cursor-pointer"
                    >
                      Hide Console [x]
                    </button>
                  </div>

                  {/* Console Body */}
                  <div className="flex-1 overflow-y-auto p-4 leading-normal select-text">
                    {consoleTab === 'stdin' ? (
                      <div className="h-full flex flex-col gap-1.5">
                        <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">Provide Standard Input (Stdin):</span>
                        <textarea
                          value={customStdin}
                          onChange={e => setCustomStdin(e.target.value)}
                          className="flex-1 bg-white border border-neutral-200 text-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-neutral-300 resize-none font-semibold font-mono text-[10px]"
                          placeholder="Enter standard input values here..."
                          readOnly={isRecruiter}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {consoleOutput ? (
                          <>
                            <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-200/50">
                              <span className="text-neutral-400 font-bold">Status:</span>
                              <span className={`font-black uppercase tracking-wider ${
                                consoleOutput.status === 'Accepted' || consoleOutput.status === 'Executed' || consoleOutput.status === 'Submitted'
                                  ? 'text-emerald-600'
                                  : consoleOutput.status === 'Running...' || consoleOutput.status === 'Evaluating...'
                                    ? 'text-orange-500 animate-pulse'
                                    : 'text-red-500'
                              }`}>{consoleOutput.status}</span>
                              {submitResult && (
                                <span className="ml-2 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold border border-emerald-100">
                                  Passed {submitResult.passed} / {submitResult.total}
                                </span>
                              )}
                            </div>
                            
                            {consoleOutput.stdout && (
                              <div className="space-y-1">
                                <div className="text-[8px] text-neutral-400 font-black uppercase tracking-widest">Standard Output:</div>
                                <pre className="bg-white p-2.5 rounded-xl border border-neutral-200/40 text-neutral-800 whitespace-pre-wrap max-h-[100px] overflow-y-auto font-semibold leading-relaxed">{consoleOutput.stdout}</pre>
                              </div>
                            )}

                            {consoleOutput.stderr && (
                              <div className="space-y-1">
                                <div className="text-[8px] text-red-400 font-black uppercase tracking-widest">Error Logs (stderr):</div>
                                <pre className="bg-red-50/50 p-2.5 rounded-xl border border-red-100 text-red-600 whitespace-pre-wrap max-h-[100px] overflow-y-auto font-semibold leading-relaxed">{consoleOutput.stderr}</pre>
                              </div>
                            )}

                            {!consoleOutput.stdout && !consoleOutput.stderr && (
                              <div className="text-neutral-400 italic">No output.</div>
                            )}
                          </>
                        ) : (
                          <div className="text-neutral-400 italic py-2 text-center font-bold">Run or submit code to check console execution results here.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer toolbar inside IDE */}
              <div className="bg-neutral-50 border-t border-neutral-200/80 flex flex-wrap items-center gap-2 px-2 sm:px-4 py-1.5 sm:py-0 sm:h-9 shrink-0 justify-between">
                <div className="flex gap-2">
                  {!isRecruiter ? (
                    <>
                      <button
                        onClick={handleRunCode}
                        disabled={running || submitting}
                        className="text-[9px] font-extrabold border border-neutral-200 hover:bg-neutral-100 bg-white text-neutral-900 px-3.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-50"
                      >
                        {running ? 'Running...' : '▶ Run code'}
                      </button>
                      <button
                        onClick={handleSubmitCode}
                        disabled={running || submitting}
                        className="text-[9px] font-extrabold bg-neutral-950 hover:bg-neutral-850 text-white px-3.5 py-1 rounded-full transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit code'}
                      </button>
                      
                      {consoleOpen ? (
                        <button
                          onClick={() => setConsoleOpen(false)}
                          className="text-[9px] font-extrabold text-neutral-500 hover:text-neutral-700 px-2.5 py-1 transition-all cursor-pointer"
                        >
                          Close Console
                        </button>
                      ) : (
                        <button
                          onClick={() => { setConsoleOpen(true); setConsoleTab('stdin'); }}
                          className="text-[9px] font-extrabold text-neutral-500 hover:text-neutral-700 px-2.5 py-1 transition-all cursor-pointer"
                        >
                          Open Console
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-[9px] font-bold text-neutral-400">
                      {running ? 'Candidate is running code...' : submitting ? 'Candidate is submitting solution...' : 'Watching Candidate Workspace'}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold text-neutral-400 font-mono">{languageMeta[editorLanguage]?.label || 'JavaScript'}</span>
              </div>
            </div>
          )}

          {/* Drawing whiteboard */}
          {activeTab === 'whiteboard' && (
            <div className="absolute inset-0 bg-white flex flex-col overflow-hidden">
              <div className="absolute top-4 left-4 z-10 flex gap-2 bg-white/95 p-1.5 rounded-full border shadow-md backdrop-blur">
                <>
                  {['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b'].map(c => (
                    <button 
                      key={c} 
                      onClick={() => setBrushColor(c)}
                      className={`w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform cursor-pointer ${brushColor === c ? 'ring-2 ring-orange-500 ring-offset-1' : ''}`} 
                      style={{ background: c }} 
                    />
                  ))}
                  <div className="w-[1px] bg-gray-200 h-5 mx-1"></div>
                  <button 
                    onClick={clearCanvas} 
                    className="px-3 py-1 text-[10px] bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-full flex items-center gap-1 text-neutral-700 transition-colors cursor-pointer font-bold"
                  >
                    <Eraser size={11} /> Clear Board
                  </button>
                </>
              </div>
              <canvas
                ref={canvasRef}
                className="flex-1 bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          )}

        </div>

      </div>

      {/* ── BOTTOM SECTION (Reduced Height): Horizontal Split (Webcams on Left, Tools on Right) ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden w-full relative border-t border-neutral-200/80 bg-neutral-50/50">
        
        {/* Left half: Webcams side-by-side (Takes up 62% width) */}
        <div className="w-full lg:w-[62%] h-[280px] sm:h-[380px] lg:h-full flex flex-col p-2 sm:p-4 justify-between relative bg-neutral-50/55 border-b lg:border-b-0 border-neutral-200">
          
          {/* Side-by-side webcams container (Only 2 screens, candidate & recruiter) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full h-full lg:h-[calc(100%-1rem)] items-center">
            
            {/* Candidate webcam card */}
            <div className="flex-1 w-full sm:w-auto h-full rounded-xl sm:rounded-[1.8rem] overflow-hidden bg-neutral-900 border border-neutral-200 aspect-video relative shadow-md">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ display: (remoteStreamActive && remoteCamOn) ? 'block' : 'none' }}
              />
              {(!remoteStreamActive || !remoteCamOn) && (
                <img 
                  src={
                    isRecruiter 
                      ? (session?.candidate?.parsed_resume?.photo_url || "https://i.pravatar.cc/150?u=demo_candidate")
                      : "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"
                  } 
                  alt={isRecruiter ? "Candidate" : "Interviewer"} 
                  className="w-full h-full object-cover opacity-85" 
                />
              )}
              {!remoteMicOn && (
                <div className="absolute top-3 right-3 bg-red-600/80 p-1.5 rounded-full text-white shadow-md">
                  <MicOff size={11} />
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-neutral-800 text-[9px] font-bold px-3 py-1 rounded-full border border-neutral-200 shadow-sm">
                {isRecruiter ? `${candidateName} (Candidate)` : `${session?.company?.name || "Company Recruiter"} (Interviewer)`}
              </div>
            </div>

            {/* Recruiter webcam card */}
            <div className="flex-1 w-full sm:w-auto h-full rounded-xl sm:rounded-[1.8rem] overflow-hidden bg-neutral-900 border border-neutral-200 aspect-video relative shadow-md">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: camOn ? 'block' : 'none' }}
              />
              {!camOn && (
                <img 
                  src={
                    isRecruiter
                      ? "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400"
                      : (session?.candidate?.parsed_resume?.photo_url || "https://i.pravatar.cc/150?u=demo_candidate")
                  } 
                  alt="You" 
                  className="w-full h-full object-cover opacity-85" 
                />
              )}
              {!micOn && (
                <div className="absolute top-3 right-3 bg-red-600/80 p-1.5 rounded-full text-white shadow-md">
                  <MicOff size={11} />
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-neutral-800 text-[9px] font-bold px-3 py-1 rounded-full border border-neutral-200 shadow-sm">
                {userName} (You)
              </div>
            </div>

          </div>

          {/* Floating Controls pill overlay at bottom center of webcam panel */}
          <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-1.5 sm:py-2 bg-white border border-neutral-200 rounded-full shadow-lg backdrop-blur z-20">
            <button
              onClick={() => setMicOn(m => !m)}
              className={`p-2 rounded-full transition-all cursor-pointer ${
                micOn ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'bg-red-500/10 text-red-500'
              }`}
              title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micOn ? <Mic size={14} /> : <MicOff size={14} />}
            </button>

            <button
              onClick={() => setCamOn(c => !c)}
              className={`p-2 rounded-full transition-all cursor-pointer ${
                camOn ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'bg-red-500/10 text-red-500'
              }`}
              title={camOn ? 'Stop Webcam' : 'Start Webcam'}
            >
              {camOn ? <Video size={14} /> : <VideoOff size={14} />}
            </button>

            <div className="w-[1px] bg-neutral-200 h-5 mx-1"></div>

            <button
              onClick={() => navigate(isRecruiter ? '/recruiter/interviews' : '/candidate/dashboard')}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2.5 transition-all shadow-md shadow-red-600/20 cursor-pointer shrink-0"
              title="End Call / Leave Room"
            >
              <PhoneMissed size={14} className="transform rotate-[135deg]" />
            </button>
          </div>

        </div>

        {/* Right half: Interview Tools (Chat, Notes, Scorecard) (Takes up 38% width) */}
        <div className="w-full lg:w-[38%] h-[400px] sm:h-[500px] lg:h-full border-t lg:border-t-0 lg:border-l border-neutral-200/80 flex flex-col bg-white shrink-0">
          
          {/* Tool Tabs Selector */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-neutral-200 bg-white shrink-0">
            {isRecruiter && (
              <>
                <button
                  onClick={() => setRightActiveTab('notes-right')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold capitalize transition-all cursor-pointer ${
                    rightActiveTab === 'notes-right' 
                      ? 'bg-neutral-950 text-white border border-neutral-950' 
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Evaluation Notes
                </button>
                <button
                  onClick={() => setRightActiveTab('scorecard-right')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold capitalize transition-all cursor-pointer ${
                    rightActiveTab === 'scorecard-right' 
                      ? 'bg-neutral-950 text-white border border-neutral-950' 
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Scorecard
                </button>
              </>
            )}
            <button
              onClick={() => setRightActiveTab('chat-right')}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold capitalize transition-all cursor-pointer ${
                rightActiveTab === 'chat-right' 
                  ? 'bg-neutral-950 text-white border border-neutral-950' 
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Chat Message
            </button>
          </div>

          {/* Active Tool Body */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            
            {/* Recruiter Notes */}
            {isRecruiter && rightActiveTab === 'notes-right' && (
              <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0 bg-neutral-50/50 space-y-3">
                <div className="flex justify-between items-center text-neutral-500 text-[9px] font-bold uppercase tracking-wider shrink-0">
                  <span>Candidate notes (private)</span>
                  <button onClick={handleSaveNotes} className="text-[9px] bg-neutral-950 hover:bg-neutral-800 text-white px-3 py-1 rounded-full font-bold transition-all cursor-pointer">
                    Save Notes
                  </button>
                </div>
                <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
                  <textarea
                    className="w-full flex-1 bg-transparent text-neutral-800 p-4 outline-none resize-none text-xs font-semibold leading-relaxed select-text overflow-y-auto"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Type candidate feedback and interview observations here..."
                  />
                </div>
              </div>
            )}

            {/* Chat message threads */}
            {rightActiveTab === 'chat-right' && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50/50">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                  {chatMessages.map((m, i) => (
                    <div key={i} className="space-y-1 select-text">
                      <div className="text-[9px] font-bold text-neutral-400 tracking-wide">{m.from} · {m.time}</div>
                      <div className={`text-xs px-3.5 py-2.5 rounded-2xl leading-relaxed ${
                        m.from === userName 
                          ? 'bg-neutral-950 text-white ml-6' 
                          : 'bg-white border border-neutral-200 text-neutral-800'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12 text-neutral-400 italic text-[10px] font-bold uppercase tracking-wider">No messages in room chat</div>
                  )}
                </div>
                
                {/* Input row */}
                <div className="p-3 border-t border-neutral-200 bg-white flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Type something..."
                    className="flex-1 bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs rounded-full px-4 py-2 focus:outline-none focus:border-neutral-400 placeholder-neutral-400 font-semibold"
                  />
                  <input
                    type="submit"
                    className="hidden"
                    onClick={sendChat}
                  />
                  <button onClick={sendChat} className="bg-neutral-950 text-white p-2.5 rounded-full hover:bg-neutral-800 transition-all cursor-pointer shrink-0">
                    <Send size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Recruiter evaluation details */}
            {isRecruiter && rightActiveTab === 'scorecard-right' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-5 bg-neutral-50/50 scrollbar-none">
                <h4 className="text-[9px] font-bold text-neutral-500 tracking-widest uppercase mb-2">Score Candidate (1-5)</h4>
                
                <div className="space-y-3.5">
                  {[
                    { label: 'Problem Understanding', key: 'understanding', score: ratings.understanding },
                    { label: 'Algorithm Design', key: 'algorithm', score: ratings.algorithm },
                    { label: 'Code Quality', key: 'quality', score: ratings.quality },
                    { label: 'Technical Communication', key: 'communication', score: ratings.communication },
                    { label: 'Culture Fit', key: 'fit', score: ratings.fit },
                  ].map((item) => (
                    <div key={item.key} className="bg-white border border-neutral-200 p-4 rounded-2xl space-y-2.5 shadow-sm">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-neutral-600">{item.label}</span>
                        <span className="text-orange-500">{item.score}/5</span>
                      </div>
                      <div className="flex gap-1.5">
                        {[1,2,3,4,5].map(s => (
                          <button 
                            key={s} 
                            type="button"
                            onClick={() => setRatings(prev => ({ ...prev, [item.key]: s }))}
                            className={`flex-1 h-1.5 rounded-full transition-all cursor-pointer ${
                              s <= item.score ? 'bg-orange-500' : 'bg-neutral-200 hover:bg-neutral-300'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Overall Recommendation</label>
                    <select 
                      value={recommendation}
                      onChange={e => setRecommendation(e.target.value)}
                      className="w-full bg-white border border-neutral-200 text-neutral-750 rounded-full px-4 py-2.5 text-xs focus:outline-none focus:border-neutral-400 cursor-pointer font-bold shadow-sm"
                    >
                      <option>Strong Yes</option>
                      <option>Yes</option>
                      <option>No Decision</option>
                      <option>No</option>
                      <option>Strong No</option>
                    </select>
                  </div>
                  
                  <button onClick={submitScorecard} className="w-full py-3 bg-neutral-950 hover:bg-neutral-850 text-white font-extrabold rounded-full text-xs transition-all shadow-md mt-6 cursor-pointer">
                    Submit Scorecard & Complete Interview
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Anti-Cheating Warning Overlay */}
        {focusWarning && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full border border-red-100 shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-500/10">
                <X size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-neutral-950 font-extrabold text-sm tracking-tight">Warning: Focus Lost</h3>
                <p className="text-[11px] text-neutral-450 font-bold uppercase tracking-wider leading-relaxed">
                  TAB SWITCHING / WINDOW BLUR DETECTED
                </p>
                <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                  Please maintain active focus on the interview screen. Focus loss events are reported to the recruiter instantly.
                </p>
              </div>
              <button
                onClick={() => setFocusWarning(false)}
                className="w-full py-3 bg-neutral-950 hover:bg-neutral-850 text-white font-extrabold rounded-full text-xs transition-all shadow-md cursor-pointer"
              >
                Acknowledge & Resume
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

// Inline fallback loader component to prevent compile issues
function Loader2({ className, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
