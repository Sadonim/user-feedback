import type { FeedbackType } from '../../state';
import { createCloseBtn } from '../popup';

interface TypeOption {
  readonly type: FeedbackType;
  readonly emoji: string;
  readonly name: string;
  readonly description: string;
}

const TYPE_OPTIONS: readonly TypeOption[] = [
  { type: 'BUG', emoji: '🐛', name: '버그 신고', description: '제대로 작동하지 않는 기능' },
  { type: 'FEATURE', emoji: '✨', name: '기능 제안', description: '개선 아이디어 공유' },
  { type: 'GENERAL', emoji: '💬', name: '일반 문의', description: '기타 의견 남기기' },
] as const;

export function renderTypeSelect(
  onSelect: (type: FeedbackType) => void,
  onClose: () => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'wfb-step-type';

  // 헤더: 제목 + 닫기 버튼
  const header = document.createElement('div');
  header.className = 'wfb-step-header';
  const title = document.createElement('span');
  title.className = 'wfb-step-title';
  title.textContent = '피드백 보내기';
  header.append(title, createCloseBtn(onClose));
  container.appendChild(header);

  const cards = document.createElement('div');
  cards.className = 'wfb-type-cards';

  TYPE_OPTIONS.forEach((option) => {
    const card = document.createElement('div');
    card.className = 'wfb-type-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('data-type', option.type);
    card.setAttribute('aria-label', `${option.name}: ${option.description}`);

    // [C2] innerHTML 금지 — createElement 전용
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'wfb-type-emoji';
    emojiSpan.setAttribute('aria-hidden', 'true');
    emojiSpan.textContent = option.emoji;

    const info = document.createElement('div');
    info.className = 'wfb-type-info';

    const name = document.createElement('span');
    name.className = 'wfb-type-name';
    name.textContent = option.name;

    const desc = document.createElement('span');
    desc.className = 'wfb-type-desc';
    desc.textContent = option.description;

    info.append(name, desc);
    card.append(emojiSpan, info);

    const handleSelect = (): void => {
      card.setAttribute('aria-pressed', 'true');
      onSelect(option.type);
    };

    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });

    cards.appendChild(card);
  });

  container.appendChild(cards);
  return container;
}
