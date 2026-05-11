import React from "react";
import {
  characterCatalog,
  expressionCatalog,
  getCatalogItem,
  poseCatalog,
  styleAdapterCatalog
} from "../../shared/catalogs.js";
import { getDepthProgress, getDepthScale } from "../../shared/depth.js";

function hasCustomPart(part) {
  return Boolean(!part?.hidden && (part?.source || part?.mode === "drawn" || part?.shape));
}

function PuppetPart({ part, className, label, showLabel, slot, selected, editableParts, onPartSelect }) {
  if (!hasCustomPart(part)) return null;
  const style = {
    "--part-scale": part.scale || 1,
    "--part-rotate": `${part.rotate || 0}deg`,
    "--part-x": `${part.x || 0}px`,
    "--part-y": `${part.y || 0}px`,
    "--part-tint": part.tint || "var(--puppet)"
  };
  const selectPart = (event) => {
    if (!editableParts || !onPartSelect) return;
    event.stopPropagation();
    onPartSelect(slot);
  };

  if (part.source) {
    return (
      <img
        className={`puppetPart ${className} ${selected ? "selectedPart" : ""}`}
        style={style}
        src={part.source}
        alt=""
        draggable="false"
        onClick={selectPart}
      />
    );
  }

  return (
    <span
      className={`puppetPart assembledPart partShape-${part.shape || "scribble"} ${className} ${selected ? "selectedPart" : ""}`}
      style={style}
      aria-hidden="true"
      onClick={selectPart}
    >
      {showLabel ? part.label || label : null}
    </span>
  );
}

function PartHotspot({ slot, className, selected, editableParts, onPartSelect }) {
  if (!editableParts || !onPartSelect) return null;
  const readableSlot = slot.replace(/([A-Z])/g, " $1").toLowerCase();
  return (
    <button
      type="button"
      className={`partHotspot ${className} ${selected ? "selectedPartHotspot" : ""}`}
      aria-label={`Select ${readableSlot}`}
      onClick={(event) => {
        event.stopPropagation();
        onPartSelect(slot);
      }}
    />
  );
}

export function Puppet({
  performer,
  isSelf,
  depthModel,
  showLabels = false,
  editableParts = false,
  selectedPartId = "",
  onPartSelect
}) {
  const character = getCatalogItem(characterCatalog, performer.character);
  const expression = getCatalogItem(expressionCatalog, performer.state.expression);
  const pose = getCatalogItem(poseCatalog, performer.state.pose);
  const { state } = performer;
  const design = state.characterDesign || {};
  const parts = state.characterParts || {};
  const hasUserParts = Object.values(parts).some(hasCustomPart);
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
  const depth = getDepthProgress(state.y, depthModel);
  const groundSpeed = Math.max(0.6, Math.min(1.7, state.groundSpeed || 1));
  const settleAmount = state.settleAmount || 0;
  const walkBounce = Number.isFinite(state.visualBounce) ? state.visualBounce : state.walkBounce || 0;
  const performanceLean = Number.isFinite(state.visualLean)
    ? state.visualLean
    : (state.travelLean || 0) + (state.anticipationLean || 0) * 0.75;
  const actingLean = pose.bodyLean + performanceLean;
  const motionSquash = state.walking
    ? (state.visualSquash || state.anticipationSquash || 1) + Math.min(0.032, walkBounce * 0.018)
    : (state.visualSquash || state.anticipationSquash || 1) - settleAmount * 0.006;
  const selectBodyPart = (slot) => (event) => {
    if (!editableParts || !onPartSelect) return;
    event.stopPropagation();
    onPartSelect(slot);
  };

  return (
    <div
      className={[
        "puppet",
        `body-${rig.body}`,
        `archetype-${character.archetype || character.id}`,
        character.rig === "rig-model" ? "rigModel" : "",
        hasUserParts ? "puppetCustom" : "needsParts",
        `limbs-${rig.limbs}`,
        `style-${stylePreset}`,
        `texture-${adapter.texturePreset || "paper-grain"}`,
        adapter.borderless ? "style-borderless" : "",
        `idle-${state.idleMotion}`,
        `behavior-${state.behaviorPreset || "none"}`,
        `mouth-${mouthLevel}`,
        canIdle ? "idle-breathing" : "",
        canBlink ? "auto-blink" : "",
        isWalking ? `walking walk-${rig.walkCycle}` : "",
        state.macro ? `macro-${state.macro}` : "",
        showLabels ? "showStageLabels" : "hideStageLabels",
        editableParts ? "editableParts" : "",
        isSelf ? "self" : ""
      ].join(" ")}
      style={{
        left: `${state.x}%`,
        top: `${state.y}%`,
        zIndex: 100 + Math.round((state.depthProgress ?? depth) * 1000),
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
        "--walk-bounce": walkBounce,
        "--settle": settleAmount,
        "--cast-shadow-x": `${-18 + depth * 10}px`,
        "--cast-shadow-y": `${14 + depth * 16 + settleAmount * 2}px`,
        "--cast-shadow-scale": 0.5 + depth * 0.54 + walkBounce * 0.025,
        "--cast-shadow-opacity": 0.08 + depth * adapter.shadowOpacity + settleAmount * 0.018,
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
      {showLabels ? <div className="nameTag">{performer.name}</div> : null}
      <div className="castShadow" aria-hidden="true" />
      <div className="puppetRig">
        {rig.arms ? (
          <>
            <div className="limb arm armLeft">
              <PartHotspot slot="leftArm" className="partHotspotLimb" selected={selectedPartId === "leftArm"} editableParts={editableParts} onPartSelect={onPartSelect} />
              <PuppetPart part={parts.leftArm} className="partLeftArm" label="arm" slot="leftArm" selected={selectedPartId === "leftArm"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
            </div>
            <div className="limb arm armRight">
              <PartHotspot slot="rightArm" className="partHotspotLimb" selected={selectedPartId === "rightArm"} editableParts={editableParts} onPartSelect={onPartSelect} />
              <PuppetPart part={parts.rightArm} className="partRightArm" label="arm" slot="rightArm" selected={selectedPartId === "rightArm"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
            </div>
          </>
        ) : null}
        {rig.legs ? (
          <>
            <div className="limb leg legLeft">
              <PartHotspot slot="leftLeg" className="partHotspotLimb" selected={selectedPartId === "leftLeg"} editableParts={editableParts} onPartSelect={onPartSelect} />
              <PuppetPart part={parts.leftLeg} className="partLeftLeg" label="leg" slot="leftLeg" selected={selectedPartId === "leftLeg"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
            </div>
            <div className="limb leg legRight">
              <PartHotspot slot="rightLeg" className="partHotspotLimb" selected={selectedPartId === "rightLeg"} editableParts={editableParts} onPartSelect={onPartSelect} />
              <PuppetPart part={parts.rightLeg} className="partRightLeg" label="leg" slot="rightLeg" selected={selectedPartId === "rightLeg"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
            </div>
          </>
        ) : null}
        <div className={`puppetBody ${selectedPartId === "torso" ? "selectedPartBody" : ""}`} onClick={selectBodyPart("torso")}>
          <PartHotspot slot="head" className="partHotspotHead" selected={selectedPartId === "head"} editableParts={editableParts} onPartSelect={onPartSelect} />
          <PartHotspot slot="torso" className="partHotspotTorso" selected={selectedPartId === "torso"} editableParts={editableParts} onPartSelect={onPartSelect} />
          <PuppetPart part={parts.backAppendage} className="partBackAppendage" label="??" slot="backAppendage" selected={selectedPartId === "backAppendage"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
          <PuppetPart part={parts.torso} className="partTorso" label="torso" slot="torso" selected={selectedPartId === "torso"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
          <PuppetPart part={parts.head} className="partHead" label="head" slot="head" selected={selectedPartId === "head"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
          <PuppetPart part={parts.topAccessory} className="partTopAccessory" label="hat" slot="topAccessory" selected={selectedPartId === "topAccessory"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
          <PuppetPart part={parts.leftAccessory} className="partLeftAccessory" label="prop" slot="leftAccessory" selected={selectedPartId === "leftAccessory"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
          <PuppetPart part={parts.rightAccessory} className="partRightAccessory" label="prop" slot="rightAccessory" selected={selectedPartId === "rightAccessory"} editableParts={editableParts} onPartSelect={onPartSelect} showLabel={showLabels} />
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
