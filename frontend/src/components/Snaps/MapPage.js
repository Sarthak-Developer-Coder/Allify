import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Box, VStack, Text, HStack, Button, useToast } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';

export default function MapPage(){
  const { hostName } = useContext(chatContext);
  const [nearby, setNearby] = useState([]);
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const toast = useToast();

  const share = async () => {
    if (!navigator.geolocation) return toast({ title:'Geolocation not supported', status:'error' });
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      await fetch(hostName + '/map/update', { method:'POST', headers:{ 'Content-Type':'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ lat, lng }) });
      load();
      toast({ title:'Location shared', status:'success' });
    }, ()=> toast({ title:'Location denied', status:'error' }));
  };

  const load = useCallback(async () => {
    try { const r = await fetch(hostName + '/map/nearby', { headers:{ 'auth-token': localStorage.getItem('token') } }); const d = await r.json(); setNearby(Array.isArray(d)?d:[]); } catch { setNearby([]); }
  }, [hostName]);
  useEffect(()=>{ load(); }, [load]);

  // Lazy-init Leaflet map with CDN (no bundler dep) and update markers
  useEffect(() => {
    if (!mapRef.current) return;
    const ensureLeaflet = async () => {
      if (window.L) return window.L;
      await new Promise((res) => {
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; l.onload = res; document.head.appendChild(l);
      });
      await new Promise((res) => {
        const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; document.body.appendChild(s);
      });
      return window.L;
    };
    ensureLeaflet().then((L) => {
      if (!mapObj.current) {
        mapObj.current = L.map(mapRef.current).setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapObj.current);
      }
      // clear existing markers layer by recreating
      mapObj.current.eachLayer((layer) => { if (layer instanceof window.L.Marker) mapObj.current.removeLayer(layer); });
      nearby.forEach(n => {
        if (typeof n.lat === 'number' && typeof n.lng === 'number') {
          window.L.marker([n.lat, n.lng]).addTo(mapObj.current).bindPopup(`${n.user?.name||'Friend'}`);
        }
      });
    }).catch(()=>{});
  }, [nearby]);

  return (
  <Box p={4}>
      <VStack align='stretch' spacing={3}>
        <HStack justify='space-between'>
          <Text fontSize='2xl' fontWeight='bold'>Map</Text>
          <Button onClick={share}>Share my location</Button>
        </HStack>
    <Box id='map' ref={mapRef} style={{ height: '50vh', width: '100%', borderRadius: 8, overflow: 'hidden' }} />
    {/* List fallback */}
        {nearby.map(n => (
          <Box key={n._id} borderWidth='1px' borderRadius='md' p={2}>
            <Text>{n.user?.name || 'Friend'} — {n.lat.toFixed(4)}, {n.lng.toFixed(4)}</Text>
          </Box>
        ))}
        {nearby.length===0 && <Text color='gray.500'>No nearby friends yet.</Text>}
      </VStack>
    </Box>
  );
}
