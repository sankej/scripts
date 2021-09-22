/*
cron 10 0 * * * airtcp_checkin.js
AirTcp签到

*/

// const $ = new Env('AirTcp签到')
const MagicJS = require('./magic')
// const notify = require('./sendNotify').sendNotify
const notify = (e) => console.log(e)
const scriptName = 'AirTcp签到'
const airtcpCookieKey = 'airtcp_cookie'

let magicJS = MagicJS(scriptName, 'INFO')

const airtcp_headers = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'zh-cn',
  Connection: 'keep-alive',
  'Content-Type': 'application/json;charset=utf-8',
  Host: 'airtcp.vip',
  Referer: 'https://airtcp.vip/',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
}

const checkin = (cookie) => {
  return new Promise((resolve, reject) => {
    const options = {
      url: 'https://airtcp.vip/user/checkin',
      headers: {
        Cookie: cookie,
        ...airtcp_headers,
      },
    }

    magicJS.post(options, (err, response, data) => {
      if (err) {
        magicJS.logError(`签到失败, 请求异常: ${err}`, 'ERROR')
        reject('签到失败，请求异常, 请查阅日志!')
      } else {
        const { msg } = JSON.parse(data)
        magicJS.logInfo(msg)
        // notify(msg)
        resolve(msg)
      }
    })
  })
}

function getAirTcpTraffic(cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      url: 'https://airtcp.vip/user',
      headers: {
        Cookie: cookie,
        ...airtcp_headers,
      },
    }

    magicJS.get(options, (err, response, data) => {
      if (err) {
        magicJS.logError(`获取流量失败, 请求异常: ${err}`, 'ERROR')
        reject('获取流量失败，请求异常, 请查阅日志!')
      } else {
        let res = data.match(new RegExp('(?=<span.*class="counter".*>).*?(?=</span)', 'gi'))
        const [memberDuration, remainTraffic] = res.map((item) => item.replace(/[^\d|.]*/gi, ''))
        const todayTraffic = unescape(data.match(new RegExp('(?=今日已用).*?(?=<)')))
        data = data.replace(/\r\n/g, '')
        data = data.replace(/\n/g, '')
        data = data.replace(/\s/g, '')
        const expirationDate = unescape(data.match(new RegExp('(?=標準套餐節點).*?(?=<)')))
        const msg = `会员时长: ${memberDuration} 天\n剩余流量: ${remainTraffic}TB  ${todayTraffic}\n${expirationDate}`
        magicJS.logInfo(msg)
        // notify(msg)
        resolve(msg)
      }
    })
  })
}

;(async () => {
  try {
    const cookie = magicJS.read(airtcpCookieKey)
    if (!cookie) return notify(`cookie不存在!`)
    const res = await checkin(cookie)
    const trafficMsg = await getAirTcpTraffic(cookie)
    notify(scriptName, `${res}\n${trafficMsg}`)
  } catch (error) {
    notify(scriptName, error)
  }
})()
