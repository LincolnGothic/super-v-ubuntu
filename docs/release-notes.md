Super V Ubuntu 0.1.9 fixes screenshot text entry and refreshes capture/redaction.

- Text opens a focused input box on the image with a native caret. Type, click
  another location to move the box, and press Enter to finish. Export actions
  include the current text draft; Escape cancels it.
- Replace the black-cover button with a light mosaic brush. Draw freely, adjust
  brush thickness (1–256 pixels) and tile size (4–64 pixels), or click for a dab.
  White/light-gray tiles cover the painted pixels completely.
- Add a separate undoable black-and-white filter for the source image.
  Annotations retain their colors and mosaics keep their light palette.
- Super+Shift+S and the camera button start a fresh crosshair selection, without
  a remembered frame. Drag and release to capture; Escape cancels. The selector
  disappears before capture, and the previous editor closes first.
- Super V captures go to the clipboard and optional history. Save image chooses
  a file destination. Print Screen retains GNOME’s normal area/window/screen
  controls and separate file-saving behavior.
- Include the changes in all seven interface languages.

Ubuntu 24.04/GNOME 46, Ubuntu 26.04/GNOME 50 and Debian 13/GNOME 48 installers
support x86-64 and ARM64. Each Architecture: all package uses native distribution
runtimes; all six platform/CPU checks gate publication. SHA256SUMS covers the
three distribution packages and universal installer.

Install your distribution’s package with `sudo apt install ./PACKAGE.deb`, save
your work, log out and back in, and check **Super V 0.1.9** in the header. No
uninstall is needed. Language, shortcuts and saved history are preserved unless
your clearing preference requests otherwise. Original images and separate files
remain independent of edited exports. See the README for usage and limitations.
