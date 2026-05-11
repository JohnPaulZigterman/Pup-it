import React from "react";
import { characterCatalog, expressionCatalog, getCatalogItem } from "../../shared/catalogs.js";
import { getDepthScale } from "../../shared/depth.js";

export function Puppet({ performer, isSelf }) {
  const character = getCatalogItem(characterCatalog, performer.character);
  const expression = getCatalogItem(expressionCatalog, performer.state.expression);
  const { state } = performer;
  const scale = getDepthScale(state.y, state.scale);

  return (
    <div
      className={`puppet ${state.macro ? `macro-${state.macro}` : ""} ${isSelf ? "self" : ""}`}
      style={{
        left: `${state.x}%`,
        top: `${state.y}%`,
        zIndex: Math.round(state.y * 10),
        transform: `translate(-50%, -100%) scale(${scale})`
      }}
    >
      <div className="nameTag">{performer.name}</div>
      <div
        className="puppetBody"
        style={{
          "--puppet": character.color,
          "--accent": character.accent,
          "--facing": state.facing
        }}
      >
        <div className={`mouth ${state.speaking ? "talking" : ""}`}>
          {expression.face[2]}
        </div>
        <span className="eye left">{expression.face[0]}</span>
        <span className="eye right">{expression.face[1]}</span>
      </div>
      <div className="shadow" />
    </div>
  );
}
