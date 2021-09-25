const { TelegramClient } = require('telegram')
const { StoreSession } = require('telegram/sessions')
const input = require('input') // npm i input

const apiIdKey = 'TELEGRAM_API_ID'
const apiHashKey = 'TELEGRAM_API_HASH'

const apiId = +process.env[apiIdKey]
const apiHash = process.env[apiHashKey]
const storeSession = new StoreSession(apiId)

;(async () => {
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

  for (code of shareCodes) {
    await client.sendMessage('zza_jd_notify_bot', { message: '/help' })
    await sleep(1)
  }

  // const jobs = shareCodes.map(async (code) => {
  //   await client.sendMessage('zza_jd_notify_bot', { message: code })
  // })

  // await Promise.all(jobs)

  process.exit(0)
})()

function getShareCode() {
  const child = require('child_process')
  const res = child.execSync('node zero205_JD_tencent_scf_main_jd_get_share_code.js', { shell: '/bin/zsh' })
  return res.toString().match(new RegExp('^/.*', 'gm'))
}

function sleep(time) {
  return new Promise((res) => setTimeout(res, time * 1000))
}
