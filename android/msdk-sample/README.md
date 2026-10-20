# MSDK 真机接入参考（不参与编译）

本目录的两个 Kotlin 文件是 **DJI MSDK v5** 的接入示例，**没有**被 `android/app` 的构建包含。
原因很直接：它们 `import dji.v5.*`，需要额外引入 DJI 的 Maven 依赖、申请 App Key、
并在真机上完成飞机绑定，才能编译通过。把这些依赖塞进演示 APK 只会让构建在 CI 里挂掉。

所以工程分成两层：

| 层 | 位置 | 编译 | 作用 |
|---|---|---|---|
| 演示宿主 | `android/app/` | ✅ | 零依赖 WebView，APK 可直接安装，飞行指令走演示回执 |
| 真机桥接 | `android/msdk-sample/` | ❌ | 换成 MSDK 调用时照抄，含前置检查与失败回推 |

## 接入时要改的三个地方

1. **依赖**：在 `android/app/build.gradle.kts` 里按 DJI 官方文档加 MSDK v5 依赖，
   并在 `AndroidManifest.xml` 里补上 DJI 要求的 meta-data（App Key）与权限。
2. **控制器**：把 `MainActivity` 里 `onFlightEvent` 的演示回执换成 `DroneCommandController.dispatch()`，
   同时把 `realFlightControllerAttached` 置为 `true`。
3. **权限与合规**：真机飞行需要网络/定位权限、实名登记，室内测试请拆桨或使用 DJI 模拟器。

## 三条能力边界（不要对外承诺）

- **远程开机/关机不存在**。消费级机型是机身物理按键，MSDK 没有远程上下电接口。
  页面上的「开机」只能表示「App 与飞机已连接」。
- **急停 ≠ 空中停桨**。MSDK 未开放空中停桨，DJI Fly 的急停实际是刹车 + 强制降落，
  示例里退化为 `startLanding`，UI 文案也写的是「强制降落（非停桨）」。
- **返航依赖 GPS / Home 点**。不满足时 `startGoHome` 直接失败，所以页面做了回执回滚：
  原生返回 false 就撤销本地状态，不会出现「UI 说起飞了、飞机没动」。

`DroneCommandBridge.kt` 里标了 `NOTE` 的地方（尤其电量读取路径）在不同 MSDK
小版本间会变，接入时请对着你用的版本核对一遍官方 API。
