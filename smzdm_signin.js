/*
cron 20 0 * * * smzdm_signin.js
什么值得买签到

*/

// const $ = new Env('什么值得买签到')
const MagicJS = require('./magic')
const notify = require('./sendNotify').sendNotify
const zhiyouRegex = /^https?:\/\/zhiyou\.smzdm\.com\/user$/
const smzdmCookieKey = 'smzdm_cookie'
const scriptName = '什么值得买'
let magicJS = MagicJS(scriptName, 'INFO')
function randomStr() {
  let len = 17
  let char = '0123456789'
  let str = ''
  for (i = 0; i < len; i++) {
    str += char.charAt(Math.floor(Math.random() * char.length))
  }
  return str
}

// Web端签到
function WebSignin(cookie) {
  return new Promise((resolve, reject) => {
    let ts = Date.parse(new Date())
    let options = {
      url: `https://zhiyou.smzdm.com/user/checkin/jsonp_checkin?callback=jQuery11240${randomStr()}_${ts}&_=${
        ts + 3
      }`,
      headers: {
        Accept: '*/*',
        'Accept-Language': 'zh-cn',
        Connection: 'keep-alive',
        Host: 'zhiyou.smzdm.com',
        Referer: 'https://www.smzdm.com/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Safari/605.1.15',
        Cookie: cookie,
      },
    }
    magicJS.get(options, (err, resp, data) => {
      if (err) {
        magicJS.logWarning('Web端签到出现异常:' + err)
        reject('Web:签到异常')
      } else {
        try {
          let checkin_data = /\((.*)\)/.exec(data)
          if (checkin_data) {
            let checkin_obj = JSON.parse(checkin_data[1])
            if (!!checkin_obj && checkin_obj.hasOwnProperty('error_code')) {
              if (checkin_obj.error_code == -1) {
                magicJS.logWarning(`Web端签到出现异常，网络繁忙，接口返回：${data}`)
                reject('Web:网络繁忙')
              } else if (checkin_obj['error_code'] == 99) {
                magicJS.logWarning('Web端Cookie已过期')
                resolve([false, 'Web:Cookie过期'])
              } else if (checkin_obj['error_code'] == 0) {
                magicJS.logInfo('Web:签到成功')
                resolve([true, 'Web:签到成功'])
              } else {
                magicJS.logWarning(`Web端签到出现异常，接口返回数据不合法：${data}`)
                reject('Web:返回错误')
              }
            }
          } else {
            magicJS.logWarning(`Web端签到出现异常，接口返回数据不存在：${data}`)
            reject('Web:签到异常')
          }
        } catch (err) {
          magicJS.logWarning(`Web端签到出现异常，代码执行异常：${err}，接口返回：${data}`)
          reject('Web:执行异常')
        }
      }
    })
  })
}
/**
 * APP端签到
 * 感谢：
 * https://github.com/wangfei021325
 * https://github.com/chavyleung
 */
function AppSignin(cookie) {
  function GetAppSigninBody() {
    let ts = new Date().getTime()
    let token = /sess=([^;]*)/.exec(cookie)[1]
    let sign = hex_md5(
      `f=android&sk=1&time=${ts}&token=${token}&v=10.0&weixin=0&key=apr1$AwP!wRRT$gJ/q.X24poeBInlUJC`,
    ).toUpperCase()
    return `touchstone_event=&v=10.0&sign=${sign}&weixin=0&time=${ts}&sk=1&token=${token}&f=android&captcha=`
  }
  let options = {
    url: 'https://user-api.smzdm.com/checkin',
    headers: {
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-Hans-CN;q=1, en-CN;q=0.9',
      Connection: 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
      Host: 'user-api.smzdm.com',
    },
    body: GetAppSigninBody(),
  }
  return new Promise((resolve, reject) => {
    magicJS.post(options, (err, resp, data) => {
      if (err) {
        magicJS.logError(`APP签到失败，请求异常：${err}`)
        reject('❌APP签到失败，请求异常，请查阅日志！')
      } else {
        try {
          magicJS.logDebug(`App签到接口返回：${data}`)
          let obj = typeof data === 'string' ? JSON.parse(data) : data
          if (obj.error_code === '0' && obj.error_msg === '已签到') {
            resolve('APP:重复签到')
          }
          if (obj.error_code === '0' && obj.error_msg.indexOf('签到成功') >= 0) {
            resolve('APP:签到成功')
          } else {
            reject('APP:签到异常')
          }
        } catch (err) {
          magicJS.logError(`App签到失败，执行异常：${err}，接口响应：${data}`)
          reject('❌App签到失败，执行异常，请查阅日志！')
        }
      }
    })
  })
}
// 获取用户信息，新版
function WebGetCurrentInfoNewVersion(smzdmCookie) {
  return new Promise((resolve) => {
    let options = {
      url: 'https://zhiyou.smzdm.com/user/exp/',
      headers: {
        Cookie: smzdmCookie,
      },
      body: '',
    }
    magicJS.get(options, (err, resp, data) => {
      if (err) {
        magicJS.logError(`获取用户信息失败，异常信息：${err}`)
        resolve([null, null, null, null, null, null, null])
      } else {
        try {
          // 获取用户名
          let userName = data.match(/info-stuff-nickname.*zhiyou\.smzdm\.com\/user[^<]*>([^<]*)</)[1].trim()
          // 获取近期经验值变动情况
          let pointTimeList = data.match(/<div class="scoreLeft">(.*)<\/div>/gi)
          let pointDetailList = data.match(/<div class=['"]scoreRight ellipsis['"]>(.*)<\/div>/gi)
          let minLength =
            pointTimeList.length > pointDetailList.length ? pointDetailList.length : pointTimeList.length
          let userPointList = []
          for (let i = 0; i < minLength; i++) {
            userPointList.push({
              time: pointTimeList[i].match(/\<div class=['"]scoreLeft['"]\>(.*)\<\/div\>/)[1],
              detail: pointDetailList[i].match(/\<div class=['"]scoreRight ellipsis['"]\>(.*)\<\/div\>/)[1],
            })
          }
          // 获取用户资源
          let assetsNumList = data.match(/assets-part[^<]*>(.*)</gi)
          let points = assetsNumList[0].match(/assets-num[^<]*>(.*)</)[1] // 积分
          let experience = assetsNumList[2].match(/assets-num[^<]*>(.*)</)[1] // 经验
          let gold = assetsNumList[4].match(/assets-num[^<]*>(.*)</)[1] // 金币
          // let prestige = assetsNumList[6].match(/assets-num[^<]*>(.*)</)[1]; // 威望
          let prestige = 0
          let silver = assetsNumList[6].match(/assets-num[^<]*>(.*)</)[1] // 碎银子
          resolve([
            userName,
            userPointList,
            Number(points),
            Number(experience),
            Number(gold),
            Number(prestige),
            Number(silver),
          ])
        } catch (err) {
          magicJS.logError(`获取用户信息失败，异常信息：${err}`)
          resolve([null, null, null, null, null, null, null])
        }
      }
    })
  })
}
// 获取用户信息
function WebGetCurrentInfo(smzdmCookie) {
  return new Promise((resolve) => {
    let webGetCurrentInfo = {
      url: `https://zhiyou.smzdm.com/user/info/jsonp_get_current?with_avatar_ornament=1&callback=jQuery112403507528653716241_${new Date().getTime()}&_=${new Date().getTime()}`,
      headers: {
        Accept:
          'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Connection: 'keep-alive',
        DNT: '1',
        Host: 'zhiyou.smzdm.com',
        Referer: 'https://zhiyou.smzdm.com/user/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
        Cookie: smzdmCookie,
      },
    }
    magicJS.get(webGetCurrentInfo, (err, resp, data) => {
      try {
        let obj = JSON.parse(/\((.*)\)/.exec(data)[1])
        if (obj['smzdm_id'] !== 0) {
          resolve([
            obj['nickname'], // 昵称
            `https:${obj['avatar']}`, // 头像
            obj['vip_level'], // 新版VIP等级
            obj['checkin']['has_checkin'], //是否签到
            Number(obj['checkin']['daily_checkin_num']), //连续签到天数
            Number(obj['unread']['notice']['num']), // 未读消息
            Number(obj['level']), // 旧版等级
            Number(obj['exp']), // 旧版经验
            Number(obj['point']), // 积分
            Number(obj['gold']), // 金币
            Number(obj['silver']), // 碎银子
          ])
        } else {
          magicJS.logWarning(`获取用户信息异常，Cookie过期或接口变化：${data}`)
          resolve([null, null, null, null, null, false, null, null])
        }
      } catch (err) {
        magicJS.logError(`获取用户信息异常，代码执行异常：${err}，接口返回数据：${data}`)
        resolve([null, null, null, null, null, false, null, null])
      }
    })
  })
}
;(async () => {
  if (magicJS.isRequest && zhiyouRegex.test(magicJS.request.url) && magicJS.request.method == 'GET') {
    GetWebCookie()
  } else {
    // 通知信息
    let title = ''
    let subTitle = ''
    let content = ''
    // 获取Cookie
    let smzdmCookie = magicJS.read(smzdmCookieKey)
    if (!!smzdmCookie === false) {
      magicJS.logWarning('没有读取到什么值得买有效cookie，请访问zhiyou.smzdm.com进行登录')
      notify(scriptName, '❓没有获取到Web端Cookie，请先进行登录。')
    } else {
      try {
        // 查询签到前用户数据
        let [
          nickName,
          avatar,
          beforeVIPLevel,
          beforeHasCheckin,
          ,
          beforeNotice,
          ,
          ,
          beforePoint,
          beforeGold,
          beforeSilver,
        ] = await WebGetCurrentInfo(smzdmCookie)
        if (!nickName) {
          notify(scriptName, '❌Cookie过期或接口变化，请尝试重新登录')
          magicJS.done()
        } else {
          let [, , , beforeExp, , beforePrestige] = await WebGetCurrentInfoNewVersion(smzdmCookie)
          magicJS.logInfo(
            `昵称：${nickName}\nWeb端签到状态：${beforeHasCheckin}\n签到前等级${beforeVIPLevel}，积分${beforePoint}，经验${beforeExp}，金币${beforeGold}，碎银子${beforeSilver}， 未读消息${beforeNotice}`,
          )
          // Web端签到及重试
          let webCheckinRetry = magicJS.retry(WebSignin, 5, 500)
          let [webCheckinErr, [webCheckinResult, webCheckinStr]] = await magicJS.attempt(
            webCheckinRetry(smzdmCookie),
            [false, 'Web端签到异常'],
          )
          if (webCheckinErr) {
            magicJS.logWarning('Web端签到异常：' + webCheckinErr)
            notify(webCheckinErr)
          } else {
            subTitle = webCheckinStr
            // APP签到
            // await magicJS.sleep(5000);
            // await AppSignin(smzdmCookie).then(signinStr => {
            //   subTitle += ` ${signinStr}`;
            // }).catch(ex =>{
            //   subTitle += ` ${ex}`;
            // })
            // 查询签到后用户数据
            await magicJS.sleep(3000)
            let [
              ,
              ,
              afterVIPLevel,
              afterHasCheckin,
              afterCheckinNum,
              afterNotice,
              ,
              ,
              afterPoint,
              afterGold,
              afterSilver,
            ] = await WebGetCurrentInfo(smzdmCookie)
            let [, afteruserPointList, , afterExp, , afterPrestige] = await WebGetCurrentInfoNewVersion(
              smzdmCookie,
            )
            magicJS.logInfo(
              `昵称：${nickName}\nWeb端签到状态：${afterHasCheckin}\n签到后等级${afterVIPLevel}，积分${afterPoint}，经验${afterExp}，金币${afterGold}，碎银子${afterSilver}，未读消息${afterNotice}`,
            )
            if (beforeHasCheckin && afterHasCheckin) {
              webCheckinStr = 'Web端重复签到'
            }
            if (!!afterCheckinNum) content += `已连续签到${afterCheckinNum}天`
            // 通知内容
            if (afterExp && beforeExp) {
              let addPoint = afterPoint - beforePoint
              let addExp = afterExp - beforeExp
              let addGold = afterGold - beforeGold
              // let addPrestige = afterPrestige - beforePrestige;
              let addSilver = afterSilver - beforeSilver
              content += !!content ? '\n' : ''
              content +=
                '积分' +
                afterPoint +
                (addPoint > 0 ? '(+' + addPoint + ')' : '') +
                ' 经验' +
                afterExp +
                (addExp > 0 ? '(+' + addExp + ')' : '') +
                ' 金币' +
                afterGold +
                (addGold > 0 ? '(+' + addGold + ')' : '') +
                '\n' +
                '碎银子' +
                afterSilver +
                (addSilver > 0 ? '(+' + addSilver + ')' : '') +
                // ' 威望' + afterPrestige + (addPrestige > 0 ? '(+' + addPrestige + ')' : '') +
                ' 未读消息' +
                afterNotice
            }
            title = `${scriptName} - ${nickName} V${afterVIPLevel}`
            notify(title, `${subTitle}\n${content}`)
          }
        }
      } catch (err) {
        magicJS.logError(`签到出现异常：${err}`)
        notify(scriptName, '❌签到出现异常，请查阅日志')
      }
    }
  }
  magicJS.done()
})()
