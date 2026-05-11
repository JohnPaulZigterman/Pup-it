import React from "react";
import {
  characterCatalog,
  expressionCatalog,
  getCatalogItem,
  poseCatalog,
  styleAdapterCatalog
} from "../../shared/catalogs.js";
import { getDepthScale } from "../../shared/depth.js";

export function Puppet({ performer, isSelf, depthModel }) {
  const character = getCatalogItem(characterCatalog, performer.character);
  const expression = getCatalogItem(expressionCatalog, performer.state.expression);
  const pose = getCatalogItem(poseCatalog, performer.state.pose);
  const { state } = performer;
  const design = state.characterDesign || {};
  const rig = { ...character.rigConfig, ...state.rigConfig };
  const stylePreset = state.stylePreset || character.stylePreset;
  const adapter = getCatalogItem(styleAdapterCatalog, stylePreset);
  const lineWidth = adapter.lineWidth || 0;
  const scale = getDepthScale(state.y, state.scale, depthModel);
  const isWalking = state.walking && rig.walkCycle !== "none";
  const canIdle = state.idleMotion !== "held" && !isWalking && !state.macro;
  const canBlink = state.idleMotion !== "held";
  const rawMouthOpen = state.mouthOpen || 0;
  const mouthOpen = Math.max(rawMouthOpen, state.speaking ? 0.16 : 0);
  const mouthLevel =
    mouthOpen > 0.72 ? "wide" : mouthOpen > 0.38 ? "medium" : mouthOpen > 0.1 ? "small" : "closed";
  const depth = Math.max(
    0,
    Math.min(1, (state.y - (depthModel?.horizon || 20)) / ((depthModel?.foreground || 82) - (depthModel?.horizon || 20)))
  );
  const groundSpeed = Math.max(0.6, Math.min(1.7, state.groundSpeed || 1));
  const actingLean = pose.bodyLean + (state.travelLean || 0);
  const motionSquash = state.walking ? 1 + Math.min(0.035, (state.groundSpeed || 0) * 0.018) : 1;

  return (
    <div
      className={[
        "puppet",
        `body-${rig.body}`,
        `archetype-${character.archetype || character.id}`,
        `limbs-${rig.limbs}`,
        `style-${stylePreset}`,
        `texture-${adapter.texturePreset || "paper-grain"}`,
        adapter.borderless ? "style-borderless" : "",
        `idle-${state.idleMotion}`,
        `mouth-${mouthLevel}`,
        canIdle ? "idle-breathing" : "",
        canBlink ? "auto-blink" : "",
        isWalking ? `walking walk-${rig.walkCycle}` : "",
        state.macro ? `macro-${state.macro}` : "",
        isSelf ? "self" : ""
      ].join(" ")}
      style={{
        left: `${state.x}%`,
        top: `${state.y}%`,
        zIndex: Math.round(state.y * 10),
        transform: `translate(-50%, -100%) scale(${scale})`,
        "--puppet": design.color || character.color,
        "--accent": design.accent || character.accent,
        "--outline": adapter.outline,
        "--facing": state.facing < 0 ? -1 : 1,
        "--line-width": `${lineWidth}px`,
        "--detail-line-width": `${Math.max(0, lineWidth - 1)}px`,
        "--body-scale-x": adapter.bodyScaleX,
        "--body-scale-y": adapter.bodyScaleY,
        "--body-corner": adapter.corner,
        "--eye-scale": adapter.eyeScale,
        "--highlight-opacity": adapter.highlightOpacity,
        "--shadow-opacity": adapter.shadowOpacity,
        "--texture-opacity": adapter.textureOpacity,
        "--depth": depth,
        "--ground-speed": groundSpeed,
        "--cast-shadow-x": `${-18 + depth * 10}px`,
        "--cast-shadow-y": `${16 + depth * 18}px`,
        "--cast-shadow-scale": 0.52 + depth * 0.56,
        "--cast-shadow-opacity": 0.08 + depth * adapter.shadowOpacity,
        "--arm-length": `${rig.armLength * adapter.limbScale}px`,
        "--leg-length": `${rig.legLength * adapter.limbScale}px`,
        "--body-lean": `${actingLean}deg`,
        "--body-squash": pose.bodySquash * motionSquash,
        "--arm-left": `${pose.armLeft}deg`,
        "--arm-right": `${pose.armRight}deg`,
        "--leg-left": `${pose.legLeft}deg`,
        "--leg-right": `${pose.legRight}deg`,
        "--blink-delay": `${-(state.blinkSeed || 0)}ms`,
        "--mouth-open": mouthOpen
      }}
    >
      <div className="nameTag">{performer.name}</div>
      <div className="castShadow" aria-hidden="true" />
      <div className="puppetRig">
        {rig.arms ? (
          <>
            <div className="limb arm armLeft" />
            <div className="limb arm armRight" />
          </>
        ) : null}
        {rig.legs ? (
          <>
            <div className="limb leg legLeft" />
            <div className="limb leg legRight" />
          </>
        ) : null}
        <div className="puppetBody">
          <div className="animalFeature ears" aria-hidden="true" />
          <div className="animalFeature snout" aria-hidden="true" />
          <div className="animalFeature beak" aria-hidden="true" />
          <div className="animalFeature wings" aria-hidden="true" />
          <div className="animalFeature tail" aria-hidden="true" />
          <div
            className={`mouth mouthStyle-${rig.mouthStyle} ${mouthOpen > 0.06 ? "mouth-active" : ""}`}
          >
            {expression.face[2]}
          </div>
          <span className="eye eyeOpen left">{expression.face[0]}</span>
          <span className="eye eyeOpen right">{expression.face[1]}</span>
          <span className="eye eyeBlink left">{expression.blinkFace[0]}</span>
          <span className="eye eyeBlink right">{expression.blinkFace[1]}</span>
        </div>
        <div className="shadow" />
      </div>
    </div>
  );
}
