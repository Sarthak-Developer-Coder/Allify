import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Box, HStack, VStack, Text, Input, Button, Textarea, SimpleGrid, Select, useDisclosure } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';
import CompanyDetail from './CompanyDetail';

const Jobs = () => {
  const { hostName } = useContext(chatContext);
  const [jobs, setJobs] = useState([]);
  const [saved, setSaved] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ title: '', company: '', location: '', description: '', employmentType: 'Full-time' });
  const [filters, setFilters] = useState({ location: '', type: '', workMode: '', minSalary: '', maxSalary: '', skills: '', sort: 'new' });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (filters.location) p.set('location', filters.location);
  if (filters.type) p.set('type', filters.type);
  if (filters.workMode) p.set('workMode', filters.workMode);
    if (filters.minSalary) p.set('minSalary', filters.minSalary);
    if (filters.maxSalary) p.set('maxSalary', filters.maxSalary);
    if (filters.skills) p.set('skills', filters.skills);
  if (filters.sort) p.set('sort', filters.sort);
    p.set('page', String(page));
    p.set('limit', '10');
    return p.toString() ? `?${p.toString()}` : '';
  }, [q, filters.location, filters.type, filters.workMode, filters.minSalary, filters.maxSalary, filters.skills, filters.sort, page]);

  const load = useCallback(async () => {
    const res = await fetch(`${hostName}/jobs${buildQuery()}`, { headers: { 'auth-token': localStorage.getItem('token') } });
    const data = await res.json();
    if (Array.isArray(data)) {
      // backward compat
      setJobs(data);
      setPages(1);
    } else {
      setJobs(data.items || []);
      setPages(data.pages || 1);
    }
  }, [hostName, buildQuery]);

  useEffect(() => {
    (async () => {
      await fetch(`${hostName}/jobs`, { headers: { 'auth-token': localStorage.getItem('token') } });
      const s = await fetch(`${hostName}/user/jobs/saved`, { headers: { 'auth-token': localStorage.getItem('token') } }).then(r => r.json());
      setSaved(Array.isArray(s) ? s : []);
      const comps = await fetch(`${hostName}/companies`, { headers: { 'auth-token': localStorage.getItem('token') } }).then(r => r.json());
      setCompanies(Array.isArray(comps) ? comps : []);
  const al = await fetch(`${hostName}/jobs/alerts/list`, { headers: { 'auth-token': localStorage.getItem('token') } }).then(r => r.json());
  setAlerts(Array.isArray(al) ? al : []);
    })();
  }, [hostName]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box p={2}>
      <VStack align='stretch' spacing={2}>
        <HStack>
          <Input placeholder='Search jobs' value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={() => { setPage(1); load(); }}>Search</Button>
        </HStack>
        <HStack>
          <Input placeholder='Location' value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
          <Select placeholder='Type' value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Internship</option>
            <option>Temporary</option>
            <option>Other</option>
          </Select>
          <Input placeholder='Min salary' type='number' value={filters.minSalary} onChange={(e) => setFilters({ ...filters, minSalary: e.target.value })} />
          <Input placeholder='Max salary' type='number' value={filters.maxSalary} onChange={(e) => setFilters({ ...filters, maxSalary: e.target.value })} />
        </HStack>
        <HStack>
          <Input placeholder='Skills (comma separated)' value={filters.skills} onChange={(e) => setFilters({ ...filters, skills: e.target.value })} />
          <Select placeholder='Work mode' value={filters.workMode} onChange={(e) => setFilters({ ...filters, workMode: e.target.value })}>
            <option>On-site</option>
            <option>Remote</option>
            <option>Hybrid</option>
          </Select>
          <Select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
            <option value='new'>Newest</option>
            <option value='salary'>Top salary</option>
          </Select>
          <Button variant='outline' onClick={() => { setFilters({ location: '', type: '', workMode: '', minSalary: '', maxSalary: '', skills: '', sort: 'new' }); setQ(''); setPage(1); load(); }}>Reset</Button>
        </HStack>
        <HStack>
          <Button size='sm' onClick={async () => {
            const body = { q, location: filters.location, type: filters.type, workMode: filters.workMode, skills: (filters.skills || '').split(',').map(s => s.trim()).filter(Boolean) };
            await fetch(`${hostName}/jobs/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(body) });
            const al = await fetch(`${hostName}/jobs/alerts/list`, { headers: { 'auth-token': localStorage.getItem('token') } }).then(r => r.json());
            setAlerts(Array.isArray(al) ? al : []);
          }}>Create alert from filters</Button>
        </HStack>
      </VStack>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={3}>
        <VStack align='stretch' spacing={3}>
          {jobs.map(j => {
            const isSaved = saved.find(s => s._id === j._id);
            return (
              <Box key={j._id} p={3} borderWidth='1px' borderRadius='md' bg='blackAlpha.200'>
                <Text fontWeight='bold'>{j.title}</Text>
                <Text>{j.company} • {j.location}</Text>
                <Text mt={1} noOfLines={3}>{j.description}</Text>
                <HStack mt={2}>
                  <Button size='sm' onClick={async () => { await fetch(`${hostName}/jobs/${j._id}/apply`, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') } }); }}>Apply</Button>
                  <Button size='sm' variant='outline' onClick={async () => {
                    const hdrs = { 'auth-token': localStorage.getItem('token') };
                    if (isSaved) {
                      await fetch(`${hostName}/user/jobs/${j._id}/unsave`, { method: 'POST', headers: hdrs });
                    } else {
                      await fetch(`${hostName}/user/jobs/${j._id}/save`, { method: 'POST', headers: hdrs });
                    }
                    const s = await fetch(`${hostName}/user/jobs/saved`, { headers: hdrs }).then(r => r.json());
                    setSaved(Array.isArray(s) ? s : []);
                  }}>{isSaved ? 'Unsave' : 'Save'}</Button>
                </HStack>
              </Box>
            );
          })}
        </VStack>
        <Box>
          <Text fontWeight='bold' mb={2}>Saved jobs</Text>
          <VStack align='stretch' spacing={3}>
            {saved.map(j => (
              <Box key={j._id} p={3} borderWidth='1px' borderRadius='md'>
                <Text fontWeight='semibold'>{j.title}</Text>
                <Text fontSize='sm' color='gray.500'>{j.company} • {j.location}</Text>
              </Box>
            ))}
          </VStack>
          <Box mt={6}>
            <Text fontWeight='bold' mb={2}>Companies</Text>
            <VStack align='stretch' spacing={3}>
              {companies.map(c => (
                <Box key={c._id} p={3} borderWidth='1px' borderRadius='md' _hover={{ bg: 'gray.50', cursor: 'pointer' }} onClick={() => { setActiveCompanyId(c._id); onOpen(); }}>
                  <Text fontWeight='semibold'>{c.name}</Text>
                  <Text fontSize='sm' color='gray.500'>{c.website || ''}</Text>
                  <Button size='xs' mt={2} onClick={async () => {
                    const hdrs = { 'auth-token': localStorage.getItem('token') };
                    await fetch(`${hostName}/companies/${c._id}/follow`, { method: 'POST', headers: hdrs });
                  }}>Follow</Button>
                </Box>
              ))}
            </VStack>
          </Box>
          <Box mt={6}>
            <Text fontWeight='bold' mb={2}>Job alerts</Text>
            <VStack align='stretch' spacing={2}>
              {alerts.map(a => (
                <HStack key={a._id} justify='space-between' borderWidth='1px' borderRadius='md' p={2}>
                  <Text fontSize='sm' noOfLines={1}>{[a.q, a.location, a.type, a.workMode].filter(Boolean).join(' • ')}</Text>
                  <Button size='xs' variant='outline' onClick={async () => {
                    await fetch(`${hostName}/jobs/alerts/${a._id}`, { method: 'DELETE', headers: { 'auth-token': localStorage.getItem('token') } });
                    setAlerts(prev => prev.filter(x => x._id !== a._id));
                  }}>Delete</Button>
                </HStack>
              ))}
                <CompanyDetail
                  isOpen={isOpen}
                  onClose={() => { onClose(); }}
                  companyId={activeCompanyId}
                  hostName={hostName}
                  token={localStorage.getItem('token')}
                  onFilterByCompany={(name) => { setQ(name); setPage(1); load(); }}
                />
            </VStack>
          </Box>
        </Box>
      </SimpleGrid>

      <HStack mt={3} justify='center'>
        <Button size='sm' isDisabled={page <= 1} onClick={() => { setPage(p => Math.max(1, p - 1)); setTimeout(load, 0); }}>Prev</Button>
        <Text fontSize='sm'>Page {page} of {pages}</Text>
        <Button size='sm' isDisabled={page >= pages} onClick={() => { setPage(p => Math.min(pages, p + 1)); setTimeout(load, 0); }}>Next</Button>
      </HStack>

      <Box mt={6} p={3} borderWidth='1px' borderRadius='md'>
        <Text fontWeight='bold' mb={2}>Post a job</Text>
        <Input placeholder='Title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} mb={2} />
        <Input placeholder='Company' value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} mb={2} />
        <Input placeholder='Location' value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} mb={2} />
        <Select placeholder='Employment type' value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} mb={2}>
          <option>Full-time</option>
          <option>Part-time</option>
          <option>Contract</option>
          <option>Internship</option>
          <option>Temporary</option>
          <option>Other</option>
        </Select>
        <Textarea placeholder='Description' value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} mb={2} />
        <Button onClick={async () => { await fetch(`${hostName}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify(form) }); setForm({ title: '', company: '', location: '', description: '', employmentType: 'Full-time' }); load(); }}>Post</Button>
      </Box>
    </Box>
  );
};

export default Jobs;
