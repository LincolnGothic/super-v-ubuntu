# SPDX-License-Identifier: GPL-3.0-or-later
UUID = super-v-ubuntu@super-v-ubuntu.local
DESTDIR ?=
PREFIX ?= /usr
EXTDIR = $(DESTDIR)$(PREFIX)/share/gnome-shell/extensions/$(UUID)
NODE ?= node
MSGFMT ?= msgfmt
XGETTEXT ?= xgettext
export MSGFMT XGETTEXT

.PHONY: all test check lint test-gjs package install install-local clean emoji translations pot
all:

check:
	$(NODE) scripts/validate.js
	python3 scripts/check-generated.py
	python3 scripts/translations.py check

lint:
	eslint --no-eslintrc -c eslint.json -f unix extension tests scripts --ext .js

test: check lint
	$(NODE) --experimental-vm-modules --test tests/history.test.js tests/image.test.js tests/editor.test.js tests/editor-bridge.test.js tests/emoji.test.js tests/settings.test.js tests/lifecycle.test.js tests/shell-compat.test.js tests/popup.test.js tests/catalog.test.js tests/localization.test.js
	$(MAKE) test-gjs

test-gjs: translations
	glib-compile-schemas --strict extension/schemas
	GSETTINGS_BACKEND=memory gjs -m tests/gjs.test.js
	python3 tests/translations.test.py

package:
	dpkg-buildpackage -us -uc -b

install: translations
	install -d $(EXTDIR)/core $(EXTDIR)/data $(EXTDIR)/schemas
	install -m 0644 extension/*.js extension/metadata.json extension/stylesheet.css $(EXTDIR)/
	install -m 0644 extension/core/*.js $(EXTDIR)/core/
	install -m 0644 extension/data/emoji.json vendor/unicode/LICENSE.txt $(EXTDIR)/data/
	install -d $(EXTDIR)/data/emoji-locales
	install -m 0644 extension/data/emoji-locales/*.json $(EXTDIR)/data/emoji-locales/
	cp -r extension/locale $(EXTDIR)/
	install -m 0644 extension/schemas/*.xml $(EXTDIR)/schemas/
	glib-compile-schemas --strict $(EXTDIR)/schemas

install-local: translations
	./scripts/install-local.sh

emoji:
	python3 scripts/generate-emoji.py

translations:
	python3 scripts/translations.py build

pot:
	python3 scripts/translations.py pot

clean:
	rm -f extension/schemas/gschemas.compiled
	rm -rf extension/locale
