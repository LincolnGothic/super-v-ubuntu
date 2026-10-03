# Super V Ubuntu — 日本語

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md)

Ubuntu GNOME 向けの Windows 風 Super+V パネルです。クリップボード履歴、絵文字、顔文字、記号、お気に入りのローカル GIF を利用できます。データはこのコンピューター内に保存され、テレメトリーや実行時のネットワーク通信はありません。

Ubuntu 24.04 / GNOME 46 · Ubuntu 26.04 / GNOME 50 · Wayland

## インストールと更新

[v0.1.4 のパッケージ](https://github.com/LincolnGothic/super-v-ubuntu/releases/tag/v0.1.4)をダウンロードフォルダーに保存します。

```sh
sudo apt install "$HOME/Downloads/super-v-ubuntu_0.1.4_all.deb"
```

インストール後にログアウトして再度ログインし、一般ユーザーで次のコマンドを実行します（sudo は使いません）。最初のコマンドは通知のショートカットを Super+M に設定し、Super+V をこの拡張機能に割り当てられるようにします。独自の通知ショートカットは置き換えられます。

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
```

更新後もログアウトして再度ログインしてください。タイトルは **Super V 0.1.4** になります。古いバージョンが表示される場合は info のパスを確認してください。同じ UUID のユーザー用拡張機能はシステムのインストールより優先されます。

## 使い方と言語

入力先をクリックして **Super+V** を押します。矢印キーで選択、Enter で挿入、Esc で閉じます。Ctrl+Tab でタブを切り替え、Ctrl+F で検索に戻ります。絵文字はグリッド表示で、日本語や英語の名前から検索できます。位置、ショートカット、履歴、自動貼り付けは設定で変更できます。

同じパッケージで英語、簡体字中国語、繁体字中国語、日本語、スペイン語、フランス語、韓国語に対応します。デスクトップの言語に従います。Ubuntu の「地域と言語」で変更した後、ログアウトして再度ログインしてください。未対応の言語では英語を使用します。

ローカル GIF は設定で追加します。貼り付け先が画像に対応している必要があり、アニメーションへの対応はアプリによって異なります。オンライン GIF 検索はありません。履歴には個人情報が含まれる場合があり、保存形式は平文です。詳細と検証状況は[英語の説明](../../README.md)と[プライバシーの説明](../../SECURITY.md)を参照してください。
