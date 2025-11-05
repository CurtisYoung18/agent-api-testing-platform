#!/usr/bin/env python3
"""
Agent API 测试工具 Web应用启动脚本
"""

import subprocess
import sys
import os
from pathlib import Path


def check_virtual_environment():
    """检查是否在虚拟环境中"""
    return hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)


def install_dependencies():
    """安装依赖包"""
    print("📦 正在安装依赖包...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ 依赖包安装完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 依赖包安装失败: {e}")
        return False


def start_streamlit():
    """启动Streamlit应用"""
    print("🚀 正在启动Web应用...")
    print("📝 应用将在浏览器中自动打开")
    print("🔗 如果没有自动打开，请访问: http://localhost:8501")
    print("⏹️  按 Ctrl+C 停止应用")
    print("-" * 50)
    
    try:
        # 启动Streamlit应用
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", "app.py",
            "--server.port", "8501",
            "--server.headless", "false",
            "--browser.serverAddress", "localhost"
        ])
    except KeyboardInterrupt:
        print("\n👋 应用已停止")
    except FileNotFoundError:
        print("❌ 未找到streamlit命令，请确保已安装streamlit包")
        print("💡 运行: pip install streamlit")
    except Exception as e:
        print(f"❌ 启动应用时出错: {e}")


def main():
    print("=" * 60)
    print("🤖 Agent API 测试工具 - Web应用启动器")
    print("=" * 60)
    
    # 检查工作目录
    current_dir = Path.cwd()
    if not (current_dir / "app.py").exists():
        print("❌ 请在项目根目录运行此脚本")
        print(f"当前目录: {current_dir}")
        return
    
    # 检查虚拟环境
    if not check_virtual_environment():
        print("⚠️  建议在虚拟环境中运行")
        print("💡 创建虚拟环境: python -m venv venv")
        print("💡 激活虚拟环境: source venv/bin/activate  # Linux/Mac")
        print("💡                 venv\\Scripts\\activate  # Windows")
        
        choice = input("\n是否继续？(y/N): ").lower()
        if choice != 'y':
            print("👋 已取消启动")
            return
    
    # 检查并安装依赖
    try:
        import streamlit
        import plotly
        import xlsxwriter
        print("✅ 依赖包检查通过")
    except ImportError as e:
        print(f"📦 需要安装依赖包: {e}")
        if input("是否自动安装？(y/N): ").lower() == 'y':
            if not install_dependencies():
                return
        else:
            print("💡 手动安装: pip install -r requirements.txt")
            return
    
    # 启动应用
    start_streamlit()


if __name__ == "__main__":
    main()
