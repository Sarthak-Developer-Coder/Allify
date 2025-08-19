let webpush;
try { webpush = require('web-push'); } catch {}
const PushSub = require('../Models/PushSub');

function configure(){
  if (!webpush) return false;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const mail = process.env.VAPID_CONTACT || 'mailto:admin@example.com';
  if (!pub || !priv) return false;
  try { webpush.setVapidDetails(mail, pub, priv); return true; } catch { return false; }
}

async function sendToUser(userId, payload){
  try {
    if (!configure()) return;
    const sub = await PushSub.findOne({ user: userId });
    if (!sub) return;
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch {}
}

module.exports = { sendToUser };
