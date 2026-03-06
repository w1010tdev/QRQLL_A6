# QRQLL

青鹿（QingLu）教学系统静态模拟服务。

## GitHub Pages 部署（推荐）

本项目已提供基于 Service Worker 的静态实现，可直接托管在 GitHub Pages 上，**无需运行任何服务器**。

### 部署步骤

1. Fork 或 Push 本仓库到 GitHub。
2. 进入仓库 **Settings → Pages**，将 Source 设为 **GitHub Actions**。
3. 向 `main` 分支推送代码后，Actions 会自动构建并发布。
4. 发布成功后，访问 `https://<用户名>.github.io/<仓库名>/` 即可看到状态页面。
5. 将青鹿客户端服务器地址配置为该 GitHub Pages 地址，刷新页面后 Service Worker 即接管所有 API 请求。

### 模拟的 API 接口

| 接口路径 | 说明 |
|---|---|
| `/qlBox-manager/getBindedSchoolInfo` | 学校信息 |
| `/classInApp/serv-manager/j_spring_security_check` | 登录认证 |
| `/classInApp/box/auth/tokenValid` | Token 验证 |
| `/classInApp/serv-teachplatform/pub/alive` | 心跳检测 |
| `/classInApp/serv-teachplatform/courseware/student/selectShareFileList` | 课件列表（返回空列表）|
| `/classInApp/serv-teachplatform/hw/basicInfo/student/selectPadHomeworkList` | 作业列表 |
| `/classInApp/serv-teachplatform/hw/basicInfo/student/selectPadHomeworkDetail` | 作业详情 |

> **注意**：特殊作业（special_homework）功能暂未实现，所有用户均返回标准作业列表。

---

## 本地 Python 服务器（备用）

如需在本地运行原始 Flask 服务器：

```bash
pip install -r requirements.txt
python QRQLL.py
```

服务将监听 `http://0.0.0.0:2417`。
