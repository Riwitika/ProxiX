import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import QRCode from "react-qr-code"
import { Calendar, Users, LogOut, CheckCircle, BarChart3, Presentation, Lock, Edit3 } from "lucide-react"

export default function App() {
  const SESSION_TIME = 35

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)

  const [activeTab, setActiveTab] = useState("session")

  const [selectedDate, setSelectedDate] = useState("")
  const [schedule, setSchedule] = useState([])
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  
  const [activeSession, setActiveSession] = useState(null)
  const [qrValue, setQrValue] = useState("")
  const [timeLeft, setTimeLeft] = useState(0)

  const [manualOpen, setManualOpen] = useState(false)
  const [students, setStudents] = useState([])
  const [editReasonPrompt, setEditReasonPrompt] = useState(null)
  const [editReasonText, setEditReasonText] = useState("")

  const [analyticsData, setAnalyticsData] = useState([])

  const loadStudents = async () => {
    const { data } = await supabase.from("users").select("*").eq("role", "student")
    if (data) {
      const sorted = data.sort((a,b) => a.username.localeCompare(b.username))
      setStudents(sorted.map(s => ({ id: s.id, name: s.username, present: false })))
    }
  }

  useEffect(() => {
    if (loggedIn) {
      loadStudents()
      loadSchedule()
      if(activeTab === "analytics") fetchAnalytics()
    }
  }, [loggedIn, activeTab])

  const login = async () => {
    const { data } = await supabase.from("users").select("*").eq("username", username).eq("password", password).single()
    if (data && data.role === "teacher") { setLoggedIn(true) } else { alert("Access Denied") }
  }

  const loadSchedule = async () => {
    const { data } = await supabase.from("schedule").select("*").order("start_time")
    setSchedule(data)
  }

  const generateQR = async () => {
    if (!selectedSchedule) { alert("Select schedule first"); return }

    const sessionToken = "PROXIX-" + Math.random().toString(36).substring(2, 10)
    let sessData = activeSession;
    
    if (activeSession && !activeSession.is_locked && activeSession.class_id === selectedSchedule.class_id) {
       // Merge it to existing manual or previous session run
       const { data, error } = await supabase.from("sessions").update({ qr_token: sessionToken, end_time: new Date(Date.now() + SESSION_TIME * 1000) }).eq("id", activeSession.id).select().single()
       if (!error && data) sessData = data;
    } else {
       const { data, error } = await supabase
         .from("sessions")
         .insert([{
             class_id: selectedSchedule.id,
             qr_token: sessionToken,
             start_time: new Date(),
             end_time: new Date(Date.now() + SESSION_TIME * 1000),
             session_date: selectedDate || new Date().toISOString().split('T')[0],
             is_locked: false
         }]).select().single()
         
       if (error) {
          alert("Error creating session in DB: " + error.message);
          console.error(error)
          return;
       }
       sessData = data;
    }
    
    setActiveSession(sessData)

    let seconds = SESSION_TIME
    setTimeLeft(seconds)
    setQrValue(sessionToken + "|" + Date.now())

    const interval = setInterval(() => {
      seconds -= 5
      setTimeLeft(seconds)
      setQrValue(sessionToken + "|" + Date.now())

      if (seconds <= 0) {
        clearInterval(interval)
        setQrValue("")
      }
    }, 5000)
    
    supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, payload => {
          if(payload.new.session_id === sessData.id) {
             setStudents(prev => prev.map(s => s.id === payload.new.student_id ? { ...s, present: true } : s))
          }
      }).subscribe()
  }

  const lockSession = async () => {
    if(!activeSession) return;
    const { error } = await supabase.from("sessions").update({ is_locked: true }).eq("id", activeSession.id)
    
    if (error) {
      alert("Failed to lock session: " + error.message);
      return;
    }

    setActiveSession({...activeSession, is_locked: true})
    setQrValue("")
    alert("Session Locked! Attendance is now sealed.")
  }

  const handleAttendanceClick = async (studentId, currentPresentStatus) => {
    if (!activeSession) { alert("Start a session first."); return; }

    const nextState = !currentPresentStatus

    if (activeSession.is_locked) {
       setEditReasonPrompt({ studentId, nextState })
    } else {
       commitAttendanceChange(studentId, nextState, null)
    }
  }

  const commitAttendanceChange = async (studentId, isPresent, reason) => {
    if (isPresent) {
       const { error } = await supabase.from("attendance").insert([{
          student_id: studentId,
          session_id: activeSession.id,
          method: "Manual",
          fingerprint_verified: false,
          face_verified: false,
          timestamp: new Date().toISOString(),
          edit_reason: reason
       }])
       if (error) { alert("Failed to save attendance: " + error.message); return; }
    } else {
       const { error } = await supabase.from("attendance")
          .delete()
          .eq("student_id", studentId)
          .eq("session_id", activeSession.id)
       if (error) { alert("Failed to remove attendance: " + error.message); return; }
    }

    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, present: isPresent } : s))
    setEditReasonPrompt(null)
    setEditReasonText("")
  }

  const openManualAttendance = async () => {
    let sessionToOpen = activeSession;
    
    if (!sessionToOpen) {
       if (!selectedSchedule) { alert("Select schedule first"); return; }
       
       const { data: sessData, error } = await supabase
         .from("sessions")
         .insert([{
             class_id: selectedSchedule.id,
             qr_token: "MANUAL-" + Math.random().toString(36).substring(2),
             start_time: new Date(),
             end_time: new Date(Date.now() + 1000 * 60 * 60), // Manual session persists for longer implicitly
             session_date: selectedDate || new Date().toISOString().split('T')[0],
             is_locked: false
         }]).select().single()
         
       if (error) {
          alert("Error creating manual session in DB: " + error.message);
          return;
       }
       sessionToOpen = sessData;
       setActiveSession(sessData);
       setStudents(prev => prev.map(s => ({ ...s, present: false })))
    } else {
       const { data } = await supabase.from("attendance").select("student_id").eq("session_id", sessionToOpen.id)
       if (data) {
          const presentIds = data.map(d => d.student_id)
          setStudents(prev => prev.map(s => ({ ...s, present: presentIds.includes(s.id) })))
       }
    }
    
    setManualOpen(true)
  }

  const fetchAnalytics = async () => {
      const { data: sessData } = await supabase.from("sessions").select("*").eq("is_locked", true)
      
      let lockedSessionIds = [];
      if (sessData && sessData.length > 0) {
         lockedSessionIds = sessData.map(s => s.id);
      }

      let attData = [];
      if (lockedSessionIds.length > 0) {
         const { data } = await supabase.from("attendance").select("*").in("session_id", lockedSessionIds);
         attData = data || [];
      }

      const { data: userData } = await supabase.from("users").select("*").eq("role", "student")
      
      const totalSessions = lockedSessionIds.length

      const aggregated = userData.map(user => {
         const userAttendance = attData ? attData.filter(a => a.student_id === user.id).length : 0
         return {
            id: user.id,
            name: user.username,
            attended: userAttendance,
            total: totalSessions,
            percentage: totalSessions > 0 ? Math.round((userAttendance / totalSessions) * 100) : 0
         }
      })

      aggregated.sort((a, b) => b.percentage - a.percentage)
      setAnalyticsData(aggregated)
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px] top-[-100px] left-[-100px] opacity-40"></div>
            <div className="absolute w-[400px] h-[400px] bg-cyan-500 rounded-full blur-[100px] bottom-[-50px] right-[-50px] opacity-40"></div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-10 w-full max-w-md relative z-10">
          <div className="flex flex-col items-center mb-10">
            <img src="/logo.png" alt="ProxiX Logo" className="h-20 mb-4 object-contain" onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/150?text=Logo+Missing" }} />
            {/* Fallback text if logo missing */}
            <p className="text-sm text-slate-300 mt-2 font-medium tracking-widest uppercase">Faculty Portal</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Username</label>
              <input
                placeholder="Enter username"
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl p-4 mt-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl p-4 mt-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button onClick={login} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-4 rounded-xl font-bold mt-4 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src="/logo.png" alt="ProxiX Logo" className="h-8 object-contain" onError={(e) => { e.target.style.display='none' }} />
             <h1 className="text-xl font-bold text-white tracking-tight ml-2">Proxi<span className="text-blue-500">X</span></h1>
          </div>
          
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
             <button onClick={() => setActiveTab("session")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === "session" ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                <Presentation size={16} /> Live Session
             </button>
             <button onClick={() => setActiveTab("analytics")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === "analytics" ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                <BarChart3 size={16} /> Analytics
             </button>
          </div>

          <button onClick={() => setLoggedIn(false)} className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2 font-medium text-sm">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {activeTab === "session" ? (
         <>
         <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900">Dashboard</h2>
         </div>

         <div className="grid lg:grid-cols-12 gap-8">
           
           <div className="lg:col-span-5 space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                  <Calendar className="text-blue-500" size={20} /> Class Configuration
               </h3>
               <div className="space-y-4">
                 <input type="date" value={selectedDate} className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={(e) => { setSelectedDate(e.target.value); loadSchedule() }} />
                 <select className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={(e) => setSelectedSchedule(schedule.find(s => String(s.id) === e.target.value))}>
                    <option value="">-- Choose from schedule --</option>
                    {schedule.map(item => <option key={item.id} value={item.id}>{item.subject} • {item.start_time} - {item.end_time}</option>)}
                 </select>
                 
                 <button disabled={!selectedSchedule || (activeSession && activeSession.is_locked)} onClick={generateQR} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold disabled:opacity-50 mt-2 hover:bg-slate-800">
                   Start Dynamic QR Session
                 </button>

                 <button disabled={!selectedSchedule} onClick={openManualAttendance} className="w-full bg-white border border-slate-200 text-slate-700 p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50">
                    <Users size={18} /> Open Manual Attendance
                 </button>
               </div>
             </div>
           </div>

           <div className="lg:col-span-7">
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col relative overflow-hidden">
               <div className="flex justify-between items-center mb-8 relative z-10">
                 <h3 className="text-lg font-bold text-slate-800">Active Live Session</h3>
                 {activeSession?.is_locked ? (
                     <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"><Lock size={12}/> Locked</span>
                 ) : qrValue ? (
                     <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 animate-pulse"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Live</span>
                 ) : null}
               </div>

               {qrValue && !activeSession?.is_locked ? (
                 <div className="flex-1 flex flex-col items-center justify-center relative z-10 animate-fade-in">
                   <div className="relative p-2 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-xl shadow-blue-500/20 mb-8 p-[3px]">
                       <div className="bg-white p-6 rounded-[22px]"><QRCode value={qrValue} size={260} level="H" /></div>
                   </div>
                   <div className="w-full max-w-sm mt-4">
                      <div className="flex justify-between text-sm font-semibold mb-2"><span className="text-slate-500">Session expires in</span><span className="text-slate-800">{timeLeft}s</span></div>
                     <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                       <div className="bg-blue-500 h-full transition-all duration-1000 ease-linear rounded-full" style={{ width: `${(timeLeft / SESSION_TIME) * 100}%` }}></div>
                     </div>
                   </div>
                   <button onClick={lockSession} className="mt-8 bg-red-50 hover:bg-red-100 text-red-600 px-6 py-2 rounded-full font-bold text-sm transition-colors border border-red-200">
                      Force Lock Session Early
                   </button>
                 </div>
               ) : activeSession?.is_locked ? (
                  <div className="flex-1 flex items-center justify-center">
                     <div className="text-center">
                        <Lock size={60} className="text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">Session Locked</h3>
                        <p className="text-slate-500 mt-2 max-w-sm">QR Code is permanently disabled and attendance is secured. Changes require a reason log.</p>
                     </div>
                  </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-center opacity-60">
                   <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4"><QRCode value="PROXIX" size={60} fgColor="#cbd5e1" level="L" /></div>
                   <h3 className="text-lg font-semibold text-slate-800">Waiting for session...</h3>
                 </div>
               )}
             </div>
           </div>
         </div>
         </>
        ) : (
         <div className="animate-fade-in">
           <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900">Student Analytics</h2>
           </div>
           
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                       <th className="p-4 font-semibold">Student Name</th>
                       <th className="p-4 font-semibold text-center">Attended / Total</th>
                       <th className="p-4 font-semibold text-center">Percentage</th>
                       <th className="p-4 font-semibold text-center">Status</th>
                    </tr>
                 </thead>
                 <tbody>
                    {analyticsData.map((row) => (
                       <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4 font-semibold text-slate-800">{row.name}</td>
                          <td className="p-4 text-center font-medium text-slate-600">{row.attended} / {row.total}</td>
                          <td className="p-4 text-center"><span className="font-bold text-slate-800">{row.percentage}%</span></td>
                          <td className="p-4 text-center">
                             {row.percentage >= 75 ? (
                                <span className="py-1 px-3 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Good</span>
                             ) : row.percentage > 0 ? (
                                <span className="py-1 px-3 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Warning</span>
                             ) : (
                                <span className="py-1 px-3 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">N/A</span>
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
         </div>
        )}
      </main>

      {/* MANUAL ATTENDANCE MODAL */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setManualOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">Register {activeSession?.is_locked && <Lock size={16} className="text-blue-500" />}</h2>
                 <p className="text-sm text-slate-500 mt-1">{selectedSchedule?.subject || "No class selected"}</p>
              </div>
              <button onClick={() => setManualOpen(false)} className="w-8 h-8 bg-slate-200 rounded-full">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {students.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-4 hover:bg-slate-50 border-b border-slate-50 rounded-xl">
                  <span className="font-semibold text-slate-700">{s.name}</span>
                  <button onClick={() => handleAttendanceClick(s.id, s.present)} className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 w-28 justify-center border ${s.present ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white text-slate-500 border-slate-200"}`}>
                    {s.present ? <><CheckCircle size={14}/> Present</> : activeSession?.is_locked ? <><Edit3 size={14}/> Edit</> : "Mark"}
                  </button>
                </div>
              ))}
            </div>
            {!activeSession?.is_locked && (
                <div className="p-6 border-t border-slate-100 bg-white">
                   <button onClick={() => { lockSession(); setManualOpen(false) }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-md flex justify-center items-center gap-2">
                     <Lock size={18} /> Lock Session & Save Attendance
                   </button>
                </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT REASON MODAL */}
      {editReasonPrompt && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditReasonPrompt(null)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm animate-fade-in">
               <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4"><Edit3 size={24} /></div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">{activeSession?.is_locked ? "Override Locked Record" : "Manual Attendance Log"}</h3>
               <p className="text-sm text-slate-500 mb-6">{activeSession?.is_locked ? "This session has been sealed. Provide a reason to change attendance." : "Please provide a reason for manual attendance."}</p>
               <input autoFocus placeholder="e.g., Late arrival, medical exempt..." className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mb-6" value={editReasonText} onChange={(e) => setEditReasonText(e.target.value)} />
               <div className="flex gap-3">
                  <button onClick={() => setEditReasonPrompt(null)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
                  <button disabled={!editReasonText.trim()} onClick={() => commitAttendanceChange(editReasonPrompt.studentId, editReasonPrompt.nextState, editReasonText)} className="flex-1 py-3 text-white font-bold bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-50">Confirm</button>
               </div>
            </div>
         </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}