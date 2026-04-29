'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [isSignup, setIsSignup] = useState(false)
  const [use24Hour, setUse24Hour] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [classes, setClasses] = useState<any[]>([])
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])

  const [selectedClass, setSelectedClass] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [newClass, setNewClass] = useState('')
  const [classDays, setClassDays] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const [newDeadline, setNewDeadline] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        loadData(data.user.id)
      }
    })
  }, [])

  async function loadData(userId: string) {
    const { data: classData } = await supabase.from('classes').select('*').eq('user_id', userId)

    const { data: deadlineData } = await supabase
      .from('deadlines')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })

    setClasses(classData || [])
    setDeadlines(deadlineData || [])

    loadFiles(userId)
  }

  async function loadFiles(userId: string) {
    const { data } = await supabase.storage.from('notes').list('')
    const filtered = (data || []).filter(f => f.name.startsWith(userId))
    setFiles(filtered)
  }

  // ---------- DEADLINE COLOR LOGIC ----------
  function getDeadlineStyle(dateStr: string) {
    const today = new Date()
    const due = new Date(dateStr)

    today.setHours(0,0,0,0)
    due.setHours(0,0,0,0)

    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

    if (diff < 0) return styles.expired
    if (diff === 0) return styles.today
    if (diff === 1) return styles.tomorrow
    if (diff <= 7) return styles.week

    return {}
  }

  function formatTime(time: string) {
    if (!time) return ''
    if (use24Hour) return time

    const [h, m] = time.split(':')
    let hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12
    return `${hour}:${m} ${ampm}`
  }

  async function handleAuth() {
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) return alert(error.message)
      alert('Account created!')
      setIsSignup(false)
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return alert(error.message)
      setUser(data.user)
      loadData(data.user.id)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function addClass() {
    if (!newClass) return

    await supabase.from('classes').insert([{
      name: newClass,
      days: classDays,
      start_time: startTime,
      end_time: endTime,
      user_id: user.id
    }])

    setNewClass('')
    setClassDays('')
    setStartTime('')
    setEndTime('')
    loadData(user.id)
  }

  async function deleteClass(id: string) {
    await supabase.from('classes').delete().eq('id', id)
    loadData(user.id)
  }

  async function addDeadline() {
    if (!newDeadline || !deadlineDate) return

    await supabase.from('deadlines').insert([{
      title: newDeadline,
      due_date: deadlineDate,
      user_id: user.id
    }])

    setNewDeadline('')
    setDeadlineDate('')
    loadData(user.id)
  }

  async function deleteDeadline(id: string) {
    await supabase.from('deadlines').delete().eq('id', id)
    loadData(user.id)
  }

  async function uploadFile() {
    if (!file || !selectedClass) {
      alert('Select a class and file')
      return
    }

    const safeName = file.name.replace(/\s+/g, '_')
    const fileName = `${user.id}__${selectedClass}__${Date.now()}__${safeName}`

    const { error } = await supabase.storage
      .from('notes')
      .upload(fileName, file)

    if (error) return alert(error.message)

    setFile(null)
    loadFiles(user.id)
  }

  async function viewFile(fileName: string) {
    const { data } = await supabase.storage
      .from('notes')
      .createSignedUrl(fileName, 60)

    window.open(data?.signedUrl, '_blank')
  }

  async function deleteFile(fileName: string) {
    await supabase.storage.from('notes').remove([fileName])
    loadFiles(user.id)
  }

  const groupedFiles: any = {}

  files.forEach(f => {
    const parts = f.name.split('__')
    if (parts.length < 4) return

    const className = parts[1]
    const originalName = parts.slice(3).join('__')

    if (!groupedFiles[className]) groupedFiles[className] = []
    groupedFiles[className].push({ stored: f.name, display: originalName })
  })

  if (!user) {
    return (
      <div style={styles.centered}>
        <div style={styles.card}>
          <h2 style={styles.text}>{isSignup ? 'Sign Up' : 'Login'}</h2>

          <input placeholder="Email" onChange={(e)=>setEmail(e.target.value)} style={styles.input}/>
          <input type="password" placeholder="Password" onChange={(e)=>setPassword(e.target.value)} style={styles.input}/>

          <button onClick={handleAuth} style={styles.button}>
            {isSignup ? 'Create Account' : 'Login'}
          </button>

          <p style={styles.text}>
            <span onClick={()=>setIsSignup(!isSignup)} style={styles.link}>
              {isSignup ? 'Switch to Login' : 'Create account'}
            </span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.text}>Dashboard</h2>
        <div>
          <span style={styles.text}>{user.email}</span>
          <button onClick={logout} style={styles.logout}>Logout</button>
        </div>
      </div>

      <label style={styles.text}>
        <input type="checkbox" checked={use24Hour} onChange={()=>setUse24Hour(!use24Hour)} />
        Use 24-hour time
      </label>

      <div style={styles.grid}>

        {/* CLASSES */}
        <div style={styles.card}>
          <h3 style={styles.text}>Classes</h3>

          <input placeholder="Name" value={newClass} onChange={(e)=>setNewClass(e.target.value)} style={styles.input}/>
          <input placeholder="Days" value={classDays} onChange={(e)=>setClassDays(e.target.value)} style={styles.input}/>
          <input type="time" value={startTime} onChange={(e)=>setStartTime(e.target.value)} style={styles.input}/>
          <input type="time" value={endTime} onChange={(e)=>setEndTime(e.target.value)} style={styles.input}/>

          <button onClick={addClass} style={styles.button}>Add</button>

          {classes.map(c => (
            <div key={c.id} style={styles.item}>
              <b style={styles.text}>{c.name}</b>
              <div style={styles.text}>{c.days}</div>
              <div style={styles.text}>
                {formatTime(c.start_time)} - {formatTime(c.end_time)}
              </div>
              <button onClick={()=>deleteClass(c.id)} style={styles.delete}>Delete</button>
            </div>
          ))}
        </div>

        {/* DEADLINES */}
        <div style={styles.card}>
          <h3 style={styles.text}>Deadlines</h3>

          <input placeholder="Assignment" value={newDeadline} onChange={(e)=>setNewDeadline(e.target.value)} style={styles.input}/>
          <input type="date" value={deadlineDate} onChange={(e)=>setDeadlineDate(e.target.value)} style={styles.input}/>

          <button onClick={addDeadline} style={styles.button}>Add</button>

          {deadlines.map(d => (
            <div key={d.id} style={{...styles.item, ...getDeadlineStyle(d.due_date)}}>
              <span style={styles.text}>{d.title} — {d.due_date}</span>
              <button onClick={()=>deleteDeadline(d.id)} style={styles.delete}>Delete</button>
            </div>
          ))}
        </div>

        {/* NOTES */}
        <div style={styles.card}>
          <h3 style={styles.text}>Notes</h3>

          <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} style={styles.input}>
            <option value="">Select Class</option>
            {classes.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <label style={styles.button}>
            Choose File
            <input type="file" style={{display:'none'}} onChange={(e)=>setFile(e.target.files?.[0] || null)} />
          </label>

          <button onClick={uploadFile} style={styles.button}>Upload</button>

          {Object.keys(groupedFiles).map(className => (
            <div key={className}>
              <h4 style={styles.text}>{className}</h4>

              {groupedFiles[className].map((f:any) => (
                <div key={f.stored} style={styles.item}>
                  <span style={styles.text}>{f.display}</span>
                  <div>
                    <button onClick={()=>viewFile(f.stored)} style={styles.small}>View</button>
                    <button onClick={()=>deleteFile(f.stored)} style={styles.delete}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

const styles:any = {
  container:{padding:20,fontFamily:'Arial',background:'#f9fafb'},
  header:{display:'flex',justifyContent:'space-between',marginBottom:20},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20},
  card:{background:'#fff',padding:20,borderRadius:10,boxShadow:'0 2px 10px rgba(0,0,0,0.1)',color:'#111'},
  item:{marginTop:10,padding:10,border:'1px solid #eee',borderRadius:6},

  expired:{background:'#fee2e2'},
  today:{background:'#fed7aa'},
  tomorrow:{background:'#fef3c7'},
  week:{background:'#dbeafe'},

  input:{width:'100%',marginBottom:10,padding:8,borderRadius:5,border:'1px solid #ccc',color:'#111'},
  text:{color:'#111'},
  button:{background:'#4f46e5',color:'white',padding:'8px 12px',border:'none',borderRadius:5,marginBottom:10,cursor:'pointer'},
  delete:{background:'#ef4444',color:'white',border:'none',padding:'5px 8px',marginTop:5,borderRadius:5},
  small:{background:'#3b82f6',color:'white',border:'none',padding:'5px 8px',marginRight:5,borderRadius:5},
  logout:{background:'#111',color:'white',padding:'6px 12px',borderRadius:6,border:'none',marginLeft:10,cursor:'pointer'},
  centered:{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'},
  link:{color:'#4f46e5',cursor:'pointer',marginLeft:5}
}