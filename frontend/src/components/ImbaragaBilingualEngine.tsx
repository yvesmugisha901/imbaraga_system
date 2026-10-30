import { useEffect } from 'react';
import {
  useImbaragaLang,
  detectHeaderLangFromDom,
  setActiveLang,
  applyDomTranslation
} from '../utils/imbaragaStore';

export default function ImbaragaBilingualEngine() {
  const [lang, setLang] = useImbaragaLang();

  useEffect(() => {
    const initialDetected = detectHeaderLangFromDom();
    if (initialDetected !== lang) {
      setLang(initialDetected);
    }

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest('button, a, [role="button"]') as HTMLElement | null;
      const el = btn ?? target;
      const txt = (el.textContent ?? '').trim();
      if (txt === 'RW') {
        setActiveLang('RW');
      } else if (txt === 'EN') {
        setActiveLang('EN');
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [lang, setLang]);

  useEffect(() => {
    let rafId: number | null = null;
    const run = () => {
      applyDomTranslation(lang);
    };

    run();
    const timer1 = window.setTimeout(run, 80);
    const timer2 = window.setTimeout(run, 250);
    const timer3 = window.setTimeout(run, 600);

    const observer = new MutationObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyDomTranslation(lang);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      observer.disconnect();
    };
  }, [lang]);

  return null;
}
