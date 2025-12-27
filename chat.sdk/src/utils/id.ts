let counter = 0;

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  counter = (counter + 1) % 1000;
  return `msg_${timestamp}_${randomPart}_${counter}`;
}
