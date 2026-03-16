import type { FeedbackType } from '../../state';

interface TypeOption {
  readonly type: FeedbackType;
  readonly emoji: string;
  readonly name: string;
  readonly description: string;
}

const TYPE_OPTIONS: readonly TypeOption[] = [
  { type: 'BUG', emoji: '🐛', name: 'Bug Report', description: "Something isn't working" },
  { type: 'FEATURE', emoji: '✨', name: 'Feature Request', description: 'Suggest an improvement' },
  { type: 'GENERAL', emoji: '💬', name: 'General Feedback', description: 'Share your thoughts' },
] as const;

export function renderTypeSelect(
  onSelect: (type: FeedbackType) => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'wfb-step-type';

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

    container.appendChild(card);
  });

  return container;
}
