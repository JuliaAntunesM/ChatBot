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
            '--disable-extensions',
            '--disable-features=site-per-process,TranslateUI,BlinkGenPropertyTrees',
            '--disable-features=dbus',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--metrics-recording-only',
            '--mute-audio'
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
function applyVars(text, vars) {
    return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '');
}

// ─── Enviar mensagens de um nó ────────────────────────────────────────────────
async function sendNode(userId, node, vars) {
    for (const msg of (node.messages || [])) {
        if (msg.delay > 0) await delay(msg.delay);

        if (msg.type === 'text') {
            await client.sendMessage(userId, applyVars(msg.content, vars));
        } else if (msg.type === 'opcoes') {
            const linhas = (msg.opcoes || []).map((o, i) => `${i + 1}️⃣ ${o}`).join('\n');
            const texto = (msg.content ? applyVars(msg.content, vars) + '\n\n' : '') + linhas + '\n\n👉 Responda com o número da opção!';
            await client.sendMessage(userId, texto);
        } else if (msg.type === 'audio') {
            const media = await MessageMedia.fromFilePath(msg.content);
            await client.sendMessage(userId, media, { sendAudioAsVoice: true });
        } else if (msg.type === 'image') {
            const media = await MessageMedia.fromFilePath(msg.content);
            await client.sendMessage(userId, media);
        }
    }
}

// ─── Resolver próximo nó baseado em conexões e resposta ──────────────────────
function resolveNextNode(node, replyText, config) {
    const connections = node.connections || [];
    if (connections.length === 0) return null;

    // Tenta encontrar conexão cuja condição combina com a resposta
    for (const conn of connections) {
        if (conn.condition === 'always') return config.nodes.find(n => n.id === conn.targetNodeId) || null;
        if (replyText && replyText.toLowerCase().includes(conn.condition.toLowerCase())) {
            return config.nodes.find(n => n.id === conn.targetNodeId) || null;
        }
    }
    // Fallback: usa a primeira conexão
    return config.nodes.find(n => n.id === connections[0].targetNodeId) || null;
}

// ─── Estado por usuário ───────────────────────────────────────────────────────
const userStates = {};

client.on('message', async msg => {
    if (!msg.from.endsWith('@c.us')) return;

    const userId = msg.from;
    const config = loadConfig();

    if (!userStates[userId]) userStates[userId] = { currentNodeId: null, vars: {}, waitingReply: false };
    const state = userStates[userId];

    // Gatilho inicial: usuário não está em nenhum fluxo
    if (!state.currentNodeId) {
        const pattern = new RegExp((config.triggerWords || []).join('|'), 'i');
        if (!pattern.test(msg.body)) return;

        const startNode = config.nodes.find(n => n.id === config.startNodeId);
        if (!startNode) return;

        state.currentNodeId = startNode.id;
        state.waitingReply = false;
        state.vars = {};

        await sendNode(userId, startNode, state.vars);

        if (startNode.waitForReply) {
            state.waitingReply = true;
        } else {
            await advanceFlow(userId, startNode, '', config);
        }
        return;
    }

    // Usuário já está no fluxo e enviou uma resposta
    if (state.waitingReply) {
        const currentNode = config.nodes.find(n => n.id === state.currentNodeId);
        if (!currentNode) { state.currentNodeId = null; return; }

        // Salvar resposta em variável se configurado
        if (currentNode.saveReplyAs) {
            state.vars[currentNode.saveReplyAs] = msg.body.split(' ')[0];
        }

        state.waitingReply = false;
        await advanceFlow(userId, currentNode, msg.body, config);
    }
});

async function advanceFlow(userId, currentNode, replyText, config) {
    const state = userStates[userId];
    const nextNode = resolveNextNode(currentNode, replyText, config);

    if (!nextNode) {
        state.currentNodeId = null;
        state.waitingReply = false;
        return;
    }

    state.currentNodeId = nextNode.id;
    await sendNode(userId, nextNode, state.vars);

    if (nextNode.waitForReply) {
        state.waitingReply = true;
    } else {
        // Avança automaticamente para o próximo sem esperar resposta
        await advanceFlow(userId, nextNode, '', config);
    }
}

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