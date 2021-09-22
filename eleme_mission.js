/*
cron 0 10 * * * eleme_mission.js
饿了么领取任务

*/

// const $ = new Env('饿了么领取任务')
const MagicJS = require('./magic')
const notify = require('./sendNotify').sendNotify
const scriptName = '饿了么'
const elemeCookieKey = 'eleme_app_cookie'
const elemeLongitudeKey = 'eleme_app_longitude'
const elemeLatitudeKey = 'eleme_app_latitude'
// 以下条件是AND的关系
const taskKeywords = ['美食外卖'] // 任务JSON中含有此关键字的任务才会领取
const requiredOrderAmount = 4 // 需要完成订单数量小于等于此数的任务才会领取

let magicJS = MagicJS(scriptName, 'INFO')

// 获取超级会员任务列表
function GetSuperVipMissions(cookie, longitude, latitude) {
  return new Promise((resolve, reject) => {
    let options = {
      url: `https://h5.ele.me/restapi/svip_biz/v1/supervip/query_mission_list?longitude=${longitude}&latitude=${latitude}`,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-cn',
        Connection: 'keep-alive',
        Cookie: cookie,
        Host: 'h5.ele.me',
        Referer: 'https://h5.ele.me/svip/home?entryStat=profile',
        'User-Agent': 'Rajax/1 Apple/iPhone10,3 iOS/14.2 Eleme/9.3.8',
        'f-pTraceId': 'WVNet_WV_2-3-30',
        'f-refer': 'wv_h5',
        'x-shard': `loc=${longitude},${latitude}`,
      },
    }
    magicJS.get(options, (err, resp, data) => {
      if (err) {
        magicJS.logError(`获取会员任务失败，请求异常：${err}`)
        reject('❌获取会员任务失败，请求异常，请查阅日志！')
      } else {
        try {
          magicJS.logInfo(`获取会员任务，接口响应：${data}`)
          let obj = typeof data === 'string' ? JSON.parse(data) : data
          if (obj) {
            let result = []
            obj.missions.forEach((element) => {
              let missionInfo = JSON.stringify(element)
              let flag = false
              for (keyword of taskKeywords) {
                if (
                  missionInfo.indexOf(keyword) >= 0 &&
                  element.required_order_amount <= requiredOrderAmount
                ) {
                  flag = true
                  break
                }
              }
              if (flag === true) {
                result.push(element.mission_id)
              }
            })
            resolve(result)
          } else {
            magicJS.logWarning(`没有可领取的会员任务，接口响应：${data}`)
            reject('❌没有可领取的会员任务，请查阅日志！')
          }
        } catch (err) {
          magicJS.logError(`获取会员任务失败，执行异常：${err}，接口响应：${data}`)
          reject('❌获取会员任务失败，执行异常，请查阅日志！')
        }
      }
    })
  })
}

// 接受超级会员任务列表中的任务
function AcceptMission(cookie, longitude, latitude, mission_id) {
  let _mission_id = encodeURIComponent(mission_id)
  return new Promise((resolve, reject) => {
    let options = {
      url: `https://h5.ele.me/restapi/svip_biz/v1/supervip/accept_mission?type=0&receiveType=1&mission_id=${_mission_id}`,
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
        'User-Agent': 'Rajax/1 Apple/iPhone10,3 iOS/14.5.1 Eleme/9.8.5',
        'f-pTraceId': 'WVNet_WV_1-1-40',
        'f-refer': 'wv_h5',
        'x-shard': 'loc=121.52699279785156,31.2293643951416',
      },
      body: {
        longitude: longitude,
        latitude: latitude,
      },
    }
    magicJS.post(options, (err, resp, data) => {
      if (err) {
        magicJS.logError(`领取会员任务失败，任务Id：${mission_id}，请求异常：${err}`)
        reject(`领取会员任务失败，任务Id：${mission_id}`)
      } else {
        try {
          let obj = typeof data === 'string' ? JSON.parse(data) : data
          if (obj.success === true) {
            magicJS.logInfo(
              `领取会员任务成功，任务Id：${mission_id}，任务描述：${obj.mission.checkout_description}`,
            )
            resolve(obj.mission.checkout_description)
          } else {
            magicJS.logError(`领取会员任务失败，任务Id：${mission_id}，响应异常：${data}`)
            reject(`领取会员任务失败，任务Id：${mission_id}`)
          }
        } catch (err) {
          magicJS.logError(`领取会员任务失败，任务Id：${mission_id}，执行异常：${err}，接口响应：${data}`)
          reject(`领取会员任务失败，任务Id：${mission_id}`)
        }
      }
    })
  })
}

;(async () => {
  let subTitle = ''
  let content = ''
  let cookie = magicJS.read(elemeCookieKey)
  let longitude = magicJS.read(elemeLongitudeKey)
  let latitude = magicJS.read(elemeLatitudeKey)
  if (!!!cookie) {
    magicJS.logWarning('没有读取到Cookie，请先从App中获取一次Cookie！')
    content = '❓没有读取到有效Cookie，请先从App中获取Cookie!!'
  } else {
    // 领取会员任务
    let [getMissionErr, missions] = await magicJS.attempt(
      magicJS.retry(GetSuperVipMissions, 3, 2000)(cookie, longitude, latitude),
      [],
    )
    if (getMissionErr) {
      subTitle = getMissionErr
    } else if (missions.length == 0) {
      magicJS.log(
        '领取任务失败，没有发现符合要求的任务。请查阅任务返回JSON，确认是否因为任务描述改变而无法领取。',
      )
      subTitle = '❌没有符合要求的任务可以领取'
    } else {
      magicJS.logDebug(`获取待领取的任务Id：${JSON.stringify(missions)}`)
      let acceptMissionList = []
      content = '会员任务领取结果：'
      for (let i = 0; i < missions.length; i++) {
        let [acceptErr, acceptResult] = await magicJS.attempt(
          AcceptMission(cookie, longitude, latitude, missions[i]),
          null,
        )
        if (acceptResult) {
          acceptMissionList.push(missions[i])
          content += `\n${acceptResult}`
        }
        magicJS.logInfo(`成功领取的任务Id：${JSON.stringify(acceptMissionList)}`)
      }
      if (acceptMissionList.length <= 0) {
        content += '\n没有领取任何任务'
      }
    }
  }
  // 通知
  notify(`${scriptName}`, `${subTitle}\n${content}`)
  magicJS.done()
})()
