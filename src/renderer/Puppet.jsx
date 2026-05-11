import React from "react";
import {
  characterCatalog,
  expressionCatalog,
  getCatalogItem,
  poseCatalog
} from "../../shared/catalogs.js";
import { getDepthScale } from "../../shared/depth.js";

export function Puppet({ performer, isSelf }) {
  const character = getCatalogItem(characterCatalog, performer.character);
  const expression = getCatalogItem(expressionCatalog, performer.state.expression);
  const pose = getCatalogItem(poseCatalog, performer.state.pose);
  const { state } = performer;
  const rig = { ...character.rigConfig, ...state.rigConfig };
  const stylePreset = state.stylePreset || character.stylePreset;
  const scale = getDepthScale(state.y, state.scale);
  const isWalking = state.walking && rig.walkCycle !== "none";
  const canIdle = state.idleMotion !== "held" && !isWalking && !state.macro;
  const canBlink = state.idleMotion !== "held";
  const mouthOpen = Math.max(state.mouthOpen || 0, state.speaking ? 0.62 : 0);

  return (
    <div
      className={[
        "puppet",
        `body-${rig.body}`,
        `limbs-${rig.limbs}`,
        `style-${stylePreset}`,
        `idle-${state.idleMotion}`,
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
        "--puppet": character.color,
        "--accent": character.accent,
        "--facing": state.facing,
        "--arm-length": `${rig.armLength}px`,
        "--leg-length": `${rig.legLength}px`,
        "--body-lean": `${pose.bodyLean * state.facing}deg`,
        "--body-squash": pose.bodySquash,
        "--arm-left": `${pose.armLeft * state.facing}deg`,
        "--arm-right": `${pose.armRight * state.facing}deg`,
        "--leg-left": `${pose.legLeft}deg`,
        "--leg-right": `${pose.legRight}deg`,
        "--blink-delay": `${-(state.blinkSeed || 0)}ms`,
        "--mouth-open": mouthOpen
      }}
    >
      <div className="nameTag">{performer.name}</div>
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
        <div className={`mouth mouth-${rig.mouthStyle} ${mouthOpen > 0.06 ? "mouth-active" : ""}`}>
          {expression.face[2]}
        </div>
        <span className="eye eyeOpen left">{expression.face[0]}</span>
        <span className="eye eyeOpen right">{expression.face[1]}</span>
        <span className="eye eyeBlink left">{expression.blinkFace[0]}</span>
        <span className="eye eyeBlink right">{expression.blinkFace[1]}</span>
      </div>
      <div className="shadow" />
    </div>
  );
}
