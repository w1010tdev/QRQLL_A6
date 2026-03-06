from datetime import datetime
import os
import sys
from typing import Dict
from flask import Flask, jsonify, request, send_from_directory

HOMEWORK_DATA = [
    {
        "id": "1867975578577879042",
        "name": "百度搜索",
        "lessonName": "数学",
        "url": "https://baidu.com" 
    },
    {
        "id": "242799",
        "name": "CSTimer",
        "lessonName": "数学",
        "url": "https://cstimer.net/"
    }
]

SPECIAL_HOMEWORK_DATA = [
    {
        "id": "2027004201",
        "name": "专门为您准备的特别作业",
        "lessonName": "特别课程",
        "url": "https://cn.bing.com" 
    }
]

# Flask应用部分
app = Flask(__name__)

def get_app_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

APP_DIR = get_app_dir()
RESOURCES_DIR = os.path.join(APP_DIR, "resources")
if not os.path.exists(RESOURCES_DIR):
    os.makedirs(RESOURCES_DIR)

def ok(result=None, message: str = ""):
    return jsonify({"status": 0, "message": message, "result": result if result is not None else {}})

def get_param(name: str, default: str = "") -> str:
    if request.args.get(name) is not None:
        return request.args.get(name, default)
    return request.form.get(name, default)

def build_homework_list_dynamic(page_index: int, page_size: int) -> Dict:
    username = get_param("studentNo", "")
    if not username:
        username = request.headers.get("currentUserId", "")
    
    data_source = SPECIAL_HOMEWORK_DATA if username in ["CC20270042", "CC20270182"] else HOMEWORK_DATA
    
    data_list = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    start = (page_index - 1) * page_size
    end = start + page_size
    sliced_data = data_source[start:end]
    
    for hw in sliced_data:
        data_list.append({
            "publishTime": now,
            "homeworkId": hw["id"],
            "homeworkName": hw["name"],
            "lessonName": hw["lessonName"],
            "lessonId": "1001",
            "startTime": now,
            "endTime": None,
            "publishAnswerTime": "0",
            "submitStatus": 0,
            "redoQuestionNums": None
        })

    return {
        "pageIndex": page_index,
        "pageSize": page_size,
        "pageCount": (len(data_source) + page_size - 1) // page_size,
        "recordCount": len(data_source),
        "data": data_list
    }

def build_homework_detail_dynamic(homework_id: str) -> Dict:
    username = get_param("studentNo", "")
    if not username:
        username = request.headers.get("currentUserId", "")
        
    data_source = SPECIAL_HOMEWORK_DATA if username in ["CC20270042", "CC20270182"] else HOMEWORK_DATA
    
    target_hw = next((item for item in data_source if item["id"] == homework_id), None)
    
    # 兜底逻辑：找不到ID就用第一个，保证测试时不报错
    if not target_hw:
        if data_source:
            target_hw = data_source[0]
        else:
            return {}

    iframe_url = target_hw["url"]
    hw_name = target_hw["name"]
    
    x_frame_bypass_script = """
<script>
    customElements.define('x-frame-bypass', class extends HTMLIFrameElement {
        static get observedAttributes() {
            return ['src']
        }
        constructor() {
            super()
        }
        attributeChangedCallback() {
            this.load(this.src)
        }
        connectedCallback() {
            this.sandbox = '' + this.sandbox || 'allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation' // all except allow-top-navigation
        }
        load(url, options) {
            if (!url) return
            if (!url.startsWith('http')) throw new Error(`X-Frame-Bypass src ${url} does not start with http(s)://`)
            console.log('X-Frame-Bypass loading:', url)
            this.srcdoc = `<!DOCTYPE html><html><head><style>.loader { position: absolute; top: calc(50% - 25px); left: calc(50% - 25px); width: 50px; height: 50px; background-color: #333; border-radius: 50%; animation: loader 1s infinite ease-in-out; } @keyframes loader { 0% { transform: scale(0); } 100% { transform: scale(1); opacity: 0; } }</style></head><body><div class="loader"></div></body></html>`
            this.fetchProxy(url, options, 0).then(res => res.text()).then(data => {
                if (data) this.srcdoc = data.replace(/<head([^>]*)>/i, `<head$1>
                <base href="${url}">
                <script>
                // X-Frame-Bypass navigation event handlers
                document.addEventListener('click', e => {
                    if (frameElement && document.activeElement && document.activeElement.href) {
                        e.preventDefault()
                        frameElement.load(document.activeElement.href)
                    }
                })
                document.addEventListener('submit', e => {
                    if (frameElement && document.activeElement && document.activeElement.form && document.activeElement.form.action) {
                        e.preventDefault()
                        if (document.activeElement.form.method === 'post')
                            frameElement.load(document.activeElement.form.action, {method: 'post', body: new FormData(document.activeElement.form)})
                        else
                            frameElement.load(document.activeElement.form.action + '?' + new URLSearchParams(new FormData(document.activeElement.form)))
                    }
                })
                <\\/script>`).replace(/ crossorigin=['"][^'"]*['"]/gi, '')
            }).catch(e => console.error('Cannot load X-Frame-Bypass:', e))
        }
        fetchProxy(url, options, i) {
            const proxies = (options || {}).proxies || [
                'https://api.allorigins.win/raw?url=',
                'https://api.codetabs.com/v1/proxy/?quest=',
                'https://cors-anywhere.herokuapp.com/',
                'https://proxy.wenzixi.top/https://api.allorigins.win/raw?url=',
                'https://proxy.wenzixi.top/https://api.codetabs.com/v1/proxy/?quest=',
                'https://proxy.wenzixi.top/https://cors-anywhere.herokuapp.com/'
            ]
            return fetch(proxies[i] + encodeURIComponent(url), options).then(res => {
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                return res
            }).catch(error => {
                if (i === proxies.length - 1) throw error
                return this.fetchProxy(url, options, i + 1)
            })
        }
    }, {extends: 'iframe'})
</script>
"""

    html_content = (
        f'{x_frame_bypass_script}'
        f'<div style="width:91%">'
        f'<iframe is="x-frame-bypass" src="{iframe_url}" allow="fullscreen" '
        f'style="width:144vw;height:81vw;transform:scale(0.5);transform-origin:0 0;border:none">'
        f'</iframe></div><div style="width:70%">'
    )

    return {
        "id": homework_id,
        "name": hw_name,
        "bizType": 21,
        "createType": None,
        "publishAnswerStatus": 0,
        "submitStatus": 0,
        "taskId": "TASK_" + homework_id,
        "hwPageInfoDTOs": [
            {
                "id": "PAGE_" + homework_id,
                "homeworkId": homework_id,
                "pageType": 3,
                "pageSeqNum": 1,
                "needAnswerStatus": 0,
                "pageStatus": 1,
                "del": 0,
                "createTime": "2024-12-15 00:50:57",
                "updateTime": "2024-12-15 00:50:57",
                "hwQuestionInfos": [
                    {
                        "id": "Q_" + homework_id,
                        "homeworkId": homework_id,
                        "typeId": 4,
                        "seqNum": 1,
                        "seqNumName": "1",
                        "content": html_content, # 注入带样式的 HTML
                        "answer": "",
                        "del": 0,
                        "studentAnswerDetails": []
                    }
                ]
            }
        ],
        "trajectoryPageDTOs": None
    }

@app.route("/qlBox-manager/getBindedSchoolInfo", methods=["POST", "GET"])
def get_binded_school_info(): return ok({"schoolId": "LOCAL_SCHOOL", "schoolName": "QRQLL 模拟学校"})

@app.route("/classInApp/box/auth/tokenValid", methods=["POST", "GET"])
@app.route("/classInApp/serv-manager/j_spring_security_check", methods=["POST", "GET"])
def auth_mock():
    username = get_param("j_username", "student001")
    if username == "student001":
        username = get_param("username", "student001")

    host_ip = request.host.split(":")[0]
    return ok({
        "userId": username, "schoolKey": "LOCAL_SCHOOL", "schoolName": "QRQLL 模拟学校",
        "classroomId": "C001", "classroomName": "模拟教室", "className": "模拟班级",
        "loginIp": host_ip, "classInSocketPort": "9000", "token": f"mock-token-{username}",
        "isBoxClass": True, "isAirClass": False,
    })

@app.route("/classInApp/serv-teachplatform/pub/alive", methods=["POST", "GET"])
def ping_alive(): return ok({"alive": True})

# 资源列表接口
@app.route("/serv-teachplatform/courseware/student/selectShareFileList", methods=["GET", "POST"])
@app.route("/classInApp/serv-teachplatform/courseware/student/selectShareFileList", methods=["GET", "POST"])
def teacher_file_list():
    page_index = int(get_param("pageIndex", "1"))
    page_size = int(get_param("pageSize", "20"))
    
    files = []
    for root, _, filenames in os.walk(RESOURCES_DIR):
        for name in filenames:
            abs_path = os.path.join(root, name)
            rel = os.path.relpath(abs_path, RESOURCES_DIR).replace("\\", "/")
            files.append(rel)
    
    items = []
    for idx, rel_path in enumerate(sorted(files), start=1):
        name = os.path.basename(rel_path)
        ext = os.path.splitext(rel_path)[1].lower().lstrip(".")
        abs_path = os.path.join(RESOURCES_DIR, rel_path)
        size = str(os.path.getsize(abs_path)) if os.path.exists(abs_path) else "0"
        
        items.append({
            "fileId": f"file-{idx}", "fileName": name, "shareTime": "2024-01-01",
            "size": size, "lessonName": "Mock Course", "suffix": ext,
            "fileUrl": f"resources/{rel_path}", "teacherName": "Mock Teacher"
        })
    
    total = len(items)
    start = (page_index - 1) * page_size
    return ok({
        "data": items[start:start+page_size], "pageCount": (total+page_size-1)//page_size,
        "pageIndex": page_index, "pageSize": page_size, "recordCount": total
    })

@app.route("/resources/<path:filename>")
def serve_resource(filename: str):
    return send_from_directory(RESOURCES_DIR, filename, as_attachment=False)

# 作业接口
@app.route("/classInApp/serv-teachplatform/hw/basicInfo/student/selectPadHomeworkList", methods=["GET", "POST"])
def homework_list():
    page_index = int(get_param("pageIndex", "1"))
    page_size = int(get_param("pageSize", "20"))
    return ok(build_homework_list_dynamic(page_index, page_size))

@app.route("/classInApp/serv-teachplatform/hw/basicInfo/student/selectPadHomeworkDetail", methods=["GET", "POST"])
def homework_detail():
    homework_id = get_param("homeworkId")
    return ok(build_homework_detail_dynamic(homework_id))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=2417, debug=False, use_reloader=False)
