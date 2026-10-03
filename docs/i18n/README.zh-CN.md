# Super V Ubuntu — 简体中文

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md)

适用于 Ubuntu GNOME 的 Windows 风格 Super+V 选择器，提供剪贴板历史、表情符号、颜文字、符号和本地 GIF 收藏。所有内容保留在本机，无遥测或运行时网络请求。

Ubuntu 24.04 / GNOME 46 · Ubuntu 26.04 / GNOME 50 · Wayland

## 安装与升级

下载 [v0.1.5 安装包](https://github.com/LincolnGothic/super-v-ubuntu/releases/tag/v0.1.5)，保存到“下载”目录：

```sh
sudo apt install "$HOME/Downloads/super-v-ubuntu_0.1.5_all.deb"
```

安装后注销并重新登录，再以普通用户运行以下命令（不使用 sudo）。第一个命令将通知快捷键设为 Super+M，为本应用释放 Super+V；它会替换自定义通知快捷键。

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
```

升级后再次注销并登录，标题应为 **Super V 0.1.5**。如果仍显示旧版，请检查上面 info 命令输出的路径；用户目录中的同 UUID 扩展会覆盖系统安装。

## 使用与语言

先点击目标输入框，再按 **Super+V**。方向键选择、Enter 插入、Esc 关闭；Ctrl+Tab 切换标签，Ctrl+F 返回搜索。表情符号每行显示多个，可使用中文或英文名称搜索。设置可更改位置、快捷键、记录和自动粘贴。

同一个安装包支持英语、简体中文、繁体中文、日语、西班牙语、法语和韩语。在 Super V 的“设置 → 外观 → 语言”中选择，界面和本地化搜索会立即更新，无需注销，也不会更改 Ubuntu 的语言。默认选项为“跟随系统”；不支持的语言回退到英语。语言名称始终以原文显示。类别按钮横向排列，可直接点击；使用箭头或水平滚动查看更多类别，点击手掌按钮选择肤色。

在设置中添加本地 GIF 文件。粘贴目标必须支持图像；动画支持取决于应用。没有在线 GIF 搜索。剪贴板历史可能含有私人文字，持久历史以明文保存；详情与完整测试状态见 [英文文档](../../README.md) 和 [隐私说明](../../SECURITY.md)。
