import type { Transition } from "motion/react";

export const spring: Transition = { type: "spring", bounce: 0, duration: 0.4 };
export const springFast: Transition = { type: "spring", bounce: 0, duration: 0.3 };
export const springMomentum: Transition = { type: "spring", bounce: 0.2, duration: 0.3 };

export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
