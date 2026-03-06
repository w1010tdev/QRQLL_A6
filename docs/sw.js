/* QRQLL 静态模拟服务 — Service Worker
 * 拦截青鹿教学系统的 API 请求并返回模拟数据，无需后端服务器。
 * special_homework 功能暂未实现。
 */

'use strict';

// ── 作业数据 ──────────────────────────────────────────────────────────────────
const HOMEWORK_DATA = [
  { id: '1867975578577879042', name: '百度搜索', lessonName: '数学', url: 'https://baidu.com' },
  { id: '242799',              name: 'CSTimer',  lessonName: '数学', url: 'https://cstimer.net/' }
];

// ── 工具函数 ──────────────────────────────────────────────────────────────────

/** 构造统一的 JSON 成功响应 */
function jsonOk(result, message) {
  result  = result  !== undefined ? result  : {};
  message = message !== undefined ? message : '';
  return new Response(
    JSON.stringify({ status: 0, message: message, result: result }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}

/** 从 URL 查询参数或已解析的 POST 表单中取值 */
function getParam(url, postParams, name, defaultVal) {
  defaultVal = defaultVal !== undefined ? defaultVal : '';
  var v = url.searchParams.get(name);
  if (v !== null) return v;
  if (postParams) { v = postParams.get(name); if (v !== null) return v; }
  return defaultVal;
}

/** 返回当前时间字符串 "YYYY-MM-DD HH:MM:SS" */
function nowStr() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ── 业务逻辑 ──────────────────────────────────────────────────────────────────

function buildHomeworkList(pageIndex, pageSize) {
  var now   = nowStr();
  var start = (pageIndex - 1) * pageSize;
  var slice = HOMEWORK_DATA.slice(start, start + pageSize);
  return {
    pageIndex:   pageIndex,
    pageSize:    pageSize,
    pageCount:   Math.ceil(HOMEWORK_DATA.length / pageSize),
    recordCount: HOMEWORK_DATA.length,
    data: slice.map(function(hw) {
      return {
        publishTime:      now,
        homeworkId:       hw.id,
        homeworkName:     hw.name,
        lessonName:       hw.lessonName,
        lessonId:         '1001',
        startTime:        now,
        endTime:          null,
        publishAnswerTime:'0',
        submitStatus:     0,
        redoQuestionNums: null
      };
    })
  };
}

/* x-frame-bypass 内联脚本（原样保留，以便青鹿客户端在 iframe 中加载外部页面）。
 * 该字符串会被注入到作业详情的 HTML content 字段中。               */
var X_FRAME_BYPASS_SCRIPT = [
  '<script>',
  "customElements.define('x-frame-bypass', class extends HTMLIFrameElement {",
  "  static get observedAttributes() { return ['src'] }",
  "  constructor() { super() }",
  "  attributeChangedCallback() { this.load(this.src) }",
  "  connectedCallback() {",
  "    this.sandbox = '' + this.sandbox ||",
  "      'allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation'",
  '  }',
  '  load(url, options) {',
  '    if (!url) return',
  "    if (!url.startsWith('http')) throw new Error('X-Frame-Bypass src ' + url + ' does not start with http(s)://')",
  "    console.log('X-Frame-Bypass loading:', url)",
  "    this.srcdoc = '<!DOCTYPE html><html><head><style>.loader { position: absolute; top: calc(50% - 25px); left: calc(50% - 25px); width: 50px; height: 50px; background-color: #333; border-radius: 50%; animation: loader 1s infinite ease-in-out; } @keyframes loader { 0% { transform: scale(0); } 100% { transform: scale(1); opacity: 0; } }</style></head><body><div class=\"loader\"></div></body></html>'",
  "    this.fetchProxy(url, options, 0).then(function(res) { return res.text() }).then(function(data) {",
  '      if (data) {',
  "        var base = '<base href=\"' + url + '\">'",
  "        this.srcdoc = data.replace(/<head([^>]*)>/i, '<head$1>' + base).replace(/ crossorigin=['\"][^'\"]*['\"]/gi, '')",
  '      }',
  "    }.bind(this)).catch(function(e) { console.error('Cannot load X-Frame-Bypass:', e) })",
  '  }',
  '  fetchProxy(url, options, i) {',
  '    var proxies = (options || {}).proxies || [',
  "      'https://api.allorigins.win/raw?url=',",
  "      'https://api.codetabs.com/v1/proxy/?quest=',",
  "      'https://cors-anywhere.herokuapp.com/',",
  "      'https://proxy.wenzixi.top/https://api.allorigins.win/raw?url=',",
  "      'https://proxy.wenzixi.top/https://api.codetabs.com/v1/proxy/?quest=',",
  "      'https://proxy.wenzixi.top/https://cors-anywhere.herokuapp.com/'",
  '    ]',
  '    return fetch(proxies[i] + encodeURIComponent(url), options).then(function(res) {',
  '      if (!res.ok) throw new Error(res.status + " " + res.statusText)',
  '      return res',
  '    }).catch(function(error) {',
  '      if (i === proxies.length - 1) throw error',
  '      return this.fetchProxy(url, options, i + 1)',
  '    }.bind(this))',
  '  }',
  "}, {extends: 'iframe'})",
  '<\/script>'
].join('\n');

function buildHomeworkDetail(homeworkId) {
  var hw = null;
  for (var i = 0; i < HOMEWORK_DATA.length; i++) {
    if (HOMEWORK_DATA[i].id === homeworkId) { hw = HOMEWORK_DATA[i]; break; }
  }
  if (!hw) hw = HOMEWORK_DATA[0];
  if (!hw) return {};

  var iframeUrl = hw.url;
  var hwName    = hw.name;

  var htmlContent =
    X_FRAME_BYPASS_SCRIPT +
    '<div style="width:91%">' +
    '<iframe is="x-frame-bypass" src="' + iframeUrl + '" allow="fullscreen" ' +
    'style="width:144vw;height:81vw;transform:scale(0.5);transform-origin:0 0;border:none">' +
    '</iframe></div><div style="width:70%">';

  return {
    id:                  homeworkId,
    name:                hwName,
    bizType:             21,
    createType:          null,
    publishAnswerStatus: 0,
    submitStatus:        0,
    taskId:              'TASK_' + homeworkId,
    hwPageInfoDTOs: [
      {
        id:                'PAGE_' + homeworkId,
        homeworkId:        homeworkId,
        pageType:          3,
        pageSeqNum:        1,
        needAnswerStatus:  0,
        pageStatus:        1,
        del:               0,
        createTime:        '2024-12-15 00:50:57',
        updateTime:        '2024-12-15 00:50:57',
        hwQuestionInfos: [
          {
            id:                   'Q_' + homeworkId,
            homeworkId:           homeworkId,
            typeId:               4,
            seqNum:               1,
            seqNumName:           '1',
            content:              htmlContent,
            answer:               '',
            del:                  0,
            studentAnswerDetails: []
          }
        ]
      }
    ],
    trajectoryPageDTOs: null
  };
}

// ── 路由表 ────────────────────────────────────────────────────────────────────
// key：去掉 GitHub Pages base path 后的 pathname
// value：function(url, postParams) => Response

var ROUTES = {
  '/qlBox-manager/getBindedSchoolInfo': function() {
    return jsonOk({ schoolId: 'LOCAL_SCHOOL', schoolName: 'QRQLL 模拟学校' });
  },

  '/classInApp/box/auth/tokenValid': function(url, p) {
    var username = getParam(url, p, 'j_username', 'student001');
    if (username === 'student001') username = getParam(url, p, 'username', 'student001');
    return jsonOk({
      userId: username, schoolKey: 'LOCAL_SCHOOL', schoolName: 'QRQLL 模拟学校',
      classroomId: 'C001', classroomName: '模拟教室', className: '模拟班级',
      loginIp: '127.0.0.1', classInSocketPort: '9000', token: 'mock-token-' + username,
      isBoxClass: true, isAirClass: false
    });
  },

  '/classInApp/serv-manager/j_spring_security_check': function(url, p) {
    var username = getParam(url, p, 'j_username', 'student001');
    if (username === 'student001') username = getParam(url, p, 'username', 'student001');
    return jsonOk({
      userId: username, schoolKey: 'LOCAL_SCHOOL', schoolName: 'QRQLL 模拟学校',
      classroomId: 'C001', classroomName: '模拟教室', className: '模拟班级',
      loginIp: '127.0.0.1', classInSocketPort: '9000', token: 'mock-token-' + username,
      isBoxClass: true, isAirClass: false
    });
  },

  '/classInApp/serv-teachplatform/pub/alive': function() {
    return jsonOk({ alive: true });
  },

  '/serv-teachplatform/courseware/student/selectShareFileList': function(url, p) {
    var pageIndex = parseInt(getParam(url, p, 'pageIndex', '1'),  10);
    var pageSize  = parseInt(getParam(url, p, 'pageSize',  '20'), 10);
    return jsonOk({ data: [], pageCount: 0, pageIndex: pageIndex, pageSize: pageSize, recordCount: 0 });
  },

  '/classInApp/serv-teachplatform/courseware/student/selectShareFileList': function(url, p) {
    var pageIndex = parseInt(getParam(url, p, 'pageIndex', '1'),  10);
    var pageSize  = parseInt(getParam(url, p, 'pageSize',  '20'), 10);
    return jsonOk({ data: [], pageCount: 0, pageIndex: pageIndex, pageSize: pageSize, recordCount: 0 });
  },

  '/classInApp/serv-teachplatform/hw/basicInfo/student/selectPadHomeworkList': function(url, p) {
    var pageIndex = parseInt(getParam(url, p, 'pageIndex', '1'),  10);
    var pageSize  = parseInt(getParam(url, p, 'pageSize',  '20'), 10);
    return jsonOk(buildHomeworkList(pageIndex, pageSize));
  },

  '/classInApp/serv-teachplatform/hw/basicInfo/student/selectPadHomeworkDetail': function(url, p) {
    var homeworkId = getParam(url, p, 'homeworkId', '');
    return jsonOk(buildHomeworkDetail(homeworkId));
  }
};

// ── Service Worker 生命周期 ───────────────────────────────────────────────────

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// ── Fetch 拦截 ────────────────────────────────────────────────────────────────

self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url;
  try { url = new URL(req.url); } catch(e) { return; }

  // 只处理同源请求
  if (url.origin !== self.location.origin) return;

  // 计算相对于 SW 根（scope）的 pathname，以兼容 GitHub Pages 子路径
  var scope    = new URL(self.registration.scope);
  var basePath = scope.pathname.replace(/\/$/, ''); // e.g. "/QRQLL_A6"
  var pathname = url.pathname;
  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || '/';
  }

  var handler = ROUTES[pathname];
  if (!handler) return; // 非 API 路径，交由默认网络处理

  event.respondWith(
    (function() {
      if (req.method === 'POST') {
        return req.clone().text().then(function(body) {
          var postParams = null;
          try { postParams = new URLSearchParams(body); } catch(e) {}
          return handler(url, postParams);
        }).catch(function() { return handler(url, null); });
      }
      return Promise.resolve(handler(url, null));
    })()
  );
});
