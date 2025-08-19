import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Grid, GridItem, HStack, Input, Text, VStack, useToast, Avatar, Wrap, WrapItem } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';

// 2048 implementation
const SIZE = 4;

function useBoard2048() {
  const empty = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const [board, setBoard] = useState(empty());
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  const spawn = (b) => {
    const empties = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!b[r][c]) empties.push([r, c]);
    if (empties.length === 0) return b;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    b[r][c] = Math.random() < 0.9 ? 2 : 4;
    return b;
  };

  const canMove = (b) => {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!b[r][c]) return true;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (r + 1 < SIZE && b[r][c] === b[r + 1][c]) return true;
      if (c + 1 < SIZE && b[r][c] === b[r][c + 1]) return true;
    }
    return false;
  };

  const start = () => {
    const b = empty();
    spawn(b); spawn(b);
    setBoard(b);
    setScore(0);
    setOver(false);
  };

  const compressLine = (line) => {
    const nums = line.filter((x) => x);
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i] === nums[i + 1]) {
        nums[i] *= 2;
        setScore((s) => s + nums[i]);
        nums.splice(i + 1, 1);
      }
    }
    while (nums.length < SIZE) nums.push(0);
    return nums;
  };

  const transpose = (m) => m[0].map((_, i) => m.map((row) => row[i]));
  const reverseRows = (m) => m.map((row) => row.slice().reverse());

  const move = (dir) => {
    if (over) return;
    let work = board.map((row) => row.slice());

    if (dir === 'up') {
      work = transpose(work);
    } else if (dir === 'down') {
      work = reverseRows(transpose(work));
    } else if (dir === 'right') {
      work = reverseRows(work);
    }

    const after = work.map((row) => compressLine(row));
    const moved = JSON.stringify(after) !== JSON.stringify(work);

    let restored = after;
    if (dir === 'up') {
      restored = transpose(restored);
    } else if (dir === 'down') {
      restored = transpose(reverseRows(restored));
    } else if (dir === 'right') {
      restored = reverseRows(restored);
    }

    if (moved) spawn(restored);
    setBoard(restored);
    if (!canMove(restored)) setOver(true);
  };

  return { board, score, over, start, move };
}

const tileBg = (v) => {
  const colors = {
    0: 'gray.700', 2: 'purple.100', 4: 'purple.200', 8: 'purple.300', 16: 'purple.400', 32: 'purple.500', 64: 'purple.600',
    128: 'orange.400', 256: 'orange.500', 512: 'orange.600', 1024: 'pink.500', 2048: 'green.500',
  };
  return colors[v] || 'teal.600';
};

// Snake implementation
function useSnakeGame() {
  const COLS = 20;
  const ROWS = 20;
  const CELL = 16; // px
  const [snake, setSnake] = useState([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(120); // ms per step

  const placeFood = (body) => {
    const setTo = new Set(body.map((b) => `${b.x},${b.y}`));
    let x, y;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (setTo.has(`${x},${y}`));
    setFood({ x, y });
  };

  const start = () => {
    const initial = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    setSnake(initial);
    setDir({ x: 1, y: 0 });
    nextDirRef.current = { x: 1, y: 0 };
    setScore(0);
    setOver(false);
    setRunning(true);
    placeFood(initial);
    setSpeed(120);
  };

  const pause = () => setRunning(false);
  const resume = () => { if (!over) setRunning(true); };

  const setDirection = (nx, ny) => {
    // prevent reversing
    if (nx === -dir.x && ny === -dir.y) return;
    nextDirRef.current = { x: nx, y: ny };
  };

  const step = () => {
    // apply queued dir once per tick
    if (nextDirRef.current) setDir(nextDirRef.current);
    const head = snake[0];
    const nx = head.x + nextDirRef.current.x;
    const ny = head.y + nextDirRef.current.y;
    // collisions
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { setOver(true); setRunning(false); return; }
    if (snake.some((s) => s.x === nx && s.y === ny)) { setOver(true); setRunning(false); return; }

    const newHead = { x: nx, y: ny };
    const newSnake = [newHead, ...snake];
    if (nx === food.x && ny === food.y) {
      setScore((s) => s + 1);
      placeFood(newSnake);
      // speed up every 5
      setSpeed((sp) => (sp > 60 && (((score + 1) % 5) === 0) ? sp - 8 : sp));
    } else {
      newSnake.pop();
    }
    setSnake(newSnake);
  };

  useEffect(() => {
    if (!running || over) return;
    const id = setInterval(step, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, over, speed, snake]);

  return { COLS, ROWS, CELL, snake, food, score, over, start, pause, resume, running, setDirection };
}

// Flappy Bird implementation
function useFlappyGame() {
  const W = 320;
  const H = 480;
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const birdX = 60;
  const [birdY, setBirdY] = useState(H / 2);
  const velRef = useRef(0);
  const gravity = 0.5;
  const lift = -8.5;
  const pipeGap = 120;
  const pipeW = 48;
  const speed = 2;
  const [pipes, setPipes] = useState([]); // {x, topH, scored}
  const rafRef = useRef(0);

  const newPipe = (x) => ({ x, topH: 50 + Math.floor(Math.random() * (H - 200)), scored: false });

  const start = () => {
    setScore(0);
    setOver(false);
    setRunning(true);
    setBirdY(H / 2);
    velRef.current = 0;
    const init = [newPipe(W + 60), newPipe(W + 60 + 160), newPipe(W + 60 + 320)];
    setPipes(init);
  };
  const pause = () => setRunning(false);
  const resume = () => { if (!over) setRunning(true); };
  const flap = () => { if (!running || over) return; velRef.current = lift; };

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current; if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      // physics
      if (running && !over) {
        velRef.current += gravity;
        setBirdY((y) => y + velRef.current);
        setPipes((ps) => ps.map((p) => ({ ...p, x: p.x - speed })).filter((p) => p.x + pipeW > -10));
        // add new pipe when last is beyond spacing
        setPipes((ps) => {
          if (ps.length === 0) return [newPipe(W + 60)];
          const last = ps[ps.length - 1];
          if (last.x < W - 160) return [...ps, newPipe(last.x + 160)];
          return ps;
        });
        // scoring and collisions
        setPipes((ps) => ps.map((p) => {
          if (!p.scored && p.x + pipeW < birdX) { setScore((s) => s + 1); return { ...p, scored: true }; }
          return p;
        }));
        const topCollide = pipes.some((p) => birdX > p.x && birdX < p.x + pipeW && birdY < p.topH);
        const botCollide = pipes.some((p) => birdX > p.x && birdX < p.x + pipeW && birdY > p.topH + pipeGap);
        if (birdY <= 0 || birdY >= H || topCollide || botCollide) { setOver(true); setRunning(false); }
      }
      // draw
      ctx.fillStyle = '#1a202c'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#718096'; ctx.font = '16px sans-serif'; ctx.fillText(`Score: ${score}`, 8, 20);
      // pipes
      ctx.fillStyle = '#63b3ed';
      pipes.forEach((p) => {
        ctx.fillRect(p.x, 0, pipeW, p.topH);
        ctx.fillRect(p.x, p.topH + pipeGap, pipeW, H - (p.topH + pipeGap));
      });
      // bird
      ctx.fillStyle = '#f6ad55';
      ctx.beginPath(); ctx.arc(birdX, birdY, 10, 0, Math.PI * 2); ctx.fill();

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, over, pipes, score, birdY]);

  return { canvasRef, W, H, score, running, over, start, pause, resume, flap };
}

// Pong (solo) implementation
function usePongGame() {
  const W = 480, H = 300;
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const paddleW = 80, paddleH = 10;
  const [paddleX, setPaddleX] = useState((W - paddleW) / 2);
  const ballRef = useRef({ x: W / 2, y: H / 2, vx: 3, vy: -3, r: 6 });
  const rafRef = useRef(0);

  const start = () => {
    setRunning(true); setOver(false); setScore(0);
    setPaddleX((W - paddleW) / 2);
    ballRef.current = { x: W / 2, y: H / 2, vx: 3, vy: -3, r: 6 };
  };
  const pause = () => setRunning(false);
  const resume = () => { if (!over) setRunning(true); };
  const nudge = (dir) => setPaddleX((x) => Math.max(0, Math.min(W - paddleW, x + dir * 18)));
  const handleMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; setPaddleX(Math.max(0, Math.min(W - paddleW, x - paddleW / 2)));
  };
  const handleTouch = (e) => {
    if (!e.touches[0]) return; const rect = e.currentTarget.getBoundingClientRect(); const x = e.touches[0].clientX - rect.left; setPaddleX(Math.max(0, Math.min(W - paddleW, x - paddleW / 2)));
  };

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current; if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (running && !over) {
        const b = ballRef.current;
        b.x += b.vx; b.y += b.vy;
        if (b.x < b.r || b.x > W - b.r) b.vx *= -1;
        if (b.y < b.r) { b.vy *= -1; setScore((s) => s + 1); }
        // paddle collision
        if (b.y + b.r >= H - paddleH - 4) {
          if (b.x >= paddleX && b.x <= paddleX + paddleW) {
            b.vy = -Math.abs(b.vy);
            const hitPos = (b.x - (paddleX + paddleW / 2)) / (paddleW / 2);
            b.vx = Math.max(-4.5, Math.min(4.5, b.vx + hitPos * 2));
          } else if (b.y > H + 10) {
            setOver(true); setRunning(false);
          }
        }
      }
      // draw
      ctx.fillStyle = '#1a202c'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#718096'; ctx.font = '16px sans-serif'; ctx.fillText(`Score: ${score}`, 8, 20);
      // paddle
      ctx.fillStyle = '#90cdf4'; ctx.fillRect(paddleX, H - paddleH - 4, paddleW, paddleH);
      // ball
      ctx.fillStyle = '#f6ad55'; ctx.beginPath(); ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.r, 0, Math.PI * 2); ctx.fill();

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, over, paddleX, score]);

  return { canvasRef, W, H, score, running, over, start, pause, resume, nudge, handleMouse, handleTouch };
}

export default function Games() {
  const { hostName } = React.useContext(chatContext);
  const toast = useToast();
  const { board, score: score2048, over: over2048, start: start2048, move: move2048 } = useBoard2048();
  const snakeGame = useSnakeGame();
  const flappy = useFlappyGame();
  const pong = usePongGame();
  const [mode, setMode] = useState('2048'); // '2048' | 'snake' | 'flappy' | 'pong'
  const [top, setTop] = useState([]);
  const [myBest, setMyBest] = useState(0);
  const [nameFilter, setNameFilter] = useState('');

  const loadScores = async () => {
    try {
      const t = await (await fetch(`${hostName}/games/top/${mode}?limit=20`)).json();
      setTop(Array.isArray(t) ? t : []);
      const mine = await (await fetch(`${hostName}/games/best/${mode}`, { headers: { 'auth-token': localStorage.getItem('token') } })).json();
      setMyBest(mine?.score || 0);
    } catch {}
  };

  useEffect(() => { start2048(); loadScores(); // eslint-disable-next-line
  }, []);

  // Keyboard controls based on mode
  useEffect(() => {
    const handler = (e) => {
      const k = e.key.toLowerCase();
      if (mode === '2048') {
        if (["arrowup","w"].includes(k)) move2048('up');
        if (["arrowdown","s"].includes(k)) move2048('down');
        if (["arrowleft","a"].includes(k)) move2048('left');
        if (["arrowright","d"].includes(k)) move2048('right');
      } else if (mode === 'snake') {
        if (["arrowup","w"].includes(k)) snakeGame.setDirection(0, -1);
        if (["arrowdown","s"].includes(k)) snakeGame.setDirection(0, 1);
        if (["arrowleft","a"].includes(k)) snakeGame.setDirection(-1, 0);
        if (["arrowright","d"].includes(k)) snakeGame.setDirection(1, 0);
      } else if (mode === 'flappy') {
        if (k === ' ' || k === 'arrowup' || k === 'w') flappy.flap();
      } else if (mode === 'pong') {
        if (["arrowleft","a"].includes(k)) pong.nudge(-1);
        if (["arrowright","d"].includes(k)) pong.nudge(1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, move2048, snakeGame, flappy, pong]);

  const submitScore = async () => {
    try {
      await fetch(`${hostName}/games/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ game: mode, score: mode === '2048' ? score2048 : snakeGame.score })
      });
      toast({ title: 'Score submitted', status: 'success', duration: 1000 });
      loadScores();
    } catch (e) { toast({ title: 'Submit failed', status: 'error' }); }
  };

  const swipeHandlers = useMemo(() => {
    let sx = 0, sy = 0;
    return {
      onTouchStart: (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; },
      onTouchEnd: (e) => {
        const t = e.changedTouches[0]; const dx = t.clientX - sx; const dy = t.clientY - sy;
        if (mode === 'flappy') { flappy.flap(); return; }
        if (mode === 'pong') { /* touch handled on canvas move */ return; }
        if (Math.abs(dx) > Math.abs(dy)) {
          if (mode === '2048') move2048(dx > 0 ? 'right' : 'left'); else snakeGame.setDirection(dx > 0 ? 1 : -1, 0);
        } else {
          if (mode === '2048') move2048(dy > 0 ? 'down' : 'up'); else snakeGame.setDirection(0, dy > 0 ? 1 : -1);
        }
      }
    };
  }, [mode, move2048, snakeGame, flappy]);

  // Snake canvas rendering
  const canvasRef = useRef(null);
  useEffect(() => {
    if (mode !== 'snake') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const COLS = snakeGame.COLS; const ROWS = snakeGame.ROWS; const CELL = snakeGame.CELL;
    const draw = () => {
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke(); }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke(); }
      ctx.fillStyle = '#f56565';
      ctx.fillRect(snakeGame.food.x * CELL + 2, snakeGame.food.y * CELL + 2, CELL - 4, CELL - 4);
      snakeGame.snake.forEach((seg, idx) => {
        ctx.fillStyle = idx === 0 ? '#68d391' : '#9ae6b4';
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      });
    };
    draw();
  }, [mode, snakeGame, snakeGame.snake, snakeGame.food]);

  return (
    <Box w="100%" overflow="hidden">
      <HStack justify="space-between" mb={2} flexWrap="wrap" rowGap={2} columnGap={3}>
  <Wrap spacing={2}>
          <WrapItem>
            <Button size="sm" variant={mode === '2048' ? 'solid' : 'ghost'} onClick={() => { setMode('2048'); loadScores(); }}>2048</Button>
          </WrapItem>
          <WrapItem>
            <Button size="sm" variant={mode === 'snake' ? 'solid' : 'ghost'} onClick={() => { setMode('snake'); loadScores(); }}>Snake</Button>
          </WrapItem>
          <WrapItem>
            <Button size="sm" variant={mode === 'flappy' ? 'solid' : 'ghost'} onClick={() => { setMode('flappy'); loadScores(); flappy.start(); }}>Flappy</Button>
          </WrapItem>
          <WrapItem>
            <Button size="sm" variant={mode === 'pong' ? 'solid' : 'ghost'} onClick={() => { setMode('pong'); loadScores(); pong.start(); }}>Pong</Button>
          </WrapItem>
        </Wrap>
        <HStack flexWrap="wrap" rowGap={2} columnGap={2}>
          <Text>Score: {mode === '2048' ? score2048 : mode==='snake' ? snakeGame.score : mode==='flappy' ? flappy.score : pong.score}</Text>
          <Text>Best: {myBest}</Text>
          {mode === '2048' ? (
            <Button size="sm" onClick={start2048}>New</Button>
          ) : mode==='snake' ? (
            <>
              {snakeGame.running ? <Button size="sm" onClick={snakeGame.pause}>Pause</Button> : <Button size="sm" onClick={snakeGame.resume}>Resume</Button>}
              <Button size="sm" onClick={snakeGame.start}>New</Button>
            </>
          ) : mode==='flappy' ? (
            <>
              {flappy.running ? <Button size="sm" onClick={flappy.pause}>Pause</Button> : <Button size="sm" onClick={flappy.resume}>Resume</Button>}
              <Button size="sm" onClick={flappy.start}>New</Button>
            </>
          ) : (
            <>
              {pong.running ? <Button size="sm" onClick={pong.pause}>Pause</Button> : <Button size="sm" onClick={pong.resume}>Resume</Button>}
              <Button size="sm" onClick={pong.start}>New</Button>
            </>
          )}
          <Button size="sm" onClick={submitScore}>Submit</Button>
        </HStack>
      </HStack>

      {mode === '2048' ? (
        <>
          <Grid templateColumns={`repeat(${SIZE}, 72px)`} gap={2} p={3} bg="blackAlpha.400" borderRadius="lg" w="max-content" maxW="100%" overflowX="auto" {...swipeHandlers}>
            {board.map((row, r) => row.map((v, c) => (
              <GridItem key={`${r}-${c}`} w="72px" h="72px" bg={tileBg(v)} color={v <= 4 ? 'black' : 'white'} fontWeight="bold" display="flex" alignItems="center" justifyContent="center" borderRadius="md" boxShadow="md">{v || ''}</GridItem>
            )))}
          </Grid>
          {over2048 && <Text mt={2} color="red.300">Game Over. Try New.</Text>}
        </>
      ) : mode==='snake' ? (
        <>
          <Box p={3} bg="blackAlpha.400" borderRadius="lg" w="max-content" maxW="100%" overflowX="auto" {...swipeHandlers}>
            <canvas ref={canvasRef} width={snakeGame.COLS * snakeGame.CELL} height={snakeGame.ROWS * snakeGame.CELL} style={{ borderRadius: 8 }} />
          </Box>
          {snakeGame.over && <Text mt={2} color="red.300">Game Over. Start a new run.</Text>}
        </>
      ) : mode==='flappy' ? (
        <>
          <Box p={3} bg="blackAlpha.400" borderRadius="lg" w="max-content" maxW="100%" overflowX="auto" onClick={flappy.flap}>
            <canvas ref={flappy.canvasRef} width={flappy.W} height={flappy.H} style={{ borderRadius: 8 }} />
          </Box>
          {flappy.over && <Text mt={2} color="red.300">Game Over. Tap New to try again.</Text>}
        </>
      ) : (
        <>
          <Box p={3} bg="blackAlpha.400" borderRadius="lg" w="max-content" maxW="100%" overflowX="auto">
            <canvas
              ref={pong.canvasRef}
              width={pong.W}
              height={pong.H}
              style={{ borderRadius: 8 }}
              onMouseMove={(e) => pong.handleMouse(e)}
              onTouchMove={(e) => pong.handleTouch(e)}
            />
          </Box>
          {pong.over && <Text mt={2} color="red.300">Game Over. Tap New to try again.</Text>}
        </>
      )}

      <VStack align="stretch" mt={4} spacing={2}>
        <HStack justify="space-between">
          <Text fontSize="md" fontWeight="bold">Top Scores</Text>
          <Input placeholder="Filter by name" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} size="sm" w="200px" />
        </HStack>
        {top.filter((s) => (s.user?.name || '').toLowerCase().includes(nameFilter.toLowerCase())).map((s, i) => (
          <HStack key={s._id || i} justify="space-between" p={2} bg="whiteAlpha.100" borderRadius="md">
            <HStack>
              <Avatar size="sm" src={s.user?.profilePic} name={s.user?.name} />
              <Text>{s.user?.name || 'Anon'}</Text>
            </HStack>
            <Text fontWeight="bold">{s.score}</Text>
          </HStack>
        ))}
        {top.length === 0 && <Text>No scores yet. Be the first!</Text>}
      </VStack>
    </Box>
  );
}
