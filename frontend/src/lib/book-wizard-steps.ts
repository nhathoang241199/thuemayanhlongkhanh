export type BookWizardMode = "BY_CAMERA" | "BY_DATE";

export const WIZARD_STEP = {
  BY_CAMERA: {
    BRAND: 0,
    CAMERA: 1,
    LENS: 2,
    DATE: 3,
    SLOT: 4,
    PICKUP: 5,
    SUMMARY: 6,
  },
  BY_DATE: {
    DATE: 0,
    SLOT: 1,
    BRAND: 2,
    CAMERA: 3,
    LENS: 4,
    PICKUP: 5,
    SUMMARY: 6,
  },
} as const;

export function wizardSummaryStep(mode: BookWizardMode): number {
  return WIZARD_STEP[mode].SUMMARY;
}

export function wizardPickupStep(mode: BookWizardMode): number {
  return WIZARD_STEP[mode].PICKUP;
}

export function wizardBrandStep(mode: BookWizardMode): number {
  return mode === "BY_CAMERA"
    ? WIZARD_STEP.BY_CAMERA.BRAND
    : WIZARD_STEP.BY_DATE.BRAND;
}

export function wizardCameraStep(mode: BookWizardMode): number {
  return mode === "BY_CAMERA"
    ? WIZARD_STEP.BY_CAMERA.CAMERA
    : WIZARD_STEP.BY_DATE.CAMERA;
}

export function wizardLensStep(mode: BookWizardMode): number {
  return mode === "BY_CAMERA"
    ? WIZARD_STEP.BY_CAMERA.LENS
    : WIZARD_STEP.BY_DATE.LENS;
}

export function wizardDateStep(mode: BookWizardMode): number {
  return mode === "BY_CAMERA"
    ? WIZARD_STEP.BY_CAMERA.DATE
    : WIZARD_STEP.BY_DATE.DATE;
}

export function wizardSlotStep(mode: BookWizardMode): number {
  return mode === "BY_CAMERA"
    ? WIZARD_STEP.BY_CAMERA.SLOT
    : WIZARD_STEP.BY_DATE.SLOT;
}
