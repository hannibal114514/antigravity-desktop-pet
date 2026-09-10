import Cocoa
import WebKit

class FloatingKeyPanel: NSPanel {
    override var canBecomeKey: Bool {
        return true
    }
    override var canBecomeMain: Bool {
        return true
    }
}

class WindowMoveHandler: NSObject, WKScriptMessageHandler {
    weak var panel: NSPanel?

    init(panel: NSPanel) {
        self.panel = panel
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let panel = self.panel else { return }
        if message.name == "moveWindow", let body = message.body as? [String: Any] {
            if let dx = body["dx"] as? Double, let dy = body["dy"] as? Double {
                let current = panel.frame.origin
                panel.setFrameOrigin(NSPoint(x: current.x + CGFloat(dx), y: current.y - CGFloat(dy)))
            }
        }
    }
}

class DesktopPetApp: NSObject, NSApplicationDelegate {
    var window: FloatingKeyPanel!
    var webView: WKWebView!
    var moveHandler: WindowMoveHandler!

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let screen = NSScreen.main else { return }
        let screenRect = screen.visibleFrame
        
        let petWidth: CGFloat = 350
        let petHeight: CGFloat = 310
        
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
        moveHandler = WindowMoveHandler(panel: window)
        contentController.add(moveHandler, name: "moveWindow")
        
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: petWidth, height: petHeight), configuration: config)
        webView.setValue(false, forKey: "drawsBackground")
        webView.autoresizingMask = [.width, .height]
        
        // 优先加载本地嵌入的 web/index.html，完全脱离任何终端服务独立运行
        let bundle = Bundle.main
        if let resourcePath = bundle.resourcePath {
            let webFolder = (resourcePath as NSString).appendingPathComponent("web")
            let indexPath = (webFolder as NSString).appendingPathComponent("index.html")
            if FileManager.default.fileExists(atPath: indexPath) {
                let indexURL = URL(fileURLWithPath: indexPath)
                let folderURL = URL(fileURLWithPath: webFolder)
                webView.loadFileURL(indexURL, allowingReadAccessTo: folderURL)
            } else if let url = URL(string: "http://localhost:1420/") {
                webView.load(URLRequest(url: url))
            }
        }
        
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        window.orderFrontRegardless()
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = DesktopPetApp()
app.delegate = delegate
app.run()
