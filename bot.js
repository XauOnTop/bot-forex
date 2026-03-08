const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const axios = require("axios")
const cheerio = require("cheerio")
const cron = require("node-cron")

const TARGET = "6282129048885@s.whatsapp.net"

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const sock = makeWASocket({
        auth: state
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update

        if (qr) {
            console.log("Scan QR di WhatsApp")
            console.log(qr)
        }

        if (connection === "open") {
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

        if(currency === "USD" && impact.includes("High")){
            news.push({title,time})
        }

    })

    return news
}

function startScheduler(sock){

    cron.schedule("0 7 * * *", async () => {

        const news = await getForexNews()

        let msg = "📊 USD HIGH IMPACT NEWS\n\n"

        news.forEach(n=>{
            msg += `${n.title}\n⏰ ${n.time}\n\n`
        })

        await sock.sendMessage(TARGET,{text:msg})

        console.log("News sent")

    })

}

startBot()