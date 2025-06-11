// leitor de qr code
const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const SESSION_FILE_PATH = './session.json';
const express = require('express');
const app = express();
const qrcodeImg = require('qrcode');
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}
const client = new Client({
    session: sessionData
});
let latestQr = null;

app.get('/', (req, res) => {
    if (latestQr) {
        res.send(`
            <html>
                <body style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;'>
                    <h2>Escaneie o QR Code para conectar o WhatsApp</h2>
                    <img src="${latestQr}" />
                </body>
            </html>
        `);
    } else {
        res.send('<html><body><h2>QR Code ainda não gerado. Aguarde...</h2></body></html>');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Express rodando na porta ${PORT}`);
});

// serviço de leitura do qr code
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
    qrcodeImg.toDataURL(qr, (err, url) => {
        if (!err) {
            latestQr = url;
            console.log('QR Code atualizado para exibição web!');
        }
    });
    console.log('QR Code gerado! Veja o terminal/log da Railway para escanear.');
});
// apos isso ele diz que foi tudo certo
client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});
// E inicializa tudo 
client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms)); // Função que usamos para criar o delay entre uma ação e outra

// Armazenar o estado da conversa por usuário
const userStates = {};

client.on('message', async msg => {
    // Ignorar mensagens de grupos
    if (!msg.from.endsWith('@c.us')) return;

    const chat = await msg.getChat();
    const userId = msg.from;
    if (!userStates[userId]) userStates[userId] = { step: 0 };
    const state = userStates[userId];

    // Início do funil
    if (state.step === 0 && /(oi|olá|ola|bom dia|boa tarde|boa noite)/i.test(msg.body)) {
        state.step = 1;
        await client.sendMessage(userId, 'Oi! Tudo bem? Eu sou a professora Natália.🥰');
        await delay(3000);
        await client.sendMessage(userId, 'Antes de tudo! Qual é o seu nome?');
        state.step = 2;
        return;
    }

    // Recebe o nome da cliente
    if (state.step === 2) {
        state.nome = msg.body.split(' ')[0];
        await client.sendMessage(userId, `Que bom falar contigo, ${state.nome}!`);
        await delay(5000);
        await client.sendMessage(userId, 'Me conta, qual é seu objetivo com os treinos? Quer secar, definir ou levantar o bumbum? Assim posso te ajudar da melhor forma! 🩷🥰Estou aqui pra te ouvir!💗😊');
        state.step = 3;
        return;
    }

    // Recebe objetivo
    if (state.step === 3) {
        // Aguarda resposta
        await client.sendMessage(userId, `Entendi, ${state.nome}!`);
        await delay(6000);
        await client.sendMessage(userId, 'É normal querer mudanças, e eu estou aqui pra te ajudar a alcançá-las!😍🎉');
        await delay(7000);
        await client.sendMessage(userId, 'Vou te mandar um áudio rapidinho pra explicar melhor, tá?');
        await delay(7000);
        const audio1 = await MessageMedia.fromFilePath('./audios/AUDIO1.mp3');
        await client.sendMessage(userId, audio1, { sendAudioAsVoice: true });
        await delay(11000);
        const audio2 = await MessageMedia.fromFilePath('./audios/AUDIO2.mp3');
        await client.sendMessage(userId, audio2, { sendAudioAsVoice: true });
        // Aguarda resposta
        await client.sendMessage(userId, `Fico muito feliz que tenha se interessado e queira saber mais ${state.nome}!🥰💗`);
        await delay(8000);
        await client.sendMessage(userId, 'Os os treinos em casa da professora Natália Fit é um método que promete resultados visíveis em apenas 30 dias!😱😍');
        await delay(10000);
        await client.sendMessage(userId, 'Imagine-se com um corpo mais firme e tonificado, sem precisar de equipamentos caros ou academias lotadas...🥰💗');
        await delay(9000);
        await client.sendMessage(userId, 'Você já ouviu falar dos nossos treinos em casa?');
        state.step = 4;
        return;
    }

    // Pergunta se já ouviu falar dos treinos
    if (state.step === 4) {
        // Aguarda resposta
        await client.sendMessage(userId, 'Eles são a solução perfeita para quem deseja transformar o corpo rapidamente!😍🎉');
        await delay(7000);
        await client.sendMessage(userId, 'E se você não notar resultados, garantimos seu dinheiro de volta!😍💰');
        await delay(7000);
        await client.sendMessage(userId, 'O que torna nossos treinos tão eficaz são as aulas Exclusivas de Treinos Guiados.');
        await delay(8000);
        await client.sendMessage(userId, 'Com aulas práticas e acessíveis, adaptadas aos seus objetivos, você fará treinos que realmente funcionam!😱😍🎉');
        await delay(10000);
        await client.sendMessage(userId, 'E tudo isso sob a orientação da Professora Natália Fit, especialista em transformação corporal.💗');
        await delay(5000);
        await client.sendMessage(userId, 'Quer saber como funciona esse método?');
        state.step = 5;
        return;
    }

    // Aguarda resposta se quer saber como funciona
    if (state.step === 5) {
        await client.sendMessage(userId, '🎁Com os nossos treinos em casa, você pode esperar:\n\n😍Eliminação de Celulite: Aulas focadas para combater a celulite.  \n🍑Flacidez Reduzida: Treinos que tonificam seu corpo.  \n🥦🍎Dicas de Nutrição: Estratégias para maximizar resultados.  \n🥰Apoio Comunitário: Conexão com outras mulheres em busca de transformação.  \n🏆Monitoramento de Progresso: Ferramentas para acompanhar suas melhorias.');
        await delay(12000);
        await client.sendMessage(userId, 'E tudo isso em apenas 30 dias!😍🎉');
        await delay(7000);
        await client.sendMessage(userId, 'Posso te mostrar alguns depoimentos de mulheres que já usaram o método?');
        await delay(7000);
        await client.sendMessage(userId, 'Olha o que as mulheres estão falando sobre as aulas da Natália Fit:');
        await delay(8000);
        const prova1 = await MessageMedia.fromFilePath('./ProvaSocial/PROVASOCIAL1.png');
        await client.sendMessage(userId, prova1);
        await delay(10000);
        await client.sendMessage(userId, 'Outro depoimento:');
        const prova2 = await MessageMedia.fromFilePath('./ProvaSocial/PROVASOCIAL2.png');
        await client.sendMessage(userId, prova2);
        await delay(9000);
        await client.sendMessage(userId, 'E mais um:');
        const prova3 = await MessageMedia.fromFilePath('./ProvaSocial/PROVASOCIAL3.png');
        await client.sendMessage(userId, prova3);
        await delay(9000);
        await client.sendMessage(userId, 'Olha só este relato:');
        const prova4 = await MessageMedia.fromFilePath('./ProvaSocial/PROVASOCIAL4.png');
        await client.sendMessage(userId, prova4);
        await delay(9000);
        await client.sendMessage(userId, `Está pronta para transformar seu corpo também, ${state.nome}?😍🎉`);
        // Aguarda resposta
        await client.sendMessage(userId, 'Agora, você deve estar se perguntando quanto custa essa transformação...');
        await delay(8000);
        await client.sendMessage(userId, 'O programa de Treinos da Natália Fit poderia facilmente ser vendido por R$ 997!');
        await delay(10000);
        await client.sendMessage(userId, 'Mas hoje, você pode começar sua transformação por apenas R$47!😱😍');
        await delay(9000);
        await client.sendMessage(userId, 'E tem mais, fechando hoje, você ainda leva bônus exclusivos:🎁\n\n🍑Aulas "Segredos para um Bumbum Perfeito" \n🥗Guia de Bem-Estar Permanente \n🏆Acesso ao Grupo VIP no WhatsApp');
        await delay(12000);
        await client.sendMessage(userId, 'E você tem 7 dias de garantia incondicional. Se não gostar, devolvemos seu dinheiro!💰🎁');
        await delay(7000);
        await client.sendMessage(userId, 'Mas atenção, essa oferta é válida somente para os 50 primeiros inscritos!😱');
        await delay(8000);
        await client.sendMessage(userId, `O que você acha, ${state.nome}?`);
        state.step = 6;
        return;
    }

    // Aguarda resposta final
    if (state.step === 6) {
        await client.sendMessage(userId, 'Eu entendo que decidir pode ser difícil...');
        await delay(7000);
        await client.sendMessage(userId, 'Mas continuar como está pode ser ainda mais desgastante, não acha?😫');
        await delay(7000);
        await client.sendMessage(userId, 'Ao escolher as aulas da Natália Fit, você evita:\n\n😫Perder tempo com soluções que não funcionam.  \n💰Gastar mais dinheiro em tratamentos caros.  \n🍑Deixar problemas de flacidez e celulite piorarem.  \n😰Frustração de não ver resultados.');
        await delay(13000);
        await client.sendMessage(userId, 'Você está pronta para aproveitar essa oferta de R$47 e transformar seu corpo?😍🎉');
        await delay(15000);
        await client.sendMessage(userId, `${state.nome}, essa é a sua oportunidade incrível!!!🥰💗🎉`);
        await delay(8000);
        await client.sendMessage(userId, 'Clique no link e garanta seu acesso por apenas R$47.🎁');
        await delay(7000);
        await client.sendMessage(userId, 'Vai ser incrível ter você com a gente!🥰💗');
        await delay(7000);
        await client.sendMessage(userId, 'Se tiver qualquer dúvida ou precisar de algo, me avisa.');
        await delay(7000);
        await client.sendMessage(userId, `E eu tenho uma surpresa pra você, ${state.nome}🎁`);
        await delay(8000);
        await client.sendMessage(userId, 'Assim que finalizar o pagamento, vou liberar um bônus extra que foi autorizado para você por ter ficado comigo até agora...🎁😍😍');
        await delay(4000);
        await client.sendMessage(userId, 'https://lastlink.com/p/CFBBEB673/checkout-payment/');
        state.step = 7;
        return;
    }

    if (state.step === 7) {
        await client.sendMessage(userId, 'Se precisar de mais informações, é só me chamar!');
        return;
    }
});

client.on('authenticated', (session) => {
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(session));
});