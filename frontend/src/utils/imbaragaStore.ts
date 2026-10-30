import { useEffect, useState } from 'react';

export type AppLang = 'EN' | 'RW';

export interface HouseholdRecord {
  id: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  ubudehe: string;
  members: number;
  income: number;
  assets: number;
  vulnerabilityScore: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  primaryDriver: string;
  primaryDriverRw: string;
  recommendedIntervention: string;
  recommendedInterventionRw: string;
}

export interface UploadedBatchSummary {
  fileName: string;
  uploadedAt: string;
  totalHouseholds: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  avgScore: number;
  avgIncome: number;
  districtsCovered: string[];
  sectorsCovered: string[];
  cellsCovered: string[];
  villagesCovered: string[];
  records: HouseholdRecord[];
}

declare global {
  interface Window {
    __IMBARAGA_LANG__?: AppLang;
    __IMBARAGA_UPLOADED_DATA__?: UploadedBatchSummary | null;
  }
}

export function detectHeaderLangFromDom(): AppLang {
  if (typeof document === 'undefined') return 'EN';
  const buttons = document.querySelectorAll('button');
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    const txt = (b.textContent ?? '').trim();
    if (txt === 'RW') {
      const cls = b.className || '';
      const bg = window.getComputedStyle(b).backgroundColor;
      if (
        cls.includes('bg-emerald') ||
        cls.includes('bg-green') ||
        cls.includes('bg-teal') ||
        cls.includes('text-white') ||
        b.getAttribute('aria-pressed') === 'true' ||
        (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)')
      ) {
        return 'RW';
      }
    }
  }
  const navText = document.body?.innerText ?? '';
  if (navText.includes('Guhitamo ingo') || navText.includes('Ubusesenguzi')) {
    return 'RW';
  }
  const saved = localStorage.getItem('imbaraga_lang');
  return saved === 'RW' ? 'RW' : 'EN';
}

export function getActiveLang(): AppLang {
  if (typeof window === 'undefined') return 'EN';
  if (window.__IMBARAGA_LANG__) return window.__IMBARAGA_LANG__;
  return detectHeaderLangFromDom();
}

export function setActiveLang(lang: AppLang): void {
  if (typeof window === 'undefined') return;
  window.__IMBARAGA_LANG__ = lang;
  try {
    localStorage.setItem('imbaraga_lang', lang);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('imbaraga-lang-change', { detail: lang }));
}

export function useImbaragaLang(): [AppLang, (l: AppLang) => void] {
  const [lang, setLangState] = useState<AppLang>(() => getActiveLang());

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<AppLang>;
      if (custom.detail === 'EN' || custom.detail === 'RW') {
        setLangState(custom.detail);
      } else {
        setLangState(getActiveLang());
      }
    };
    window.addEventListener('imbaraga-lang-change', handler);
    return () => window.removeEventListener('imbaraga-lang-change', handler);
  }, []);

  return [lang, setActiveLang];
}

export function translateDriverOrAdviceToRw(text: string): string {
  if (!text) return text;
  if (text.includes(' + ')) {
    return text
      .split(' + ')
      .map(part => translateDriverOrAdviceToRw(part.trim()))
      .join(' + ');
  }

  const t = text.trim();

  if (/Direct VUP cash transfer\s*&\s*financial inclusion onboarding/i.test(t)) {
    return "Inkunga y'amafaranga ya VUP no kwinjizwa muri serivisi z'imari";
  }
  if (/Asset-building cooperative\s*&\s*micro-credit linkage/i.test(t)) {
    return "Kwinjizwa muri koperative y'iterambere no guhabwa inguzanyo nto";
  }
  if (/Routine monitoring\s*&\s*community savings group/i.test(t)) {
    return "Gukurikiranwa bisanzwe no kwizigamira mu matsinda (Ibimina)";
  }
  if (/Immediate social protection transfer/i.test(t)) {
    return "Inkunga yihutirwa yo kurengera abatishoboye";
  }
  if (/Priority home visit/i.test(t)) {
    return "Gusura urugo mu buryo bwihutirwa";
  }
  if (/^Severe income deficit$/i.test(t)) {
    return 'Amikoro make cyane';
  }
  if (/^Low household income$/i.test(t)) {
    return "Amikoro make y'urugo";
  }
  if (/^Zero productive assets$/i.test(t)) {
    return 'Nta mitungo ibyara inyungu';
  }
  if (/^Baseline socio-economic exposure$/i.test(t)) {
    return "Ibyago bisanzwe by'imibereho";
  }
  const highPovMatch = t.match(/^High-poverty district\s*\(([^)]+)\)$/i);
  if (highPovMatch) {
    return `Akarere gafite ubukene bwinshi (${highPovMatch[1]})`;
  }
  const highDepMatch = t.match(/^High dependency\s*\((\d+)\s*members?\)$/i);
  if (highDepMatch) {
    return `Umubare munini w'abagize urugo (${highDepMatch[1]})`;
  }

  return translateTextToRw(t);
}

const EXACT_EN_TO_RW: Record<string, string> = {
  'Seeing poverty before the next survey': "Kubona ishusho y'ubukene mbere y'ibarura ritaha",
  'Dashboard': 'Ahabanza',
  'Targeting': 'Guhitamo ingo',
  'Insights': 'Ubusesenguzi',
  'Where to focus': 'Aho kwibanda',
  'Map': 'Ikarita',
  'Progress': 'Iterambere',
  'Drivers': 'Impamvu Nyamukuru',
  'All districts': 'Uturere twose',
  'Sources': "Inkomoko y'Imibare",
  'Sources and limits': "Inkomoko y'imibare n'imbogamizi",
  'Where is help needed most?': 'Ni hehe ubufasha bukenewe cyane kurusha ahandi?',
  'Official poverty data for all 30 districts of Rwanda. NISR EICV7 2023/24 and FinScope 2024.': "Imibare nyayo y'ubukene mu turere twose 30 tw'u Rwanda. NISR EICV7 2023/24 na FinScope 2024.",
  'People living in poverty': 'Abaturage babayeho mu bukene',
  'Highest district': 'Akarere gafite ubukene bwinshi',
  'Districts with lower poverty than 2016/17': 'Uturere twagabanyije ubukene ugereranyije na 2016/17',
  '30 of 30': '30 kuri 30',
  'Districts needing extra attention': "Uturere dukeneye kwitabwaho by'umwihariko",
  'Where to focus first': 'Aho kwibanda mbere na mbere',
  'Poverty above the national rate, with low access to services or finance.': "Ubukene buri hejuru y'igipimo cy'igihugu, hamwe n'uburyo buke bwo kubona serivisi cyangwa imari.",
  'Map by district': "Ikarita y'uturere",
  'Point at or select a district for details.': 'Rambika akamenyetso ku karere cyangwa ugakandeho kugira ngo ubone amakuru arambuye.',
  'Point at or tap a district to see its details.': 'Rambika akamenyetso ku karere cyangwa ugakandeho kugira ngo ubone amakuru arambuye.',
  'of people in poverty': "by'abaturage bari mu bukene",
  'No data': 'Nta makuru',
  'Poverty': 'Ubukene',
  'Missing support': 'Abadafite ubufasha',
  'Poor and left out': 'Abakene basigaye inyuma',
  'Official NISR EICV7 2023/24 poverty rate for each district.': "Igipimo nyacyo cy'ubukene cya NISR EICV7 2023/24 kuri buri karere.",
  'Progress since 2016/17': 'Iterambere kuva mu 2016/17',
  'Poverty in every district, then and now.': 'Ubukene muri buri karere, icyo gihe n’ubu.',
  'What is behind poverty': 'Ni iki gitera ubukene',
  'What is behind poverty?': 'Ni iki gitera ubukene?',
  'Compare poverty with one indicator at a time. Association, not cause.': "Gereranya ubukene n'igipimo kimwe icyarimwe. Ni isano bifitanye, si impamvu ntakuka.",
  'Search, filter and compare all 30 districts.': 'Shakisha, robanura kandi ugereranye uturere twose 30.',
  'Where the numbers come from and how to read them.': 'Aho imibare ikomoka n’uburyo bwo kuyisoma.',
  'District': 'Akarere',
  'Province': 'Intara',
  'Poverty rate (%)': "Igipimo cy'ubukene (%)",
  'Poverty rate': "Igipimo cy'ubukene",
  'Change since 2016/17': 'Ihinduka kuva 2016/17',
  'Low access to services': "Serivisi z'ibanze nke",
  'Low financial access': "Kutagerwaho n'imari",
  'Yes': 'Yego',
  'No': 'Oya',
  'South': 'Amajyepfo',
  'North': 'Amajyaruguru',
  'East': 'Iburasirazuba',
  'West': 'Iburengerazuba',
  'Kigali': 'Umujyi wa Kigali',
  'City of Kigali': 'Umujyi wa Kigali',
  'For analysts': 'Ku basesenguzi',
  'How the risk estimate is made, how accurate it is, and whether it treats groups fairly. Results here come from synthetic data and must be re-checked on real survey data before field use.': "Uko igipimo cy'ibyago kibazwa, ukuri kwacyo, n'uko gifata ibyiciro byose mu buryo bungana. Ibisubizo biri hano bikomoka ku mibare y'igerageza kandi bigomba kongera kugenzurwa ku mibare nyayo y'ubushakashatsi mbere yo gukoreshwa.",
  'What drives the risk estimate': "Ni iki kigena igipimo cy'ibyago by'ubukene",
  'The household answers that matter most': "Ibisubizo by'urugo bifite uburemere kurusha ibindi",
  'How much each answer moves the risk estimate, across all test households. Longer bar means a bigger influence.': "Ingano y'uko buri gisubizo gihindura igipimo cy'ibyago mu ngo zose zageragejwe. Umurongo muremure usobanura uruhare runini.",
  'Household assets': "Imitungo y'urugo",
  'Education of household head': "Amashuri y'umukuru w'urugo",
  'Main source of income': "Inkomoko nyamukuru y'amikoro",
  'Land owned (ha)': 'Ubutaka butunzwe (ha)',
  'Number of income sources': "Umubare w'inkomoko z'amikoro",
  'Has savings': 'Bafite ubwizigame',
  'Urban share of district': "Igice cy'umujyi mu karere",
  'Household size': "Umubare w'abagize urugo",
  'Has electricity': 'Bafite amashanyarazi',
  'Ubudehe category': "Icyiciro cy'Ubudehe",
  'Access to clean water': "Kugerwaho n'amazi meza",
  'Clean water': 'Amazi meza',
  'Health insurance': 'Ubwishingizi bwo kwivuza',
  'Mobile phone ownership': 'Gutunga telefone igendanwa',
  'Livestock ownership': 'Gutunga amatungo',
  'Roof material': "Ibikoresho by'isakaro",
  'Wall material': "Ibikoresho by'inkuta",
  'Floor material': 'Imiterere yo hasi mu nzu',
  'Age of household head': "Imyaka y'umukuru w'urugo",
  'Sex of household head': "Igitsina cy'umukuru w'urugo",
  'Does it treat groups fairly?': 'Ese ifata ibyiciro byose mu buryo bungana?',
  'Share of poor households found, by head of household': "Ijanisha ry'ingo zikennye zabonetse, hakurikijwe uyobora urugo",
  'Group': 'Icyiciro',
  'Households': 'Ingo',
  'Actually poor': 'Abakene nyabo',
  'Poor households found': 'Ingo zikennye zabonetse',
  'Non-poor wrongly flagged': 'Ingo zitari izikennye zashyizwe ku rutonde kwibeshya',
  'Female-headed': "Ingo ziyoborwa n'abagore",
  'Male-headed': "Ingo ziyoborwa n'abagabo",
  'Rural': 'Mu cyaro',
  'Urban': 'Mu mujyi',
  'Youth-headed': "Ingo ziyoborwa n'urubyiruko",
  'Elderly-headed': "Ingo ziyoborwa n'abageze mu za bukuru",
  'Measured on held-out synthetic households at a risk cutoff of 0.5. Real-world fairness must be re-checked on real survey data. Groups under 30 households are hidden.': "Byapimwe ku ngo z'igerageza ku gipimo cy'ibyago cya 0.5. Uburinganire nyabwo bugomba kongera kugenzurwa ku mibare nyayo y'ubushakashatsi. Ibyiciro biri munsi y'ingo 30 ntibyerekanwa.",
  'Where it finds and misses households': 'Aho ibona ingo zikennye n’aho izihusha',
  'Results on households the model never saw in training': 'Ibisubizo ku ngo modeli itigeze ibona mu gihe cyo kuyitoza',
  'Flagged as at risk': "Zagaragajwe nk'iziri mu byago",
  'Not flagged': 'Zitaragaragajwe',
  'Really poor': 'Abakene nyabo',
  'Not poor': 'Abatari abakene',
  'Correctly found': 'Zabonetse neza',
  'Missed': 'Zahushijwe',
  'Flagged by mistake': 'Zagaragajwe ku kwibeshya',
  'Correctly left out': 'Zasizwe neza',
  '4,000 held-out test households. Trained and tested on SYNTHETIC data calibrated to published NISR marginals. These numbers are not real-world accuracy.': "Ingo 4,000 z'igerageza. Yatojwe kandi ipimwa ku mibare y'igerageza ihuje n'imibare rusange ya NISR. Iyi mibare si igipimo cy'ukuri nyako mu murimo.",
  'How good is the ranking?': 'Urutonde rwizewe ku ruhe rwego?',
  'Poor households found versus non-poor households wrongly flagged': 'Ingo zikennye zabonetse ugereranyije n’ingo zitari izikennye zagaragajwe ku kwibeshya',
  'The closer a line gets to the top-left corner, the better the model finds poor households without flagging many non-poor ones. The dotted diagonal is random guessing.': "Uko umurongo wegera imfuruka yo hejuru ibumoso, ni ko modeli ibona neza ingo zikennye itagaragaje ingo nyinshi zitari izikennye. Umurongo w'utudomo ugaragaza gutombora.",
  'AUC is 1.0 for a perfect model and 0.5 for guessing. Trained and tested on SYNTHETIC data calibrated to published NISR marginals. These numbers are not real-world accuracy.': "Igipimo cya AUC ni 1.0 kuri modeli itunganye na 0.5 ku gutombora. Yatojwe kandi ipimwa ku mibare y'igerageza ihuje na NISR. Iyi mibare si ukuri nyako mu murimo.",
  'Simple model versus complex model': 'Modeli yoroshye ugereranyije na modeli ihambaye',
  'Both were tested on the same households': 'Zombi zageragejwe ku ngo zimwe',
  'We tested a complex model (XGBoost) against a simple, easy-to-explain one. When they score almost the same, the simple model is a strong choice for officials who need to understand the result.': "Twagereranyije modeli ihambaye (XGBoost) na modeli yoroshye gusobanura. Iyo zombi zitsinze ku rugero rumwe, modeli yoroshye ni yo mahitamo meza ku bayobozi bakeneye gusobanukirwa ibisubizo.",
  'Measure': 'Igipimo',
  'Simple baseline': "Modeli y'ibanze yoroshye",
  'Flags that were truly poor': 'Ingo zagaragajwe zari zikennye koko',
  'Overall correct': 'Ukuri rusange',
  'Ranking quality': "Ubwiza bw'urutonde",
  'Ranking on unseen districts': 'Urutonde ku turere tutakoreshejwe mu myitozo',
  '(District-grouped AUC)': '(AUC ikomatanyije ku turere)',
  'Bold marks the better value. Test set: 4,000 households; training set: 16,000. The unseen-district row checks that the model works on districts it was not trained on. Trained and tested on SYNTHETIC data calibrated to published NISR marginals. These numbers are not real-world accuracy.': "Inyuguti zitsindagiye zigaragaza igipimo cyiza kurusha ikindi. Ingo z'igerageza: 4,000; ingo z'imyitozo: 16,000. Umurongo w'uturere tutabonywe ugenzura ko modeli ikora neza no mu turere itatojweho. Yatojwe ku mibare y'igerageza ihuje na NISR.",
  'Severe income deficit': 'Amikoro make cyane',
  'Low household income': "Amikoro make y'urugo",
  'Zero productive assets': 'Nta mitungo ibyara inyungu',
  'Baseline socio-economic exposure': "Ibyago bisanzwe by'imibereho",
  'Direct VUP cash transfer & financial inclusion onboarding': "Inkunga y'amafaranga ya VUP no kwinjizwa muri serivisi z'imari",
  'Asset-building cooperative & micro-credit linkage': "Kwinjizwa muri koperative y'iterambere no guhabwa inguzanyo nto",
  'Routine monitoring & community savings group': "Gukurikiranwa bisanzwe no kwizigamira mu matsinda (Ibimina)",
  'Weakest districts': 'Uturere dufite intege nke',
  'Districts where the fewest poor households are found': 'Uturere hagaragaramo ingo zikennye nke cyane',
  'kicukiro': 'Kicukiro',
  'nyarugenge': 'Nyarugenge',
  'gasabo': 'Gasabo',
  'rwamagana': 'Rwamagana',
  'nyaruguru': 'Nyaruguru',
  'gicumbi': 'Gicumbi',
  'gisagara': 'Gisagara',
  'rubavu': 'Rubavu'
};

const LOWER_EN_TO_RW: Record<string, string> = {};
Object.entries(EXACT_EN_TO_RW).forEach(([k, v]) => {
  LOWER_EN_TO_RW[k.toLowerCase()] = v;
});

function applyDynamicPatterns(trimmed: string): string | null {
  let m = trimmed.match(/^The share of poor households found is similar across groups\s*\(gap\s+([\d.]+)\s+points?\)\.?$/i);
  if (m) return `Ijanisha ry'ingo zikennye zabonetse rirenda kungana mu byiciro byose (ikinyuranyo ni amanota ${m[1]}).`;

  m = trimmed.match(/^The share of poor households found differs across groups\s*\(gap\s+([\d.]+)\s+points?\)\.?$/i);
  if (m) return `Ijanisha ry'ingo zikennye zabonetse riratandukanye mu byiciro (ikinyuranyo ni amanota ${m[1]}).`;

  m = trimmed.match(/^Check this:\s*the share of\s+.+\s+differs by\s+([\d.]+)\s+points between groups\.\s*Some groups are\s+.+\s+more often\.?$/i);
  if (m) return `Reba ibi: ijanisha ry'ingo zikennye zabonetse riratandukanye ku manota ${m[1]} hagati y'uturere. Uturere tumwe duhuswa inshuro nyinshi kurusha utundi.`;

  m = trimmed.match(/^Of\s+([\d,]+)\s+households that are really poor,\s*the model found\s+([\d,]+)\s+and missed\s+([\d,]+)\.\s*Of\s+([\d,]+)\s+households it flagged,\s*([\d,]+)\s+were not poor,\s*which is why a home visit confirms every flag\.?$/i);
  if (m) {
    return `Mu ngo ${m[1]} zikennye koko, modeli yabonye ${m[2]} ihusha ${m[3]}. Mu ngo ${m[4]} yagaragaje, ${m[5]} ntizari zikennye, ari yo mpamvu gusura urugo byemeza buri rugo rwagaragajwe.`;
  }

  m = trimmed.match(/^([\d.]+%)\s+of households$/i);
  if (m) return `${m[1]} by'ingo`;

  m = trimmed.match(/^([\d.]+%)\s+of people in poverty$/i);
  if (m) return `${m[1]} by'abaturage bari mu bukene`;

  m = trimmed.match(/^Simple baseline\s*\(logistic regression\):\s*AUC\s*([\d.]+)$/i);
  if (m) return `Modeli y'ibanze yoroshye (logistic regression): AUC ${m[1]}`;

  m = trimmed.match(/^([−-]?\d+(?:\.\d+)?)\s*pts$/i);
  if (m) return `${m[1]} amanota`;

  m = trimmed.match(/^(\d+)\s+of\s+(\d+)$/i);
  if (m) return `${m[1]} kuri ${m[2]}`;

  m = trimmed.match(/^Rank\s+(\d+)\s+of\s+(\d+)$/i);
  if (m) return `Umwanya wa ${m[1]} kuri ${m[2]}`;

  return null;
}

const COMPOSITIONAL_PHRASES: Array<[RegExp, string]> = [
  [/Direct VUP cash transfer\s*&\s*financial inclusion onboarding/gi, "Inkunga y'amafaranga ya VUP no kwinjizwa muri serivisi z'imari"],
  [/Asset-building cooperative\s*&\s*micro-credit linkage/gi, "Kwinjizwa muri koperative y'iterambere no guhabwa inguzanyo nto"],
  [/Routine monitoring\s*&\s*community savings group/gi, "Gukurikiranwa bisanzwe no kwizigamira mu matsinda (Ibimina)"],
  [/Severe income deficit/gi, 'Amikoro make cyane'],
  [/Low household income/gi, "Amikoro make y'urugo"],
  [/Zero productive assets/gi, 'Nta mitungo ibyara inyungu'],
  [/Baseline socio-economic exposure/gi, "Ibyago bisanzwe by'imibereho"],
  [/Weakest districts/gi, 'Uturere dufite intege nke'],
  [/Districts where the fewest poor households are found/gi, 'Uturere hagaragaramo ingo zikennye nke cyane'],
  [/Check this:\s*the share of/gi, 'Reba ibi: ijanisha rya'],
  [/points between groups\.\s*Some groups are/gi, "amanota hagati y'uturere. Uturere tumwe"],
  [/more often\./gi, 'inshuro nyinshi.'],
  [/Point at or tap a district to see its details\.?/gi, 'Rambika akamenyetso ku karere cyangwa ugakandeho kugira ngo ubone amakuru arambuye.'],
  [/Point at or select a district for details\.?/gi, 'Rambika akamenyetso ku karere cyangwa ugakandeho kugira ngo ubone amakuru arambuye.'],
  [/Poverty in every district, then and now\.?/gi, 'Ubukene muri buri karere, icyo gihe n’ubu.'],
  [/What is behind poverty\??/gi, 'Ni iki gitera ubukene?'],
  [/Compare poverty with one indicator at a time\.\s*Association, not cause\.?/gi, "Gereranya ubukene n'igipimo kimwe icyarimwe. Ni isano bifitanye, si impamvu ntakuka."],
  [/Search, filter and compare all 30 districts\.?/gi, 'Shakisha, robanura kandi ugereranye uturere twose 30.'],
  [/Sources and limits/gi, "Inkomoko y'imibare n'imbogamizi"],
  [/Where the numbers come from and how to read them\.?/gi, 'Aho imibare ikomoka n’uburyo bwo kuyisoma.'],
  [/of people in poverty/gi, "by'abaturage bari mu bukene"],
  [/of households/gi, "by'ingo"],
  [/Non-poor households wrongly flagged/gi, 'Ingo zitari izikennye zagaragajwe ku kwibeshya'],
  [/Poor households found/gi, 'Ingo zikennye zabonetse'],
  [/Flags that were truly poor/gi, 'Ingo zagaragajwe zari zikennye koko'],
  [/Overall correct/gi, 'Ukuri rusange'],
  [/Ranking on unseen districts/gi, 'Urutonde ku turere tutakoreshejwe mu myitozo'],
  [/District-grouped AUC/gi, 'AUC ikomatanyije ku turere'],
  [/Ranking quality/gi, "Ubwiza bw'urutonde"],
  [/Simple baseline/gi, "Modeli y'ibanze yoroshye"],
  [/Actually poor/gi, 'Abakene nyabo'],
  [/Really poor/gi, 'Abakene nyabo'],
  [/Not poor/gi, 'Abatari abakene'],
  [/Flagged as at risk/gi, "Zagaragajwe nk'iziri mu byago"],
  [/Not flagged/gi, 'Zitaragaragajwe'],
  [/Correctly found/gi, 'Zabonetse neza'],
  [/Flagged by mistake/gi, 'Zagaragajwe ku kwibeshya'],
  [/Correctly left out/gi, 'Zasizwe neza'],
  [/Missed/gi, 'Zahushijwe'],
  [/Female-headed/gi, "Ingo ziyoborwa n'abagore"],
  [/Male-headed/gi, "Ingo ziyoborwa n'abagabo"],
  [/Household assets/gi, "Imitungo y'urugo"],
  [/Education of household head/gi, "Amashuri y'umukuru w'urugo"],
  [/Main source of income/gi, "Inkomoko nyamukuru y'amikoro"],
  [/Land owned \(ha\)/gi, 'Ubutaka butunzwe (ha)'],
  [/Number of income sources/gi, "Umubare w'inkomoko z'amikoro"],
  [/Has savings/gi, 'Bafite ubwizigame'],
  [/Urban share of district/gi, "Igice cy'umujyi mu karere"],
  [/Has electricity/gi, 'Bafite amashanyarazi'],
  [/Ubudehe category/gi, "Icyiciro cy'Ubudehe"]
];

export function translateTextToRw(original: string): string {
  const trimmed = original.trim();
  if (!trimmed) return original;
  if (trimmed === 'EN' || trimmed === 'RW' || trimmed === 'Imbaraga' || trimmed === 'XGBoost') return original;

  const leading = original.match(/^\s*/)?.[0] ?? '';
  const trailing = original.match(/\s*$/)?.[0] ?? '';

  if (trimmed.includes(' + ')) {
    const parts = trimmed.split(' + ').map(p => translateDriverOrAdviceToRw(p.trim()));
    return leading + parts.join(' + ') + trailing;
  }

  if (EXACT_EN_TO_RW[trimmed]) {
    return leading + EXACT_EN_TO_RW[trimmed] + trailing;
  }
  const lower = trimmed.toLowerCase();
  if (LOWER_EN_TO_RW[lower]) {
    return leading + LOWER_EN_TO_RW[lower] + trailing;
  }

  const dyn = applyDynamicPatterns(trimmed);
  if (dyn !== null) {
    return leading + dyn + trailing;
  }

  let working = trimmed;
  let changed = false;
  for (const [regex, replacement] of COMPOSITIONAL_PHRASES) {
    if (regex.test(working)) {
      working = working.replace(regex, replacement);
      changed = true;
    }
  }
  if (changed) {
    return leading + working + trailing;
  }

  return original;
}

const originalTextMap = new WeakMap<Text, string>();
const translatedValueMap = new WeakMap<Text, string>();

export function applyDomTranslation(lang: AppLang): void {
  if (typeof document === 'undefined') return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'textarea') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let currentNode = walker.nextNode() as Text | null;
  while (currentNode) {
    const currentVal = currentNode.nodeValue ?? '';
    if (currentVal.trim().length > 0) {
      const lastTranslated = translatedValueMap.get(currentNode);
      if (
        !originalTextMap.has(currentNode) ||
        (lastTranslated !== undefined && currentVal !== lastTranslated && currentVal !== originalTextMap.get(currentNode))
      ) {
        originalTextMap.set(currentNode, currentVal);
      }

      const orig = originalTextMap.get(currentNode) ?? currentVal;
      if (lang === 'RW') {
        const rw = translateTextToRw(orig);
        if (rw !== currentVal) {
          currentNode.nodeValue = rw;
        }
        translatedValueMap.set(currentNode, rw);
      } else {
        if (currentVal !== orig) {
          currentNode.nodeValue = orig;
        }
        translatedValueMap.set(currentNode, orig);
      }
    }
    currentNode = walker.nextNode() as Text | null;
  }

  const inputs = document.querySelectorAll<HTMLInputElement>('input[placeholder]');
  inputs.forEach(inp => {
    const origAttr = inp.getAttribute('data-orig-placeholder') ?? inp.placeholder;
    if (!inp.hasAttribute('data-orig-placeholder')) {
      inp.setAttribute('data-orig-placeholder', origAttr);
    }
    if (lang === 'RW') {
      const rw = translateTextToRw(origAttr);
      if (rw !== origAttr) inp.placeholder = rw;
    } else {
      inp.placeholder = origAttr;
    }
  });
}
