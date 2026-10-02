// SPDX-License-Identifier: GPL-3.0-or-later
import {searchKey} from './history.js';

function catalog(groups) {
    return groups.flatMap(([group, entries]) => entries.map(([text, name]) =>
        ({text, name, group, keywords: [], tones: [], subgroup: group})));
}

export const kaomoji = catalog([
    ['Happy', [['(^_^)', 'happy'], ['(≧▽≦)', 'delighted'], ['(＾▽＾)', 'smile'],
        ['(｡◕‿◕｡)', 'cute smile'], ['ヽ(・∀・)ﾉ', 'celebrate'], ['(✿◠‿◠)', 'flower smile'],
        ['(•‿•)', 'smiling'], ['(⌒‿⌒)', 'joy'], ['(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', 'celebration sparkles']]],
    ['Love', [['(♡˙︶˙♡)', 'love'], ['(づ｡◕‿‿◕｡)づ', 'hug'], ['(っ˘з(˘⌣˘ )', 'kiss'],
        ['(♥ω♥*)', 'heart eyes'], ['(´｡• ᵕ •｡`)', 'affection'], ['(｡♥‿♥｡)', 'adoration']]],
    ['Sad', [['(T_T)', 'cry'], ['(╥﹏╥)', 'tears'], ['(｡•́︿•̀｡)', 'sad'], ['(ಥ_ಥ)', 'crying'],
        ['(；＿；)', 'weeping'], ['(っ- ‸ - ς)', 'unhappy']]],
    ['Surprised', [['(⊙_⊙)', 'surprised'], ['(°ロ°)', 'shocked'], ['Σ(°△°|||)', 'astonished'],
        ['(・_・;)', 'nervous'], ['(O_O)', 'wide eyes'], ['(・・?)', 'confused']]],
    ['Playful', [['¯\\_(ツ)_/¯', 'shrug'], ['(╯°□°）╯︵ ┻━┻', 'table flip'],
        ['┬─┬ノ( º _ ºノ)', 'restore table'], ['(¬‿¬)', 'smirk'], ['(ง •̀_•́)ง', 'determined'],
        ['(☞ﾟヮﾟ)☞', 'point right'], ['☜(ﾟヮﾟ☜)', 'point left'], ['(－_－) zzZ', 'sleep']]],
    ['Animals', [['(=^･ω･^=)', 'cat'], ['ʕ•ᴥ•ʔ', 'bear'], ['U・ᴥ・U', 'dog'],
        ['(•ө•)', 'bird'], ['／(･ × ･)＼', 'rabbit'], ['(=①ω①=)', 'cat eyes']]],
    ['Classic', [[':-)', 'smile'], [';-)', 'wink'], [':-D', 'laugh'], [':-P', 'tongue'],
        [':-(', 'sad'], [':-O', 'surprise'], ['<3', 'heart'], [':-/', 'unsure']]],
]);

export const symbols = catalog([
    ['Math', [['±', 'plus minus'], ['×', 'multiply'], ['÷', 'divide'], ['−', 'minus'],
        ['≤', 'less than or equal'], ['≥', 'greater than or equal'], ['≠', 'not equal'],
        ['≈', 'approximately equal'], ['∞', 'infinity'], ['√', 'square root'], ['∑', 'sum'],
        ['∏', 'product'], ['∫', 'integral'], ['∂', 'partial derivative'], ['∇', 'gradient'],
        ['∈', 'element of'], ['∉', 'not element of'], ['∩', 'intersection'], ['∪', 'union'],
        ['∅', 'empty set'], ['∝', 'proportional'], ['≡', 'identical'], ['²', 'squared'],
        ['³', 'cubed'], ['₀', 'subscript zero'], ['₁', 'subscript one'], ['₂', 'subscript two'],
        ['₃', 'subscript three'], ['⁻', 'superscript minus'], ['⁺', 'superscript plus']]],
    ['Greek', [['α', 'alpha'], ['β', 'beta'], ['γ', 'gamma'], ['δ', 'delta'], ['ε', 'epsilon'],
        ['ζ', 'zeta'], ['η', 'eta'], ['θ', 'theta'], ['ι', 'iota'], ['κ', 'kappa'],
        ['λ', 'lambda'], ['μ', 'mu micro'], ['ν', 'nu'], ['ξ', 'xi'], ['π', 'pi'],
        ['ρ', 'rho'], ['σ', 'sigma'], ['τ', 'tau'], ['φ', 'phi'], ['χ', 'chi'],
        ['ψ', 'psi'], ['ω', 'omega'], ['Γ', 'capital gamma'], ['Δ', 'capital delta'],
        ['Θ', 'capital theta'], ['Λ', 'capital lambda'], ['Π', 'capital pi'],
        ['Σ', 'capital sigma'], ['Φ', 'capital phi'], ['Ω', 'capital omega']]],
    ['Arrows', [['←', 'left arrow'], ['→', 'right arrow'], ['↑', 'up arrow'], ['↓', 'down arrow'],
        ['↔', 'left right arrow'], ['↕', 'up down arrow'], ['⇒', 'implies'],
        ['⇐', 'left double arrow'], ['⇔', 'equivalent'], ['⇌', 'equilibrium reversible reaction'],
        ['↗', 'north east arrow'], ['↘', 'south east arrow'], ['↙', 'south west arrow'],
        ['↖', 'north west arrow'], ['↦', 'maps to'], ['⟶', 'long right arrow']]],
    ['Currency', [['$', 'dollar'], ['€', 'euro'], ['£', 'pound'], ['¥', 'yen yuan'],
        ['₩', 'won'], ['₹', 'rupee'], ['₽', 'ruble'], ['¢', 'cent'], ['₿', 'bitcoin']]],
    ['Punctuation', [['…', 'ellipsis'], ['—', 'em dash'], ['–', 'en dash'], ['·', 'middle dot'],
        ['•', 'bullet'], ['“', 'left quotation mark'], ['”', 'right quotation mark'],
        ['‘', 'left single quote'], ['’', 'right single quote'], ['«', 'left guillemet'],
        ['»', 'right guillemet'], ['§', 'section'], ['¶', 'paragraph'], ['†', 'dagger'],
        ['‡', 'double dagger'], ['©', 'copyright'], ['®', 'registered'], ['™', 'trademark']]],
    ['Units', [['°', 'degree'], ['℃', 'degrees Celsius'], ['℉', 'degrees Fahrenheit'],
        ['µ', 'micro'], ['Å', 'angstrom'], ['‰', 'per mille'], ['％', 'full width percent'],
        ['ℓ', 'litre'], ['ℏ', 'reduced Planck constant'], ['Å', 'angstrom sign']]],
]);

export class CatalogIndex {
    constructor(records) {
        this.records = records;
        this.groups = [...new Set(records.map(x => x.group))];
    }

    search(query = '', group = 'All') {
        const terms = searchKey(query).trim().split(/\s+/u).filter(Boolean);
        return this.records.filter(x => (group === 'All' || x.group === group) &&
            terms.every(term => searchKey(`${x.name} ${x.text} ${x.group}`).includes(term)));
    }
}
