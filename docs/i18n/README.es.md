# Super V Ubuntu — Español

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [한국어](README.ko.md)

Un selector al estilo de Windows con Super+V para Ubuntu GNOME: historial del portapapeles, emojis, kaomoji, símbolos y GIF locales favoritos. Los datos permanecen en tu equipo, sin telemetría ni conexiones de red durante el uso.

Ubuntu 24.04 / GNOME 46 · Ubuntu 26.04 / GNOME 50 · Wayland

## Instalación y actualización

Guarda el [paquete v0.1.5](https://github.com/LincolnGothic/super-v-ubuntu/releases/tag/v0.1.5) en tu carpeta de descargas:

```sh
sudo apt install "$HOME/Downloads/super-v-ubuntu_0.1.5_all.deb"
```

Después de instalar, cierra la sesión y vuelve a entrar. Ejecuta estos comandos como usuario normal, sin sudo. El primero asigna Super+M a las notificaciones para dejar Super+V disponible; reemplaza cualquier atajo de notificaciones personalizado.

```sh
gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
gnome-extensions enable super-v-ubuntu@super-v-ubuntu.local
gnome-extensions info super-v-ubuntu@super-v-ubuntu.local
```

Tras actualizar, vuelve a cerrar y abrir la sesión. El título debe mostrar **Super V 0.1.5**. Si aparece una versión antigua, comprueba la ruta indicada por info: una copia de usuario con el mismo UUID tiene prioridad sobre el paquete del sistema.

## Uso e idiomas

Haz clic en el campo de destino y pulsa **Super+V**. Usa las flechas para seleccionar, Enter para insertar y Esc para cerrar. Ctrl+Tab cambia de pestaña; Ctrl+F vuelve a la búsqueda. Los emojis se muestran en una cuadrícula y se pueden buscar por nombres en español o inglés. Ajustes permite cambiar la posición, el atajo, el historial y el pegado automático.

Un único paquete incluye inglés, chino simplificado, chino tradicional, japonés, español, francés y coreano. Elige en «Ajustes → Apariencia → Idioma» de Super V: la interfaz y la búsqueda traducida cambian inmediatamente, sin cerrar sesión ni cambiar el idioma de Ubuntu. La opción predeterminada es «Seguir el sistema»; los idiomas no disponibles usan inglés. Los nombres de los idiomas conservan su forma nativa. Las categorías se seleccionan directamente en una fila horizontal; usa las flechas o el desplazamiento horizontal para ver más. El botón de la mano abre el menú de tonos de piel.

Añade GIF locales desde Ajustes. La aplicación de destino debe aceptar imágenes; la animación depende de ella. No hay búsqueda de GIF en línea. El historial puede contener texto privado y se guarda sin cifrar. Consulta la [documentación completa en inglés](../../README.md) y las [notas de privacidad](../../SECURITY.md), incluido el estado de las pruebas.
