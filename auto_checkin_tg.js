/*
cron 10 10 * * * auto_send_sharecode.js
自动加入助力池

*/

// const $ = new Env('tg签到')
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
    await sleep(Math.floor(Math.random() * 10 + 1) * 60)
    await client.sendMessage('EmbyPublicBot', { message: '/checkin' })

    console.log('签到完成')
    process.exit(0)
  } catch (error) {
    console.log(error)
    process.exit(0)
  }
})()

function sleep(time) {
  return new Promise((res) => setTimeout(res, time * 1000))
}
