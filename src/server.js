const makeWaSocket = require('@whiskeysockets/baileys').default
const { delay, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@whiskeysockets/baileys')
// const dialogflow = require('@google-cloud/dialogflow');
const P = require('pino')
const { unlink, existsSync, mkdirSync } = require('fs')
const express = require('express');
// const { body, validationResult } = require('express-validator');
const http = require('http');
const port = process.env.PORT || 9002;
const app = express();
const server = http.createServer(app);
const Path = 'Sessions';
// const request = require('request')

const fs = require('fs')
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

const Update = (sock) => {
    sock.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('CHATBOT - Qrcode: ', qr);
        };
        if (connection === 'close') {
            const Reconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (Reconnect) Connection()
            console.log(`CHATBOT - CONEXÃO FECHADA! RAZÃO: ` + DisconnectReason.loggedOut.toString());
            if (Reconnect === false) {
                fs.rmSync(Path, { recursive: true, force: true });
                const removeAuth = Path
                unlink(removeAuth, err => {
                    if (err) throw err
                })
            }
        }
        if (connection === 'open') {
            console.log('CHATBOT - CONECTADO')
        }
    })
}

const Connection = async () => {
    const { version } = await fetchLatestBaileysVersion()
    if (!existsSync(Path)) {
        mkdirSync(Path, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState(Path)
    const config = {
        auth: state,
        logger: P({ level: 'error' }),
        printQRInTerminal: true,
        version,
        connectTimeoutMs: 60_000,
        async getMessage(key) {
            return { conversation: 'Chatbot' };
        },
    }
    const sock = makeWaSocket(config, { auth: state });
    Update(sock.ev);
    sock.ev.on('creds.update', saveCreds);

    const SendMessage = async (jid, msg) => {
        await sock.presenceSubscribe(jid)
        await delay(1500)
        await sock.sendPresenceUpdate('composing', jid)
        await delay(1000)
        await sock.sendPresenceUpdate('paused', jid)
        return await sock.sendMessage(jid, msg)
    }


    /////////////////////INICIO DAS FUNÇÕES/////////////////////

    sock.ev.on('messages.upsert', async ({ messages, type }) => {

        console.log('<<<<<<<<<<<<<<<<<<<<< CHEGOU >>>>>>>>>>>>>>>>>>>>>>');
        console.log(messages[0]);
        console.log('     ');
        console.log('     ');

        const msg = messages[0]
        const jid = msg.key.remoteJid
        const nomeUsuario = msg.pushName
        const saudacao = welcome(date)

        const text = msg?.message?.conversation;
        if (text === '!ping') {
            const result = await SendMessage(jid, { text: "pong!" })
            console.log('RESULT: ', result);
        }

        if (text === 'NOME:') {
            const result = await SendMessage(jid, { text: "Renato Aruã Miranda Moreira" })
            console.log('RESULT: ', result);
        }

        if (text === 'CPF:') {
            const result = await SendMessage(jid, { text: "064.179.079-10" })
            console.log('RESULT: ', result);
        }

        if (text === 'ENDEREÇO:') {
            const result = await SendMessage(jid, { text: "Rua Gustavo Janzen - Tatuquara - Curitiba, PR - CEP 81480-386" })
            console.log('RESULT: ', result);
        }
    });

};

Connection();

server.listen(port, function () {
    console.log('CHATBOT - Servidor rodando na porta: ' + port);

});