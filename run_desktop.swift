import Cocoa
import WebKit

class FloatingKeyPanel: NSPanel {
    override var canBecomeKey: Bool {
        return true
    }
    override var canBecomeMain: Bool {
        return true
    }
    override func constrainFrameRect(_ frameRect: NSRect, to screen: NSScreen?) -> NSRect {
        // 允许窗口完全自由移动至屏幕顶部/任意边界，不受系统顶部菜单栏默认限制拦截
        return frameRect
    }

    override func keyDown(with event: NSEvent) {
        // 支持 Cmd+Q 快捷键退出
        if event.modifierFlags.contains(.command) && event.charactersIgnoringModifiers == "q" {
            NSApp.terminate(nil)
            return
        }
        super.keyDown(with: event)
    }
}

class HitTestWebView: WKWebView {
    var hitRects: [NSRect] = []

    override func hitTest(_ point: NSPoint) -> NSView? {
        if hitRects.isEmpty {
            return nil
        }
        for rect in hitRects {
            if rect.contains(point) {
                return super.hitTest(point)
            }
        }
        return nil
    }
}

class WindowBridgeHandler: NSObject, WKScriptMessageHandler {
    weak var panel: NSPanel?
    weak var webView: HitTestWebView?

    init(panel: NSPanel, webView: HitTestWebView) {
        self.panel = panel
        self.webView = webView
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let panel = self.panel else { return }

        // 1. 拖拽移动
        if message.name == "moveWindow", let body = message.body as? [String: Any] {
            if let dx = body["dx"] as? Double, let dy = body["dy"] as? Double {
                let current = panel.frame.origin
                panel.setFrameOrigin(NSPoint(x: current.x + CGFloat(dx), y: current.y - CGFloat(dy)))
            }
        }

        // 2. 命中测试矩形更新
        if message.name == "updateHitRegions", let rectsArray = message.body as? [[String: Any]] {
            var newRects: [NSRect] = []
            let windowHeight = panel.frame.height
            for r in rectsArray {
                if let x = r["x"] as? Double,
                   let y = r["y"] as? Double,
                   let w = r["width"] as? Double,
                   let h = r["height"] as? Double {
                    let macY = windowHeight - CGFloat(y) - CGFloat(h)
                    let macRect = NSRect(x: CGFloat(x), y: macY, width: CGFloat(w), height: CGFloat(h))
                    newRects.append(macRect)
                }
            }
            self.webView?.hitRects = newRects
        }

        // 3. 动态自适应窗口尺寸 (贴图紧凑盒 vs 气泡/菜单展开)
        if message.name == "resizeWindow", let body = message.body as? [String: Any] {
            if let newW = body["width"] as? Double, let newH = body["height"] as? Double {
                let currentFrame = panel.frame
                let targetW = CGFloat(newW)
                let targetH = CGFloat(newH)

                if abs(currentFrame.width - targetW) > 1 || abs(currentFrame.height - targetH) > 1 {
                    // 保持底边角色中心点稳定对齐
                    let deltaW = currentFrame.width - targetW
                    let newX = currentFrame.origin.x + (deltaW / 2.0)
                    var newY = currentFrame.origin.y

                    // 如果高度增加且超出屏幕顶部，微调 y 使窗口可见
                    if targetH > currentFrame.height, let screen = panel.screen ?? NSScreen.main {
                        let topOverflow = (newY + targetH) - screen.visibleFrame.maxY
                        if topOverflow > 0 {
                            newY -= topOverflow
                        }
                    }
                    panel.setFrame(NSRect(x: newX, y: newY, width: targetW, height: targetH), display: true, animate: false)
                }
            }
        }

        // 4. 彻底退出应用
        if message.name == "quitApp" {
            NSApp.terminate(nil)
        }
    }
}

class DesktopPetApp: NSObject, NSApplicationDelegate {
    var window: FloatingKeyPanel!
    var webView: HitTestWebView!
    var bridgeHandler: WindowBridgeHandler!

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let screen = NSScreen.main else { return }
        let screenRect = screen.visibleFrame
        
        // 初始采用角色紧凑尺寸 (180x115)，待前端加载完毕后精确双向同步
        let petWidth: CGFloat = 180
        let petHeight: CGFloat = 115
        
        let x = screenRect.maxX - petWidth - 30
        let y = screenRect.minY + 30

        let windowRect = NSRect(x: x, y: y, width: petWidth, height: petHeight)
        
        window = FloatingKeyPanel(
            contentRect: windowRect,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .floating
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        window.isReleasedWhenClosed = false
        window.acceptsMouseMovedEvents = true
        
        let contentController = WKUserContentController()
        
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.mediaTypesRequiringUserActionForPlayback = []
        
        webView = HitTestWebView(frame: NSRect(x: 0, y: 0, width: petWidth, height: petHeight), configuration: config)
        webView.setValue(false, forKey: "drawsBackground")
        webView.autoresizingMask = [.width, .height]
        
        bridgeHandler = WindowBridgeHandler(panel: window, webView: webView)
        contentController.add(bridgeHandler, name: "moveWindow")
        contentController.add(bridgeHandler, name: "resizeWindow")
        contentController.add(bridgeHandler, name: "updateHitRegions")
        contentController.add(bridgeHandler, name: "quitApp")
        
        if let url = URL(string: "http://127.0.0.1:1421/") {
            webView.load(URLRequest(url: url))
        }
        
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        window.orderFrontRegardless()
    }

    func applicationWillTerminate(_ notification: Notification) {
        // 优雅退出通知
        if let url = URL(string: "http://127.0.0.1:1421/api/quit") {
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            URLSession.shared.dataTask(with: req).resume()
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = DesktopPetApp()
app.delegate = delegate
app.run()
