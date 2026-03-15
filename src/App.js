import { useState } from "react"
import { supabase } from "./supabaseClient"
import QRCode from "react-qr-code"

function App(){

const SESSION_TIME = 35

const [username,setUsername] = useState("")
const [password,setPassword] = useState("")
const [loggedIn,setLoggedIn] = useState(false)

const [selectedDate,setSelectedDate] = useState("")
const [schedule,setSchedule] = useState([])
const [selectedSchedule,setSelectedSchedule] = useState(null)

const [qrValue,setQrValue] = useState("")
const [timeLeft,setTimeLeft] = useState(0)
const [sessionEnded,setSessionEnded] = useState(false)



// LOGIN
const login = async () => {

const { data } = await supabase
.from("users")
.select("*")
.eq("username",username)
.eq("password",password)
.single()

if(data && data.role === "teacher"){
setLoggedIn(true)
}else{
alert("Access Denied")
}

}



// LOAD SCHEDULE
const loadSchedule = async () => {

const { data } = await supabase
.from("schedule")
.select("*")
.order("start_time")

setSchedule(data)

}



// GENERATE QR
const generateQR = async () => {

if(!selectedSchedule){
alert("Select schedule first")
return
}

setSessionEnded(false)

const sessionToken = "PROXIX-" + Math.random().toString(36).substring(2,10)

let seconds = SESSION_TIME
setTimeLeft(seconds)

setQrValue(sessionToken + "|" + Date.now())

await supabase
.from("sessions")
.insert([
{
class_id: selectedSchedule.class_id,
qr_token: sessionToken,
start_time: new Date(),
end_time: new Date(Date.now() + SESSION_TIME*1000),
session_date: selectedDate
}
])

const interval = setInterval(()=>{

seconds -= 5
setTimeLeft(seconds)

setQrValue(sessionToken + "|" + Date.now())

if(seconds <= 0){
clearInterval(interval)
setQrValue("")
setSessionEnded(true)
}

},5000)

}



// ---------------- LOGIN PAGE ----------------

if(!loggedIn){

return(

<div className="min-h-screen bg-slate-100 flex items-center justify-center">

<div className="bg-white shadow-xl rounded-2xl p-10 w-96">

{/* LOGO */}

<div className="flex flex-col items-center mb-6">

<div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow">
PX
</div>

<h1 className="text-2xl font-bold text-slate-800 mt-3">
ProxiX
</h1>

<p className="text-sm text-slate-500">
Smart Attendance System
</p>

</div>

<h2 className="text-lg font-semibold text-center text-slate-700 mb-6">
Teacher Login
</h2>

<input
placeholder="Username"
className="w-full border border-slate-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
onChange={(e)=>setUsername(e.target.value)}
/>

<input
type="password"
placeholder="Password"
className="w-full border border-slate-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
onChange={(e)=>setPassword(e.target.value)}
/>

<button
onClick={login}
className="w-full bg-teal-600 text-white p-3 rounded-lg font-semibold hover:bg-teal-700 transition"
>
Login
</button>

</div>

</div>

)

}



// ---------------- DASHBOARD ----------------

return(

<div className="min-h-screen bg-slate-100">

{/* HEADER */}

<div className="bg-white border-b shadow-sm px-10 py-4 flex items-center justify-between">

<div className="flex items-center gap-3">

<div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
PX
</div>

<h1 className="text-xl font-bold text-slate-800">
ProxiX Teacher Portal
</h1>

</div>

</div>



{/* MAIN CONTENT */}

<div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 p-10">

{/* CLASS CARD */}

<div className="bg-white p-6 rounded-xl shadow-sm">

<h2 className="text-lg font-semibold text-slate-700 mb-4">
Select Class
</h2>

<label className="text-sm text-slate-500">
Select Date
</label>

<input
type="date"
value={selectedDate}
className="w-full border border-slate-300 p-2 rounded mt-1 mb-4"
onChange={(e)=>{

setSelectedDate(e.target.value)
loadSchedule()

}}
/>

<label className="text-sm text-slate-500">
Select Schedule
</label>

<select
className="w-full border border-slate-300 p-2 rounded mt-1"
onChange={(e)=>{

const id = e.target.value
const found = schedule.find(s => s.id === id)

setSelectedSchedule(found)

}}
>

<option value="">Select Class</option>

{schedule.map(item => (

<option key={item.id} value={item.id}>

{item.subject} ({item.subject_code}) - {item.start_time} - {item.end_time} - {item.venue}

</option>

))}

</select>

<button
onClick={generateQR}
className="w-full mt-6 bg-teal-600 text-white p-3 rounded-lg font-semibold hover:bg-teal-700 transition"
>
Generate QR Session
</button>

</div>



{/* QR CARD */}

<div className="bg-white p-6 rounded-xl shadow-sm text-center">

<h2 className="text-lg font-semibold text-slate-700 mb-4">
QR Session
</h2>

{qrValue && selectedSchedule ? (

<>

<h3 className="font-semibold text-slate-800 mb-1">

{selectedSchedule.subject} ({selectedSchedule.subject_code})

</h3>

<p className="text-slate-500 mb-4">

{selectedSchedule.start_time} - {selectedSchedule.end_time} | {selectedSchedule.venue}

</p>

<div className="flex justify-center mb-4">

<QRCode value={qrValue} size={210}/>

</div>

<h3 className="font-semibold text-slate-700">

Time Left: {timeLeft} sec

</h3>

<div className="w-full bg-slate-200 h-2 rounded mt-3">

<div
className="bg-teal-600 h-2 rounded"
style={{width:`${(timeLeft/35)*100}%`}}
>

</div>

</div>

</>

) : (

<p className="text-slate-400">
No active QR session
</p>

)}

{sessionEnded && (

<p className="text-red-500 font-semibold mt-3">
Session Ended
</p>

)}

</div>

</div>

</div>

)

}

export default App