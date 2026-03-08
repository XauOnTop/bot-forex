const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")

const phoneNumber = "6282129048885"

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("auth")

const sock = makeWASocket({
auth: state,
printQRInTerminal: false
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", async(update)=>{

const { connection } = update

if(connection === "close"){

console.log("Connection closed")

startBot()

}

if(connection === "open"){

console.log("WhatsApp Connected ✅")

}

})

if(!sock.authState.creds.registered){

const code = await sock.requestPairingCode(phoneNumber)

console.log("PAIRING CODE:")
console.log(code)

}

}

startBot()