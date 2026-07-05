// ─── Dependências ────────────────────────────────────────────────────────────
const qrcode = require('qrcode-terminal');
const qrcodeLib = require('qrcode');
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ─── Configuração ─────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(data) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Estado global ────────────────────────────────────────────────────────────
let botStatus = 'disconnected'; // 'disconnected' | 'qr' | 'ready'
let currentQR = null;

// ─── WhatsApp Client ──────────────────────────────────────────────────────────
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-extensions'
        ]
    }
});

client.on('qr', async qr => {
    qrcode.generate(qr, { small: true });
    botStatus = 'qr';
    currentQR = await qrcodeLib.toDataURL(qr);
    console.log('QR Code gerado. Escaneie pelo WhatsApp.');
});

client.on('ready', () => {
    botStatus = 'ready';
    currentQR = null;
    console.log('Tudo certo! WhatsApp conectado.');
});

client.on('disconnected', () => {
    botStatus = 'disconnected';
    currentQR = null;
    console.log('WhatsApp desconectado.');
});

client.initialize();

// ─── Delay ───────────────────────────────────────────────────────────────────
const delay = ms => new Promise(res => setTimeout(res, ms));

// ─── Substituir variáveis no texto ───────────────────────────────────────────
function applyVars(text, state) {
    return text.replace(/\{nome\}/g, state.nome || '');
}

// ─── Enviar sequência de mensagens de um step ────────────────────────────────
async function sendStep(userId, stepIndex, state) {
    const config = loadConfig();
    const step = config.steps[stepIndex];
    if (!step) return;

    for (const msg of step.messages) {
        if (msg.delay > 0) await delay(msg.delay);

        if (msg.type === 'text') {
            await client.sendMessage(userId, applyVars(msg.content, state));
        } else if (msg.type === 'audio') {
            const media = await MessageMedia.fromFilePath(msg.content);
            await client.sendMessage(userId, media, { sendAudioAsVoice: true });
        } else if (msg.type === 'image') {
            const media = await MessageMedia.fromFilePath(msg.content);
            await client.sendMessage(userId, media);
        }
    }
}

// ─── Estado por usuário ───────────────────────────────────────────────────────
const userStates = {};

client.on('message', async msg => {
    if (!msg.from.endsWith('@c.us')) return;

    const userId = msg.from;
    if (!userStates[userId]) userStates[userId] = { step: 0 };
    const state = userStates[userId];
    const config = loadConfig();

    // Gatilho inicial
    if (state.step === 0) {
        const pattern = new RegExp(config.triggerWords.join('|'), 'i');
        if (!pattern.test(msg.body)) return;
        state.step = 1;
        await sendStep(userId, 0, state); // step id=1 → índice 0
        state.step = 2;
        return;
    }

    // Step 2: recebe o nome
    if (state.step === 2) {
        state.nome = msg.body.split(' ')[0];
        await sendStep(userId, 1, state);
        state.step = 3;
        return;
    }

    // Steps 3 a 7: avança automaticamente enviando o próximo step
    if (state.step >= 3 && state.step <= 7) {
        const stepIndex = state.step - 1; // step 3 → índice 2, etc.
        await sendStep(userId, stepIndex, state);
        state.step = state.step < 7 ? state.step + 1 : 7;
        return;
    }
});

// ─── Servidor Express (Dashboard) ────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard')));

// Upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.body.type;
        const dest = type === 'audio'
            ? path.join(__dirname, 'audios')
            : path.join(__dirname, 'ProvaSocial');
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// API: ler config
app.get('/api/config', (req, res) => {
    res.json(loadConfig());
});

// API: salvar config
app.post('/api/config', (req, res) => {
    try {
        saveConfig(req.body);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: status do bot + QR
app.get('/api/status', (req, res) => {
    res.json({ status: botStatus, qr: currentQR });
});

// API: upload de arquivo
app.post('/api/upload', upload.single('file'), (req, res) => {
    const type = req.body.type;
    const folder = type === 'audio' ? 'audios' : 'ProvaSocial';
    res.json({ path: `./${folder}/${req.file.originalname}` });
});

app.listen(3000, () => {
    console.log('📊 Dashboard disponível em: http://localhost:3000');
});