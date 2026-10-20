package com.example.air3s

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import dji.v5.common.callback.CommonCallbacks
import dji.v5.common.error.IDJIError
import dji.v5.manager.aircraft.flightcontroller.FlightControlData
import dji.v5.manager.aircraft.flightcontroller.FlightController

/**
 * 3D 页面 <-> 真机飞控 的命令桥（DJI MSDK v5）
 * ============================================================
 * 目录：
 *   1. DroneCommandBridge —— 页面按钮 → 原生；原生 → 页面
 *   2. DroneCommandController —— 指令 → MSDK 调用 + 前置检查
 *
 * ⚠️ 先看清楚这几条，它们决定了"哪些指令真能做"：
 *
 *  · 「开机 / 关机」是机身物理按键。MSDK **没有**远程上下电接口，
 *    所以页面里的开关机只能表示"App 与飞机建立连接 / 断开连接"，
 *    或者干脆保持纯演示。不要对外承诺"远程开关机"。
 *
 *  · 「急停」在消费级机型上不存在"空中停桨"的开放接口。
 *    DJI Fly 的急停实际是刹车 + 强制降落，这里退化为 startLanding，
 *    并在 UI 上明确它是"降落"而不是"停桨坠落"。
 *
 *  · 所有指令都必须做前置检查（GPS / Home 点 / 电量 / 是否已在空中）。
 *    失败要把原因回传给页面，页面会回滚状态 —— 不要让 UI 单方面"假装成功"。
 *
 *  · 本文件是**接入示例**，不是可直接编译的成品：MSDK 的方法名与包路径
 *    在小版本之间会变（尤其电量、错误描述），标了 NOTE 的地方请按你接入的
 *    版本对着官方 API 文档 / 官方 Sample 校对一遍。
 */

private const val TAG = "DroneCmd"

/* ============================================================
 * 1. 页面桥
 * ========================================================== */
class DroneCommandBridge(
    private val webView: WebView,
    private val controller: DroneCommandController
) {

    /**
     * 页面里 execCommand() 成功后会调用 window.AndroidBridge.onFlightEvent(...)
     * 这里转成真机指令，并把回执（成功/失败）写回页面。
     */
    @JavascriptInterface
    fun onFlightEvent(command: String, mode: String, stateJson: String) {
        Log.i(TAG, "page -> native : $command  (mode=$mode, state=$stateJson)")

        controller.dispatch(command) { ok, message ->
            val safe = message.replace("\\", "\\\\").replace("'", "\\'")
            webView.post {
                webView.evaluateJavascript(
                    "window.DroneNative && window.DroneNative.onResult('$command', $ok, '$safe')",
                    null
                )
            }
        }
    }

    /** 拆解模式下的部件点选（可选，用于埋点或原生侧联动） */
    @JavascriptInterface
    fun onPartSelected(id: String, name: String) {
        Log.d(TAG, "part selected: $id / $name")
    }

    /**
     * 原生 → 页面：遥控器、后端 MQTT、语音助手等外部指令源，
     * 统一走页面上的 DroneCmd.exec()，保证 UI 状态机与真机指令一致。
     */
    fun sendCommandToWeb(command: String) {
        webView.post {
            webView.evaluateJavascript(
                "window.DroneCmd && window.DroneCmd.exec('${command.replace("'", "")}')",
                null
            )
        }
    }
}

/* ============================================================
 * 2. 指令执行器
 * ========================================================== */
class DroneCommandController(@Suppress("unused") private val context: Context) {

    private val fc: FlightController get() = FlightController.getInstance()

    fun dispatch(command: String, onResult: (Boolean, String) -> Unit) {
        when (command.lowercase()) {
            "power" -> onPower(onResult)
            "takeoff" -> onTakeoff(onResult)
            "land" -> onLand(onResult)
            "rth" -> onGoHome(onResult)
            "hold" -> onHold(onResult)
            "estop" -> onEmergency(onResult)
            else -> onResult(false, "未实现的指令：$command")
        }
    }

    /* ---------- 指令 ---------- */

    /** 开关机：MSDK 不提供远程上下电，只能反映连接状态 */
    private fun onPower(onResult: (Boolean, String) -> Unit) {
        val connected = fc.state != null
        if (connected) {
            onResult(false, "已连接飞机；关机需长按机身电源键（MSDK 无远程上下电接口）")
        } else {
            onResult(false, "未连接飞机，请先在 App 内完成对频/连接")
        }
    }

    private fun onTakeoff(onResult: (Boolean, String) -> Unit) {
        val state = fc.state
        if (state == null) return onResult(false, "飞控状态未就绪")
        if (state.isFlying) return onResult(false, "已在空中，无需重复起飞")
        if (!state.isHomeLocationSet) return onResult(false, "Home 点未记录（等待 GPS 定位）")
        if (state.satelliteCount < 8) return onResult(false, "卫星数不足（${state.satelliteCount}）")

        val battery = batteryPercent()
        if (battery in 0..12) return onResult(false, "电量不足 12%（$battery%）")

        // NOTE: v5 起自动起飞由飞控接管，要求飞机在地面、电机未解锁。
        fc.startTakeoff(object : CommonCallbacks.CompletionCallback {
            override fun onSuccess() = onResult(true, "起飞指令已受理")
            override fun onFailure(error: IDJIError) = onResult(false, "起飞失败：$error")
        })
    }

    private fun onLand(onResult: (Boolean, String) -> Unit) {
        val state = fc.state ?: return onResult(false, "飞控状态未就绪")
        if (!state.isFlying) return onResult(false, "当前不在空中")

        fc.startLanding(object : CommonCallbacks.CompletionCallback {
            override fun onSuccess() = onResult(true, "开始降落")
            override fun onFailure(error: IDJIError) = onResult(false, "降落失败：$error")
        })
        // 若开启了下视避障，接近地面时飞控会等待 confirmLanding()，
        // 可在 StateCallback 里判断高度 < 0.5 m 时补一次确认。
    }

    private fun onGoHome(onResult: (Boolean, String) -> Unit) {
        val state = fc.state ?: return onResult(false, "飞控状态未就绪")
        if (!state.isFlying) return onResult(false, "当前不在空中")
        if (!state.isHomeLocationSet) return onResult(false, "Home 点未记录，无法返航")

        fc.startGoHome(object : CommonCallbacks.CompletionCallback {
            override fun onSuccess() = onResult(true, "返航指令已受理")
            override fun onFailure(error: IDJIError) = onResult(false, "返航失败：$error")
        })
    }

    /**
     * 悬停：自动返航中先取消返航，再进虚拟摇杆模式并持续给零杆量。
     * 注意虚拟摇杆与自动飞行互斥，且必须持续以 10Hz 以上频率下发，
     * 否则飞控判定摇杆失联会触发悬停/降落保护。
     */
    private fun onHold(onResult: (Boolean, String) -> Unit) {
        fc.cancelGoHome(object : CommonCallbacks.CompletionCallback {
            override fun onSuccess() {
                fc.setVirtualStickModeEnabled(true, object : CommonCallbacks.CompletionCallback {
                    override fun onSuccess() = sendZeroStick(onResult)
                    override fun onFailure(error: IDJIError) =
                        onResult(false, "虚拟摇杆开启失败：$error")
                })
            }

            override fun onFailure(error: IDJIError) =
                onResult(false, "取消返航失败：$error")
        })
    }

    private fun sendZeroStick(onResult: (Boolean, String) -> Unit) {
        // pitch, roll, yaw, throttle —— 全 0 即"原地保持"
        val zero = FlightControlData(0f, 0f, 0f, 0f)
        fc.sendVirtualStickFlightControlData(zero, object : CommonCallbacks.CompletionCallback {
            override fun onSuccess() = onResult(true, "已进入悬停（零杆量保持）")
            override fun onFailure(error: IDJIError) = onResult(false, "悬停下发失败：$error")
        })
        // 实际项目要起一个定时器持续下发，见类注释。
    }

    /**
     * 急停：消费级机型没有空中停桨的开放接口，
     * 这里退化为强制降落，并在页面文案里说清楚。
     */
    private fun onEmergency(onResult: (Boolean, String) -> Unit) {
        val state = fc.state ?: return onResult(false, "飞控状态未就绪")
        if (!state.isFlying) return onResult(false, "当前不在空中")

        fc.startLanding(object : CommonCallbacks.CompletionCallback {
            override fun onSuccess() = onResult(true, "已触发强制降落（非停桨）")
            override fun onFailure(error: IDJIError) = onResult(false, "强制降落失败：$error")
        })
    }

    /* ---------- 辅助 ---------- */

    /**
     * 电量：不同 MSDK 子版本取值位置不同
     *  · v5.1 ~ v5.4：FlightControllerState.getBatteryState().getChargeRemainingInPercent()
     *  · 部分版本改为 BatteryManager.getInstance().getBatteryState()
     * 这里返回 -1 表示"未接入"，前置检查会跳过电量判断。
     */
    private fun batteryPercent(): Int = -1

    /* ---------- 遥测下行（可选） ---------- */
    /**
     * 把真机状态推给 3D 页面做数字孪生：
     *
     *   fc.setStateCallback { state ->
     *       bridge.sendStateToWeb(state.aircraftLocation.altitude, state.satelliteCount, ...)
     *   }
     *
     * 注意：真机遥测接入后，页面的本地状态机就不再是"真值"了，
     * 建议单独做一个 twin 模式，只同步显示、不接受本地指令，
     * 避免"仿真状态"和"真实状态"互相覆盖。
     */
}

/* ============================================================
 * 3. Activity 里怎么接
 * ============================================================
 *
 *   webView.settings.apply {
 *       javaScriptEnabled = true
 *       domStorageEnabled = true
 *       // 只加载 assets 里的本地页面，别加载远端 URL
 *   }
 *   val controller = DroneCommandController(this)
 *   val bridge = DroneCommandBridge(webView, controller)
 *   webView.addJavascriptInterface(bridge, "AndroidBridge")
 *   webView.loadUrl("file:///android_asset/dji-air-3s.html")
 *
 * 安全提醒：addJavascriptInterface 会把对象暴露给页面里的所有 JS。
 * 只加载本地 assets、不要加载第三方页面；方法必须标注 @JavascriptInterface（API 17+）。
 *
 * 合规提醒：真机飞行需实名登记、遵守空域与视距内飞行要求，
 * 室内测试请拆桨或使用模拟器。
 */
