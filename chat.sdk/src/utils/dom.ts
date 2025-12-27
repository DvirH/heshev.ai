export function getContainer(selector: string | HTMLElement): HTMLElement | null {
  if (typeof selector === 'string') {
    return document.querySelector(selector);
  }
  return selector;
}

export function createContainer(id: string): HTMLElement {
  const container = document.createElement('div');
  container.id = id;
  return container;
}

export function loadExternalCSS(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`link[href="${url}"]`)) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load CSS: ${url}`));
    document.head.appendChild(link);
  });
}

export function injectStyles(css: string, id?: string): void {
  // Check if already injected
  if (id && document.getElementById(id)) {
    return;
  }

  const style = document.createElement('style');
  if (id) {
    style.id = id;
  }
  style.textContent = css;
  document.head.appendChild(style);
}

export function removeElement(element: HTMLElement): void {
  element.parentNode?.removeChild(element);
}
