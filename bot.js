const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const axios = require("axios")
const cheerio = require("cheerio")
const cron = require("node-cron")
const moment = require("moment")

const TARGET = "6282129048885@s.whatsapp.net"

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("auth")

const sock = makeWASocket({
auth: state
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", async(update)=>{

const { connection, lastDisconnect } = update

if(connection === "close"){

const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut

console.log("Connection closed")

if(shouldReconnect){
startBot()
}

}

if(connection === "open"){
console.log("WhatsApp Connected ✅")
startScheduler(sock)
}

})

}

async function getForexNews(){

const res = await axios.get("https://www.forexfactory.com/calendar")

const $ = cheerio.load(res.data)

const news = []

$(".calendar__row").each((i,el)=>{

const currency = $(el).find(".calendar__currency").text().trim()
const impact = $(el).find(".impact").attr("title") || ""
const title = $(el).find(".calendar__event-title").text().trim()
const time = $(el).find(".calendar__time").text().trim()

const actual = $(el).find(".calendar__actual").text().trim()
const forecast = $(el).find(".calendar__forecast").text().trim()
const previous = $(el).find(".calendar__previous").text().trim()

if(currency === "USD" && impact.includes("High")){

news.push({
title,
time,
actual,
forecast,
previous
})

}

})

return news

}

function buildMessage(news){

let msg = "📊 *USD HIGH IMPACT NEWS*\n\n"

news.forEach((n,i)=>{

msg += `${i+1}. ${n.title}\n`
msg += `⏰ ${n.time}\n`
msg += `📌 Previous: ${n.previous || "-"}\n`
msg += `📈 Forecast: ${n.forecast || "-"}\n`
msg += `📊 Actual: ${n.actual || "-"}\n\n`

})

return msg

}

function startScheduler(sock){

console.log("Scheduler aktif")

cron.schedule("0 7 * * *", async()=>{

const news = await getForexNews()

const message = buildMessage(news)

await sock.sendMessage(TARGET,{text:message})

console.log("Morning news sent")

},{
timezone:"Asia/Jakarta"
})

cron.schedule("*/10 * * * *", async()=>{

const news = await getForexNews()

news.forEach(async n=>{

let msg = `⚠️ *NEWS ALERT*\n\n`
msg += `📰 ${n.title}\n`
msg += `⏰ ${n.time}\n`
msg += `📌 Previous: ${n.previous}\n`
msg += `📈 Forecast: ${n.forecast}`

await sock.sendMessage(TARGET,{text:msg})

})

})

}

startBot()