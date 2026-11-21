/** Friendly openers for a first message. Short, warm, and easy to edit. */
export function openers(first: string, shared: string[]): string[] {
  const list = [
    `Hi ${first}, I am in your college too. Nice to meet you!`,
    `Hey ${first}, would be great to connect and share notes sometime.`,
  ];
  if (shared[0]) list.unshift(`Hi ${first}, I saw we both like ${shared[0]}. Want to chat?`);
  return list.slice(0, 3);
}
