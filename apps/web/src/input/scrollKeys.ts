const ARROW_STEP_PX = 56;

/**
 * Scrolls a list the way the keys scroll a page: arrows by a line, Page Up and Page Down by a
 * screenful, Home and End to either end. Returns whether the key was one of these.
 */
export function scrollByKey(element: HTMLElement, key: string): boolean {
  const page = element.clientHeight - ARROW_STEP_PX;
  const target: Partial<Record<string, number>> = {
    ArrowUp: element.scrollTop - ARROW_STEP_PX,
    ArrowDown: element.scrollTop + ARROW_STEP_PX,
    PageUp: element.scrollTop - page,
    PageDown: element.scrollTop + page,
    Home: 0,
    End: element.scrollHeight,
  };
  const top = target[key];
  if (top === undefined) return false;
  element.scrollTo({ top });
  return true;
}
