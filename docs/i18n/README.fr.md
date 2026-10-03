# Super V Ubuntu — Français

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md)

Un sélecteur Super+V inspiré de Windows pour Ubuntu GNOME : historique du presse-papiers, émojis, kaomoji, symboles et GIF locaux favoris. Les données restent sur votre ordinateur, sans télémétrie ni accès réseau à l’exécution.

Ubuntu 24.04 / GNOME 46 · Ubuntu 26.04 / GNOME 50 · Wayland

## Installation et mise à jour

Enregistrez le [paquet v0.1.4](https://github.com/LincolnGothic/super-v-ubuntu/releases/tag/v0.1.4) dans votre dossier de téléchargements :

```sh
sudo apt install "$HOME/Downloads/super-v-ubuntu_0.1.4_all.deb"
```

Après l’installation, déconnectez-vous puis reconnectez-vous. Exécutez ces commandes avec votre compte habituel, sans sudo. La première réserve Super+M aux notifications et libère Super+V ; elle remplace tout raccourci de notification personnalisé.

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
```

Après une mise à jour, déconnectez-vous puis reconnectez-vous. Le titre doit afficher **Super V 0.1.4**. Si une ancienne version apparaît, vérifiez le chemin indiqué par info : une copie utilisateur portant le même UUID prend priorité sur le paquet système.

## Utilisation et langues

Cliquez dans le champ de destination, puis appuyez sur **Super+V**. Les flèches sélectionnent, Entrée insère et Échap ferme. Ctrl+Tab change d’onglet ; Ctrl+F revient à la recherche. Les émojis sont présentés en grille et peuvent être recherchés par leur nom en français ou en anglais. Les paramètres permettent de modifier la position, le raccourci, l’historique et le collage automatique.

Un seul paquet inclut l’anglais, le chinois simplifié, le chinois traditionnel, le japonais, l’espagnol, le français et le coréen. L’interface suit la langue du bureau. Modifiez-la dans « Région et langue » d’Ubuntu, puis reconnectez-vous. Les langues non disponibles utilisent l’anglais.

Ajoutez vos GIF locaux dans les paramètres. L’application de destination doit accepter les images ; la prise en charge des animations dépend de l’application. Aucune recherche de GIF en ligne. L’historique peut contenir du texte privé et est enregistré en clair. Consultez la [documentation complète en anglais](../../README.md) et les [notes de confidentialité](../../SECURITY.md), notamment l’état des tests.
