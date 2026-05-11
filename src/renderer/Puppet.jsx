import React from "react";
import { characterCatalog, expressionCatalog, getCatalogItem } from "../../shared/catalogs.js";
import { getDepthScale } from "../../shared/depth.js";

export function Puppet({ performer, isSelf }) {
  const character = getCatalogItem(characterCatalog, performer.character);
  const expression = getCatalogItem(expressionCatalog, performer.state.expression);
  const { state } = performer;
  const rig = { ...character.rigConfig, ...state.rigConfig };
  const stylePreset = state.stylePreset || character.stylePreset;
  const scale = getDepthScale(state.y, state.scale);
  const isWalking = state.walking && rig.walkCycle !== "none";

  return (
    <div
      className={[
        "puppet",
        `body-${rig.body}`,
        `limbs-${rig.limbs}`,
        `style-${stylePreset}`,
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
        "--leg-length": `${rig.legLength}px`
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
        <div className={`mouth mouth-${rig.mouthStyle} ${state.speaking ? "talking" : ""}`}>
          {expression.face[2]}
        </div>
        <span className="eye left">{expression.face[0]}</span>
        <span className="eye right">{expression.face[1]}</span>
      </div>
      <div className="shadow" />
    </div>
  );
}
