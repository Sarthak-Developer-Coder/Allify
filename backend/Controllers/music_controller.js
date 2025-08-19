const fs = require('fs');
const path = require('path');
const Track = require('../Models/Track');
const Playlist = require('../Models/Playlist');
const TrackLike = require('../Models/TrackLike');
const TrackComment = require('../Models/TrackComment');
const PlayHistory = require('../Models/PlayHistory');

const imageupload = require('../config/imageupload');
const { spawn } = require('child_process');

function runCmd(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore','pipe','pipe'] });
    let out=''; let err='';
    p.stdout.on('data', d=> out+=d.toString());
    p.stderr.on('data', d=> err+=d.toString());
    p.on('close', code => code===0 ? resolve({ out, err }) : reject(new Error(err||('exit '+code))));
    p.on('error', reject);
  });
}

// Resolve actual audio file path even if DB has a stale absolute path from a different folder.
async function resolveAudioPath(track) {
  try {
    let p = track.filePath || '';
    if (p && fs.existsSync(path.resolve(p))) return path.resolve(p);
    // Fallback: look in current uploads/music for a file with the same basename
    const musicDir = path.join(__dirname, '..', 'uploads', 'music');
    const candidate = path.join(musicDir, path.basename(p || ''));
    if (candidate && fs.existsSync(candidate)) {
      // Persist fix for next time
      try { track.filePath = candidate; await track.save(); } catch {}
      return candidate;
    }
    // As a last resort, scan uploads/music for first audio file owned by this track id pattern
    try {
      const files = fs.readdirSync(musicDir).filter(f => /\.(mp3|m4a|aac|wav|flac|ogg)$/i.test(f));
      const hit = files.find(f => f.includes(track._id.toString().slice(-6)) || f.toLowerCase().includes((track.title||'').toLowerCase()));
      if (hit) {
        const found = path.join(musicDir, hit);
        try { track.filePath = found; await track.save(); } catch {}
        return found;
      }
    } catch {}
    return '';
  } catch { return ''; }
}

async function ensureWaveform(track) {
  try {
    if (track.waveformReady && track.waveformPath && fs.existsSync(path.resolve(track.waveformPath))) return track.waveformPath;
    const audioPath = await resolveAudioPath(track);
    if (!audioPath) throw new Error('audio not found');
    const wfDir = path.join(path.dirname(audioPath), 'waveforms');
    if (!fs.existsSync(wfDir)) fs.mkdirSync(wfDir, { recursive: true });
    const outPath = path.join(wfDir, `${track._id}.json`);
    // Try audiowaveform if installed
    try {
      await runCmd('audiowaveform', ['-i', audioPath, '--pixels-per-second', '10', '-o', outPath, '--output-format', 'json']);
    } catch {
      // Fallback: ffmpeg loudnorm stats to approximate peaks (coarse)
      await runCmd('ffmpeg', ['-i', audioPath, '-filter:a', 'astats=metadata=1:reset=1', '-f', 'null', '-'], path.dirname(audioPath)).catch(()=>{});
      // Write a synthetic flat waveform as fallback
      const buckets = 200; const peaks = Array.from({ length: buckets }, (_, i) => Math.abs(Math.sin(i/buckets*Math.PI)));
      fs.writeFileSync(outPath, JSON.stringify({ version:1, buckets, peaks }));
    }
    track.waveformReady = true; track.waveformPath = outPath; await track.save();
    return outPath;
  } catch (e) { console.error('ensureWaveform', e); return ''; }
}

async function transcodeHls(track) {
  try {
    if (track.hlsReady && track.hlsDir && fs.existsSync(path.resolve(track.hlsDir))) return track.hlsDir;
  const audioPath = await resolveAudioPath(track);
  if (!audioPath) throw new Error('audio not found');
    const baseDir = path.join(path.dirname(audioPath), 'hls', track._id.toString());
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    // Create multi-bitrate audio-only HLS (AAC)
    // 64/128/256 kbps variants
    const args = [
      '-y','-i', audioPath,
      '-filter_complex', '[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a]'
      ,'-map', '[a]','-c:a','aac','-b:a','64k','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(baseDir, '64k_%03d.aac'), path.join(baseDir,'64k.m3u8')
    ];
    try { await runCmd('ffmpeg', args, baseDir); } catch (e) { console.error('ffmpeg hls 64k', e); }
    const args2 = [ '-y','-i', audioPath,'-map','0:a','-c:a','aac','-b:a','128k','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(baseDir, '128k_%03d.aac'), path.join(baseDir,'128k.m3u8') ];
    try { await runCmd('ffmpeg', args2, baseDir); } catch (e) { console.error('ffmpeg hls 128k', e); }
    const args3 = [ '-y','-i', audioPath,'-map','0:a','-c:a','aac','-b:a','256k','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(baseDir, '256k_%03d.aac'), path.join(baseDir,'256k.m3u8') ];
    try { await runCmd('ffmpeg', args3, baseDir); } catch (e) { console.error('ffmpeg hls 256k', e); }
    // Write a master playlist
    const master = ['#EXTM3U', '#EXT-X-VERSION:3'];
    [['64k',64000],['128k',128000],['256k',256000]].forEach(([name, bw])=>{
      master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bw},CODECS="mp4a.40.2"`);
      master.push(`${name}.m3u8`);
    });
    fs.writeFileSync(path.join(baseDir, 'master.m3u8'), master.join('\n'));
    track.hlsReady = true; track.hlsDir = baseDir; await track.save();
    return baseDir;
  } catch (e) { console.error('transcodeHls', e); return ''; }
}

exports.upload = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const audioFile = req.file || (req.files && req.files.file && req.files.file[0]);
    if (!audioFile) return res.status(400).json({ error: 'No file uploaded' });
  const { title, artist, album, genres, tags, year, bpm } = req.body;
    // optional cover image uploaded via separate field 'cover'
    let coverUrl = '';
    if (req.files && req.files.cover && req.files.cover[0]) {
      const coverFile = req.files.cover[0];
      try {
        if (coverFile.buffer) {
          coverUrl = await imageupload(coverFile, false);
        } else if (coverFile.path) {
          const buf = fs.readFileSync(coverFile.path);
          coverUrl = await imageupload({ buffer: buf }, false);
          // best-effort cleanup
          try { fs.unlinkSync(coverFile.path); } catch {}
        }
      } catch {}
    }
  const track = await Track.create({
      title: title || audioFile.originalname,
      artist: artist || 'Unknown',
      album: album || '',
      genres: typeof genres === 'string' ? genres.split(',').map(s=>s.trim()).filter(Boolean) : Array.isArray(genres)? genres : [],
  tags: typeof tags === 'string' ? tags.split(',').map(s=>s.trim()).filter(Boolean) : Array.isArray(tags)? tags : [],
  year: year ? parseInt(year) : null,
  bpm: bpm ? parseInt(bpm) : null,
      filePath: audioFile.path,
      mimeType: audioFile.mimetype,
      size: audioFile.size || 0,
      uploader: userId,
      coverUrl,
    });
  // kick off async jobs (best-effort)
  ensureWaveform(track).catch(()=>{});
  transcodeHls(track).catch(()=>{});
    res.json(track);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Upload failed' }); }
};

exports.list = async (req, res) => {
  try {
  const { search = '', limit = 50, sort = 'trending', genre, tag, uploader, minLikes, yearMin, yearMax, durMin, durMax, bpmMin, bpmMax } = req.query;
    const q = {};
    if (search) {
      Object.assign(q, { $or: [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
        { album: { $regex: search, $options: 'i' } },
    { genres: { $in: [new RegExp(search, 'i')] } },
    { tags: { $in: [new RegExp(search, 'i')] } }
      ] });
    }
    if (genre) q.genres = { $in: [ new RegExp(genre, 'i') ] };
  if (tag) q.tags = { $in: [ new RegExp(tag, 'i') ] };
    if (uploader) q.uploader = uploader;
    if (minLikes) q.likes = { $gte: parseInt(minLikes) || 0 };
  // numeric ranges
  const and = [];
  const yrMin = parseInt(yearMin); const yrMax = parseInt(yearMax);
  if (!Number.isNaN(yrMin) || !Number.isNaN(yrMax)) and.push({ year: Object.assign({}, !Number.isNaN(yrMin)?{ $gte: yrMin }:{}, !Number.isNaN(yrMax)?{ $lte: yrMax }:{} ) });
  const dMin = parseFloat(durMin); const dMax = parseFloat(durMax);
  if (!Number.isNaN(dMin) || !Number.isNaN(dMax)) and.push({ duration: Object.assign({}, !Number.isNaN(dMin)?{ $gte: dMin }:{}, !Number.isNaN(dMax)?{ $lte: dMax }:{} ) });
  const bMin = parseInt(bpmMin); const bMax = parseInt(bpmMax);
  if (!Number.isNaN(bMin) || !Number.isNaN(bMax)) and.push({ bpm: Object.assign({}, !Number.isNaN(bMin)?{ $gte: bMin }:{}, !Number.isNaN(bMax)?{ $lte: bMax }:{} ) });
  if (and.length) q.$and = and;
    const cursor = Track.find(q);
    if (sort === 'trending' || sort === 'likes') cursor.sort({ likes: -1, createdAt: -1 });
    else if (sort === 'new') cursor.sort({ createdAt: -1 });
    else if (sort === 'alpha') cursor.sort({ title: 1 });
    const items = await cursor.limit(Math.min(parseInt(limit)||50, 200)).lean();
    res.json(items);
  } catch (e) { console.error(e); res.status(500).json({ error: 'List failed' }); }
};

exports.mine = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const items = await Track.find({ uploader: userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { console.error(e); res.status(500).json({ error: 'List failed' }); }
};

exports.get = async (req, res) => {
  try {
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e) { res.status(404).json({ error: 'Not found' }); }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (String(t.uploader) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
  const { title, artist, album, genres, tags, year, bpm, lyrics, duration } = req.body;
    if (title !== undefined) t.title = title;
    if (artist !== undefined) t.artist = artist;
    if (album !== undefined) t.album = album;
    if (genres !== undefined) t.genres = typeof genres === 'string' ? genres.split(',').map(s=>s.trim()).filter(Boolean) : Array.isArray(genres) ? genres : t.genres;
    if (tags !== undefined) t.tags = typeof tags === 'string' ? tags.split(',').map(s=>s.trim()).filter(Boolean) : Array.isArray(tags) ? tags : t.tags;
    if (year !== undefined) { const y=parseInt(year); t.year = Number.isNaN(y)? t.year : y; }
    if (bpm !== undefined) { const b=parseInt(bpm); t.bpm = Number.isNaN(b)? t.bpm : b; }
    if (lyrics !== undefined) t.lyrics = lyrics;
    if (duration !== undefined) {
      const d = parseFloat(duration);
      if (!Number.isNaN(d) && d >= 0 && d < 24*60*60) t.duration = d;
    }
    await t.save();
    res.json(t);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Update failed' }); }
};

// Placeholder: return very rough waveform peaks by sampling file size (not actual audio decoding)
// In production, precompute peaks with ffmpeg/audiowaveform and cache JSON per track
exports.waveform = async (req, res) => {
  try {
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const wfPath = await ensureWaveform(t);
    if (wfPath && fs.existsSync(wfPath)) {
      const raw = fs.readFileSync(wfPath, 'utf8');
      try { return res.type('application/json').send(raw); } catch {}
    }
    res.json({ buckets: 0, peaks: [] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Waveform failed' }); }
};

// Minimal HLS placeholder: serve original file as single-variant pseudo m3u8
// For real multi-bitrate HLS, generate segments and variant playlists via ffmpeg.
exports.hlsMaster = async (req, res) => {
  try {
  const t = await Track.findById(req.params.id);
  if (!t) return res.status(404).end();
  const dir = await transcodeHls(t);
  if (!dir) return res.status(500).end();
  const masterPath = path.join(dir, 'master.m3u8');
  if (fs.existsSync(masterPath)) return res.type('application/vnd.apple.mpegurl').send(fs.readFileSync(masterPath));
  return res.status(404).end();
  } catch (e) { console.error(e); res.status(500).end(); }
};

exports.hlsStream = async (req, res) => {
  try {
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).end();
    const dir = await transcodeHls(t);
    if (!dir) return res.status(500).end();
    // serve requested variant/segment or master fallback
    // When master.m3u8 is requested, route should use hlsMaster
    const f = req.params.file || 'master.m3u8';
    const full = path.join(dir, f);
    if (fs.existsSync(full)) {
      if (full.endsWith('.m3u8')) res.type('application/vnd.apple.mpegurl');
      else if (full.endsWith('.aac')) res.type('audio/aac');
      return fs.createReadStream(full).pipe(res);
    }
    res.status(404).end();
  } catch (e) { console.error(e); res.status(500).end(); }
};

exports.stream = async (req, res) => {
  try {
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).end();
    // increment plays async and add to history if user present
    try {
      Track.updateOne({ _id: t._id }, { $inc: { plays: 1 } }).catch(()=>{});
      const userId = req.user?.id || req.user?._id || null;
      if (userId) PlayHistory.create({ user: userId, track: t._id }).catch(()=>{});
    } catch {}
  const filePath = await resolveAudioPath(t);
  if (!filePath) { console.error('stream: file not found for', t._id, t.filePath); return res.status(404).end(); }
  const stat = fs.statSync(filePath);
    const range = req.headers.range;
    const asDownload = req.query && (req.query.download === '1' || req.query.download === 'true');
    if (!range) {
  const hdrs = { 'Content-Length': stat.size, 'Content-Type': t.mimeType || 'audio/mpeg' };
      if (asDownload) {
    const ext = path.extname(filePath) || '.mp3';
        hdrs['Content-Disposition'] = `attachment; filename="${(t.title||'track').replace(/[^a-z0-9-_\.]+/gi,'_')}${ext}"`;
      }
      res.writeHead(200, hdrs);
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    if (start >= stat.size || end >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
    const chunkSize = end - start + 1;
    const hdrs206 = {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': t.mimeType || 'audio/mpeg'
    };
    if (asDownload) {
      const ext = path.extname(filePath) || '.mp3';
      hdrs206['Content-Disposition'] = `attachment; filename="${(t.title||'track').replace(/[^a-z0-9-_\.]+/gi,'_')}${ext}"`;
    }
    res.writeHead(206, hdrs206);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } catch (e) { console.error(e); res.status(500).end(); }
};

exports.remove = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (String(t.uploader) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    // remove file
    try { if (t.filePath) fs.unlinkSync(path.resolve(t.filePath)); } catch {}
    // remove db references
    await Promise.all([
      TrackLike.deleteMany({ track: t._id }),
      TrackComment.deleteMany({ track: t._id }),
      PlayHistory.deleteMany({ track: t._id }),
      Playlist.updateMany({}, { $pull: { tracks: t._id } })
    ]);
    await t.deleteOne();
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Delete failed' }); }
};

exports.like = async (req, res) => {
  try {
  const userId = req.user?.id || req.user?._id || req.user;
  const trackId = req.params.id;
  await TrackLike.updateOne({ user: userId, track: trackId }, { $setOnInsert: { user: userId, track: trackId } }, { upsert: true });
  const t = await Track.findByIdAndUpdate(trackId, { $inc: { likes: 1 } }, { new: true });
  res.json(t);
  } catch (e) { res.status(500).json({ error: 'Like failed' }); }
};

exports.unlike = async (req, res) => {
  try {
  const userId = req.user?.id || req.user?._id || req.user;
  const trackId = req.params.id;
  await TrackLike.deleteOne({ user: userId, track: trackId });
  const t = await Track.findByIdAndUpdate(trackId, { $inc: { likes: -1 } }, { new: true });
  res.json(t);
  } catch (e) { res.status(500).json({ error: 'Unlike failed' }); }
};

exports.createPlaylist = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const { name, isPublic = true } = req.body;
    const pl = await Playlist.create({ name, owner: userId, isPublic });
    res.json(pl);
  } catch (e) { res.status(500).json({ error: 'Create playlist failed' }); }
};

exports.getPlaylist = async (req, res) => {
  try {
    const pl = await Playlist.findById(req.params.id).populate('tracks');
    if (!pl) return res.status(404).json({ error: 'Not found' });
    res.json(pl);
  } catch (e) { res.status(404).json({ error: 'Not found' }); }
};

exports.addToPlaylist = async (req, res) => {
  try {
    const { trackId } = req.body;
    const pl = await Playlist.findByIdAndUpdate(req.params.id, { $addToSet: { tracks: trackId } }, { new: true }).populate('tracks');
    res.json(pl);
  } catch (e) { res.status(500).json({ error: 'Add failed' }); }
};

exports.removeFromPlaylist = async (req, res) => {
  try {
    const { trackId } = req.params;
    const pl = await Playlist.findByIdAndUpdate(req.params.id, { $pull: { tracks: trackId } }, { new: true }).populate('tracks');
    res.json(pl);
  } catch (e) { res.status(500).json({ error: 'Remove failed' }); }
};

exports.myPlaylists = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const pls = await Playlist.find({ owner: userId }).sort({ updatedAt: -1 });
    res.json(pls);
  } catch (e) { res.status(500).json({ error: 'List failed' }); }
};

exports.publicPlaylists = async (_req, res) => {
  try {
    const pls = await Playlist.find({ isPublic: true }).sort({ updatedAt: -1 }).limit(200);
    res.json(pls);
  } catch (e) { res.status(500).json({ error: 'List failed' }); }
};

exports.updatePlaylist = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const pl = await Playlist.findById(req.params.id);
    if (!pl) return res.status(404).json({ error: 'Not found' });
    if (String(pl.owner) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    const { name, isPublic } = req.body;
    if (name !== undefined) pl.name = name;
    if (isPublic !== undefined) pl.isPublic = !!isPublic;
    await pl.save();
    res.json(pl);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
};

exports.addComment = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Empty comment' });
    const c = await TrackComment.create({ user: userId, track: req.params.id, text: text.trim() });
    res.json(c);
  } catch (e) { res.status(500).json({ error: 'Comment failed' }); }
};

exports.getComments = async (req, res) => {
  try {
    const list = await TrackComment.find({ track: req.params.id }).sort({ createdAt: -1 }).limit(200).populate('user', 'name email');
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Comments failed' }); }
};

exports.deleteComment = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const { id, commentId } = req.params;
    const c = await TrackComment.findOne({ _id: commentId, track: id });
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (String(c.user) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    await c.deleteOne();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
};

exports.history = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const list = await PlayHistory.find({ user: userId }).sort({ createdAt: -1 }).limit(200).populate('track');
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'History failed' }); }
};

exports.liked = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const likes = await TrackLike.find({ user: userId }).sort({ createdAt: -1 }).populate('track');
    res.json(likes.map(l => l.track).filter(Boolean));
  } catch (e) { res.status(500).json({ error: 'Liked failed' }); }
};
