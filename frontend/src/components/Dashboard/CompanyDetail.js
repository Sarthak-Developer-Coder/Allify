import React, { useEffect, useState, useCallback } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Text, VStack, HStack, Box, Link, SimpleGrid } from '@chakra-ui/react';

export default function CompanyDetail({ isOpen, onClose, companyId, hostName, token, onFilterByCompany }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const hdrs = { 'auth-token': token };
      const c = await fetch(`${hostName}/companies/${companyId}`, { headers: hdrs }).then(r => r.json());
      setCompany(c || null);
      // Best-effort: search jobs by company name if available
      if (c && c.name) {
        const params = new URLSearchParams({ q: c.name, page: '1' });
        const j = await fetch(`${hostName}/jobs?${params.toString()}`, { headers: hdrs }).then(r => r.json());
        setJobs(Array.isArray(j?.jobs) ? j.jobs : Array.isArray(j) ? j : []);
      } else {
        setJobs([]);
      }
    } catch (e) {
      setCompany(null);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, hostName, token]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const follow = async () => {
    if (!company) return;
    const hdrs = { 'auth-token': token };
    await fetch(`${hostName}/companies/${company._id}/follow`, { method: 'POST', headers: hdrs });
    load();
  };

  const unfollow = async () => {
    if (!company) return;
    const hdrs = { 'auth-token': token };
    await fetch(`${hostName}/companies/${company._id}/unfollow`, { method: 'POST', headers: hdrs });
    load();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior='inside'>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{company?.name || 'Company'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading && <Text>Loading...</Text>}
          {!loading && company && (
            <VStack align='stretch' spacing={3}>
              {company.website && <Link href={company.website} color='blue.500' isExternal>{company.website}</Link>}
              {company.about && <Text fontSize='sm'>{company.about}</Text>}
              <HStack>
                <Text fontSize='sm' color='gray.600'>Followers: {company.followers?.length || 0}</Text>
              </HStack>
              <HStack>
                <Button size='sm' onClick={follow}>Follow</Button>
                <Button size='sm' variant='outline' onClick={unfollow}>Unfollow</Button>
                {company.name && (
                  <Button size='sm' variant='ghost' onClick={() => { onFilterByCompany?.(company.name); onClose(); }}>View jobs</Button>
                )}
              </HStack>
              <Box pt={2}>
                <Text fontWeight='bold' mb={2}>Jobs</Text>
                <SimpleGrid columns={1} spacing={2}>
                  {jobs.map(j => (
                    <Box key={j._id} p={3} borderWidth='1px' borderRadius='md'>
                      <Text fontWeight='semibold'>{j.title}</Text>
                      <Text fontSize='sm' color='gray.500'>{j.location}</Text>
                    </Box>
                  ))}
                  {!jobs.length && <Text fontSize='sm' color='gray.500'>No jobs found.</Text>}
                </SimpleGrid>
              </Box>
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
