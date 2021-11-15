/*
cron 0 21 * * 6 auto_send_sharecode.js
自动加入助力池

*/

// const $ = new Env('自动加入助力池')
const { TelegramClient } = require('telegram')
const { StoreSession } = require('telegram/sessions')
const fs = require('fs')
const input = require('input') // npm i input

const apiIdKey = 'TELEGRAM_API_ID'
const apiHashKey = 'TELEGRAM_API_HASH'

const apiId = +process.env[apiIdKey]
const apiHash = process.env[apiHashKey]
const storeSession = new StoreSession(apiId)

let bindList = fs.readFileSync('bindList.txt', 'utf8')
bindList = bindList.split('\n')
;(async () => {
  try {
    console.log('登入Telegram...')

    const client = new TelegramClient(storeSession, apiId, apiHash, { connectionRetries: 5 })

    await client.connect()

    // await client.start({
    //   phoneNumber: async () => await input.text('number ?'),
    //   password: async () => await input.text('password?'),
    //   phoneCode: async () => await input.text('Code ?'),
    //   onError: (err) => console.log(err),
    // })

    console.log('登入成功')

    const shareCodes = getShareCode()

    for (pt of bindList) {
      await client.sendMessage('JDShareCodebot', { message: `/bind ${pt}` })
      await sleep(3)
    }

    for (code of shareCodes) {
      await client.sendMessage('JD_ShareCode_Bot', { message: code })
      await client.sendMessage('JDShareCodebot', { message: code })
      await sleep(3)
    }

    // const jobs = shareCodes.map(async (code) => {
    //   await client.sendMessage('zza_jd_notify_bot', { message: code })
    // })

    // await Promise.all(jobs)

    console.log('发送助力码完成')
    process.exit(0)
  } catch (error) {
    console.log(error)
    process.exit(0)
  }
})()

function getShareCode() {
  const child = require('child_process')
  const res = child.execSync('task zero205_JD_tencent_scf_main_jd_get_share_code.js now', {
    shell: '/bin/bash',
  })
  return res.toString().match(new RegExp('^/.*', 'gm'))
}

function sleep(time) {
  return new Promise((res) => setTimeout(res, time * 1000))
}
