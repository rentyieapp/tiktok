import { useEffect, useRef } from 'react';
import type { ArcadeStateView } from '@shared/arcade';

const SPEAKABLE = new Set(['gift', 'win', 'join']);

export function useArcadeTTS(state: ArcadeStateView | null, enabled: boolean): void {
  const lastAt = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !state) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const latest = [...state.feed]
      .filter((item) => SPEAKABLE.has(item.kind))
      .sort((a, b) => b.at - a.at)[0];
    if (!latest || latest.at <= lastAt.current) return;
    lastAt.current = latest.at;
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(latest.text);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    const voice = synth.getVoices().find((entry) => entry.lang.toLowerCase().startsWith('tr'));
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  }, [enabled, state]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
}
