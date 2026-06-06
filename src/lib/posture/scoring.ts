export type PosePoint = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type PostureFrame = {
  nose?: PosePoint;
  leftEye?: PosePoint;
  rightEye?: PosePoint;
  leftEar?: PosePoint;
  rightEar?: PosePoint;
  leftShoulder?: PosePoint;
  rightShoulder?: PosePoint;
  leftHip?: PosePoint;
  rightHip?: PosePoint;
  detected: boolean;
};

export type PostureResult = {
  score: number;
  signals: string[];
  suggestions: string[];
  summary: string;
  framesAnalyzed?: number;
  detectedRatio?: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function variance(values: number[]) {
  if (values.length <= 1) return 0;
  const avg = average(values);
  return average(values.map((value) => (value - avg) ** 2));
}

export function distance(a?: PosePoint, b?: PosePoint) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getVisibility(point?: PosePoint) {
  return point?.visibility ?? 1;
}

export function safePoint(point?: PosePoint, minVisibility = 0.35) {
  if (!point) return undefined;
  return getVisibility(point) >= minVisibility ? point : undefined;
}

function frameMidpoint(a?: PosePoint, b?: PosePoint): PosePoint | undefined {
  if (!a || !b) return undefined;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function scorePostureFrames(frames: PostureFrame[]): PostureResult | null {
  if (frames.length === 0) {
    return null;
  }

  const detectedFrames = frames.filter((frame) => frame.detected);
  const detectedRatio = detectedFrames.length / frames.length;
  if (detectedRatio < 0.25) {
    return null;
  }

  let score = 100;
  const signals: string[] = [];
  const suggestions: string[] = [];

  if (detectedRatio < 0.65) {
    score -= 25;
    signals.push("Pose landmarks were only detected part of the time");
    suggestions.push("Sit farther back and keep your face and shoulders visible.");
  }

  const headTiltDiffs: number[] = [];
  const centerOffsets: number[] = [];
  const gazeOffsets: number[] = [];
  const faceVisibilityScores: number[] = [];
  const eyeDropouts: number[] = [];
  const noseXs: number[] = [];
  const noseYs: number[] = [];
  const faceMidXs: number[] = [];
  const faceMidYs: number[] = [];
  let faceAngleWarnings = 0;
  let gazeAwayFrames = 0;
  let gazeMeasuredFrames = 0;

  for (const frame of detectedFrames) {
    const nose = safePoint(frame.nose);
    const leftEye = safePoint(frame.leftEye, 0.25);
    const rightEye = safePoint(frame.rightEye, 0.25);
    const leftEar = safePoint(frame.leftEar, 0.25);
    const rightEar = safePoint(frame.rightEar, 0.25);
    const leftShoulder = safePoint(frame.leftShoulder);
    const rightShoulder = safePoint(frame.rightShoulder);
    const eyeMid = frameMidpoint(leftEye, rightEye);
    const earMid = frameMidpoint(leftEar, rightEar);
    const shoulderMid = frameMidpoint(leftShoulder, rightShoulder);
    const faceMid = eyeMid ?? earMid ?? (nose && shoulderMid ? frameMidpoint(nose, shoulderMid) : nose);

    if (nose) {
      noseXs.push(nose.x);
      noseYs.push(nose.y);
      centerOffsets.push(Math.abs(nose.x - 0.5));
    }
    if (faceMid) {
      faceMidXs.push(faceMid.x);
      faceMidYs.push(faceMid.y);
    }
    if (leftEye && rightEye) {
      headTiltDiffs.push(Math.abs(leftEye.y - rightEye.y));
      faceVisibilityScores.push((getVisibility(leftEye) + getVisibility(rightEye)) / 2);
      eyeDropouts.push(0);
      if (nose && eyeMid) {
        const gazeOffset = Math.abs(nose.x - eyeMid.x);
        gazeOffsets.push(gazeOffset);
        gazeMeasuredFrames += 1;
        if (gazeOffset > 0.028) {
          gazeAwayFrames += 1;
        }
      }
    } else {
      eyeDropouts.push(1);
    }
    if (nose && leftEar && rightEar) {
      const earBalance = Math.abs(distance(nose, leftEar) - distance(nose, rightEar));
      if (earBalance > 0.08) faceAngleWarnings += 1;
      faceVisibilityScores.push((getVisibility(leftEar) + getVisibility(rightEar)) / 2);
    }
  }

  const faceVisibility = average(faceVisibilityScores);
  if (faceVisibilityScores.length === 0 || faceVisibility < 0.35) {
    score -= 24;
    signals.push("Face and eye landmarks were not consistently visible");
    suggestions.push("Improve lighting and keep your full face in frame.");
  } else {
    signals.push("Face stayed visible enough for camera coaching");
  }

  const headTilt = average(headTiltDiffs);
  if (headTiltDiffs.length === 0) {
    score -= 10;
    signals.push("Eye line could not be measured consistently");
    suggestions.push("Keep your eyes visible and avoid looking too far down at notes.");
  } else if (headTilt <= 0.025) {
    signals.push("Head stayed level through the check");
  } else if (headTilt <= 0.055) {
    score -= 10;
    signals.push("Head tilt was slightly uneven");
    suggestions.push("Level your laptop or your head so your eye contact looks steadier.");
  } else {
    score -= 16;
    signals.push("Head tilt was noticeably uneven");
    suggestions.push("Straighten your head before starting, then keep your eye contact steady.");
  }

  const centerOffset = average(centerOffsets);
  if (centerOffsets.length === 0) {
    score -= 12;
    signals.push("Face centering could not be measured reliably");
  } else if (centerOffset <= 0.11) {
    signals.push("Face stayed centered in the camera frame");
  } else if (centerOffset <= 0.2) {
    score -= 10;
    signals.push("Face drifted slightly away from center");
    suggestions.push("Center your face in the frame before recording.");
  } else {
    score -= 18;
    signals.push("Face was noticeably off-center");
    suggestions.push("Move your laptop or chair so your face sits near the middle of the frame.");
  }

  const gazeOffset = average(gazeOffsets);
  const gazeAwayRatio = gazeMeasuredFrames > 0 ? gazeAwayFrames / gazeMeasuredFrames : 0;
  if (gazeOffsets.length > 0 && (gazeOffset > 0.038 || gazeAwayRatio > 0.18)) {
    score -= gazeAwayRatio > 0.35 ? 20 : 14;
    signals.push("Eye contact drifted away from the camera during parts of the take");
    suggestions.push("Put notes close to the webcam and return your eyes to the lens at the end of each sentence.");
  } else if (gazeOffsets.length > 0) {
    signals.push("Eye contact mostly stayed near the camera");
  }

  const faceAngleWarningRatio = faceAngleWarnings / detectedFrames.length;
  if (faceAngleWarningRatio > 0.15) {
    score -= faceAngleWarningRatio > 0.4 ? 16 : 10;
    signals.push("Face angle changed often, which can read as looking away");
    suggestions.push("Keep notes near camera height so your eye contact stays natural.");
  } else {
    signals.push("Camera-facing angle looked steady");
  }

  const movement =
    variance(noseXs) +
    variance(noseYs) +
    variance(faceMidXs) +
    variance(faceMidYs);
  if (movement <= 0.001 && noseXs.length > 5) {
    signals.push("Head movement stayed steady");
  } else if (noseXs.length > 5) {
    score -= movement > 0.003 ? 16 : 10;
    signals.push("Head movement suggested fidgeting or shifting");
    suggestions.push("Plant your feet, relax your jaw, and hold your head still between gestures.");
  }

  const eyeDropoutRatio = average(eyeDropouts);
  if (eyeDropoutRatio > 0.35) {
    score -= 8;
    signals.push("Eye landmarks dropped out often, which can indicate blinking, glare, or looking down");
    suggestions.push("Avoid screen glare and keep your eyes visible while speaking.");
  }

  const finalScore = clamp(Math.round(score), 40, 100);
  if (suggestions.length === 0) {
    suggestions.push("Keep this steady face framing during your answer.");
    suggestions.push("Keep notes near camera height so your eye contact stays natural.");
  }

  const summary =
    finalScore >= 85
      ? "Strong camera presence. Your face framing, eye contact, and head stability looked presentation-ready."
      : finalScore >= 70
        ? "Good camera presence. A few small face-framing and eye-contact changes will make you look more confident."
        : "Camera check found presentation-presence issues. Center your face, reduce fidgeting, and keep your eyes near the lens.";

  return {
    score: finalScore,
    signals: Array.from(new Set(signals)).slice(0, 5),
    suggestions: Array.from(new Set(suggestions)).slice(0, 4),
    summary,
    framesAnalyzed: frames.length,
    detectedRatio: Number(detectedRatio.toFixed(2)),
  };
}
