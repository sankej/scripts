/*
cron 10 0 * * * eleme_daily.js
饿了么领取吃货豆

*/

// const $ = new Env('饿了么领取吃货豆')
const MagicJS = require('./magic')
const notify = require('./sendNotify').sendNotify
const scriptName = '饿了么'
const getCookieRegex =
  /^https?:\/\/h5\.ele\.me\/restapi\/biz\.svip_scene\/svip\/engine\/queryTrafficSupply\?.*longitude=([^&]*).*latitude=([^&]*)/
const elemeCookieKey = 'eleme_app_cookie'
const elemeLongitudeKey = 'eleme_app_longitude'
const elemeLatitudeKey = 'eleme_app_latitude'

let magicJS = MagicJS(scriptName, 'INFO')
// magicJS.unifiedPushUrl =
// magicJS.read('eleme_app_unified_push_url') || magicJS.read('magicjs_unified_push_url')

let cookie = magicJS.read(elemeCookieKey)

// 获取待领取的吃货豆列表
function GetPeaList(cookie, longitude, latitude) {
  return new Promise((resolve, reject) => {
    let options = {
      url: `https://h5.ele.me/restapi/biz.svip_core/v1/foodie/homepage?longitude=${longitude}&latitude=${latitude}`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-cn',
        Connection: 'keep-alive',
        Cookie: cookie,
        Host: 'h5.ele.me',
        Referer: 'https://h5.ele.me/svip/home?entryStat=profile',
        'User-Agent': 'Rajax/1 Apple/iPhone10,3 iOS/14.2 Eleme/9.3.8',
        'f-pTraceId': 'WVNet_WV_2-3-74',
        'f-refer': 'wv_h5',
        'x-shard': `loc=${longitude},${latitude}`,
      },
    }
    magicJS.get(options, (err, resp, data) => {
      if (err) {
        magicJS.logError(`获取待领取的吃货豆失败，请求异常：${err}`)
        reject('获取待领取的吃货豆失败，请求异常，请查阅日志！')
      } else {
        try {
          magicJS.logDebug(`获取待领取吃货豆列表响应结果：${data}`)
          let obj = typeof data === 'string' ? JSON.parse(data) : data
          if (obj.success === true) {
            let peaList = []
            obj.foodiePeaBlock.peaList.forEach((element) => {
              peaList.push({ id: element.id, count: element.count, description: element.description })
            })
            magicJS.logInfo(`获取待领取的吃货豆成功：${JSON.stringify(peaList)}`)
            resolve(peaList)
          } else {
            magicJS.logError(`获取待领取的吃货豆失败，响应异常：${data}`)
            reject('获取待领取的吃货豆失败，响应异常，请查阅日志！')
          }
        } catch (err) {
          magicJS.logError(`获取待领取的吃货豆失败，执行异常：${err}，接口响应：${data}`)
          reject('获取待领取的吃货豆失败，执行异常，请查阅日志！')
        }
      }
    })
  })
}

// 领取吃货豆
function DrawPea(cookie, peaId, longitude, latitude) {
  return new Promise((resolve, reject) => {
    let options = {
      url: `https://h5.ele.me/restapi/biz.svip_bonus/v1/users/supervip/pea/draw?peaId=${peaId}`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-cn',
        Connection: 'keep-alive',
        'Content-Type': 'application/json;charset=utf-8',
        Cookie: cookie,
        Host: 'h5.ele.me',
        Origin: 'https://h5.ele.me',
        Referer: 'https://h5.ele.me/svip/home?entryStat=profile',
        'User-Agent': 'Rajax/1 Apple/iPhone10,3 iOS/14.2 Eleme/9.3.8',
        'f-pTraceId': 'WVNet_WV_2-3-73',
        'f-refer': 'wv_h5',
        'x-shard': `loc=${longitude},${latitude}`,
      },
      body: JSON.stringify({
        longitude: longitude,
        latitude: latitude,
      }),
    }
    magicJS.post(options, (err, resp, data) => {
      if (err) {
        magicJS.logError(`领取吃货豆失败，请求异常：${err}`)
        reject('领取吃货豆失败，请求异常，请查阅日志！')
      } else {
        try {
          magicJS.logDebug(`领取吃货豆响应结果：${data}`)
          let obj = typeof data === 'string' ? JSON.parse(data) : data
          if (obj.success === true) {
            magicJS.logInfo(`领取吃货豆成功：${data}`)
            resolve(true)
          } else {
            magicJS.logError(`领取吃货豆失败，响应异常：${data}`)
            reject('领取吃货豆失败，响应异常，请查阅日志！')
          }
        } catch (err) {
          magicJS.logError(`领取吃货豆失败，执行异常：${err}，接口响应：${data}`)
          reject('领取吃货豆失败，执行异常，请查阅日志！')
        }
      }
    })
  })
}

;(async () => {
  if (magicJS.isRequest) {
    if (getCookieRegex.test(magicJS.request.url) && magicJS.request.method == 'GET') {
      GetCookie()
    }
  } else {
    let subTitle = ''
    let content = ''
    let cookie = magicJS.read(elemeCookieKey)
    let longitude = magicJS.read(elemeLongitudeKey)
    let latitude = magicJS.read(elemeLatitudeKey)
    if (!!!cookie) {
      magicJS.logWarning('没有读取到Cookie，请先从App中获取一次Cookie！')
      content = '❓没有读取到有效Cookie，请先从App中获取Cookie!!'
    } else {
      // 获取待领取的吃货豆
      let [getPeaListErr, peaList] = await magicJS.attempt(GetPeaList(cookie, longitude, latitude), [])
      content = '吃货豆领取结果：'
      if (getPeaListErr) {
        content += '\n获取待领取的吃货豆异常，请查阅日志'
      } else if (peaList.length == 0) {
        content += '\n没有发现待领取的吃货豆'
      } else {
        let peaCount = 0
        let drawPeaContent = ''
        for (let j = 0; j < peaList.length; j++) {
          let [drawPeaErr, result] = await magicJS.attempt(
            DrawPea(cookie, peaList[j].id, longitude, latitude),
            false,
          )
          if (drawPeaErr || result === false) {
            drawPeaContent += `\n${peaList[j].description}-${peaList[j].count}吃货豆-领取失败`
          } else {
            peaCount += peaList[j].count
            drawPeaContent += `\n${peaList[j].description}-${peaList[j].count}吃货豆-领取成功`
          }
          await magicJS.sleep(1000)
        }
        content += `\n本次共领取吃货豆${peaCount}个${drawPeaContent}`
      }
    }
    // 通知
    notify(`${scriptName}-${subTitle}`, content)
  }
  magicJS.done()
})()
