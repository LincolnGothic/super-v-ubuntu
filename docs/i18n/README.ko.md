# Super V Ubuntu — 한국어

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md)

Ubuntu GNOME에서 사용하는 Windows 스타일 Super+V 선택기입니다. 클립보드 기록, 이모지, 카오모지, 기호, 즐겨찾는 로컬 GIF를 제공합니다. 모든 데이터는 이 컴퓨터에 저장되며 원격 측정이나 실행 중 네트워크 접근은 없습니다.

Ubuntu 24.04 / GNOME 46 · Ubuntu 26.04 / GNOME 50 · Wayland

## 설치 및 업데이트

[v0.1.5 패키지](https://github.com/LincolnGothic/super-v-ubuntu/releases/tag/v0.1.5)를 다운로드 폴더에 저장하세요.

```sh
sudo apt install "$HOME/Downloads/super-v-ubuntu_0.1.5_all.deb"
```

설치 후 로그아웃하고 다시 로그인하세요. 다음 명령은 일반 사용자로 실행합니다(sudo 사용 안 함). 첫 번째 명령은 알림 단축키를 Super+M으로 설정하여 Super+V를 사용할 수 있게 합니다. 기존 사용자 지정 알림 단축키는 변경됩니다.

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
```

업데이트 후에도 로그아웃하고 다시 로그인하세요. 제목에 **Super V 0.1.5**가 표시되어야 합니다. 이전 버전이 표시되면 info에 나온 경로를 확인하세요. 같은 UUID의 사용자용 확장 기능이 시스템 패키지보다 우선합니다.

## 사용 방법 및 언어

입력할 필드를 클릭한 후 **Super+V**를 누르세요. 화살표로 선택하고 Enter로 삽입하며 Esc로 닫습니다. Ctrl+Tab으로 탭을 전환하고 Ctrl+F로 검색으로 돌아갑니다. 이모지는 격자로 표시되며 한국어나 영어 이름으로 검색할 수 있습니다. 설정에서 위치, 단축키, 기록 수집, 자동 붙여넣기를 변경할 수 있습니다.

하나의 패키지에 영어, 중국어 간체, 중국어 번체, 일본어, 스페인어, 프랑스어, 한국어가 포함됩니다. Super V의 «설정 → 외관 → 언어»에서 선택하면 인터페이스와 번역된 검색이 즉시 바뀝니다. 다시 로그인할 필요가 없으며 Ubuntu의 언어도 변경되지 않습니다. 기본값은 «시스템 설정 따르기»이며 지원하지 않는 언어는 영어로 표시됩니다. 언어 이름은 각 언어의 원래 표기로 표시됩니다. 카테고리는 가로 한 줄의 버튼에서 바로 선택할 수 있습니다. 화살표나 가로 스크롤로 다른 카테고리를 보고 손 모양 버튼에서 피부색을 선택하세요.

설정에서 로컬 GIF를 추가하세요. 붙여넣을 앱이 이미지를 지원해야 하며 애니메이션 지원 여부는 앱에 따라 다릅니다. 온라인 GIF 검색은 없습니다. 클립보드 기록에 개인 정보가 포함될 수 있으며 평문으로 저장됩니다. 전체 설명과 테스트 상태는 [영문 문서](../../README.md) 및 [개인 정보 안내](../../SECURITY.md)를 참고하세요.
