export type BookWizardMode = "BY_CAMERA" | "BY_DATE";

const STEP_LABELS: Record<BookWizardMode, readonly string[]> = {
  BY_CAMERA: [
    "Hãng",
    "Máy",
    "Ống kính",
    "Ngày",
    "Buổi",
    "Nhận máy",
    "Xác nhận",
  ],
  BY_DATE: [
    "Ngày",
    "Buổi",
    "Hãng",
    "Máy",
    "Ống kính",
    "Nhận máy",
    "Xác nhận",
  ],
};

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

/** Bước tiếp theo sau khi xong lens (chọn hoặc skip). */
export function wizardStepAfterLens(mode: BookWizardMode): number {
  return mode === "BY_CAMERA"
    ? WIZARD_STEP.BY_CAMERA.DATE
    : WIZARD_STEP.BY_DATE.PICKUP;
}

export function wizardSlotStep(mode: BookWizardMode): number {
  return mode === "BY_CAMERA"
    ? WIZARD_STEP.BY_CAMERA.SLOT
    : WIZARD_STEP.BY_DATE.SLOT;
}

function allStepIndices(mode: BookWizardMode): number[] {
  return Object.values(WIZARD_STEP[mode]);
}

/** Các bước wizard hiển thị (bỏ bước Buổi khi `skipSlotStep`). */
export function visibleWizardSteps(
  mode: BookWizardMode,
  skipSlotStep: boolean,
): number[] {
  const indices = allStepIndices(mode);
  if (!skipSlotStep) return indices;
  const slot = wizardSlotStep(mode);
  return indices.filter((step) => step !== slot);
}

export function wizardStepLabel(
  mode: BookWizardMode,
  step: number,
  skipSlotStep: boolean,
): string {
  if (skipSlotStep && step === wizardSlotStep(mode)) return "";
  return STEP_LABELS[mode][step] ?? "";
}

export function wizardNextStep(
  mode: BookWizardMode,
  step: number,
  skipSlotStep: boolean,
): number | null {
  const visible = visibleWizardSteps(mode, skipSlotStep);
  const idx = visible.indexOf(step);
  if (idx < 0 || idx >= visible.length - 1) return null;
  return visible[idx + 1] ?? null;
}

export function wizardPrevStep(
  mode: BookWizardMode,
  step: number,
  skipSlotStep: boolean,
): number | null {
  const visible = visibleWizardSteps(mode, skipSlotStep);
  const idx = visible.indexOf(step);
  if (idx <= 0) return null;
  return visible[idx - 1] ?? null;
}

export function isWizardSlotStep(
  mode: BookWizardMode,
  step: number,
): boolean {
  return step === wizardSlotStep(mode);
}
