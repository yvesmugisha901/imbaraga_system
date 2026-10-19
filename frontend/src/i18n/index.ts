import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import rw from './rw.json'

export type Lang = 'en' | 'rw'
const KEY = 'imbaraga.lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'rw') return saved
  } catch {
    /* storage unavailable */
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, rw: { translation: rw } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLang(lang: Lang) {
  i18n.changeLanguage(lang)
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    /* storage unavailable */
  }
}

export default i18n