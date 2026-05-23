import type { MockSiteId } from '../components/AgentPanel/AgentPanel';

/* ─── AgentAction protocol ───
 * The contract between the AI (or hardcoded scripts) and the front-end.
 * Each action is executed sequentially. */

export interface ConfirmActionField {
  label: string;
  value: string;
  highlight?: boolean;
}

export type AgentAction =
  | { type: 'navigate'; site: MockSiteId; narration: string }
  | { type: 'click'; target: string; narration: string; label?: string }
  | { type: 'fill'; target: string; value: string; narration: string; label?: string }
  | { type: 'ask_user'; field: string; prompt: string; target: string; narration: string }
  | {
      type: 'confirm';
      title: string;
      subtitle?: string;
      fields: ConfirmActionField[];
      narration: string;
    }
  | { type: 'wait'; ms: number; narration: string }
  | { type: 'done'; summary: string; caseId?: string };

/* ─── Helpers ─── */

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function findEl<T extends HTMLElement = HTMLElement>(
  container: HTMLElement,
  target: string,
): T | null {
  let el: T | null = container.querySelector<T>(`[data-agent-id="${target}"]`);
  if (!el) {
    try {
      el = container.querySelector<T>(target);
    } catch {
      el = null;
    }
  }
  return el;
}

/* React-friendly input value setter (bypasses controlled component) */
function setReactInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/* Type a value character-by-character (for cinematic effect, elder-mode pace) */
async function typeIntoInput(input: HTMLInputElement, value: string, perChar = 55) {
  setReactInputValue(input, '');
  for (let i = 1; i <= value.length; i++) {
    setReactInputValue(input, value.slice(0, i));
    await delay(perChar);
  }
}

/* ─── Executor hooks ─── */

export interface ExecutorCallbacks {
  setHighlight: (target: string | null, label?: string) => void;
  setNarration: (msg: string) => void;
  askUser: (field: string, prompt: string) => Promise<string>;
  askConfirm: (
    title: string,
    subtitle: string | undefined,
    fields: ConfirmActionField[],
  ) => Promise<boolean>;
  pushChatMessage?: (msg: string) => void;
}

export async function executeAction(
  action: AgentAction,
  container: HTMLElement,
  cb: ExecutorCallbacks,
): Promise<{ done?: boolean; caseId?: string; cancelled?: boolean }> {
  cb.setNarration(action.type === 'done' ? '' : action.narration || '');

  switch (action.type) {
    case 'navigate':
      // Panel + mock site are already mounted by the parent before executor runs.
      await delay(900);
      return {};

    case 'click': {
      cb.setHighlight(action.target, action.label || 'Tap');
      await delay(1300); /* elder mode: longer so user can read narration */
      const el = findEl(container, action.target);
      if (el) el.click();
      await delay(280);
      cb.setHighlight(null);
      await delay(500);
      return {};
    }

    case 'fill': {
      cb.setHighlight(action.target, action.label || 'Typing');
      await delay(750);
      const input = findEl<HTMLInputElement>(container, action.target);
      if (input) {
        input.focus();
        await typeIntoInput(input, action.value);
      }
      await delay(450);
      cb.setHighlight(null);
      await delay(350);
      return {};
    }

    case 'ask_user': {
      cb.setHighlight(action.target, 'Waiting for you');
      const userValue = await cb.askUser(action.field, action.prompt);
      const input = findEl<HTMLInputElement>(container, action.target);
      if (input) {
        input.focus();
        await typeIntoInput(input, userValue);
      }
      await delay(300);
      cb.setHighlight(null);
      await delay(250);
      return {};
    }

    case 'confirm': {
      cb.setHighlight(null);
      const ok = await cb.askConfirm(action.title, action.subtitle, action.fields);
      if (!ok) {
        /* User declined → abort the sequence */
        return { done: true, cancelled: true };
      }
      await delay(300);
      return {};
    }

    case 'wait':
      await delay(action.ms);
      return {};

    case 'done':
      return { done: true, caseId: action.caseId };
  }
}

export async function runActionSequence(
  actions: AgentAction[],
  container: HTMLElement,
  cb: ExecutorCallbacks,
): Promise<{ caseId?: string; cancelled?: boolean }> {
  for (const action of actions) {
    const result = await executeAction(action, container, cb);
    if (result.done) {
      return { caseId: result.caseId, cancelled: result.cancelled };
    }
  }
  return {};
}
