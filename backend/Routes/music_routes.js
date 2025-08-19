const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const combinedUpload = require('../config/combinedUpload');
const ctrl = require('../Controllers/music_controller');

router.get('/tracks', ctrl.list);
router.get('/tracks/:id', ctrl.get);
router.get('/stream/:id', ctrl.stream);
// waveform and HLS (public)
router.get('/tracks/:id/waveform', ctrl.waveform);
router.get('/hls/:id/master.m3u8', ctrl.hlsMaster);
router.get('/hls/:id/:file', ctrl.hlsStream);
router.get('/tracks/:id/comments', ctrl.getComments);
router.delete('/tracks/:id/comments/:commentId', fetchUser, ctrl.deleteComment);
router.put('/tracks/:id', fetchUser, ctrl.update);

// accept audio and optional cover in one pass (disk)
router.post('/upload', fetchUser, combinedUpload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), ctrl.upload);
router.get('/me/tracks', fetchUser, ctrl.mine);
router.post('/like/:id', fetchUser, ctrl.like);
router.post('/unlike/:id', fetchUser, ctrl.unlike);
router.post('/tracks/:id/comments', fetchUser, ctrl.addComment);
router.get('/me/history', fetchUser, ctrl.history);
router.get('/me/liked', fetchUser, ctrl.liked);
router.delete('/tracks/:id', fetchUser, ctrl.remove);

router.post('/playlist', fetchUser, ctrl.createPlaylist);
router.get('/playlist/mine', fetchUser, ctrl.myPlaylists);
router.get('/playlist/public', ctrl.publicPlaylists);
router.get('/playlist/:id', ctrl.getPlaylist);
router.post('/playlist/:id/add', fetchUser, ctrl.addToPlaylist);
router.delete('/playlist/:id/track/:trackId', fetchUser, ctrl.removeFromPlaylist);
router.put('/playlist/:id', fetchUser, ctrl.updatePlaylist);

module.exports = router;
