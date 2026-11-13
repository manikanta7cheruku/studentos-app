// What is switched off for this launch. Marketplace needs payments, which are not part of this launch; Lost and found only
// works inside one campus, so it comes with the college spaces. The College space itself opens as colleges join.
// Turn one to false when it is ready: its pages, buttons and shortcuts come back by themselves.
export const COMING_SOON = {
  marketplace: true,
  lostFound: true,
  collegeSpace: true,
} as const;
