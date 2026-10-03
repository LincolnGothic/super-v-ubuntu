# Super V Ubuntu — 繁體中文

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md)

適用於 Ubuntu GNOME 的 Windows 風格 Super+V 選擇器，提供剪貼簿歷史、表情符號、顏文字、符號和本機 GIF 收藏。所有內容保留在本機，無遙測或執行時網路請求。

Ubuntu 24.04 / GNOME 46 · Ubuntu 26.04 / GNOME 50 · Wayland

## 安裝與升級

下載 [v0.1.5 安裝套件](https://github.com/LincolnGothic/super-v-ubuntu/releases/tag/v0.1.5)，儲存到「下載」目錄：

```sh
sudo apt install "$HOME/Downloads/super-v-ubuntu_0.1.5_all.deb"
```

安裝後登出並重新登入，再以一般使用者執行以下命令（不使用 sudo）。第一個命令將通知快捷鍵設為 Super+M，讓本應用程式使用 Super+V；它會取代自訂通知快捷鍵。

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
```

升級後再次登出並登入，標題應為 **Super V 0.1.5**。若仍顯示舊版，請檢查上方 info 命令輸出的路徑；使用者目錄中相同 UUID 的擴充功能會覆蓋系統安裝。

## 使用與語言

先點選目標輸入框，再按 **Super+V**。方向鍵選擇、Enter 插入、Esc 關閉；Ctrl+Tab 切換分頁，Ctrl+F 返回搜尋。表情符號每列顯示多個，可使用中文或英文名稱搜尋。設定可變更位置、快捷鍵、記錄和自動貼上。

同一個安裝套件支援英語、簡體中文、繁體中文、日語、西班牙語、法語和韓語。在 Super V 的「設定 → 外觀 → 語言」中選擇，介面和本地化搜尋會立即更新，無須登出，也不會變更 Ubuntu 的語言。預設為「跟隨系統」；不支援的語言使用英語。語言名稱始終以原文顯示。類別按鈕橫向排列，可直接點選；使用箭頭或水平捲動查看更多類別，點選手掌按鈕選擇膚色。

在設定中新增本機 GIF 檔案。貼上目標必須支援圖片；動畫支援取決於應用程式。沒有線上 GIF 搜尋。剪貼簿歷史可能包含私人文字，持久歷史以明文儲存；詳情與完整測試狀態見 [英文文件](../../README.md) 和 [隱私說明](../../SECURITY.md)。
