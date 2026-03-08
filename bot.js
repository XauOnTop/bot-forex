process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const moment = require('moment');

const TARGET = "6282129048885@c.us";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

let sentReminders = new Set();

client.on('qr', (qr) => {
    console.log("Scan QR ini di WhatsApp");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {

    console.log("WhatsApp Connected ✅");
    console.log("Bot Forex aktif 🚀");

    startBot();

});

client.initialize();

async function getForexNews(){

    const res = await axios.get("https://www.forexfactory.com/calendar");

    const $ = cheerio.load(res.data);

    const news = [];

    $(".calendar__row").each((i,el)=>{

        const currency = $(el).find(".calendar__currency").text().trim();
        const impact = $(el).find(".impact").attr("title") || "";
        const title = $(el).find(".calendar__event-title").text().trim();
        const time = $(el).find(".calendar__time").text().trim();

        const actual = $(el).find(".calendar__actual").text().trim();
        const forecast = $(el).find(".calendar__forecast").text().trim();
        const previous = $(el).find(".calendar__previous").text().trim();

        if(currency === "USD" && impact.includes("High")){

            news.push({
                title,
                time,
                actual,
                forecast,
                previous
            });

        }

    });

    return news;

}

function buildMessage(news){

    let msg = "📊 *USD HIGH IMPACT NEWS*\n\n";

    news.forEach((n,i)=>{

        msg += `${i+1}. ${n.title}\n`;
        msg += `⏰ ${n.time}\n`;
        msg += `📌 Previous: ${n.previous || "-"}\n`;
        msg += `📈 Forecast: ${n.forecast || "-"}\n`;
        msg += `📊 Actual: ${n.actual || "-"}\n\n`;

    });

    return msg;

}

function buildReminder(n){

    let msg = "⚠️ *REMINDER NEWS 1 JAM*\n\n";

    msg += `📰 ${n.title}\n`;
    msg += `⏰ ${n.time}\n`;
    msg += `📌 Previous: ${n.previous}\n`;
    msg += `📈 Forecast: ${n.forecast}\n`;

    return msg;

}

function startBot(){

    console.log("Scheduler aktif");

    // kirim summary jam 07:00
    cron.schedule('0 7 * * *', async ()=>{

        const news = await getForexNews();
        const message = buildMessage(news);

        await client.sendMessage(TARGET,message);

        console.log("Morning news sent");

    },{
        timezone:"Asia/Jakarta"
    });

    // cek setiap 5 menit
    cron.schedule('*/5 * * * *', async ()=>{

        const news = await getForexNews();
        const now = moment();

        news.forEach(async n => {

            if(!n.time.includes(":")) return;

            const eventTime = moment(n.time,"HH:mm");

            const diff = eventTime.diff(now,'minutes');

            const key = n.title + n.time;

            if(diff <= 60 && diff >= 55 && !sentReminders.has(key)){

                const msg = buildReminder(n);

                await client.sendMessage(TARGET,msg);

                sentReminders.add(key);

                console.log("Reminder sent:",n.title);

            }

        });

    });

}