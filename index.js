const fs = require('fs');
const puppeteer = require('puppeteer');
const chalk = require('chalk');
const player = require('play-sound')(opts = {})
const qrcodeLib = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');

var numberOfExecutions = 0;
var numberOfReboot = 0;
var whatsappConnection = null;

const DURATION_INTERVAL_OF_EXECUTIONS = 3 * 60;
const WHATSAPP_SESSION_FILE_PATH = './whatsapp-session.json';
// const sendNotifyTo = '5511963646912';
const sendNotifyTo = '5511991032631';

let sessionData;

if (fs.existsSync(WHATSAPP_SESSION_FILE_PATH)) sessionData = require(WHATSAPP_SESSION_FILE_PATH);

function whatsappInitialize() {
    const client = new Client({
        session: sessionData
    });

    client.on('authenticated', (session) => {
        sessionData = session;
        fs.writeFile(WHATSAPP_SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });

    client.on('disconnected', (reason) => {
        console.log('Client was logged out', reason);
    });

    client.initialize();

    return client;
}

function whatsappConnect(whatsapp, withQRAwait = false) {
    let isReady = false;

    whatsapp.on('ready', () => {
        isReady = true;
    });

    return new Promise((resolve) => {
        const heckInterval = setInterval(() => {
            if (isReady) resolve(isReady);
        }, 1000);

        if (!withQRAwait) {
            setTimeout(() => {
                clearInterval(heckInterval);
                resolve(false);
            }, 15000);
        }

    });
}

function getWhatsappQrCode(whatsapp) {
    let whatsappQrCode = null;

    whatsapp.on('qr', (qr) => {
        console.log(qr)
        whatsappQrCode = qr;
    });

    return new Promise((resolve) => {
        setInterval(() => {
            if (whatsappQrCode) resolve(whatsappQrCode);
        }, 500);

    });
}

async function whatsappSetup() {
    let whatsappIsReady = false;

    let displayDot = " ";

    console.log(`☎️  Iniciando conexão com whatsapp`);

    const intervalLoading = setInterval(function () {
        if (!whatsappIsReady) {
            displayDot += '. ';
            process.stdout.cursorTo(2);
            process.stdout.write(`${displayDot}\r`);
        } else {
            displayDot += '';
            clearInterval(intervalLoading);
        }
    }, 300);

    console.log(`--------------------------------------------------------------`);
    console.log(``);

    const whatsapp = whatsappInitialize();

    if (!await whatsappConnect(whatsapp)) {

        console.log('🔐  Aguardando QR Code');

        const whatsappQrCode = await getWhatsappQrCode(whatsapp);

        qrcodeLib.generate(whatsappQrCode, { small: true });

        console.log(`QRCode gerado! Escaneie para que o robô possa conectar e enviar notificações\n`);

        console.log('🧑‍💻 Aguardando conexão\n');

        await whatsappConnect(whatsapp, true);
    }

    await sleep(1400);

    whatsappIsReady = true;

    return whatsapp;
}

function whatsappNotifyMessage(job, jobNumber) {
    const buildMessage =
        `
    ${jobNumber === 0 ? `🚀 ${'_Nova Vaga Disponível!_'.toUpperCase()}\n` : '\n'}
    👉🏻  ${'```' + job.title + '```'}
    🔗 *Link:*  ${job.link}
    ⏱ *Publicado há:*  ${job.time.replace('minutes', 'minutos').replace('ago', 'atrás')}
   `
    return buildMessage;
}

async function rebootRobot() {
    const count = await countDown(DURATION_INTERVAL_OF_EXECUTIONS);

    if (count === 0) {
        numberOfReboot++;
        // console.log('EXECUTA VIA REINICIALIZAÇÃO', numberOfReboot);
        await execRobot();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function countDown(duration) {
    return new Promise((resolve) => {
        let displayInfoTimer;
        var timer = duration, minutes, seconds;
        var countInterval = setInterval(() => {
            minutes = parseInt(timer / 60)
            seconds = parseInt(timer % 60);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            displayInfoTimer = minutes + ":" + seconds;

            process.stdout.cursorTo(2);
            process.stdout.write(`${chalk.underline.bold.bgRed(`Faltam ${displayInfoTimer} para a próxima busca`)}\r`);

            if (--timer < 0) {
                timer = duration;
                resolve(0);
                clearInterval(countInterval);
            }
        }, 1000);
    });

}

async function loggers(msg, timeAwait = null) {
    let loadingCompleted = false;
    let displayDots = " ";

    console.log(`${msg}\r`);

    const intervalLoading = setInterval(function () {
        if (!loadingCompleted) {
            displayDots += '. ';
            process.stdout.cursorTo(2);
            process.stdout.write(`${displayDots}\r`);
        } else {
            displayDots = ' ';
            clearInterval(intervalLoading);
        }
    }, 300);

    console.log(`--------------------------------------------------------------`);
    console.log(``);

    console.log('');

    await sleep(timeAwait);

    loadingCompleted = true;
}

async function logger(msg, timeAwait = null) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let displayDot = " ";

            console.log(` `);

            console.log(msg);

            console.log(`--------------------------------------------------------------`);

            console.log(``);

            const intervalDot = setInterval(function () {
                displayDot += '. ';
                process.stdout.cursorTo(2);
                process.stdout.write(`${displayDot}\r`);
            }, 300);

            setTimeout(() => {
                console.log(``);
                clearInterval(intervalDot);
                resolve();
            }, timeAwait * 3 || 2500 * 3);

        }, timeAwait || 2500);
    })
}

async function execRobot() {
    return new Promise(async (resolve) => {
        numberOfExecutions++;

        await loggers(`🚀  Iniciando busca por novas vagas, pela ${numberOfExecutions}ª vez`, 1500);

        await sleep(900);

        let searchCompleted = false;
        let displayDot = " ";

        console.log('🔎  Pesquisando\r');

        const intervalLoading = setInterval(function () {
            if (!searchCompleted) {
                displayDot += '. ';
                process.stdout.cursorTo(2);
                process.stdout.write(`${displayDot}\r`);
            } else {
                displayDot += '';
                clearInterval(intervalLoading);
            }
        }, 300);

        console.log(`--------------------------------------------------------------`);
        console.log(``);

        const browser = await puppeteer.launch({
            // headless: false,
            // slowMo: 0,
        });

        const page = await browser.newPage();

        await page.setDefaultNavigationTimeout(0); 

        let jobsTechRecruiterList;
        let jobsTalentAcquisitionList;

        try {

            await page.goto('https://www.linkedin.com/jobs/search/?f_TPR=r86400&geoId=106057199&keywords=Tech%20Recruiter&location=Brasil&sortBy=DD');

            await sleep(500);
            
            jobsTechRecruiterList = await page.evaluate(async () => {

                const jobsLiFromLinkedinDOM = document.querySelectorAll("ul.jobs-search__results-list li");

                try {
                    const jobs = await new Promise((resolve) => {

                        let opportunities = [];

                        jobsLiFromLinkedinDOM.forEach((li, position) => {
                            setTimeout(() => {
                                const id = li.querySelector('.base-card') ? li.querySelector('.base-card').dataset.entityUrn.replace(/\D/g, "") : null;
                                const title = jobsLiFromLinkedinDOM[position].querySelector('span.screen-reader-text')
                                    ? jobsLiFromLinkedinDOM[position].querySelector('span.screen-reader-text').innerText
                                    : jobsLiFromLinkedinDOM[position].querySelector('h3.base-search-card__title').innerText;
                                const link = li.querySelector('a.base-card__full-link') ? li.querySelector('a.base-card__full-link').href : li.querySelector('.base-card').href;
                                const time = li.querySelector('time') ? li.querySelector('time').innerText : null;

                                opportunities.push({ id, title, link, time });

                                if (position === jobsLiFromLinkedinDOM.length - 1) {
                                    // manual inject, to debug:
                                    // opportunities.push({ id: '12345', title: '[TON] Analista de Gente & Gestão /Tech People (Pl/Sr)', link: 'https://www.linkedin.com/jobs/view/2598609235', time: "2 minutes ago" });
                                    // opportunities.push({ id: '1234', title: 'TECH RECRUITER', link: 'https://www.linkedin.com/jobs/view/2593088334', time: "4 minutes ago" });
                                    resolve(opportunities);
                                }
                            }, 4000);
                        })
                    })

                    return jobs;

                } catch (error) {
                    console.log('catch error from browser');
                    console.log(error)
                }

            });

            await page.goto('https://www.linkedin.com/jobs/search/?f_TPR=r86400&geoId=106057199&keywords=Talent%20Acquisition&location=Brasil&sortBy=DD');

            await sleep(500);

            jobsTalentAcquisitionList = await page.evaluate(async () => {

                const jobsLiFromLinkedinDOM = document.querySelectorAll("ul.jobs-search__results-list li");

                try {
                    const jobs = await new Promise((resolve) => {

                        let opportunities = [];

                        jobsLiFromLinkedinDOM.forEach((li, position) => {
                            setTimeout(() => {

                                const id = li.querySelector('.base-card') ? li.querySelector('.base-card').dataset.entityUrn.replace(/\D/g, "") : null;
                                const title = jobsLiFromLinkedinDOM[position].querySelector('span.screen-reader-text')
                                    ? jobsLiFromLinkedinDOM[position].querySelector('span.screen-reader-text').innerText
                                    : jobsLiFromLinkedinDOM[position].querySelector('h3.base-search-card__title').innerText;
                                const link = li.querySelector('a.base-card__full-link') ? li.querySelector('a.base-card__full-link').href : li.querySelector('.base-card').href;
                                const time = li.querySelector('time') ? li.querySelector('time').innerText : null;

                                if (title.includes('Talent'))
                                    opportunities.push({ id, title, link, time });

                                if (position === jobsLiFromLinkedinDOM.length - 1)
                                    resolve(opportunities);
                            
                            }, 4000);
                        })
                    })

                    return jobs;

                } catch (error) {
                    console.log('catch error from browser');
                    console.log(error)
                }

            });

            await browser.close();

        } catch (error) {
            console.log('error from node')
            console.log(error)
        }


        const jobsList = [...jobsTechRecruiterList, ...jobsTalentAcquisitionList];

        searchCompleted = true;

        // if (numberOfExecutions > 1) {
        //     jobsList.push({ id: '12345', title: 'Analista de RH - R&S', link: 'https://www.linkedin.com/jobs/view/2598465304', time: "1 minutes ago" });
        // }

        // if (numberOfExecutions > 2) {
        //     jobsList.push({ id: '12345', title: 'Analista de RH - R&S', link: 'https://www.linkedin.com/jobs/view/2598465304', time: "1 minutes ago" });
        //     jobsList.push({ id: '123456', title: 'Analista de RH - R&S', link: 'https://www.linkedin.com/jobs/view/2598465304', time: "1 minutes ago" });

        //     console.log('jobsList é')
        //     console.log(jobsList)
        // }

        await sleep(500);

        console.log(`✅  ${chalk.green.bold(`Sucesso!`)} ${chalk.underline(jobsList.length + ' vagas')} encontradas!`);

        console.log('');
        console.log('');

        let filterCompleted = false;
        let displayDotFilter = " ";

        console.log(`🎯 ${chalk('Filtrando vagas')}\r`);

        const intervalLoadingFilter = setInterval(function () {
            if (!filterCompleted) {
                displayDotFilter += '. ';
                process.stdout.cursorTo(2);
                process.stdout.write(`${displayDotFilter}\r`);
            } else {
                displayDotFilter += '';
                clearInterval(intervalLoadingFilter);
            }
        }, 300);

        console.log(`--------------------------------------------------------------`);
        console.log(``);

        console.log('');

        await sleep(2000);

        filterCompleted = true;

        const minutesAgo = jobsList.filter((job) => job.time.includes('minutes')).map((job) => job);

        const labelNumbersMinute = minutesAgo.length > 1 ? 'vagas publicadas' : 'vaga publicada';

        console.log(`👉🏻  ${chalk.bgGreen.bold(`${minutesAgo.length} ${labelNumbersMinute} na última hora`)}`);

        console.log('');

        const hoursAgo = jobsList.filter((job) => job.time.includes('hours')).map((job) => job);

        console.log(`👉🏻  ${chalk.bold.bgWhite.bgCyan(`${hoursAgo.length} vagas publicadas nas últimas 23 horas`)}`);

        console.log(' ');
        console.log(' ');

        const hasNewInMinutesAgo = () => minutesAgo.filter((job) => job.time.replace(/\D/g, "") <= 5);

        if (minutesAgo.length > 0 && hasNewInMinutesAgo()) {

            const alreadyNotifiedFile = JSON.parse(await fs.promises.readFile('already-notified.json', 'utf8'));

            const notifiedIds = alreadyNotifiedFile.id;

            let message = '';

            hasNewInMinutesAgo().map((vacancy, position) => {
                // if (!notifiedIds.find((vacancyId) => vacancyId === vacancy.id)) {
                if (!notifiedIds.includes(vacancy.id)) {
                    message += whatsappNotifyMessage(vacancy, position);
                }
            })

            const sendedVacancyIds = hasNewInMinutesAgo()
                .filter((vacancy) => !notifiedIds.includes(vacancy.id))
                .map((vacancy) => vacancy.id)

            if (sendedVacancyIds.length > 1) message = message.replace('NOVA', 'NOVAS').replace('VAGA', 'VAGAS').replace('DISPONÍVEL!_', 'DISPONÍVEIS!_ \n - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \n');

            if (message !== '') {
                whatsappConnection.sendMessage(`${sendNotifyTo}@c.us`, message);
                player.play('./aleluia.mp3', (err) => {
                    if (err) console.log(err)
                })

                fs.readFile('already-notified.json', function (err, dataFile) {
                    const alreadyNotified = JSON.parse(dataFile);

                    alreadyNotified.id = [...alreadyNotified.id, ...sendedVacancyIds];

                    fs.writeFile('already-notified.json', JSON.stringify(alreadyNotified), (err) => {
                        if (err) console.log(err);
                    });
                })

                await loggers('🔔 Enviando notificação', 2500);

            } else {
                await loggers('🔔 As vagas detectadas já foram notificadas anteriormente', 900);
            }

        }

        console.log(`⏱  ${chalk('Aguardando intervalo de execução')}\r`);

        console.log(`--------------------------------------------------------------`);

        console.log('');
        console.log('');

        rebootRobot();

        resolve();



    })

}

async function initRobot() {

    await loggers(`⏳  Ligando o robô`, 1800);

    whatsappConnection = await whatsappSetup();

    console.log('\n');

    await loggers(`💬  Conectado com sucesso!`, 400);

    await sleep(1000);

    if (numberOfExecutions === 0) await execRobot(whatsappConnection);

}

initRobot();

// execRobot();