# SPDX-License-Identifier: GPL-3.0-or-later
UUID = super-v-ubuntu@super-v-ubuntu.local
DESTDIR ?=
PREFIX ?= /usr
EXTDIR = $(DESTDIR)$(PREFIX)/share/gnome-shell/extensions/$(UUID)
NODE ?= node

.PHONY: all test check lint test-gjs package install install-local clean emoji
all:

check:
	$(NODE) scripts/validate.js
	python3 scripts/check-generated.py

lint:
	eslint --no-eslintrc -c eslint.json -f unix extension tests scripts --ext .js

test: check lint
	$(NODE) --experimental-vm-modules --test tests/history.test.js tests/emoji.test.js tests/settings.test.js tests/lifecycle.test.js tests/shell-compat.test.js tests/popup.test.js
	$(MAKE) test-gjs

test-gjs:
	glib-compile-schemas --strict extension/schemas
	GSETTINGS_BACKEND=memory gjs -m tests/gjs.test.js

package:
	dpkg-buildpackage -us -uc -b

install:
	install -d $(EXTDIR)/core $(EXTDIR)/data $(EXTDIR)/schemas
	install -m 0644 extension/*.js extension/metadata.json extension/stylesheet.css $(EXTDIR)/
	install -m 0644 extension/core/*.js $(EXTDIR)/core/
	install -m 0644 extension/data/emoji.json vendor/unicode/LICENSE.txt $(EXTDIR)/data/
	install -m 0644 extension/schemas/*.xml $(EXTDIR)/schemas/
	glib-compile-schemas --strict $(EXTDIR)/schemas

install-local:
	./scripts/install-local.sh

emoji:
	python3 scripts/generate-emoji.py

clean:
	rm -f extension/schemas/gschemas.compiled
