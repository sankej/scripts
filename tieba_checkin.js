/*
cron 20 0 * * * tieba_checkin.js
贴吧签到

*/

// const $ = new Env('贴吧签到')
const MagicJS = require('./magic')
const notify = require('./sendNotify').sendNotify
const scirptName = '百度贴吧'
const batchSize = 20
const retries = 5 // 签到失败重试次数
const interval = 2000 // 每次重试间隔
const tiebaCookieKey = 'tieba_checkin_cookie'
const tiebeGetCookieRegex = /https?:\/\/(c\.tieba\.baidu\.com|180\.97\.\d+\.\d+)\/c\/s\/login/
const tiebeNewVersionGetCookieRegex = /^https?:\/\/c\.tieba\.baidu\.com\/c\/s\/channelIconConfig/
let magicJS = MagicJS(scirptName, 'INFO')
magicJS.unifiedPushUrl = magicJS.read('tieba_unified_push_url') || magicJS.read('magicjs_unified_push_url')

let getTiebaListOptions = {
  url: 'https://tieba.baidu.com/mo/q/newmoindex',
  headers: {
    'Content-Type': 'application/octet-stream',
    Referer: 'https://tieba.baidu.com/index/tbwise/forum',
    Cookie: '',
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16A366',
  },
  body: '',
}

let tiebaCheckInOptions = {
  url: 'https://tieba.baidu.com/sign/add',
  headers: {
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding': 'gzip,deflate,br',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    Connection: 'keep-alive',
    Cookie: '',
    Host: 'tieba.baidu.com',
    Referer: 'https://tieba.baidu.com/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36 Edg/84.0.522.63',
  },
  body: '',
}

function GetTieBaList(cookie) {
  return new Promise((resolve, reject) => {
    getTiebaListOptions.headers.Cookie = cookie
    magicJS.get(getTiebaListOptions, (err, resp, data) => {
      if (err) {
        magicJS.logError(`获取贴吧列表失败，请求异常：${err}`)
        reject(err)
      } else {
        try {
          let obj = JSON.parse(data)
          if (obj.error === 'success') {
            resolve([obj.data.tbs, obj.data.like_forum])
          } else {
            magicJS.logWarning(`获取贴吧列表失败，接口响应不合法：${data}`)
            reject('获取贴吧列表失败')
          }
        } catch (err) {
          magicJS.logError(`获取贴吧列表失败，执行异常：${err}`)
          reject(err)
        }
      }
    })
  })
}

function TiebaCheckIn(cookie, tbs, tieba) {
  return new Promise((resolve, reject) => {
    let kw = tieba['forum_name']
    if (tieba['is_sign'] === 1) {
      resolve(`[${kw}] 重复签到`)
    } else {
      tiebaCheckInOptions.headers.Cookie = cookie
      tiebaCheckInOptions.body = `tbs=${tbs}&kw=${kw}&ie=utf-8`
      magicJS.post(tiebaCheckInOptions, (err, resp, data) => {
        if (err) {
          magicJS.logError(`[${kw}] 签到失败，请求异常：${err}`)
          reject(err)
        } else {
          try {
            let obj = JSON.parse(data)
            if (obj.data.errmsg === 'success' && obj.data.errno === 0 && obj.data.uinfo.is_sign_in === 1) {
              let msg = `[${kw}] 签到成功 排名 ${obj.data.uinfo.user_sign_rank} 积分 ${obj.data.uinfo.cont_sign_num}`
              magicJS.logInfo(msg)
              resolve(msg)
            } else if (obj.no === 2150040) {
              magicJS.logDebug(`[${kw}] need vcode，接口响应：${data}`)
              reject(`[${kw}] 签到失败，need vcode`)
            } else if (obj.no === 1011) {
              magicJS.logDebug(`[${kw}] 未加入此吧或等级不够，接口响应：${data}`)
              reject(`[${kw}] 未加入此吧或等级不够`)
            } else if (obj.no === 1102) {
              magicJS.logDebug(`[${kw}] 签到过快，接口响应：${data}`)
              reject(`[${kw}] 签到过快`)
            } else if (obj.no === 1101) {
              magicJS.logDebug(`[${kw}] 重复签到，接口响应：${data}`)
              resolve(`[${kw}] 重复签到`)
            } else {
              magicJS.logWarning(`[${kw}] 签到失败，接口响应不合法：${data}`)
              reject(`[${kw}] 签到失败`)
            }
          } catch (err) {
            magicJS.logError(`${kw} 签到失败，执行异常：${err}`)
            reject(`[${kw}] 执行异常`)
          }
        }
      })
    }
  })
}

;(async () => {
  if (
    magicJS.isRequest &&
    (tiebeGetCookieRegex.test(magicJS.request.url) || tiebeNewVersionGetCookieRegex.test(magicJS.request.url))
  ) {
    let cookie = magicJS.request.headers.Cookie
    let hisCookie = magicJS.read(tiebaCookieKey)
    magicJS.logDebug(`当前贴吧Cookie：\n${cookie}\n历史贴吧Cookie：\n${hisCookie}`)
    if (!!cookie && cookie === hisCookie) {
      magicJS.logInfo(`贴吧Cookie没有变化，无需更新。`)
    } else if (!!cookie && cookie !== hisCookie) {
      magicJS.write(tiebaCookieKey, cookie)
      notify(`🎈获取贴吧Cookie成功！！`)
    } else {
      notify(`❌获取贴吧Cookie出现异常！！`)
    }
  } else {
    let cookie = magicJS.read(tiebaCookieKey)
    let content = '🥺很遗憾，以下贴吧签到失败：'
    if (!!cookie === false) {
      notify('❓请先获取有效的贴吧Cookie！！')
    } else {
      let [tbs, tiebaList] = await magicJS.retry(GetTieBaList, retries, interval)(cookie)
      let tiebaCount = tiebaList.length
      let cycleNumber = Math.ceil(tiebaList.length / batchSize)
      let [success, failed] = [0, 0]
      for (let i = 0; i < cycleNumber; i++) {
        let batchTiebaPromise = []
        let batchTiebaList = tiebaList.splice(0, batchSize)
        for (let tieba of batchTiebaList) {
          batchTiebaPromise.push(
            magicJS.attempt(magicJS.retry(TiebaCheckIn, retries, interval)(cookie, tbs, tieba)),
          )
        }
        await Promise.all(batchTiebaPromise).then((result) => {
          result.forEach((element) => {
            if (element[0] !== null) {
              failed += 1
              content += `\n${element[0]}`
            } else {
              success += 1
            }
          })
        })
      }
      notify(
        scirptName,
        `签到${tiebaCount}个，成功${success}个，失败${failed}个`,
        !!failed > 0 ? content : '🎉恭喜，所有贴吧签到成功！！',
      )
    }
  }
  magicJS.done()
})()
