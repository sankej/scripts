/*
cron 25 0 * * * pt_signin.js
PT签到

*/

// const $ = new Env('PT签到')
const got = require('got')
const notify = require('./sendNotify').sendNotify

const headers = {
  accept: '*/*',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'zh-GB,zh-CN;q=0.9,zh;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  'content-type': 'application/x-www-form-urlencoded',
  pragma: 'no-cache',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
}

const sites = [
  { name: 'hdarea', url: 'https://www.hdarea.co/sign_in.php', method: 'POST', body: 'action=sign_in' },
  {
    name: 'hdatmos',
    url: 'https://hdatmos.club/attendance.php',
    method: 'GET',
    outputFn: (data) => {
      if (data.includes('签到成功')) {
        return data.match(new RegExp('(?<=<p>).*?(?=</p)', 'gi'))[0]
      }
      return data.match(new RegExp('(?<=<td.*class="text".*>).*?(?=</td)', 'gi'))[0]
    },
  },
]

const genMsg = (name, msg) => `站点: ${name}, msg: ${msg}`

const signin = async ({ name, url, method, body, outputFn }) => {
  try {
    const cookie = process.env[name]

    if (!cookie) return genMsg(name, 'cookie不存在')

    const options = {
      url,
      method,
      headers: {
        ...headers,
        cookie,
      },
      body,
    }

    method === 'GET' && delete options.body

    const result = await got(options)

    return genMsg(name, outputFn ? outputFn(result.body) : result.body)
  } catch (error) {
    console.log(error)
    return genMsg(name, '签到失败，请重新获取cookie')
  }
}

;(async () => {
  const tasks = sites.map((item) => signin(item))
  const res = await Promise.all(tasks)
  const msg = res.join('\n')
  notify(scriptName, msg)
})()
