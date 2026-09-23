import * as THREE from '../vendor/three.module.js';
import { createPropToolkit } from './modules/props/toolkit.js';
import { PROP_BUILDERS } from './modules/props/registry.js';

// Compatibility factory. Models live in independent modules/props files.
export function createCreationModel(kind, color = '#9ab8ba', name = '') {
  const build = PROP_BUILDERS[kind];
  if (!build) throw new Error(`Unknown prefab: ${kind}`);
  const group = new THREE.Group(); group.name = `creation-${kind}`;
  const kit = createPropToolkit(group, color);
  kit.name = name || kind.replace(/^prop:/, '');
  const { shapes, materials, movers } = kit;
  build(kit);
  let age = 100, time = 0, enabled = true;
  return { group, kind, setState(state) { enabled = state !== 'idle'; if (state === 'active') age = 0; }, trigger() { age = 0; }, update(dt, reduced = false, working = false) {
    age += dt; time += dt; const strength = !enabled ? 0 : age < 4 ? Math.sin(Math.min(1,age/.3)*Math.PI/2) * Math.min(1,(4-age)/.5) : working ? .25 : .06;
    for(const material of materials.values()){material.emissive.set('#e8c56e');material.emissiveIntensity=age<4?strength*.18:0;}
    for(const m of movers){ const wave=Math.sin(time*m.rate)*strength*(reduced?.15:1);m.object.position.copy(m.rest);m.object.rotation.copy(m.rotation);
      if(m.mode==='flap')m.object.rotation.z+=reduced?0:Math.sin(time*m.rate)*m.amount;
      if(m.mode==='flap-x')m.object.rotation.x+=reduced?0:Math.sin(time*m.rate)*m.amount;
      if(m.mode==='bounce')m.object.position.y+=Math.abs(wave)*m.amount;
      if(m.mode==='sway')m.object.rotation.z+=wave*m.amount;
      if(m.mode==='swing')m.object.rotation.x+=wave*m.amount;
      if(m.mode==='turn'||m.mode==='door')m.object.rotation.y+=wave*m.amount;
      if(m.mode==='spin')m.object.rotation.z+=(reduced?0:time)*m.amount*(enabled?(working||age<4?1:.06):0);
      if(m.mode==='slide')m.object.position.x+=Math.abs(wave)*m.amount;
    }
  }, dispose(){group.removeFromParent();shapes.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());} };
}
