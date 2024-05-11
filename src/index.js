import dotenv from 'dotenv';
dotenv.config();
import { makeWASocket, jidDecode, DisconnectReason, useMultiFileAuthState,getAggregateVotesInPollMessage, makeInMemoryStore } from '@whiskeysockets/baileys';
import { Handler, Callupdate, GroupUpdate} from './event/index.js'
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import axios from 'axios';
import moment from 'moment-timezone';
import express from 'express';
const app = express() 
const port = 8000


let useQR;
let isSessionPutted;

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })


async function startsock() {
  if(!process.env.SESSION_ID) {
    useQR = true;
    isSessionPutted = false;
  } else {
    useQR = false;
    isSessionPutted = true;
  }
  
  const Device = (os.platform() === 'win32') ? 'Windows' : (os.platform() === 'darwin') ? 'MacOS' : 'Linux'
  
  //Baileys Device Configuration
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: useQR,
    browser: [Device, 'Chrome', '20.0.04'],
    auth: state,
    getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg.message || undefined
            }
            return {
                conversation: "Hai Im Ethix-MD"
            }
        }
    })

    store.bind(sock.ev)

 // Manage Device Loging
 if (!sock.authState.creds.registered && isSessionPutted) {
    const sessionID = process.env.SESSION_ID.split('Ethix-MD&')[1];
    const pasteUrl = `https://pastebin.com/raw/${sessionID}`;
    const response = await fetch(pasteUrl);
    const text = await response.text();
    if (typeof text === 'string') {
      fs.writeFile('./session/creds.json', text, (err) => {
  if (err) {
    console.error('Error writing creds file:', err);
  } else {
    console.log('Creds file written successfully.');
  }
});
      await startsock() 
    }
  }

  
   // Handle Incomming Messages
  sock.ev.on("messages.upsert", async chatUpdate => await Handler(chatUpdate, sock));
  sock.ev.on("call", async (json) => await Callupdate(json, sock));
  sock.ev.on("group-participants.update", async (messag) => await GroupUpdate(sock, messag));
  
  
sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

if (connection === 'close') {
	try {
				console.log('Connection Closed, Reconnecting -')
				startsock();
			} catch (e) {
				console.log('ERROR LOG:--')
				console.log(e)
			}
		 else {
			console.log(chalk.red('Bot Logout'))
		}
	} else if (connection == 'open') { 
	console.log('Connected...', update);
        sock.sendMessage(sock.user.id, {
            text: `> *_ΣƬΉIX-MD connected_*`
        });
	}
	}
});


    sock.ev.on('creds.update', saveCreds)
  
  // response cmd pollMessage
async function getMessage(key) {
    if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message;
    }
    return {
        conversation: "Hai im Ethix-MD",
    };
}
}

startsock();

app.get('/', (req, res) => { 
   res.send('Server Running') 
}) 

app.listen(port, () => { 
   console.log(`Example app listening on port ${port}`) 
})