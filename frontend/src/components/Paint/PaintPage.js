import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, HStack, VStack, Button, Text, Input, Select, Slider, SliderTrack,
  SliderFilledTrack, SliderThumb, useToast, Checkbox, Divider, IconButton
} from '@chakra-ui/react';
import { DownloadIcon, RepeatIcon, RepeatClockIcon, AddIcon, MinusIcon } from '@chakra-ui/icons';

// Lightweight IDs
const uid = () => Math.random().toString(36).slice(2);

// Tools enum
const Tools = {
  BRUSH: 'brush', PENCIL: 'pencil', ERASER: 'eraser', LINE: 'line', RECT: 'rect', ELLIPSE: 'ellipse', POLY: 'poly',
  BUCKET: 'bucket', TEXT: 'text', EYEDROPPER: 'eyedropper', SELECT: 'select', HAND: 'hand',
};

export default function PaintPage() {
  const toast = useToast();
  const socket = typeof window !== 'undefined' ? window.__appSocket : null;

  // Viewport and canvases
  const containerRef = useRef(null);
  const overlayRef = useRef(null); // temp drawing overlay
  const gridRef = useRef(null); // grid overlay
  const presenceRef = useRef(null); // collaborators cursors
  const compositeRef = useRef(null); // for sampling/export
  const drawingAreaRef = useRef(null); // container for fit-to-screen and DnD
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Layers
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const layerMapRef = useRef(new Map()); // id -> {canvas, ctx}
  const forceTick = useState(0)[1];

  // Tools and settings
  const [tool, setTool] = useState(Tools.BRUSH);
  const [primary, setPrimary] = useState('#000000');
  const [secondary, setSecondary] = useState('#ffffff');
  const [size, setSize] = useState(8);
  const [opacity, setOpacity] = useState(1);
  const [fillShape, setFillShape] = useState(true);
  const [strokeShape, setStrokeShape] = useState(true);
  const [font, setFont] = useState('24px Arial');
  const [useGradient, setUseGradient] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [snapGrid, setSnapGrid] = useState(false);
  const [swatches, setSwatches] = useState(['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffa500','#800080']);
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState('');
  const [autosave, setAutosave] = useState(false);
  const [autosaveIntervalSec, setAutosaveIntervalSec] = useState(30);
  const [exportQuality, setExportQuality] = useState(0.92);
  const [resizeW, setResizeW] = useState(1200);
  const [resizeH, setResizeH] = useState(800);

  // Drawing state
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pathPoints = useRef([]); // for poly
  const polygonActive = useRef(false);
  const selection = useRef(null); // {x,y,w,h, imageData}
  const peersRef = useRef(new Map()); // socketId -> {x,y,color,ts}

  // History (per-layer image snapshots)
  const history = useRef([]);
  const redoStack = useRef([]);

  // Helpers
  const getActiveLayer = useCallback(() => layers.find(l => l.id === activeLayerId), [layers, activeLayerId]);
  const getActiveCtx = useCallback(() => layerMapRef.current.get(activeLayerId)?.ctx, [activeLayerId]);
  const viewportToCanvas = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / zoom;
    const y = (clientY - rect.top - offset.y) / zoom;
    let px = Math.round(x), py = Math.round(y);
    if (snapGrid && gridSize > 1) {
      px = Math.round(px / gridSize) * gridSize;
      py = Math.round(py / gridSize) * gridSize;
    }
    return { x: px, y: py };
  };
  const withCtx = (ctx, fn) => { ctx.save(); fn(ctx); ctx.restore(); };

  const initLayer = (name) => {
    const id = uid();
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    canvas.style.position = 'absolute'; canvas.style.left = '0'; canvas.style.top = '0';
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    layerMapRef.current.set(id, { canvas, ctx });
    containerRef.current.appendChild(canvas);
    return { id, name, visible: true, opacity: 1 };
  };

  // Single-layer mode: removed add/remove/move layer APIs

  const recordHistory = (layerId, before) => {
    history.current.push({ layerId, before, after: null });
    // clear redo stack on new action
    redoStack.current = [];
  };
  const finalizeHistory = (after) => {
    const last = history.current[history.current.length - 1];
    if (last) last.after = after;
  };
  const undo = React.useCallback(() => {
    const last = history.current.pop();
    if (!last) return;
  const { layerId, before } = last;
    const ctx = layerMapRef.current.get(layerId)?.ctx;
    if (!ctx || !before) return;
    const img = ctx.createImageData(before.width, before.height);
    img.data.set(before.data);
    ctx.putImageData(img, 0, 0);
    redoStack.current.push(last);
    forceTick(t => t + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const redo = React.useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    const { layerId, after } = entry;
    const ctx = layerMapRef.current.get(layerId)?.ctx;
    if (!ctx || !after) return;
    const img = ctx.createImageData(after.width, after.height);
    img.data.set(after.data);
    ctx.putImageData(img, 0, 0);
    history.current.push(entry);
    forceTick(t => t + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapshotLayer = (layerId) => {
    const { canvas, ctx } = layerMapRef.current.get(layerId);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height, data: new Uint8ClampedArray(data.data) };
  };

  // Redraw overlay transform for zoom/pan
  useEffect(() => {
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.width = viewport.width; overlay.height = viewport.height;
      overlay.style.position = 'absolute'; overlay.style.left = '0'; overlay.style.top = '0';
      overlay.style.transformOrigin = '0 0';
      overlay.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`;
      overlay.style.pointerEvents = 'none';
    }
    const grid = gridRef.current;
    if (grid) {
      grid.width = viewport.width; grid.height = viewport.height;
      grid.style.position = 'absolute'; grid.style.left = '0'; grid.style.top = '0';
      grid.style.transformOrigin = '0 0';
      grid.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`;
      grid.style.pointerEvents = 'none';
    }
    const presence = presenceRef.current;
    if (presence) {
      presence.width = viewport.width; presence.height = viewport.height;
      presence.style.position = 'absolute'; presence.style.left = '0'; presence.style.top = '0';
      presence.style.transformOrigin = '0 0';
      presence.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`;
      presence.style.pointerEvents = 'none';
    }
    // apply transforms to container children via CSS transform on wrapper
    if (containerRef.current) {
      containerRef.current.style.width = `${viewport.width}px`;
      containerRef.current.style.height = `${viewport.height}px`;
      containerRef.current.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`;
      containerRef.current.style.transformOrigin = '0 0';
      containerRef.current.style.position = 'relative';
      containerRef.current.style.background = '#ffffff';
      containerRef.current.style.outline = '1px solid #ccc';
    }
  }, [viewport, zoom, offset]);

  // Draw grid lines
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const g = grid.getContext('2d');
    g.clearRect(0, 0, grid.width, grid.height);
    if (!showGrid || gridSize < 2) return;
    g.save();
    g.strokeStyle = 'rgba(0,0,0,0.1)';
    g.lineWidth = 1;
    for (let x = 0; x <= grid.width; x += gridSize) {
      g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, grid.height); g.stroke();
    }
    for (let y = 0; y <= grid.height; y += gridSize) {
      g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(grid.width, y + 0.5); g.stroke();
    }
    g.restore();
  }, [showGrid, gridSize, viewport.width, viewport.height]);

  // Draw peer cursors
  const renderPeers = () => {
    const canvas = presenceRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const now = Date.now();
    for (const [id, cur] of peersRef.current.entries()) {
      if (now - (cur.ts||0) > 8000) { peersRef.current.delete(id); continue; }
      const r = 5; ctx.save();
      ctx.globalAlpha = 0.9; ctx.fillStyle = cur.color || '#ef4444'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cur.x, cur.y, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  };

  // Presence socket events
  useEffect(() => {
    if (!socket) return;
    const onCursor = ({ cursor, from }) => {
      if (!cursor) return;
      peersRef.current.set(from, { ...cursor, ts: Date.now() });
      renderPeers();
    };
    const iv = setInterval(renderPeers, 1000);
    socket.on('paint:cursor', onCursor);
    return () => { socket.off('paint:cursor', onCursor); clearInterval(iv); };
  }, [socket]);

  // Initialize
  useEffect(() => {
    if (!containerRef.current) return;
    // Clear any previous canvases (hot reload safety)
    containerRef.current.innerHTML = '';
    layerMapRef.current = new Map();
    // Base layer
    const base = initLayer('Background');
    setLayers([base]);
    setActiveLayerId(base.id);
    // Auto-join from query param ?room=
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r && socket) {
        setRoomId(r);
        socket.emit('paint:join', { roomId: r });
        setJoinedRoom(r);
        toast({ title: `Joined ${r}`, status: 'success' });
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compose to offscreen composite for eyedropper/export
  const composeTo = (targetCtx) => {
    targetCtx.clearRect(0, 0, viewport.width, viewport.height);
    layers.forEach(l => {
      if (!l.visible) return;
      const { canvas } = layerMapRef.current.get(l.id);
      targetCtx.globalAlpha = l.opacity;
      targetCtx.drawImage(canvas, 0, 0);
    });
    targetCtx.globalAlpha = 1;
  };

  const exportPNG = () => {
    const comp = compositeRef.current;
    comp.width = viewport.width; comp.height = viewport.height;
    const cctx = comp.getContext('2d');
    composeTo(cctx);
    const url = comp.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'canvas.png'; a.click();
  };

  const exportJPG = (quality = exportQuality) => {
    const comp = compositeRef.current;
    comp.width = viewport.width; comp.height = viewport.height;
    const cctx = comp.getContext('2d');
    composeTo(cctx);
    const q = Math.min(1, Math.max(0.1, quality || 0.92));
    const url = comp.toDataURL('image/jpeg', q);
    const a = document.createElement('a'); a.href = url; a.download = 'canvas.jpg'; a.click();
  };

  const clearCanvas = () => {
    const active = getActiveLayer(); if (!active) return;
    const ctx = getActiveCtx(); if (!ctx) return;
    recordHistory(active.id, snapshotLayer(active.id));
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    finalizeHistory(snapshotLayer(active.id));
  };

  const fillCanvas = () => {
    const active = getActiveLayer(); if (!active) return;
    const ctx = getActiveCtx(); if (!ctx) return;
    recordHistory(active.id, snapshotLayer(active.id));
    withCtx(ctx, (c) => { c.globalAlpha = opacity; c.fillStyle = primary; c.fillRect(0, 0, viewport.width, viewport.height); });
    finalizeHistory(snapshotLayer(active.id));
  };

  const resetZoom = () => setZoom(1);
  const fitToScreen = () => {
    try {
      const area = drawingAreaRef.current; if (!area) return;
      const cw = area.clientWidth - 12; const ch = area.clientHeight - 12;
      if (cw <= 0 || ch <= 0) return;
      const z = Math.max(0.1, Math.min(8, Math.min(cw / viewport.width, ch / viewport.height)));
      setZoom(z);
      setOffset({ x: 0, y: 0 });
    } catch {}
  };

  // Collaboration helpers: emit operation
  const emitOp = React.useCallback((op) => {
    try { if (socket && joinedRoom) socket.emit('paint:op', { roomId: joinedRoom, op }); } catch {}
  }, [socket, joinedRoom]);
  // Apply minimal ops from peers
  useEffect(() => {
    if (!socket) return;
    const onOp = ({ op, from }) => {
      if (!op) return;
      const ctx = getActiveCtx(); if (!ctx) return;
      const t = op.type;
      if (t === 'stroke') {
        withCtx(ctx, (c) => {
          c.globalCompositeOperation = op.erase ? 'destination-out' : 'source-over';
          c.globalAlpha = op.opacity || 1; c.lineCap = 'round'; c.lineJoin = 'round';
          c.strokeStyle = op.color || '#000'; c.lineWidth = op.size || 4;
          c.beginPath(); c.moveTo(op.from.x, op.from.y); c.lineTo(op.to.x, op.to.y); c.stroke();
        });
      } else if (t === 'line') {
        withCtx(ctx, (c) => { c.globalAlpha = op.opacity||1; c.strokeStyle = op.color||'#000'; c.lineWidth = op.size||4; c.beginPath(); c.moveTo(op.from.x, op.from.y); c.lineTo(op.to.x, op.to.y); c.stroke(); });
      } else if (t === 'rect') {
        withCtx(ctx, (c) => { c.globalAlpha = op.opacity||1; if (op.fill) { c.fillStyle = op.fill; c.fillRect(op.x, op.y, op.w, op.h); } if (op.stroke) { c.strokeStyle = op.stroke; c.lineWidth = op.size||2; c.strokeRect(op.x, op.y, op.w, op.h); } });
      } else if (t === 'ellipse') {
        withCtx(ctx, (c) => { c.globalAlpha = op.opacity||1; c.beginPath(); c.ellipse(op.cx, op.cy, Math.abs(op.rx), Math.abs(op.ry), 0, 0, Math.PI*2); if (op.fill) { c.fillStyle = op.fill; c.fill(); } if (op.stroke) { c.strokeStyle = op.stroke; c.lineWidth = op.size||2; c.stroke(); } });
      } else if (t === 'poly') {
        withCtx(ctx, (c) => { c.globalAlpha = op.opacity||1; c.beginPath(); c.moveTo(op.points[0].x, op.points[0].y); for (let i=1;i<op.points.length;i++) c.lineTo(op.points[i].x, op.points[i].y); c.closePath(); if (op.fill) { c.fillStyle = op.fill; c.fill(); } if (op.stroke) { c.strokeStyle = op.stroke; c.lineWidth = op.size||2; c.stroke(); } });
      } else if (t === 'text') {
        withCtx(ctx, (c) => { c.globalAlpha = op.opacity||1; c.fillStyle = op.color||'#000'; c.font = op.font||'24px Arial'; c.textBaseline='top'; c.fillText(op.text||'', op.x, op.y); });
      }
    };
    socket.on('paint:op', onOp);
    return () => { socket.off('paint:op', onOp); };
  }, [socket, joinedRoom, getActiveCtx]);

  const importImage = (file) => {
    const img = new Image();
    img.onload = () => {
  const ctx = getActiveCtx();
  if (!ctx) return;
  ctx.drawImage(img, 0, 0);
      toast({ title: 'Image imported', status: 'success' });
    };
    img.src = URL.createObjectURL(file);
  };

  // Flood fill
  const floodFill = (ctx, x, y, fillColor) => {
    const { width, height } = ctx.canvas;
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;
    const idx = (x, y) => (y * width + x) * 4;
    const target = data.slice(idx(x, y), idx(x, y) + 4);
    const fc = hexToRgba(fillColor, opacity);
    if (colorsMatch(target, fc)) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      let px = cx;
      // move left
      while (px >= 0 && colorsMatch(data.slice(idx(px, cy), idx(px, cy) + 4), target)) px--;
      px++;
      let spanUp = false, spanDown = false;
      while (px < width && colorsMatch(data.slice(idx(px, cy), idx(px, cy) + 4), target)) {
        setPixel(data, idx(px, cy), fc);
        if (cy > 0) {
          if (colorsMatch(data.slice(idx(px, cy - 1), idx(px, cy - 1) + 4), target)) {
            if (!spanUp) { stack.push([px, cy - 1]); spanUp = true; }
          } else if (spanUp) spanUp = false;
        }
        if (cy < height - 1) {
          if (colorsMatch(data.slice(idx(px, cy + 1), idx(px, cy + 1) + 4), target)) {
            if (!spanDown) { stack.push([px, cy + 1]); spanDown = true; }
          } else if (spanDown) spanDown = false;
        }
        px++;
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  const setPixel = (data, i, rgba) => { data[i] = rgba[0]; data[i+1] = rgba[1]; data[i+2] = rgba[2]; data[i+3] = rgba[3]; };
  const colorsMatch = (a, b) => a[0]===b[0] && a[1]===b[1] && a[2]===b[2] && a[3]===b[3];
  const hexToRgba = (hex, a=1) => {
    const h = hex.replace('#','');
    const bigint = parseInt(h.length===3 ? h.split('').map(ch=>ch+ch).join('') : h, 16);
    const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255;
    return [r,g,b, Math.round(a*255)];
  };

  // Mouse handlers
  const onDown = (e) => {
    const active = getActiveLayer();
    if (!active) return;
    const ctx = getActiveCtx();
    const pos = viewportToCanvas(e.clientX, e.clientY);
    if (tool === Tools.HAND || (e.button === 1) || (e.button === 0 && e.shiftKey)) {
      isPanning.current = true; panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; return;
    }
    // Polygon special handling
    if (tool === Tools.POLY) {
      if (!polygonActive.current) {
        polygonActive.current = true;
        pathPoints.current = [pos];
        // Snapshot before first point
        recordHistory(active.id, snapshotLayer(active.id));
      } else {
        pathPoints.current.push(pos);
      }
      drawOverlayPolygon(pathPoints.current);
      return;
    }
    drawing.current = true; lastPos.current = pos; pathPoints.current = [pos];
    // Snapshot before for other tools
    recordHistory(active.id, snapshotLayer(active.id));
    if (tool === Tools.BUCKET) {
      floodFill(ctx, pos.x, pos.y, primary);
      finalizeHistory(snapshotLayer(active.id)); drawing.current = false;
    } else if (tool === Tools.EYEDROPPER) {
      const comp = compositeRef.current; comp.width = viewport.width; comp.height = viewport.height;
      const cctx = comp.getContext('2d', { willReadFrequently: true });
      composeTo(cctx);
      const img = cctx.getImageData(pos.x, pos.y, 1, 1).data;
      const toHex = (n) => n.toString(16).padStart(2,'0');
      const hex = `#${toHex(img[0])}${toHex(img[1])}${toHex(img[2])}`;
      setPrimary(hex);
      drawing.current = false; history.current.pop(); // no-op
    } else if (tool === Tools.TEXT) {
      // Inline input
      const input = document.createElement('input');
      input.type = 'text'; input.placeholder = 'Type and press Enter';
      Object.assign(input.style, { position:'absolute', left: `${pos.x}px`, top: `${pos.y}px`, font: font, zIndex: 9999 });
      containerRef.current.appendChild(input); input.focus();
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          withCtx(ctx, (c) => { c.globalAlpha = opacity; c.fillStyle = primary; c.font = font; c.textBaseline = 'top'; c.fillText(input.value, pos.x, pos.y); });
          containerRef.current.removeChild(input);
          finalizeHistory(snapshotLayer(active.id));
        } else if (ev.key === 'Escape') {
          containerRef.current.removeChild(input); history.current.pop();
        }
      });
      drawing.current = false;
    } else if (tool === Tools.SELECT) {
      selection.current = { x: pos.x, y: pos.y, w: 0, h: 0, imageData: null };
    } else {
      // Begin path for freehand
      if (tool === Tools.BRUSH || tool === Tools.PENCIL || tool === Tools.ERASER) {
        // Nothing to draw immediately; first segment will be on move
      }
    }
  };

  const drawOverlayPolygon = (points) => {
    const ctx = overlayRef.current.getContext('2d');
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = 0.8; ctx.strokeStyle = '#3b82f6'; ctx.fillStyle = 'rgba(59,130,246,0.2)';
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  };

  const drawOverlayShape = (from, to, mode) => {
    const ctx = overlayRef.current.getContext('2d');
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle = '#3b82f6'; ctx.fillStyle = 'rgba(59,130,246,0.2)';
    const w = to.x - from.x, h = to.y - from.y;
    if (mode === Tools.LINE) { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); }
    if (mode === Tools.RECT || mode === 'select') { if (fillShape && mode!== 'select') ctx.fillRect(from.x, from.y, w, h); ctx.strokeRect(from.x, from.y, w, h); }
    if (mode === Tools.ELLIPSE) { ctx.beginPath(); ctx.ellipse(from.x + w/2, from.y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI*2); if (fillShape) ctx.fill(); if (strokeShape) ctx.stroke(); }
    ctx.restore();
  };

  const onMove = (e) => {
    if (isPanning.current) { setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }); return; }
    // broadcast cursor
    if (socket && joinedRoom) {
      try {
        const pos = viewportToCanvas(e.clientX, e.clientY);
        socket.emit('paint:cursor', { roomId: joinedRoom, cursor: { x: pos.x, y: pos.y, color: '#3b82f6' } });
      } catch {}
    }
    if (tool === Tools.POLY && polygonActive.current && pathPoints.current.length) {
      const pos = viewportToCanvas(e.clientX, e.clientY);
      drawOverlayPolygon([...pathPoints.current, pos]);
      return;
    }
    if (!drawing.current) return;
    const ctx = getActiveCtx(); if (!ctx) return;
    const pos = viewportToCanvas(e.clientX, e.clientY);
    const from = lastPos.current;
    if (tool === Tools.BRUSH || tool === Tools.PENCIL || tool === Tools.ERASER) {
      // Draw per-segment so changes to color/size/opacity apply immediately
      withCtx(ctx, (c) => {
        c.globalCompositeOperation = (tool === Tools.ERASER) ? 'destination-out' : 'source-over';
        c.globalAlpha = opacity;
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = (tool === Tools.ERASER) ? '#000' : primary;
        c.lineWidth = tool === Tools.PENCIL ? 1 : size;
        c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(pos.x, pos.y); c.stroke();
      });
      emitOp({ type:'stroke', erase: tool===Tools.ERASER, opacity, color: tool===Tools.ERASER? '#000': primary, size: tool===Tools.PENCIL?1:size, from, to: pos });
      lastPos.current = pos; pathPoints.current.push(pos);
    } else if (tool === Tools.LINE) {
      // Angle snap with Shift (horizontal/vertical/diagonal)
      let to = pos;
      if (e.shiftKey) {
        const dx = pos.x - from.x; const dy = pos.y - from.y;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (adx > ady * 2) {
          to = { x: pos.x, y: from.y };
        } else if (ady > adx * 2) {
          to = { x: from.x, y: pos.y };
        } else {
          const d = Math.max(adx, ady);
          to = { x: from.x + Math.sign(dx) * d, y: from.y + Math.sign(dy) * d };
        }
      }
      drawOverlayShape(from, to, Tools.LINE);
    } else if (tool === Tools.RECT) {
      drawOverlayShape(from, pos, Tools.RECT);
    } else if (tool === Tools.ELLIPSE) {
      drawOverlayShape(from, pos, Tools.ELLIPSE);
    } else if (tool === Tools.SELECT) {
      selection.current.w = pos.x - selection.current.x; selection.current.h = pos.y - selection.current.y; drawOverlayShape(selection.current, pos, 'select');
    }
  };

  const onUp = (e) => {
    if (isPanning.current) { isPanning.current = false; return; }
    // Polygon finalize on double-click is handled by dblclick; here ignore if polygon active
    if (tool === Tools.POLY && polygonActive.current) return;
    if (!drawing.current) return;
    drawing.current = false;
    const active = getActiveLayer(); if (!active) return;
    const ctx = getActiveCtx();
    const from = lastPos.current; const to = viewportToCanvas(e.clientX, e.clientY);
    if (tool === Tools.LINE) {
  withCtx(ctx, (c) => { c.globalAlpha = opacity; c.strokeStyle = primary; c.lineWidth = size; c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(to.x, to.y); c.stroke(); });
  emitOp({ type:'line', opacity, color: primary, size, from, to });
      overlayRef.current.getContext('2d').clearRect(0,0,overlayRef.current.width, overlayRef.current.height);
    }
    if (tool === Tools.RECT) {
      withCtx(ctx, (c) => {
        c.globalAlpha = opacity;
        if (fillShape) {
          if (useGradient) {
            const grad = c.createLinearGradient(from.x, from.y, to.x, to.y);
            grad.addColorStop(0, primary); grad.addColorStop(1, secondary);
            c.fillStyle = grad;
          } else { c.fillStyle = primary; }
          c.fillRect(from.x, from.y, to.x-from.x, to.y-from.y);
        }
        if (strokeShape) { c.strokeStyle = secondary; c.lineWidth = size; c.strokeRect(from.x, from.y, to.x-from.x, to.y-from.y); }
      });
  overlayRef.current.getContext('2d').clearRect(0,0,overlayRef.current.width, overlayRef.current.height);
  emitOp({ type:'rect', opacity, x: from.x, y: from.y, w: to.x-from.x, h: to.y-from.y, fill: fillShape ? (useGradient? null : primary) : null, stroke: strokeShape ? secondary : null, size });
    }
    if (tool === Tools.ELLIPSE) {
  withCtx(ctx, (c) => { c.globalAlpha = opacity; c.beginPath(); const w = to.x-from.x, h = to.y-from.y; c.ellipse(from.x + w/2, from.y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI*2); if (fillShape) { if (useGradient) { const grad = c.createLinearGradient(from.x, from.y, to.x, to.y); grad.addColorStop(0, primary); grad.addColorStop(1, secondary); c.fillStyle = grad; } else { c.fillStyle = primary; } c.fill(); } if (strokeShape) { c.strokeStyle = secondary; c.lineWidth = size; c.stroke(); } });
  const w = to.x-from.x, h = to.y-from.y; const cx = from.x + w/2, cy = from.y + h/2;
  emitOp({ type:'ellipse', opacity, cx, cy, rx: Math.abs(w/2), ry: Math.abs(h/2), fill: fillShape ? (useGradient? null : primary) : null, stroke: strokeShape ? secondary : null, size });
      overlayRef.current.getContext('2d').clearRect(0,0,overlayRef.current.width, overlayRef.current.height);
    }
    if (tool === Tools.SELECT) {
      const sel = selection.current; if (Math.abs(sel.w) < 2 || Math.abs(sel.h) < 2) { history.current.pop(); overlayRef.current.getContext('2d').clearRect(0,0,overlayRef.current.width, overlayRef.current.height); return; }
      // capture region for move later
      const x = Math.min(sel.x, sel.x+sel.w), y = Math.min(sel.y, sel.y+sel.h), w = Math.abs(sel.w), h = Math.abs(sel.h);
      const data = ctx.getImageData(x, y, w, h);
      sel.imageData = data; // keep
      // clear original region
      ctx.clearRect(x, y, w, h);
      // draw preview onto overlay and allow drag-place
      const octx = overlayRef.current.getContext('2d');
      octx.clearRect(0,0,overlayRef.current.width, overlayRef.current.height);
      const tmp = document.createElement('canvas'); tmp.width=w; tmp.height=h; tmp.getContext('2d').putImageData(data, 0, 0);
      const onMovePlace = (ev) => { const p = viewportToCanvas(ev.clientX, ev.clientY); octx.clearRect(0,0,overlayRef.current.width, overlayRef.current.height); octx.drawImage(tmp, p.x - w/2, p.y - h/2); };
      const onClickPlace = (ev) => { const p = viewportToCanvas(ev.clientX, ev.clientY); octx.clearRect(0,0,overlayRef.current.width, overlayRef.current.height); ctx.drawImage(tmp, p.x - w/2, p.y - h/2); finalizeHistory(snapshotLayer(active.id)); window.removeEventListener('mousemove', onMovePlace); window.removeEventListener('click', onClickPlace, true); };
      window.addEventListener('mousemove', onMovePlace); window.addEventListener('click', onClickPlace, true);
    }
    // finalize for all tools that drew directly
    if ([Tools.BRUSH, Tools.PENCIL, Tools.ERASER, Tools.LINE, Tools.RECT, Tools.ELLIPSE].includes(tool)) {
      finalizeHistory(snapshotLayer(active.id));
    }
  };

  // Finish polygon on double-click or Enter
  useEffect(() => {
    const onDbl = (e) => {
      if (!polygonActive.current || tool !== Tools.POLY) return;
      const active = getActiveLayer(); if (!active) return;
      const ctx = getActiveCtx();
      const pts = pathPoints.current;
      if (!pts || pts.length < 3) { polygonActive.current = false; overlayRef.current.getContext('2d').clearRect(0,0,overlayRef.current.width,overlayRef.current.height); history.current.pop(); return; }
      withCtx(ctx, (c) => {
        c.globalAlpha = opacity;
        c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
        for (let i=1;i<pts.length;i++) c.lineTo(pts[i].x, pts[i].y);
        c.closePath();
        if (fillShape) {
          if (useGradient) {
            const minx = Math.min(...pts.map(p=>p.x)), miny = Math.min(...pts.map(p=>p.y));
            const maxx = Math.max(...pts.map(p=>p.x)), maxy = Math.max(...pts.map(p=>p.y));
            const grad = c.createLinearGradient(minx, miny, maxx, maxy);
            grad.addColorStop(0, primary); grad.addColorStop(1, secondary);
            c.fillStyle = grad;
          } else {
            c.fillStyle = primary;
          }
          c.fill();
        }
        if (strokeShape) { c.strokeStyle = secondary; c.lineWidth = size; c.stroke(); }
      });
  overlayRef.current.getContext('2d').clearRect(0,0,overlayRef.current.width,overlayRef.current.height);
  emitOp({ type:'poly', opacity, points: pts, fill: fillShape ? (useGradient? null : primary) : null, stroke: strokeShape ? secondary : null, size });
      finalizeHistory(snapshotLayer(active.id));
      polygonActive.current = false; pathPoints.current = [];
    };
    const onKey = (e) => {
      if (e.key === 'Enter') onDbl();
      if (e.key === 'Escape' && polygonActive.current) { polygonActive.current = false; pathPoints.current = []; overlayRef.current.getContext('2d').clearRect(0,0,overlayRef.current.width,overlayRef.current.height); history.current.pop(); }
    };
    window.addEventListener('dblclick', onDbl);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('dblclick', onDbl); window.removeEventListener('keydown', onKey); };
  }, [opacity, fillShape, strokeShape, primary, secondary, size, tool, getActiveCtx, getActiveLayer, useGradient, emitOp]);

  // Wheel zoom
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(8, zoom * delta));
    setZoom(newZoom);
  };

  // Resize canvas
  const applyResize = () => {
    if (!window.confirm('Resize canvas? Current content will be cleared.')) return;
    const w = Math.max(64, Math.min(8192, Number(resizeW) || viewport.width));
    const h = Math.max(64, Math.min(8192, Number(resizeH) || viewport.height));
    // reset all
    containerRef.current.innerHTML = '';
    layerMapRef.current = new Map();
    setLayers([]);
    setViewport({ width: w, height: h });
    setTimeout(() => {
      const base = initLayer('Background');
      setLayers([base]);
      setActiveLayerId(base.id);
      toast({ title: `Canvas resized to ${w}x${h}`, status: 'success' });
      fitToScreen();
    }, 0);
  };

  // Save/Load project (localStorage)
  const saveProject = () => {
    const payload = {
      viewport, layers: layers.map(l => ({ id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, dataURL: layerMapRef.current.get(l.id).canvas.toDataURL() })),
      activeLayerId,
    };
    localStorage.setItem('paintProject', JSON.stringify(payload));
    toast({ title: 'Project saved', status: 'success' });
  };
  const loadProject = () => {
    try {
      const raw = localStorage.getItem('paintProject'); if (!raw) return;
      const p = JSON.parse(raw);
      // reset
      containerRef.current.innerHTML = '';
      layerMapRef.current = new Map();
      setLayers([]);
      setTimeout(() => {
        setViewport(p.viewport || viewport);
        const vp = p.viewport || viewport;
        setResizeW(vp.width || 1200);
        setResizeH(vp.height || 800);
        const base = initLayer('Background');
        const baseCtx = layerMapRef.current.get(base.id).ctx;
        const savedLayers = Array.isArray(p.layers) ? p.layers : [];
        // Composite all saved layers in order onto the single base
        savedLayers.forEach(l => {
          const img = new Image(); img.onload = () => { baseCtx.drawImage(img, 0, 0); }; img.src = l.dataURL;
        });
        setLayers([base]);
        setActiveLayerId(base.id);
        toast({ title: 'Project loaded', status: 'success' });
      }, 0);
    } catch { toast({ title: 'Load failed', status: 'error' }); }
  };

  // Autosave
  useEffect(() => {
    if (!autosave) return;
    const id = setInterval(() => {
      try { saveProject(); } catch {}
    }, Math.max(5, autosaveIntervalSec) * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosave, autosaveIntervalSec]);

  // Paste image from clipboard
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type?.startsWith('image/')) {
          const file = it.getAsFile();
          if (file) importImage(file);
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') { undo(); }
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') || (e.ctrlKey && e.key.toLowerCase() === 'y')) { redo(); }
      const map = { b: Tools.BRUSH, p: Tools.PENCIL, e: Tools.ERASER, l: Tools.LINE, r: Tools.RECT, o: Tools.ELLIPSE, g: Tools.BUCKET, t: Tools.TEXT, i: Tools.EYEDROPPER, v: Tools.SELECT, h: Tools.HAND };
      const t = map[e.key.toLowerCase()]; if (t) { setTool(t); }
      if (e.key === '[') setSize(s => Math.max(1, s - 1));
      if (e.key === ']') setSize(s => Math.min(128, s + 1));
      if (e.key === ' ') { e.preventDefault(); setTool(Tools.HAND); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [redo, undo]);

  // Single-layer mode: activeLayerIndex not needed

  return (
    <Box p={3} maxW='100vw'>
      <HStack align='start' spacing={3}>
        {/* Toolbar */}
        <VStack align='stretch' minW='260px' spacing={3} borderWidth='1px' borderRadius='md' p={3} bg='whiteAlpha.700' _dark={{ bg:'blackAlpha.400' }}>
          <Text fontWeight='bold'>Tools</Text>
          <Select value={tool} onChange={e=>setTool(e.target.value)}>
            <option value={Tools.BRUSH}>Brush (B)</option>
            <option value={Tools.PENCIL}>Pencil (P)</option>
            <option value={Tools.ERASER}>Eraser (E)</option>
            <option value={Tools.LINE}>Line (L)</option>
            <option value={Tools.RECT}>Rectangle (R)</option>
            <option value={Tools.ELLIPSE}>Ellipse (O)</option>
            <option value={Tools.POLY}>Polygon</option>
            <option value={Tools.BUCKET}>Fill/Bucket (G)</option>
            <option value={Tools.TEXT}>Text (T)</option>
            <option value={Tools.EYEDROPPER}>Eyedropper (I)</option>
            <option value={Tools.SELECT}>Select/Move (V)</option>
            <option value={Tools.HAND}>Pan (Space)</option>
          </Select>
          <HStack spacing={1} wrap="wrap">
            {swatches.map((c,i)=>(<Button key={i} size='xs' onClick={()=>setPrimary(c)} bg={c} color={'#000000'} borderWidth='1px'>{' '}</Button>))}
            <Button size='xs' onClick={()=>setSwatches(s=>Array.from(new Set([...s, primary])).slice(0,24))}>+ Add</Button>
          </HStack>
          <HStack>
            <VStack>
              <Text fontSize='sm'>Primary</Text>
              <Input type='color' value={primary} onChange={e=>setPrimary(e.target.value)} w='50px' p={0} />
            </VStack>
            <VStack>
              <Text fontSize='sm'>Secondary</Text>
              <Input type='color' value={secondary} onChange={e=>setSecondary(e.target.value)} w='50px' p={0} />
            </VStack>
          </HStack>
          <Text fontSize='sm'>Size: {size}px</Text>
          <Slider min={1} max={128} value={size} onChange={setSize}><SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb /></Slider>
          <Text fontSize='sm'>Opacity: {Math.round(opacity*100)}%</Text>
          <Slider min={0.05} max={1} step={0.05} value={opacity} onChange={setOpacity}><SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb /></Slider>
          <HStack>
            <Checkbox isChecked={fillShape} onChange={e=>setFillShape(e.target.checked)}>Fill</Checkbox>
            <Checkbox isChecked={strokeShape} onChange={e=>setStrokeShape(e.target.checked)}>Stroke</Checkbox>
            <Checkbox isChecked={useGradient} onChange={e=>setUseGradient(e.target.checked)}>Gradient</Checkbox>
          </HStack>
          <Divider />
          <Text fontWeight='bold'>Grid</Text>
          <HStack>
            <Checkbox isChecked={showGrid} onChange={e=>setShowGrid(e.target.checked)}>Show grid</Checkbox>
            <Checkbox isChecked={snapGrid} onChange={e=>setSnapGrid(e.target.checked)}>Snap</Checkbox>
          </HStack>
          <Text fontSize='sm'>Grid size: {gridSize}px</Text>
          <Slider min={5} max={100} step={1} value={gridSize} onChange={setGridSize}><SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb /></Slider>
          <Input value={font} onChange={e=>setFont(e.target.value)} placeholder='Font (e.g., 24px Arial)' />
          <HStack>
            <Button leftIcon={<RepeatClockIcon />} onClick={undo}>Undo</Button>
            <Button leftIcon={<RepeatIcon />} onClick={redo}>Redo</Button>
          </HStack>
          <Divider />
          <Text fontWeight='bold'>Collaboration</Text>
          <HStack>
            <Input placeholder='Room ID (e.g., team-1)' value={roomId} onChange={e=>setRoomId(e.target.value)} />
          </HStack>
          <HStack>
            <Button onClick={()=>{ if (!socket) return; if (!roomId) return; socket.emit('paint:join', { roomId }); setJoinedRoom(roomId); toast({ title: `Joined ${roomId}`, status: 'success' }); }}>Join</Button>
            <Button variant='outline' onClick={()=>{ if (!socket || !joinedRoom) return; socket.emit('paint:leave', { roomId: joinedRoom }); setJoinedRoom(''); toast({ title: 'Left room', status: 'info' }); }}>Leave</Button>
          </HStack>
          <Divider />
          <Text fontWeight='bold'>Export</Text>
          <HStack>
            <Button leftIcon={<DownloadIcon />} onClick={exportPNG}>PNG</Button>
            <Button onClick={() => exportJPG()}>JPG</Button>
          </HStack>
          <Text fontSize='sm'>JPG quality: {Math.round(exportQuality*100)}</Text>
          <Slider min={10} max={100} step={1} value={Math.round(exportQuality*100)} onChange={(v)=>setExportQuality(v/100)}><SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb /></Slider>
          <HStack>
            <Button onClick={saveProject}>Save</Button>
            <Button onClick={loadProject}>Load</Button>
          </HStack>
          <HStack>
            <IconButton size='sm' aria-label='Zoom out' icon={<MinusIcon />} onClick={()=>setZoom(z=>Math.max(0.1, z/1.1))} />
            <Text w='90px' textAlign='center'>Zoom: {Math.round(zoom*100)}%</Text>
            <IconButton size='sm' aria-label='Zoom in' icon={<AddIcon />} onClick={()=>setZoom(z=>Math.min(8, z*1.1))} />
            <Button size='sm' onClick={resetZoom}>100%</Button>
            <Button size='sm' onClick={fitToScreen}>Fit</Button>
          </HStack>
          <HStack>
            <Checkbox isChecked={autosave} onChange={e=>setAutosave(e.target.checked)}>Autosave</Checkbox>
            <Text fontSize='sm'>Every {autosaveIntervalSec}s</Text>
          </HStack>
          <Slider min={5} max={300} step={5} value={autosaveIntervalSec} onChange={setAutosaveIntervalSec}><SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb /></Slider>
          <Divider />
          <Text fontWeight='bold'>Canvas</Text>
          <HStack>
            <Input type='number' value={resizeW} onChange={e=>setResizeW(e.target.value)} w='110px' />
            <Text>x</Text>
            <Input type='number' value={resizeH} onChange={e=>setResizeH(e.target.value)} w='110px' />
            <Button size='sm' onClick={applyResize}>Resize</Button>
          </HStack>
          <HStack>
            <Button size='sm' onClick={clearCanvas} variant='outline'>Clear</Button>
            <Button size='sm' onClick={fillCanvas}>Fill</Button>
          </HStack>
          <Input type='file' accept='image/*' onChange={e=>{ const f=e.target.files?.[0]; if (f) importImage(f); e.target.value=''; }} />
        </VStack>

        {/* Canvas area */}
  <Box position='relative' flex='1' h='calc(100vh - 100px)' overflow='auto' borderWidth='1px' borderRadius='md' p={3} ref={drawingAreaRef}
       onDragOver={(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect='copy'; }}
       onDrop={(e)=>{ e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) importImage(f); }}>
          <Box position='relative' ref={containerRef}
               onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onWheel={onWheel}
               onContextMenu={(e)=>e.preventDefault()} />
          <canvas ref={gridRef} style={{ position:'absolute', left:0, top:0, pointerEvents:'none' }} />
          <canvas ref={presenceRef} style={{ position:'absolute', left:0, top:0, pointerEvents:'none' }} />
          <canvas ref={overlayRef} style={{ position:'absolute', left:0, top:0, pointerEvents:'none' }} />
          <canvas ref={compositeRef} style={{ display:'none' }} />
        </Box>

  {/* Single-layer mode: layers panel removed */}
      </HStack>
    </Box>
  );
}
