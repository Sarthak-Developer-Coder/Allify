const crypto = require('crypto');

const KEY_HEX = process.env.SNAP_CRYPT_KEY || '';
let KEY = null;
try { if (KEY_HEX) KEY = Buffer.from(KEY_HEX, 'hex'); } catch {}

function encrypt(text){
  try {
    if (!KEY || !text) return text || '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return 'enc:' + iv.toString('hex') + ':' + enc.toString('hex') + ':' + tag.toString('hex');
  } catch { return text; }
}

function decrypt(text){
  try {
    if (!KEY || !text || typeof text !== 'string' || !text.startsWith('enc:')) return text;
    const [, ivh, ench, tagh] = text.split(':');
    const iv = Buffer.from(ivh, 'hex');
    const enc = Buffer.from(ench, 'hex');
    const tag = Buffer.from(tagh, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  } catch { return ''; }
}

module.exports = { encrypt, decrypt };
