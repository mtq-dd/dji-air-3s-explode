# DJI Air 3S · 结构拆解可视化

用 Three.js 程序化建模的 DJI Air 3S 交互式拆解页。**所有几何体由代码生成，不含任何外部 3D 模型 / 贴图文件**，最终打包为单文件 HTML（含 Three.js 运行时），双击即可打开。

## 打开方式

直接双击 `index.html`（已内联 Three.js，走 `file://` 也能跑）。
需要本地服务时：`python -m http.server 8080`，然后访问 `http://localhost:8080`。

URL 可选参数（演示 / 联调用）：
`?nointro=1` 跳过入场动画 · `&explode=1` 直接全拆解 · `&sel=gimbal` 预选部件 · `&cam=4,2.5,5` 指定机位
· `&fly=1` 直接进控制台 · `&cmd=power,takeoff` 按序执行指令 · `&scenario=air|ready|rth|cut` 快进到指定飞行状态（截图用）

## 交互

| 操作 | 效果 |
| --- | --- |
| 左键拖拽 | 旋转视角 |
| 滚轮 / 双指 | 缩放 |
| 右键拖拽 | 平移 |
| 点击部件（或左侧清单） | 该部件拆解飞出 + 高亮 + 右侧显示参数 |
| 再次点击同一部件 / 面板按钮 | 归位 |
| `全部拆解` | 8 个部件按层次散开 |
| `复原视角` | 归位 + 复位镜头 + 恢复自转 |
| `标注` | 显示/隐藏部件标签 |
| `自转` | 自动环绕 |
| `空格` / `Esc` | 全部拆解 / 取消选中 |
| `飞行控制` | 进入 / 退出指令台（进入时自动收起拆解、隐藏侧栏） |

## 控制指令（飞行状态机）

点顶部「飞行控制」进入控制台：拆解自动收起，左右面板淡出，底部升起指令台。此时模型可继续拖拽旋转缩放，但不再响应部件拾取，避免误触。

**状态机**

```
OFF ──开机──▶ BOOT ──自检1.2s──▶ READY ──起飞──▶ SPINUP ──1s──▶ CLIMB ──▶ HOVER
                                 ▲                                        │
                                 │◀──────────── 着陆 ◀── DESCEND ◀──降落/返航
                                                                            │
  任意空中状态 ──急停──▶ CUT（停桨下落）──坠地──▶ OFF                        │
                              RTH：爬升 6 m → 水平回起降点 → 自动降落 ───────┘
```

**指令与前置条件**（不满足时按钮置灰，日志给出原因，不会"假装成功"）

| 指令 | 前置 | 行为 |
| --- | --- | --- |
| 开机 / 关机 | 地面 | 自检：电量灯逐颗点亮 → READY；关机：灯灭、桨停 |
| 起飞 | READY 且电量 > 12% | 起桨 1 s → 爬升到 5 m → 定点悬停 |
| 降落 | 空中 | 垂直下降到地面 → 桨停 → READY |
| 返航 | 空中且 Home 点存在 | 爬升到 6 m → 水平回起降点 → 自动降落 |
| 悬停 | 空中 | 取消当前动作，保持高度与位置 |
| 急停 | 空中 | 停桨下落（演示），落地后自动断电 |

**联动效果**：桨叶按状态变速旋转并叠加桨盘虚影；机身随水平速度轻微倾斜；电池灯随电量变化（低于 20% 转琥珀色并告警）；地面出现光斑投影，随高度变大变淡；高度上升时相机自动跟随并重算取景，不会飞出画面。

**遥测**：ALT 高度、H.S 水平速度、BAT 电量、TIME 飞行时长、GPS 卫星、RSSI 图传、当前模式与指令日志。电量按空中 0.62 %/s、地面 0.05 %/s 消耗（演示值，非真实放电曲线）。

**快捷键**：`T` 起飞 · `L` 降落 · `H` 返航 · `X` 急停 · `Esc` 退出控制台（空中会拒绝）。

**对外指令接口**（供 Kotlin / iframe / 后端指令源调用）

```js
window.DroneCmd.exec('takeoff');   // 返回 { ok, mode, msg? }；失败时 ok=false
window.DroneCmd.state();           // { mode, powered, altitude, battery, speed, flightTime }
window.DroneCmd.enter(true);       // 进入控制台（等价于点按钮）
```

页面会把每次指令回执抛给原生：`window.AndroidBridge.onFlightEvent(cmd, mode, stateJson)`；原生可用 `DroneNative.onResult(cmd, ok, msg)` 回写结果，**失败会自动回滚本地状态**，避免 UI 说"已起飞"而飞机没动。

## 目录

```
index.html                  最终产物（单文件，可直接分发）
src/main.js                 场景与建模源码（可读版，含飞行状态机）
src/style.css               HUD 样式
src/template.html           HTML 骨架
build.mjs                   esbuild 打包 + 内联脚本

android/                    Android Gradle 工程（可打包 APK）
  app/                       WebView 宿主，零第三方依赖
  msdk-sample/               DJI MSDK v5 接入参考（不参与编译）
  gradlew / gradle/          Gradle 8.11.1 wrapper
.github/workflows/          GitHub Actions 流水线
```

修改源码后重新构建：

```bash
npm install          # 首次
node build.mjs       # 生成 index.html
```

## 打包 Android APK

**关键点：页面只有一份源文件。** 根目录的 `index.html` 由 Gradle 的 `syncWebPage` 任务在构建前
复制成 `app/src/main/assets/dji-air-3s.html`，仓库里不存第二份，改页面只需改 `index.html`。

### 走 GitHub Actions（推荐）

`.github/workflows/build-apk.yml` 已配好，触发方式有三种：

| 触发 | 场景 |
| --- | --- |
| push 到 `main` | 每次提交自动出包 |
| Actions 页面点 `Run workflow` | 手动构建 |
| 打 `v*` tag | 构建并自动发布到 Releases |

产物在运行记录的 **Artifacts → `dji-air-3s-debug-apk`**，下载解压就是可直接安装的 APK。

### 本地构建

需要 JDK 17+ 与 Android SDK（`local.properties` 里写 `sdk.dir`）：

```bash
cd android
./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

装到手机：

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Debug 包用自动生成的 debug keystore 签名，**可直接安装**但不宜分发。要出正式签名包，在
CI 里配置 `SIGNING_STORE_FILE` / `SIGNING_STORE_PASSWORD` / `SIGNING_KEY_ALIAS` /
`SIGNING_KEY_PASSWORD` 四个环境变量后再跑 `assembleRelease`。

> `gradle-wrapper.properties` 里的 distributionUrl 指向腾讯云镜像（国内直连 services.gradle.org 常被中断）。
> 海外环境可改回 `https://services.gradle.org/distributions/gradle-8.11.1-bin.zip`。

## 实现要点

- **建模**：机身用超椭圆截面放样（`loftGeometry`）得到前低后高的楔形壳体；机臂用带基向量变换的扁锥管（`beamGeometry`）；桨叶用 `Shape` + `ExtrudeGeometry` 挤出后做桨距偏转。云台 / 电池 / 电机 / 感知阵列均为基本体组合。
- **材质**：`MeshStandardMaterial` + `RoomEnvironment` 环境反射 + 程序生成的噪声粗糙度贴图，漆面有细微的不均匀感。
- **拆解**：每个部件组带一个位移向量，逐帧做指数缓动；层级上按「垂直分层 + 适度外扩」排布，任何视角下都不会互相压住。
- **高亮**：选中部件提升自发光与反射强度、其余部件压暗到 42%，配合 UnrealBloom 形成辉光；未使用自定义着色器，跨设备表现稳定。
- **取景**：把包围盒 8 个角投影到 NDC 反算缩放，任意屏幕比例都不会裁切（竖屏自动下移观察点避开底部面板）。
- **标签**：CSS2DRenderer + 屏幕空间避让，同列标签自动错开。

## 接真机：能做什么、不能做什么

页面里的指令是**本地状态机 + 动画**，不连接任何真实飞机。想接真机，有三档：

| 方案 | 做法 | 成本 | 适用 |
| --- | --- | --- | --- |
| A. 纯仿真（当前） | 指令只驱动 3D，不碰硬件 | 0 | 汇报、教学、投标演示 |
| B. WebView + MSDK 桥 | 页面按钮 → `AndroidBridge` → DJI MSDK v5 | 中 | App 内"半真半演"，可真实起飞降落 |
| C. 原生渲染 + MSDK | Filament / SceneView 重建几何，直接吃遥测 | 高 | 长期产品化、数字孪生 |

`android/DroneCommandBridge.kt` 是 B 档的接入骨架，含前置检查与失败回推。三条必须提前说清楚的边界：

- **开机 / 关机做不到远程**。消费级机型是机身物理按键，MSDK 没有远程上下电接口。页面上的"开机"只能表示"已连接飞机 / 电机解锁"，对外不要说成远程开关机。
- **急停 ≠ 空中停桨**。MSDK 不开放空中停桨，DJI Fly 的急停本质是刹车加强制降落；示例里退化为 `startLanding`，文案也写成"强制降落"。
- **返航依赖 Home 点**。没有 GPS / Home 点记录时 `startGoHome` 会失败，必须把失败原因回填给 UI（页面已实现回滚）。

另外 MSDK 需要开发者账号注册 App Key、飞机固件与 SDK 版本匹配，真机调试请在空旷场地并拆桨做首轮联调。

### 原生渲染

若要摆脱 WebView，推荐 Google **Filament**（`com.google.android.filament`）或封装库 **SceneView**：PBR 与 Bloom 内置，但需要把放样、扁锥管、桨叶挤出这套几何逻辑改写成 `VertexBuffer` 构建流程，工作量约为 Web 版的 1.5～2 倍。

### 画布黑屏（Android WebView / 模拟器）

现象：进入飞行控制台后 3D 画布偶发整块变黑，切一次横竖屏就恢复。

**真机（Redmi Note 12 Turbo / Adreno 725）上没复现过，只在模拟器上出现。** 这也是符合预期的：模拟器的图形栈是宿主机 GPU 透传或 SwiftShader 软渲染，`antialias + UnrealBloomPass` 这套组合的浮点渲染目标在它上面最容易丢图层。页面本身是活的——帧率正常、没有报错、也拿不到 `contextlost` 事件，只是合成结果没了。转屏之所以能修好，是因为旋转触发了一次视口尺寸变化，浏览器不得不重建合成表面。

处理分四层，用户不用再手动转屏：

| 层 | 做法 | 文件 |
| --- | --- | --- |
| 建档 | 创建渲染器之前先探一次 GPU（`UNMASKED_RENDERER_WEBGL` + UA），模拟器/软渲染直接关 MSAA、降 `powerPreference`；运行期再关 Bloom、`pixelRatio` 退回 1 | `src/main.js` → `SOFT_GPU` / `setQuality()` |
| 样式 | WebView 内关闭 `backdrop-filter`，面板改为接近不透明的实色 | `src/style.css` → `html.webview` |
| 时机 | 进出飞行控制台、转屏、切后台回来、重新获得焦点时重建绘制缓冲，并让原生微调一次 WebView 尺寸（等价于"人工转屏"） | `src/main.js` → `kickSurface()` |
| 兜底 | 原生看门狗每 4s 用 `PixelCopy` 抓画面中段算亮度：出现「原本有内容 → 连续两次纯黑」就自动重建表面；连修两次仍黑则调 `DroneRender.degrade()` 降档 | `MainActivity.kt` → `sampleCanvas()` |

真机走全画质（实测 GPU 报 `Adreno (TM) 725`，`low:false`）；模拟器自动降档，牺牲辉光换稳定。调试时可以在 DevTools 控制台直接调用：

```js
DroneRender.size()      // 逻辑尺寸 / dpr / GPU 名称 / 是否降档
DroneRender.resize()    // 强制同步尺寸
DroneRender.kick(true)  // 立即重建绘制缓冲 + 通知原生重建 surface
DroneRender.degrade()   // 手动降档（关 Bloom、pixelRatio=1）
```

## 说明

参数取自 DJI 官方公开规格节选，仅用于可视化演示，未逐一核对全部细项。
飞行高度与水平位移在 3D 中做了**非线性压缩**（1 m ≈ 0.16 场景单位），只为可读性，不代表真实比例。
