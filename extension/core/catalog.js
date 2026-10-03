// SPDX-License-Identifier: GPL-3.0-or-later
import {N_} from './localization.js';
import {searchKey} from './history.js';

function catalog(groups) {
    return groups.flatMap(([group, entries]) => entries.map(([text, name]) =>
        ({text, name, group, keywords: [], tones: [], subgroup: group})));
}

export const kaomoji = catalog([
    [N_('Happy'), [['(^_^)', N_('happy')], ['(≧▽≦)', N_('delighted')], ['(＾▽＾)', N_('smile')],
        ['(｡◕‿◕｡)', N_('cute smile')], ['ヽ(・∀・)ﾉ', N_('celebrate')], ['(✿◠‿◠)', N_('flower smile')],
        ['(•‿•)', N_('smiling')], ['(⌒‿⌒)', N_('joy')], ['(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', N_('celebration sparkles')]]],
    [N_('Love'), [['(♡˙︶˙♡)', N_('love')], ['(づ｡◕‿‿◕｡)づ', N_('hug')], ['(っ˘з(˘⌣˘ )', N_('kiss')],
        ['(♥ω♥*)', N_('heart eyes')], ['(´｡• ᵕ •｡`)', N_('affection')], ['(｡♥‿♥｡)', N_('adoration')]]],
    [N_('Sad'), [['(T_T)', N_('cry')], ['(╥﹏╥)', N_('tears')], ['(｡•́︿•̀｡)', N_('sad')], ['(ಥ_ಥ)', N_('crying')],
        ['(；＿；)', N_('weeping')], ['(っ- ‸ - ς)', N_('unhappy')]]],
    [N_('Surprised'), [['(⊙_⊙)', N_('surprised')], ['(°ロ°)', N_('shocked')], ['Σ(°△°|||)', N_('astonished')],
        ['(・_・;)', N_('nervous')], ['(O_O)', N_('wide eyes')], ['(・・?)', N_('confused')]]],
    [N_('Playful'), [['¯\\_(ツ)_/¯', N_('shrug')], ['(╯°□°）╯︵ ┻━┻', N_('table flip')],
        ['┬─┬ノ( º _ ºノ)', N_('restore table')], ['(¬‿¬)', N_('smirk')], ['(ง •̀_•́)ง', N_('determined')],
        ['(☞ﾟヮﾟ)☞', N_('point right')], ['☜(ﾟヮﾟ☜)', N_('point left')], ['(－_－) zzZ', N_('sleep')]]],
    [N_('Animals'), [['(=^･ω･^=)', N_('cat')], ['ʕ•ᴥ•ʔ', N_('bear')], ['U・ᴥ・U', N_('dog')],
        ['(•ө•)', N_('bird')], ['／(･ × ･)＼', N_('rabbit')], ['(=①ω①=)', N_('cat eyes')]]],
    [N_('Classic'), [[':-)', N_('smile')], [';-)', N_('wink')], [':-D', N_('laugh')], [':-P', N_('tongue')],
        [':-(', N_('sad')], [':-O', N_('surprise')], ['<3', N_('heart')], [':-/', N_('unsure')]]],
]);

export const symbols = catalog([
    [N_('Math'), [['±', N_('plus minus')], ['×', N_('multiply')], ['÷', N_('divide')], ['−', N_('minus')],
        ['≤', N_('less than or equal')], ['≥', N_('greater than or equal')], ['≠', N_('not equal')],
        ['≈', N_('approximately equal')], ['∞', N_('infinity')], ['√', N_('square root')], ['∑', N_('sum')],
        ['∏', N_('product')], ['∫', N_('integral')], ['∂', N_('partial derivative')], ['∇', N_('gradient')],
        ['∈', N_('element of')], ['∉', N_('not element of')], ['∩', N_('intersection')], ['∪', N_('union')],
        ['∅', N_('empty set')], ['∝', N_('proportional')], ['≡', N_('identical')], ['²', N_('squared')],
        ['³', N_('cubed')], ['₀', N_('subscript zero')], ['₁', N_('subscript one')], ['₂', N_('subscript two')],
        ['₃', N_('subscript three')], ['⁻', N_('superscript minus')], ['⁺', N_('superscript plus')]]],
    [N_('Greek'), [['α', N_('alpha')], ['β', N_('beta')], ['γ', N_('gamma')], ['δ', N_('delta')], ['ε', N_('epsilon')],
        ['ζ', N_('zeta')], ['η', N_('eta')], ['θ', N_('theta')], ['ι', N_('iota')], ['κ', N_('kappa')],
        ['λ', N_('lambda')], ['μ', N_('mu micro')], ['ν', N_('nu')], ['ξ', N_('xi')], ['π', N_('pi')],
        ['ρ', N_('rho')], ['σ', N_('sigma')], ['τ', N_('tau')], ['φ', N_('phi')], ['χ', N_('chi')],
        ['ψ', N_('psi')], ['ω', N_('omega')], ['Γ', N_('capital gamma')], ['Δ', N_('capital delta')],
        ['Θ', N_('capital theta')], ['Λ', N_('capital lambda')], ['Π', N_('capital pi')],
        ['Σ', N_('capital sigma')], ['Φ', N_('capital phi')], ['Ω', N_('capital omega')]]],
    [N_('Arrows'), [['←', N_('left arrow')], ['→', N_('right arrow')], ['↑', N_('up arrow')], ['↓', N_('down arrow')],
        ['↔', N_('left right arrow')], ['↕', N_('up down arrow')], ['⇒', N_('implies')],
        ['⇐', N_('left double arrow')], ['⇔', N_('equivalent')], ['⇌', N_('equilibrium reversible reaction')],
        ['↗', N_('north east arrow')], ['↘', N_('south east arrow')], ['↙', N_('south west arrow')],
        ['↖', N_('north west arrow')], ['↦', N_('maps to')], ['⟶', N_('long right arrow')]]],
    [N_('Currency'), [['$', N_('dollar')], ['€', N_('euro')], ['£', N_('pound')], ['¥', N_('yen yuan')],
        ['₩', N_('won')], ['₹', N_('rupee')], ['₽', N_('ruble')], ['¢', N_('cent')], ['₿', N_('bitcoin')]]],
    [N_('Punctuation'), [['…', N_('ellipsis')], ['—', N_('em dash')], ['–', N_('en dash')], ['·', N_('middle dot')],
        ['•', N_('bullet')], ['“', N_('left quotation mark')], ['”', N_('right quotation mark')],
        ['‘', N_('left single quote')], ['’', N_('right single quote')], ['«', N_('left guillemet')],
        ['»', N_('right guillemet')], ['§', N_('section')], ['¶', N_('paragraph')], ['†', N_('dagger')],
        ['‡', N_('double dagger')], ['©', N_('copyright')], ['®', N_('registered')], ['™', N_('trademark')]]],
    [N_('Units'), [['°', N_('degree')], ['℃', N_('degrees Celsius')], ['℉', N_('degrees Fahrenheit')],
        ['µ', N_('micro')], ['Å', N_('angstrom')], ['‰', N_('per mille')], ['％', N_('full width percent')],
        ['ℓ', N_('litre')], ['ℏ', N_('reduced Planck constant')], ['Å', N_('angstrom sign')]]],
]);

export class CatalogIndex {
    constructor(records, translate = x => x) {
        this.records = records.map(x => translate(x.name) === x.name ? x
            : {...x, name: translate(x.name), englishName: x.name});
        this.translate = translate;
        this.groups = [...new Set(records.map(x => x.group))];
    }

    search(query = '', group = 'All') {
        const terms = searchKey(query).trim().split(/\s+/u).filter(Boolean);
        return this.records.filter(x => (group === 'All' || x.group === group) &&
            terms.every(term => searchKey(`${x.name} ${x.englishName ?? ''} ${x.text} ${x.group} ${this.translate(x.group)}`).includes(term)));
    }
}
