import React, { useState, useEffect, useRef } from 'react';
import { Mic, Video, Share, MoreHorizontal, PhoneMissed, MessageSquare, PenTool, LayoutTemplate, MicOff, VideoOff, Monitor, Users, Send, ChevronRight, Eraser, Star, Sparkles } from 'lucide-react';
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

  // Media states
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

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

        // Fetch questions
        const questionsList = await api.assessments.listQuestions();
        setProblems(questionsList);
        if (questionsList.length > 0) {
          setSelectedProblem(questionsList[0]);
          setCode(questionsList[0].starter_code?.javascript || `function solution() {\n  // Write your code here\n}`);
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

  // 3. Setup WebSocket Connection & WebRTC Signaling
  useEffect(() => {
    if (!roomId) return;

    const wsUrl = `ws://localhost:8000/ws/interview/${roomId}/`;
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
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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
    if (isRecruiter) return; // Recruiter read-only
    const coords = getCanvasPos(e);
    lastCoords.current = coords;
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || isRecruiter) return;
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
    if (isRecruiter) return; // Recruiter read-only
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

  // Code & Problem sync handlers
  const handleCodeChange = (newCode) => {
    if (isRecruiter) return; // Recruiter is read-only
    setCode(newCode);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'code_edit',
        code: newCode
      }));
    }
  };

  const handleProblemChange = (p) => {
    if (isRecruiter) return; // Only candidate can change standard programming problem
    setSelectedProblem(p);
    const starter = p.starter_code?.javascript || `function solution() {\n  // Write solution\n}`;
    setCode(starter);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'problem_change',
        problem: p,
        code: starter
      }));
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
    <div className="h-screen w-full bg-neutral-50 flex flex-col text-xs text-neutral-500 overflow-hidden font-sans select-none animate-fade-in relative">
      
      {/* ── TOP SECTION (Increased to 64vh height): The largest screen on the page, covers full width ── */}
      <div className="h-[64vh] flex flex-col bg-white border-b border-neutral-200/80 shrink-0 shadow-sm">
        
        {/* Sleek Workspace Header */}
        <header className="h-12 border-b border-neutral-200/80 flex items-center justify-between px-6 bg-white shrink-0 text-neutral-800 select-none">
          <div className="flex items-center gap-3">
            <img src="/talvax_logo_navbar.png" className="w-7 h-7 object-contain" alt="Talvex Logo" />
            <span className="font-extrabold text-neutral-950 text-sm tracking-tight leading-none">Talvex Live</span>
            <div className="h-3.5 w-[1px] bg-neutral-200 mx-1"></div>
            <span className="text-[11px] font-bold text-neutral-500">{jobTitle} Workspace</span>
            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider flex items-center gap-1 border border-orange-200 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              LIVE
            </span>
          </div>

          {/* Dynamic tabs of workspace in header */}
          <div className="flex items-center bg-white px-2 gap-1 h-full">
            {['problem', 'code', 'whiteboard'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 h-full text-[10px] font-bold capitalize transition-all border-b-2 cursor-pointer ${
                  activeTab === tab 
                    ? 'border-orange-500 text-neutral-950 font-extrabold bg-neutral-50/50' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-750'
                }`}
              >
                {tab === 'code' ? 'Code Editor' : tab === 'whiteboard' ? 'Whiteboard' : 'Problem Statement'}
              </button>
            ))}

            {/* Problem Selector (Candidate Only) */}
            {!isRecruiter && problems.length > 0 && (
              <div className="ml-4 flex items-center gap-1">
                {problems.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => { handleProblemChange(p); setActiveTab('code'); }}
                    className={`px-2.5 py-0.5 text-[8px] rounded-full font-mono font-bold transition-all cursor-pointer ${
                      selectedProblem?.id === p.id 
                        ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' 
                        : 'text-neutral-500 hover:text-neutral-750'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Tab contents (Takes full width and full remaining top height) */}
        <div className="flex-1 w-full relative overflow-hidden bg-white">
          
          {/* Problem description */}
          {activeTab === 'problem' && selectedProblem && (
            <div className="absolute inset-0 overflow-y-auto p-6 text-neutral-700 select-text scrollbar-none">
              <div className="max-w-4xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-extrabold text-neutral-950 tracking-tight">{selectedProblem.title}</h2>
                  <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                    selectedProblem.difficulty?.toLowerCase() === 'easy' 
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                      : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                  }`}>
                    {selectedProblem.difficulty}
                  </span>
                </div>
                
                <p className="text-neutral-500 text-xs leading-relaxed whitespace-pre-wrap font-medium">{selectedProblem.description}</p>
                
                {selectedProblem.test_cases && selectedProblem.test_cases.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    {selectedProblem.test_cases.slice(0, 2).map((ex, i) => (
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
            </div>
          )}

          {/* IDE workspace absolute black */}
          {activeTab === 'code' && (
            <div className="absolute inset-0 flex flex-col bg-white">
              {/* Code subheader */}
              <div className="h-8 bg-neutral-50 border-b border-neutral-200/80 flex items-center px-4 shrink-0 justify-between">
                <div className="flex items-center text-orange-600 text-[9px] font-extrabold tracking-wider font-mono">
                  solution.js
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-wider">Theme:</span>
                    <button
                      onClick={() => setEditorTheme(t => t === 'black' ? 'white' : 'black')}
                      className="px-2.5 py-0.5 rounded-full text-[8px] font-bold border transition-colors bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-50 cursor-pointer shadow-sm"
                    >
                      {editorTheme === 'black' ? 'Light Editor' : 'Dark Editor'}
                    </button>
                  </div>
                  <span className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest font-mono">
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

              {/* Footer toolbar inside IDE */}
              <div className="h-9 bg-neutral-50 border-t border-neutral-200/80 flex items-center gap-2 px-4 shrink-0 justify-between">
                <div className="flex gap-2">
                  {!isRecruiter && (
                    <>
                      <button className="text-[9px] font-extrabold border border-neutral-200 hover:bg-neutral-100 bg-white text-neutral-900 px-3.5 py-1 rounded-full transition-all cursor-pointer">▶ Run code</button>
                      <button className="text-[9px] font-extrabold bg-neutral-950 hover:bg-neutral-850 text-white px-3.5 py-1 rounded-full transition-all shadow-sm cursor-pointer">Submit code</button>
                    </>
                  )}
                </div>
                <span className="text-[9px] font-bold text-neutral-400 font-mono">JavaScript (ES6)</span>
              </div>
            </div>
          )}

          {/* Drawing whiteboard */}
          {activeTab === 'whiteboard' && (
            <div className="absolute inset-0 bg-white flex flex-col overflow-hidden">
              <div className="absolute top-4 left-4 z-10 flex gap-2 bg-white/95 p-1.5 rounded-full border shadow-md backdrop-blur">
                {!isRecruiter ? (
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
                ) : (
                  <span className="text-[10px] text-gray-500 font-bold px-3 py-1 uppercase tracking-wider">👁 Recruiter View (Read-Only)</span>
                )}
              </div>
              <canvas
                ref={canvasRef}
                className={`flex-1 bg-white ${isRecruiter ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
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
      <div className="flex-1 flex overflow-hidden w-full relative border-t border-neutral-200/80 bg-neutral-50/50">
        
        {/* Left half: Webcams side-by-side (Takes up 62% width) */}
        <div className="w-[62%] h-full flex flex-col p-4 justify-between relative bg-neutral-50/55">
          
          {/* Side-by-side webcams container (Only 2 screens, candidate & recruiter) */}
          <div className="flex gap-4 w-full h-[calc(100%-1rem)] items-center">
            
            {/* Candidate webcam card */}
            <div className="flex-1 h-full rounded-[1.8rem] overflow-hidden bg-neutral-900 border border-neutral-200 aspect-video relative shadow-md">
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
                {isRecruiter ? `${candidateName} (Candidate)` : "Sarah Jenkins (Interviewer)"}
              </div>
            </div>

            {/* Recruiter webcam card */}
            <div className="flex-1 h-full rounded-[1.8rem] overflow-hidden bg-neutral-900 border border-neutral-200 aspect-video relative shadow-md">
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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 bg-white border border-neutral-200 rounded-full shadow-lg backdrop-blur z-20">
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

            <button
              onClick={() => setScreenSharing(s => !s)}
              className={`p-2 rounded-full transition-all cursor-pointer ${
                screenSharing ? 'bg-orange-50 text-orange-600' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title="Share Screen"
            >
              <Monitor size={14} />
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
        <div className="w-[38%] h-full border-l border-neutral-200/80 flex flex-col bg-white shrink-0">
          
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
