// SPDX-License-Identifier: GPL-3.0-or-later
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';

export async function loadModule(file, mocks, globalObject = {}) {
    const context = vm.createContext({TextEncoder, TextDecoder, console, global: globalObject});
    const modules = new Map();
    function get(name, parent) {
        const key = name.startsWith('.') ? resolve(dirname(parent), name) : name;
        if (modules.has(key))
            return modules.get(key);
        let module;
        const mock = mocks[key] ?? mocks[name];
        if (mock) {
            module = new vm.SyntheticModule(Object.keys(mock), function () {
                for (const [name, value] of Object.entries(mock))
                    this.setExport(name, value);
            }, {context, identifier: key});
        } else {
            module = new vm.SourceTextModule(readFileSync(key, 'utf8'), {context, identifier: key});
        }
        modules.set(key, module);
        return module;
    }
    const module = get(resolve(file), '');
    await module.link((name, parent) => get(name, parent.identifier));
    await module.evaluate();
    return module.namespace;
}

