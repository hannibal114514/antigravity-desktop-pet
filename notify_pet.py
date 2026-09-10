#!/usr/bin/env python3
import sys
import json
import urllib.request
import argparse

def send_to_pet(text, msg_type="info", state=None, tag="Antigravity"):
    url = "http://127.0.0.1:1421/notify"
    if state is None:
        state = "squint" if msg_type in ["success", "praise", "pet"] else "idle"
        
    payload = {
        "type": msg_type,
        "text": text,
        "state": state,
        "tag": tag
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.status == 200
    except Exception as e:
        print(f"Failed to notify pet: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="向 Antigravity 桌宠发送即时状态与台词")
    parser.add_argument("text", nargs="?", default="宝宝，我一直在你身边陪着你写代码哦~", help="要展示的文本")
    parser.add_argument("--type", "-t", default="info", choices=["info", "success", "error", "thinking", "rest", "praise"], help="消息类型")
    parser.add_argument("--state", "-s", default=None, choices=["idle", "squint", "sleep"], help="桌宠形态")
    parser.add_argument("--tag", default="Antigravity", help="标签名称")
    
    args = parser.parse_args()
    success = send_to_pet(args.text, args.type, args.state, args.tag)
    if success:
        print("✅ 已成功推送给桌宠！")
    else:
        print("❌ 推送失败，请检查桌宠服务是否运行")
