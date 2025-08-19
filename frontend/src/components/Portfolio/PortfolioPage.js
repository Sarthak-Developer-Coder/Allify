import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Box, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Button, Input, Textarea, HStack, VStack, SimpleGrid, Text, Select, useToast, Grid, Switch, useDisclosure, AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay } from '@chakra-ui/react';
import PortfolioLeaderboard from './PortfolioLeaderboard';
import chatContext from '../../context/chatContext';

const Section = ({ title, children, actions }) => (
  <Box borderWidth='1px' borderRadius='lg' p={4} bg='whiteAlpha.700' _dark={{ bg: 'blackAlpha.400' }}>
    <HStack justify='space-between' mb={3}>
      <Heading size='md'>{title}</Heading>
      {actions}
    </HStack>
    {children}
  </Box>
);

export default function PortfolioPage() {
  const { hostName } = useContext(chatContext);
  const toast = useToast();

  // Profile
  const [profile, setProfile] = useState({ bio: '', headline: '', website: '', socials: {}, handles: {}, slug: '', theme: 'light', accentColor: '#805AD5', badges: [], ratings: [] });
  const loadProfile = async () => {
    const res = await fetch(`${hostName}/portfolio/profile`, { headers: { 'auth-token': localStorage.getItem('token') } });
    if (res.ok) setProfile(await res.json());
  };
  const saveProfile = async () => {
    const res = await fetch(`${hostName}/portfolio/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(profile) });
    if (res.ok) toast({ title: 'Profile saved', status: 'success' }); else toast({ title: 'Save failed', status: 'error' });
  };

  // Questions
  const [qList, setQList] = useState([]);
  const [qPage, setQPage] = useState(1);
  const [qTotal, setQTotal] = useState(0);
  const [dailyStats, setDailyStats] = useState([]);
  const [analytics, setAnalytics] = useState({ byPlatform: [], byDifficulty: [], byTag: [] });
  const [qForm, setQForm] = useState({ title: '', platform: 'LeetCode', difficulty: 'Easy', url: '', tags: '', notes: '', status: 'Solved' });
  const [qFilters, setQFilters] = useState({ platform: 'All', status: 'All', query: '' });
  const [editingQ, setEditingQ] = useState(null);
  const [editQ, setEditQ] = useState({});
  const loadQuestions = async (page=1) => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    const res = await fetch(`${hostName}/portfolio/questions?${params.toString()}`, { headers: { 'auth-token': localStorage.getItem('token') } });
    if (res.ok) { const json = await res.json(); setQList(json.items || []); setQTotal(json.total||0); setQPage(page); }
  };
  const loadStats = async () => {
    const res = await fetch(`${hostName}/portfolio/stats`, { headers: { 'auth-token': localStorage.getItem('token') } });
    if (res.ok) setDailyStats(await res.json());
  };
  const loadAnalytics = async () => {
    const res = await fetch(`${hostName}/portfolio/analytics`, { headers: { 'auth-token': localStorage.getItem('token') } });
    if (res.ok) setAnalytics(await res.json());
  };
  const addQuestion = async () => {
    const payload = { ...qForm, tags: qForm.tags.split(',').map(s => s.trim()).filter(Boolean) };
    const res = await fetch(`${hostName}/portfolio/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(payload) });
    if (res.ok) { setQForm({ title: '', platform: 'LeetCode', difficulty: 'Easy', url: '', tags: '', notes: '', status: 'Solved' }); await loadQuestions(); toast({ title: 'Added', status: 'success' }); }
  };
  const updateQuestion = async (id, body) => {
    const res = await fetch(`${hostName}/portfolio/questions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Update failed');
  };
  const deleteQuestion = async (id) => {
    const res = await fetch(`${hostName}/portfolio/questions/${id}`, { method: 'DELETE', headers: { 'auth-token': localStorage.getItem('token') } });
    if (!res.ok) throw new Error('Delete failed');
  };
  const filteredQ = useMemo(() => {
    const q = (qFilters.query || '').toLowerCase();
    return qList.filter(item => {
      const byPlatform = qFilters.platform === 'All' || item.platform === qFilters.platform;
      const byStatus = qFilters.status === 'All' || item.status === qFilters.status;
      const inTitle = !q || item.title?.toLowerCase().includes(q);
      const inTags = !q || (item.tags || []).some(t => t.toLowerCase().includes(q));
      return byPlatform && byStatus && (inTitle || inTags);
    });
  }, [qList, qFilters]);

  // Sheets
  const [sheets, setSheets] = useState([]);
  const [sheetForm, setSheetForm] = useState({ name: '', url: '', total: 0, completed: 0, tags: '' });
  const loadSheets = async () => {
    const res = await fetch(`${hostName}/portfolio/sheets`, { headers: { 'auth-token': localStorage.getItem('token') } });
    if (res.ok) setSheets(await res.json());
  };
  const addSheet = async () => {
    const payload = { ...sheetForm, total: Number(sheetForm.total||0), completed: Number(sheetForm.completed||0), tags: sheetForm.tags.split(',').map(s=>s.trim()).filter(Boolean) };
    const res = await fetch(`${hostName}/portfolio/sheets`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(payload) });
    if (res.ok) { setSheetForm({ name: '', url: '', total: 0, completed: 0, tags: '' }); await loadSheets(); toast({ title: 'Sheet added', status: 'success' }); }
  };
  const updateSheet = async (id, body) => {
    const res = await fetch(`${hostName}/portfolio/sheets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Update failed');
  };
  const deleteSheet = async (id) => {
    const res = await fetch(`${hostName}/portfolio/sheets/${id}`, { method: 'DELETE', headers: { 'auth-token': localStorage.getItem('token') } });
    if (!res.ok) throw new Error('Delete failed');
  };
  const adjustSheetProgress = async (s, delta) => {
    const newCompleted = Math.max(0, Math.min(Number(s.total || 0), Number(s.completed || 0) + delta));
    try {
      await updateSheet(s._id, { completed: newCompleted });
      await loadSheets();
    } catch (e) { toast({ title: 'Update failed', status: 'error' }); }
  };

  // Events
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({ title: '', platform: '', startAt: '', url: '', notes: '' });
  const loadEvents = async () => {
    const res = await fetch(`${hostName}/portfolio/events`, { headers: { 'auth-token': localStorage.getItem('token') } });
    if (res.ok) setEvents(await res.json());
  };
  const addEvent = async () => {
    const res = await fetch(`${hostName}/portfolio/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ ...eventForm, startAt: new Date(eventForm.startAt) }) });
    if (res.ok) { setEventForm({ title: '', platform: '', startAt: '', url: '', notes: '' }); await loadEvents(); toast({ title: 'Event added', status: 'success' }); }
  };
  const deleteEvent = async (id) => {
    const res = await fetch(`${hostName}/portfolio/events/${id}`, { method: 'DELETE', headers: { 'auth-token': localStorage.getItem('token') } });
    if (!res.ok) throw new Error('Delete failed');
  };

  useEffect(() => { loadProfile(); loadQuestions(1); loadSheets(); loadEvents(); loadStats(); loadAnalytics(); /* eslint-disable */ }, []);
  const publicUrl = profile?.slug ? `${window.location.origin}/p/${profile.slug}` : '';

  // Projects
  const [projects, setProjects] = useState([]);
  const [projForm, setProjForm] = useState({ title: '', description: '', url: '', tags: '' });
  const [editingProject, setEditingProject] = useState(null);
  const [editProject, setEditProject] = useState({});
  const loadProjects = async () => {
    const p = await fetch(`${hostName}/portfolio/profile`, { headers: { 'auth-token': localStorage.getItem('token') } });
    if (p.ok) { const json = await p.json(); setProjects(json.projects || []); setProfile(json); }
  };
  const addProject = async () => {
    const payload = { ...projForm, tags: projForm.tags.split(',').map(s=>s.trim()).filter(Boolean) };
    const res = await fetch(`${hostName}/portfolio/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(payload) });
    if (res.ok) { setProjForm({ title: '', description: '', url: '', tags: '' }); await loadProjects(); toast({ title: 'Project added', status: 'success' }); }
  };
  const updateProject = async (id, body) => {
    const res = await fetch(`${hostName}/portfolio/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Update failed');
  };
  const deleteProject = async (id) => {
    const res = await fetch(`${hostName}/portfolio/projects/${id}`, { method: 'DELETE', headers: { 'auth-token': localStorage.getItem('token') } });
    if (!res.ok) throw new Error('Delete failed');
  };
  useEffect(()=>{ loadProjects(); /* eslint-disable */ },[]);

  // CSV import for questions
  const importQuestionsCSV = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = String(e.target?.result||'');
        const lines = text.split(/\r?\n/).filter(Boolean);
        const [header, ...rows] = lines;
        const cols = header.split(',').map(h=>h.trim().replace(/^"|"$/g,''));
        const idx = (name) => cols.findIndex(c=>c.toLowerCase()===name.toLowerCase());
        const items = rows.map(r=>{
          const cells = r.match(/\"([^\"]*)\"|([^,]+)/g)?.map(x=>x.replace(/^\"|\"$/g,'')) || [];
          return {
            title: cells[idx('Title')]||'',
            platform: cells[idx('Platform')]||'Other',
            difficulty: cells[idx('Difficulty')]||'Unknown',
            status: cells[idx('Status')]||'Solved',
            url: cells[idx('URL')]||'',
            tags: (cells[idx('Tags')]||'').split('|').map(s=>s.trim()).filter(Boolean),
            notes: cells[idx('Notes')]||'',
            solvedAt: cells[idx('SolvedAt')] ? new Date(cells[idx('SolvedAt')]) : undefined,
          };
        });
        for (const it of items) {
          await fetch(`${hostName}/portfolio/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(it) });
        }
        await loadQuestions(qPage);
        toast({ title: 'Import complete', status: 'success' });
      } catch { toast({ title: 'Import failed', status: 'error' }); }
    };
    reader.readAsText(file);
  };

  // Confirm dialog state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [confirmAction, setConfirmAction] = useState(()=>()=>{});
  const [confirmText, setConfirmText] = useState('Are you sure?');
  const cancelRef = React.useRef();

  // Exports
  const exportQuestionsCSV = () => {
    const header = ['Title','Platform','Difficulty','Status','URL','Tags','Notes','SolvedAt'];
    const rows = [header.join(',')].concat(
      qList.map(q => [
        (q.title||'').replaceAll('"','""'),
        q.platform||'',
        q.difficulty||'',
        q.status||'',
        q.url||'',
        (q.tags||[]).join('|'),
        (q.notes||'').replaceAll('"','""'),
        q.solvedAt ? new Date(q.solvedAt).toISOString() : ''
      ].map(v=>`"${String(v)}"`).join(','))
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'questions.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  const exportEventsICS = () => {
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MERNChat//Portfolio//EN'];
    events.forEach(ev => {
      const dt = new Date(ev.startAt);
      const dtStr = dt.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev._id}@mernchat`);
      lines.push(`DTSTAMP:${dtStr}`);
      lines.push(`DTSTART:${dtStr}`);
      lines.push(`SUMMARY:${(ev.title||'').replace(/\n/g,' ')}`);
      if (ev.url) lines.push(`URL:${ev.url}`);
      if (ev.notes) lines.push(`DESCRIPTION:${(ev.notes||'').replace(/\n/g,' ')}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'events.ics'; a.click();
    URL.revokeObjectURL(url);
  };

  const accent = profile?.accentColor || '#805AD5';
  const ChartBar = ({ label, value, max }) => (
    <HStack>
      <Text w='140px' fontSize='sm'>{label}</Text>
      <Box flex='1' bg='gray.100' borderRadius='md'>
        <Box h='8px' w={`${max? Math.round((value/max)*100):0}%`} bg={accent} borderRadius='md' />
      </Box>
      <Text w='40px' textAlign='right' fontSize='sm'>{value}</Text>
    </HStack>
  );
  const maxPlat = Math.max(1, ...(analytics.byPlatform||[]).map(p=>p.count||0));
  const maxDiff = Math.max(1, ...(analytics.byDifficulty||[]).map(d=>d.count||0));
  const maxTag = Math.max(1, ...(analytics.byTag||[]).map(t=>t.count||0));

  return (
    <Box p={4} maxW='1200px' m='0 auto'>
      <Heading mb={4}>Coding Portfolio</Heading>
      <Tabs variant='enclosed'>
        <TabList flexWrap='wrap'>
          <Tab>Overview</Tab>
          <Tab>Questions</Tab>
          <Tab>Sheets</Tab>
          <Tab>Events</Tab>
          <Tab>Profile</Tab>
          <Tab>Projects</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Section title='Profile Summary' actions={publicUrl ? <Button size='sm' onClick={()=>{ navigator.clipboard.writeText(publicUrl); toast({ title:'Public link copied', status:'success' })}}>Copy public link</Button> : null}>
                <Text>{profile.headline || 'No headline yet'}</Text>
                <Text color='gray.500' mt={2}>{profile.bio || 'Add your bio in Profile tab'}</Text>
              </Section>
              <Section title='Quick Stats' actions={<Button size='sm' variant='ghost' onClick={()=>document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' })}>Leaderboard</Button>}>
                <Text>Total Questions: {qList.length}</Text>
                <Text mt={1}>Sheets Tracked: {sheets.length}</Text>
                <Text mt={1}>Upcoming Events: {events.filter(e=>new Date(e.startAt) > new Date()).length}</Text>
                <Text mt={1}>Active Days (180d): {dailyStats.length}</Text>
              </Section>
              <Section title='Activity (last 180 days)'>
                <Grid templateColumns='repeat(36, 1fr)' gap={1}>
                  {Array.from({ length: 180 }).map((_, idx) => {
                    const day = new Date(Date.now() - (179 - idx) * 24 * 3600 * 1000);
                    const key = day.toISOString().slice(0,10);
                    const hit = dailyStats.find(d => d._id === key);
                    const c = hit?.c || 0;
                    const bg = c === 0 ? 'gray.100' : c < 2 ? 'green.100' : c < 4 ? 'green.200' : c < 6 ? 'green.300' : 'green.400';
                    return <Box key={key} w='8px' h='8px' bg={bg} borderRadius='2px' title={`${key}: ${c}`} />
                  })}
                </Grid>
              </Section>
              <Section title='Analytics'>
                <VStack align='stretch' spacing={3}>
                  <Box>
                    <Text fontWeight='bold' mb={2}>By Platform</Text>
                    <VStack align='stretch' spacing={2}>
                      {(analytics.byPlatform||[]).map((p,i)=>(<ChartBar key={i} label={p.platform} value={p.count} max={maxPlat} />))}
                    </VStack>
                  </Box>
                  <Box>
                    <Text fontWeight='bold' mb={2}>By Difficulty</Text>
                    <VStack align='stretch' spacing={2}>
                      {(analytics.byDifficulty||[]).map((d,i)=>(<ChartBar key={i} label={d.difficulty} value={d.count} max={maxDiff} />))}
                    </VStack>
                  </Box>
                  {(analytics.byTag||[]).length ? (
                    <Box>
                      <Text fontWeight='bold' mb={2}>Top Tags</Text>
                      <VStack align='stretch' spacing={2}>
                        {analytics.byTag.map((t,i)=>(<ChartBar key={i} label={t.tag} value={t.count} max={maxTag} />))}
                      </VStack>
                    </Box>
                  ) : null}
                </VStack>
              </Section>
              <Box id='leaderboard'>
                <Section title='Top Solvers'>
                  <PortfolioLeaderboard />
                </Section>
              </Box>
            </SimpleGrid>
          </TabPanel>

          <TabPanel>
            <Section title='Add Question' actions={<Button colorScheme='purple' onClick={addQuestion}>Add</Button>}>
              <VStack align='stretch'>
                <Input placeholder='Title' value={qForm.title} onChange={e=>setQForm({...qForm,title:e.target.value})} />
                <HStack>
                  <Select value={qForm.platform} onChange={e=>setQForm({...qForm,platform:e.target.value})}>
                    {['LeetCode','GFG','Codeforces','CodeChef','AtCoder','HackerRank','InterviewBit','CodeStudio','Other'].map(p=>(<option key={p} value={p}>{p}</option>))}
                  </Select>
                  <Select value={qForm.difficulty} onChange={e=>setQForm({...qForm,difficulty:e.target.value})}>
                    {['Easy','Medium','Hard','Unknown'].map(p=>(<option key={p} value={p}>{p}</option>))}
                  </Select>
                  <Select value={qForm.status} onChange={e=>setQForm({...qForm,status:e.target.value})}>
                    {['Solved','Revisit','Pending'].map(p=>(<option key={p} value={p}>{p}</option>))}
                  </Select>
                </HStack>
                <Input placeholder='URL' value={qForm.url} onChange={e=>setQForm({...qForm,url:e.target.value})} />
                <Input placeholder='Tags (comma separated)' value={qForm.tags} onChange={e=>setQForm({...qForm,tags:e.target.value})} />
                <Textarea placeholder='Notes' value={qForm.notes} onChange={e=>setQForm({...qForm,notes:e.target.value})} />
              </VStack>
            </Section>
            <Box mt={4}>
              <HStack justify='space-between' mb={2}>
                <Heading size='sm'>Recent Questions</Heading>
                <Button size='sm' variant='outline' onClick={exportQuestionsCSV}>Export CSV</Button>
              </HStack>
              <HStack mb={3} spacing={3} align='stretch'>
                <Select maxW='200px' value={qFilters.platform} onChange={e=>setQFilters(f=>({ ...f, platform: e.target.value }))}>
                  {['All','LeetCode','GFG','Codeforces','CodeChef','AtCoder','HackerRank','InterviewBit','CodeStudio','Other'].map(p=>(<option key={p} value={p}>{p}</option>))}
                </Select>
                <Select maxW='200px' value={qFilters.status} onChange={e=>setQFilters(f=>({ ...f, status: e.target.value }))}>
                  {['All','Solved','Revisit','Pending'].map(p=>(<option key={p} value={p}>{p}</option>))}
                </Select>
                <Input placeholder='Search title or tag' value={qFilters.query} onChange={e=>setQFilters(f=>({ ...f, query: e.target.value }))} />
                <Button variant='outline' onClick={()=>setQFilters({ platform: 'All', status: 'All', query: '' })}>Clear</Button>
                <Button as='label' size='sm' variant='outline' cursor='pointer'>
                  Import CSV
                  <Input type='file' accept='.csv' display='none' onChange={e=>{ const f=e.target.files?.[0]; if (f) importQuestionsCSV(f); e.target.value=''; }} />
                </Button>
              </HStack>
              <VStack align='stretch'>
                {filteredQ.map(q=> (
                  <Box key={q._id} borderWidth='1px' borderRadius='md' p={3}>
                    {editingQ === q._id ? (
                      <VStack align='stretch' spacing={2}>
                        <Input value={editQ.title || ''} onChange={e=>setEditQ(p=>({ ...p, title: e.target.value }))} />
                        <HStack>
                          <Select value={editQ.platform || ''} onChange={e=>setEditQ(p=>({ ...p, platform: e.target.value }))}>
                            {['LeetCode','GFG','Codeforces','CodeChef','AtCoder','HackerRank','InterviewBit','CodeStudio','Other'].map(p=>(<option key={p} value={p}>{p}</option>))}
                          </Select>
                          <Select value={editQ.difficulty || ''} onChange={e=>setEditQ(p=>({ ...p, difficulty: e.target.value }))}>
                            {['Easy','Medium','Hard','Unknown'].map(p=>(<option key={p} value={p}>{p}</option>))}
                          </Select>
                          <Select value={editQ.status || ''} onChange={e=>setEditQ(p=>({ ...p, status: e.target.value }))}>
                            {['Solved','Revisit','Pending'].map(p=>(<option key={p} value={p}>{p}</option>))}
                          </Select>
                        </HStack>
                        <Input placeholder='URL' value={editQ.url || ''} onChange={e=>setEditQ(p=>({ ...p, url: e.target.value }))} />
                        <Input placeholder='Tags (comma separated)' value={(editQ.tags || []).join(', ')} onChange={e=>setEditQ(p=>({ ...p, tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))} />
                        <Textarea placeholder='Notes' value={editQ.notes || ''} onChange={e=>setEditQ(p=>({ ...p, notes: e.target.value }))} />
                        <HStack>
                          <Button size='sm' colorScheme='purple' onClick={async()=>{ try{ await updateQuestion(q._id, editQ); setEditingQ(null); await loadQuestions(); toast({ title:'Updated', status:'success' }); } catch { toast({ title:'Update failed', status:'error' }); } }}>Save</Button>
                          <Button size='sm' variant='ghost' onClick={()=>setEditingQ(null)}>Cancel</Button>
                        </HStack>
                      </VStack>
                    ) : (
                      <>
                        <HStack justify='space-between'>
                          <Text fontWeight='bold'>{q.title}</Text>
                          <HStack>
                            <Text fontSize='sm' color='gray.500'>{q.platform}</Text>
                            <Text fontSize='sm' color='gray.500'>{q.difficulty}</Text>
                            <Text fontSize='sm' color='gray.500'>{q.status}</Text>
                          </HStack>
                        </HStack>
                        {q.url && <a href={q.url} target='_blank' rel='noreferrer'><Text color='purple.500' fontSize='sm'>{q.url}</Text></a>}
                        {q.tags?.length ? <Text mt={1} fontSize='sm'>Tags: {q.tags.join(', ')}</Text> : null}
                        {q.notes ? <Text mt={1} fontSize='sm' color='gray.600'>{q.notes}</Text> : null}
                        <HStack mt={2}>
                          <Button size='sm' onClick={()=>{ setEditingQ(q._id); setEditQ({ title: q.title, platform: q.platform, difficulty: q.difficulty, status: q.status, url: q.url, tags: q.tags || [], notes: q.notes || '' }); }}>Edit</Button>
                          <Button size='sm' colorScheme='red' variant='outline' onClick={()=>{ setConfirmText('Delete this question?'); setConfirmAction(()=> async()=>{ try{ await deleteQuestion(q._id); await loadQuestions(qPage); toast({ title:'Deleted', status:'success' }); } catch { toast({ title:'Delete failed', status:'error' }); } }); onOpen(); }}>Delete</Button>
                        </HStack>
                      </>
                    )}
                  </Box>
                ))}
              </VStack>
              <HStack justify='space-between' mt={3}>
                <Text fontSize='sm' color='gray.500'>Total: {qTotal}</Text>
                <HStack>
                  <Button size='sm' isDisabled={qPage<=1} onClick={()=>loadQuestions(qPage-1)}>Prev</Button>
                  <Text fontSize='sm'>Page {qPage}</Text>
                  <Button size='sm' isDisabled={(qPage*50)>=qTotal} onClick={()=>loadQuestions(qPage+1)}>Next</Button>
                </HStack>
              </HStack>
            </Box>
          </TabPanel>

          <TabPanel>
            <Section title='Add Sheet' actions={<Button colorScheme='purple' onClick={addSheet}>Add</Button>}>
              <VStack align='stretch'>
                <Input placeholder='Name' value={sheetForm.name} onChange={e=>setSheetForm({...sheetForm,name:e.target.value})} />
                <Input placeholder='URL' value={sheetForm.url} onChange={e=>setSheetForm({...sheetForm,url:e.target.value})} />
                <HStack>
                  <Input type='number' placeholder='Total' value={sheetForm.total} onChange={e=>setSheetForm({...sheetForm,total:e.target.value})} />
                  <Input type='number' placeholder='Completed' value={sheetForm.completed} onChange={e=>setSheetForm({...sheetForm,completed:e.target.value})} />
                </HStack>
                <Input placeholder='Tags (comma separated)' value={sheetForm.tags} onChange={e=>setSheetForm({...sheetForm,tags:e.target.value})} />
              </VStack>
            </Section>
            <Box mt={4}>
              <Heading size='sm' mb={2}>Sheets</Heading>
              <VStack align='stretch'>
                {sheets.map(s => (
                  <Box key={s._id} borderWidth='1px' borderRadius='md' p={3}>
                    <HStack justify='space-between'>
                      <Text fontWeight='bold'>{s.name}</Text>
                      <HStack>
                        <Button size='xs' onClick={()=>adjustSheetProgress(s, -1)}>-1</Button>
                        <Text fontSize='sm' color='gray.500'>{s.completed}/{s.total}</Text>
                        <Button size='xs' onClick={()=>adjustSheetProgress(s, +1)}>+1</Button>
                        <Button size='xs' colorScheme='red' variant='outline' onClick={()=>{ setConfirmText('Delete this sheet?'); setConfirmAction(()=> async()=>{ try{ await deleteSheet(s._id); await loadSheets(); toast({ title:'Deleted', status:'success' }); } catch { toast({ title:'Delete failed', status:'error' }); } }); onOpen(); }}>Delete</Button>
                      </HStack>
                    </HStack>
                    {s.url && <a href={s.url} target='_blank' rel='noreferrer'><Text color='purple.500' fontSize='sm'>{s.url}</Text></a>}
                  </Box>
                ))}
              </VStack>
            </Box>
          </TabPanel>

          <TabPanel>
            <Section title='Add Event' actions={<Button colorScheme='purple' onClick={addEvent}>Add</Button>}>
              <VStack align='stretch'>
                <Input placeholder='Title' value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})} />
                <HStack>
                  <Input placeholder='Platform' value={eventForm.platform} onChange={e=>setEventForm({...eventForm,platform:e.target.value})} />
                  <Input type='datetime-local' value={eventForm.startAt} onChange={e=>setEventForm({...eventForm,startAt:e.target.value})} />
                </HStack>
                <Input placeholder='URL' value={eventForm.url} onChange={e=>setEventForm({...eventForm,url:e.target.value})} />
                <Textarea placeholder='Notes' value={eventForm.notes} onChange={e=>setEventForm({...eventForm,notes:e.target.value})} />
              </VStack>
            </Section>
            <Box mt={4}>
              <HStack justify='space-between' mb={2}>
                <Heading size='sm'>Upcoming Events</Heading>
                <Button size='sm' variant='outline' onClick={exportEventsICS}>Download .ics</Button>
              </HStack>
              <VStack align='stretch'>
                {events.map(ev => (
                  <Box key={ev._id} borderWidth='1px' borderRadius='md' p={3}>
                    <HStack justify='space-between'>
                      <Text fontWeight='bold'>{ev.title}</Text>
                      <HStack>
                        <Text fontSize='sm' color='gray.500'>{new Date(ev.startAt).toLocaleString()}</Text>
                        <Button size='xs' colorScheme='red' variant='outline' onClick={()=>{ setConfirmText('Delete this event?'); setConfirmAction(()=> async()=>{ try{ await deleteEvent(ev._id); await loadEvents(); toast({ title:'Deleted', status:'success' }); } catch { toast({ title:'Delete failed', status:'error' }); } }); onOpen(); }}>Delete</Button>
                      </HStack>
                    </HStack>
                    {ev.url && <a href={ev.url} target='_blank' rel='noreferrer'><Text color='purple.500' fontSize='sm'>{ev.url}</Text></a>}
                    {ev.notes ? <Text mt={1} fontSize='sm' color='gray.600'>{ev.notes}</Text> : null}
                  </Box>
                ))}
              </VStack>
            </Box>
          </TabPanel>

          <TabPanel>
            <Section title='Edit Portfolio Profile' actions={<Button colorScheme='purple' onClick={saveProfile}>Save</Button>}>
              <VStack align='stretch'>
                <Input placeholder='Headline' value={profile.headline||''} onChange={e=>setProfile({...profile,headline:e.target.value})} />
                <Textarea placeholder='Bio' value={profile.bio||''} onChange={e=>setProfile({...profile,bio:e.target.value})} />
                <Input placeholder='Website' value={profile.website||''} onChange={e=>setProfile({...profile,website:e.target.value})} />
                <Input placeholder='Public slug (e.g., yourname)' value={profile.slug||''} onChange={e=>setProfile({...profile,slug:e.target.value})} />
                <HStack>
                  <Select value={profile.theme||'light'} onChange={e=>setProfile({...profile, theme: e.target.value})} maxW='200px'>
                    {['light','dark'].map(t => (<option key={t} value={t}>{t}</option>))}
                  </Select>
                  <Input type='color' value={profile.accentColor||'#805AD5'} onChange={e=>setProfile({...profile, accentColor: e.target.value})} maxW='120px' />
                </HStack>
                <HStack>
                  <Input placeholder='GitHub' value={profile.socials?.github||''} onChange={e=>setProfile({...profile,socials:{...profile.socials,github:e.target.value}})} />
                  <Input placeholder='LinkedIn' value={profile.socials?.linkedin||''} onChange={e=>setProfile({...profile,socials:{...profile.socials,linkedin:e.target.value}})} />
                  <Input placeholder='Twitter' value={profile.socials?.twitter||''} onChange={e=>setProfile({...profile,socials:{...profile.socials,twitter:e.target.value}})} />
                </HStack>
                <HStack>
                  <Input placeholder='LeetCode handle' value={profile.handles?.leetcode||''} onChange={e=>setProfile({...profile,handles:{...profile.handles,leetcode:e.target.value}})} />
                  <Input placeholder='GfG handle' value={profile.handles?.gfg||''} onChange={e=>setProfile({...profile,handles:{...profile.handles,gfg:e.target.value}})} />
                </HStack>
                <HStack>
                  <Input placeholder='Codeforces' value={profile.handles?.codeforces||''} onChange={e=>setProfile({...profile,handles:{...profile.handles,codeforces:e.target.value}})} />
                  <Input placeholder='CodeChef' value={profile.handles?.codechef||''} onChange={e=>setProfile({...profile,handles:{...profile.handles,codechef:e.target.value}})} />
                </HStack>
                <Section title='Badges' actions={<Button size='sm' onClick={()=>setProfile(p=>({ ...p, badges: [...(p.badges||[]), { title: '', iconUrl: '' }] }))}>Add</Button>}>
                  <VStack align='stretch'>
                    {(profile.badges||[]).map((b, idx) => (
                      <HStack key={idx}>
                        <Input placeholder='Title' value={b.title||''} onChange={e=>setProfile(p=>{ const badges=[...(p.badges||[])]; badges[idx] = { ...badges[idx], title: e.target.value }; return { ...p, badges }; })} />
                        <Input placeholder='Icon URL' value={b.iconUrl||''} onChange={e=>setProfile(p=>{ const badges=[...(p.badges||[])]; badges[idx] = { ...badges[idx], iconUrl: e.target.value }; return { ...p, badges }; })} />
                        <Button size='sm' colorScheme='red' variant='outline' onClick={()=>setProfile(p=>({ ...p, badges: (p.badges||[]).filter((_,i)=>i!==idx) }))}>Remove</Button>
                      </HStack>
                    ))}
                  </VStack>
                </Section>
                <Section title='Ratings' actions={<Button size='sm' onClick={()=>setProfile(p=>({ ...p, ratings: [...(p.ratings||[]), { platform: '', rating: 0 }] }))}>Add</Button>}>
                  <VStack align='stretch'>
                    {(profile.ratings||[]).map((r, idx) => (
                      <HStack key={idx}>
                        <Input placeholder='Platform' value={r.platform||''} onChange={e=>setProfile(p=>{ const ratings=[...(p.ratings||[])]; ratings[idx] = { ...ratings[idx], platform: e.target.value }; return { ...p, ratings }; })} />
                        <Input type='number' placeholder='Rating' value={r.rating||0} onChange={e=>setProfile(p=>{ const ratings=[...(p.ratings||[])]; ratings[idx] = { ...ratings[idx], rating: Number(e.target.value||0) }; return { ...p, ratings }; })} />
                        <Button size='sm' colorScheme='red' variant='outline' onClick={()=>setProfile(p=>({ ...p, ratings: (p.ratings||[]).filter((_,i)=>i!==idx) }))}>Remove</Button>
                      </HStack>
                    ))}
                  </VStack>
                </Section>
                <HStack>
                  <Text>Public Profile</Text>
                  <Switch isChecked={profile.isPublic!==false} onChange={e=>setProfile({...profile, isPublic: e.target.checked})} />
                </HStack>
              </VStack>
            </Section>
          </TabPanel>

          <TabPanel>
            <Section title='Add Project' actions={<Button colorScheme='purple' onClick={addProject}>Add</Button>}>
              <VStack align='stretch'>
                <Input placeholder='Title' value={projForm.title} onChange={e=>setProjForm({...projForm,title:e.target.value})} />
                <Textarea placeholder='Description' value={projForm.description} onChange={e=>setProjForm({...projForm,description:e.target.value})} />
                <Input placeholder='URL' value={projForm.url} onChange={e=>setProjForm({...projForm,url:e.target.value})} />
                <Input placeholder='Tags (comma separated)' value={projForm.tags} onChange={e=>setProjForm({...projForm,tags:e.target.value})} />
              </VStack>
            </Section>
            <Box mt={4}>
              <Heading size='sm' mb={2}>Projects</Heading>
              <VStack align='stretch'>
                {projects.map(p => (
                  <Box key={p._id} borderWidth='1px' borderRadius='md' p={3}>
                    {editingProject === p._id ? (
                      <VStack align='stretch' spacing={2}>
                        <Input value={editProject.title || ''} onChange={e=>setEditProject(v=>({ ...v, title: e.target.value }))} />
                        <Textarea value={editProject.description || ''} onChange={e=>setEditProject(v=>({ ...v, description: e.target.value }))} />
                        <Input placeholder='URL' value={editProject.url || ''} onChange={e=>setEditProject(v=>({ ...v, url: e.target.value }))} />
                        <Input placeholder='Tags (comma separated)' value={(editProject.tags || []).join(', ')} onChange={e=>setEditProject(v=>({ ...v, tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))} />
                        <HStack>
                          <Button size='sm' colorScheme='purple' onClick={async()=>{ try{ await updateProject(p._id, editProject); setEditingProject(null); await loadProjects(); toast({ title:'Updated', status:'success' }); } catch { toast({ title:'Update failed', status:'error' }); } }}>Save</Button>
                          <Button size='sm' variant='ghost' onClick={()=>setEditingProject(null)}>Cancel</Button>
                        </HStack>
                      </VStack>
                    ) : (
                      <>
                        <HStack justify='space-between'>
                          <Text fontWeight='bold'>{p.title}</Text>
                          <HStack>
                            {p.url && <a href={p.url} target='_blank' rel='noreferrer'><Text color='purple.500' fontSize='sm'>Open</Text></a>}
                            <Button size='xs' variant='outline' onClick={async()=>{ try{ await updateProject(p._id, { pinned: !p.pinned }); await loadProjects(); } catch {} }}>{p.pinned ? 'Unpin' : 'Pin'}</Button>
                            <Button size='xs' onClick={()=>{ setEditingProject(p._id); setEditProject({ title: p.title, description: p.description || '', url: p.url || '', tags: p.tags || [] }); }}>Edit</Button>
                            <Button size='xs' colorScheme='red' variant='outline' onClick={()=>{ setConfirmText('Delete this project?'); setConfirmAction(()=> async()=>{ try{ await deleteProject(p._id); await loadProjects(); toast({ title:'Deleted', status:'success' }); } catch { toast({ title:'Delete failed', status:'error' }); } }); onOpen(); }}>Delete</Button>
                          </HStack>
                        </HStack>
                        {p.tags?.length ? <Text mt={1} fontSize='sm'>Tags: {p.tags.join(', ')}</Text> : null}
                        {p.description ? <Text mt={1} fontSize='sm' color='gray.600'>{p.description}</Text> : null}
                      </>
                    )}
                  </Box>
                ))}
              </VStack>
            </Box>
          </TabPanel>

          {/* Confirm dialog */}
          <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
            <AlertDialogOverlay>
              <AlertDialogContent>
                <AlertDialogHeader fontSize='lg' fontWeight='bold'>Confirm</AlertDialogHeader>
                <AlertDialogBody>{confirmText}</AlertDialogBody>
                <AlertDialogFooter>
                  <Button ref={cancelRef} onClick={onClose}>Cancel</Button>
                  <Button colorScheme='red' ml={3} onClick={async()=>{ await confirmAction(); onClose(); }}>Delete</Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialogOverlay>
          </AlertDialog>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
