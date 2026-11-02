import type { Transition } from "motion/react";

/** Default UI: critically damped, tanpa overshoot (DESIGN.md §4). */
export const spring: Transition = { type: "spring", bounce: 0, duration: 0.4 };
export const springFast: Transition = { type: "spring", bounce: 0, duration: 0.3 };
/** Hanya untuk gerakan yang membawa momentum, misalnya sheet yang dilempar. */
export const springMomentum: Transition = { type: "spring", bounce: 0.2, duration: 0.3 };

/** Proyeksi titik akhir dari kecepatan rilis (DESIGN.md §6). */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
