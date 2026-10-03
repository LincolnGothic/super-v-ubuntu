# Super V Ubuntu — 简体中文

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md)

v0.1.8 增加可拖动、缩放和调节透明度的屏幕贴图、自动编号标记、可选取并移动/缩放/删除的标注，以及本地 OCR 文字识别。编辑器中的「贴到屏幕」可固定参考图；「从图像复制文字」可选择已安装的识别语言，检查并编辑结果后复制。在「设置 → 截图导出和 OCR」可选择保存文件夹、文件名格式及 OCR 语言。English OCR 随安装包提供；其他语言需安装对应 Tesseract 语言包。屏幕贴图与历史中的固定项目不同，锁屏、清空或禁用扩展会关闭贴图。

v0.1.6 支持 PNG/JPEG 图片历史、缩略图、固定和粘贴。点击标题栏的相机按钮，或按 Super+Shift+S，可使用 GNOME 的区域、窗口和全屏截图工具。快捷键可在设置中修改或禁用。启用「关机时清空历史记录」后，文本、图片、固定项目和最近使用的表情仅保存在内存中，关机、重启、注销或重新加载扩展时都会清空。启用时也会删除已有的磁盘历史记录，但不删除 GNOME 的截图文件。

适用于 Ubuntu GNOME 的 Windows 风格 Super+V 选择器，提供剪贴板历史、表情符号、颜文字、符号和本地 GIF 收藏。所有内容保留在本机，无遥测或运行时网络请求。

Ubuntu 24.04 / GNOME 46 · Ubuntu 26.04 / GNOME 50 · Debian 13 / GNOME 48 · Wayland · x86-64 & ARM64

## 首次安装

下载 [v0.1.8 安装包](https://github.com/LincolnGothic/super-v-ubuntu/releases/download/v0.1.8/super-v-ubuntu_0.1.8_all.deb)，在安装包所在文件夹中打开终端：

```sh
sudo apt install ./super-v-ubuntu_0.1.8_all.deb
```

安装后**保存工作、注销并重新登录**，再以普通用户运行以下命令（不使用 sudo）。第一个命令将通知快捷键设为 Super+M，为本应用释放 Super+V；它会替换自定义通知快捷键。

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
```

按 **Super+V**，标题应为 **Super V 0.1.8**。

## 升级到 v0.1.8

下载上面的安装包，在安装包所在文件夹中运行同一个 apt 命令，即可覆盖升级，无须先卸载。随后**保存工作、注销并重新登录**，再按 **Super+V** 检查标题是否为 **Super V 0.1.8**。语言和快捷键设置会保留，已保存的文本历史、固定项目和最近使用的表情会迁移；设置为注销时清空的历史会按设置清空。

以普通用户检查安装包和 GNOME 当前加载的版本：

```sh
dpkg-query -W super-v-ubuntu
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
```

两个版本都应为 **0.1.8**（扩展内部编号为 8）。若安装包为新版而 GNOME 仍加载旧版，请先注销并重新登录。系统安装的 Path 应为 `/usr/share/gnome-shell/extensions/super-v-ubuntu@super-v-ubuntu.local`；若指向用户目录，请备份并将该 UUID 文件夹移到扩展目录之外，再注销登录。若 Super+V 没有反应，可运行上面的 enable 命令；若打开的是通知，检查首次安装中的通知快捷键命令。设置打不开时，可运行 `gnome-extensions prefs super-v-ubuntu@super-v-ubuntu.local`。

## v0.1.8 设置速查

按 Super+V，点击标题栏的齿轮按钮打开“设置”。

| 功能 | 操作或设置位置 |
| --- | --- |
| 截图 | 相机按钮或 **Super+Shift+S**；截图后重新打开 Super+V 查看图片历史。需启用剪贴板历史收集。 |
| 修改截图快捷键 | **设置 → 桌面集成 → 截图快捷键（GTK 格式）**；例如 `<Super><Shift>s`，应用修改，留空可禁用。 |
| 关机清空历史 | **设置 → 剪贴板历史 → 关机时清空历史记录**。默认关闭，也会在重启、注销或重新加载扩展时清空。 |
| 切换语言 | **设置 → 外观 → 语言**；立即生效。 |

启用关机清空后，已有磁盘历史会删除，当前项目只保留在内存中；GNOME 在 Pictures/Screenshots 中另存的截图文件不会删除。

## 使用与语言

先点击目标输入框，再按 **Super+V**。方向键选择、Enter 插入、Esc 关闭；Ctrl+Tab 切换标签，Ctrl+F 返回搜索。表情符号每行显示多个，可使用中文或英文名称搜索。设置可更改位置、快捷键、记录和自动粘贴。

同一个安装包支持英语、简体中文、繁体中文、日语、西班牙语、法语和韩语。在 Super V 的“设置 → 外观 → 语言”中选择，界面和本地化搜索会立即更新，无需注销，也不会更改 Ubuntu 的语言。默认选项为“跟随系统”；不支持的语言回退到英语。语言名称始终以原文显示。类别按钮横向排列，可直接点击；使用箭头或水平滚动查看更多类别，点击手掌按钮选择肤色。

在设置中添加本地 GIF 文件。粘贴目标必须支持图像；动画支持取决于应用。没有在线 GIF 搜索。剪贴板历史可能含有私人文字，持久历史以明文保存；详情与完整测试状态见 [英文文档](../../README.md) 和 [隐私说明](../../SECURITY.md)。
