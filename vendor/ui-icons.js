var u={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var S=([e,a,o])=>{let r=document.createElementNS("http://www.w3.org/2000/svg",e);return Object.keys(a).forEach(t=>{r.setAttribute(t,String(a[t]))}),o?.length&&o.forEach(t=>{let s=S(t);r.appendChild(s)}),r},g=(e,a={})=>{let r={...u,...a};return S(["svg",r,e])};var w=e=>{for(let a in e)if(a.startsWith("aria-")||a==="role"||a==="title")return!0;return!1};var k=(...e)=>e.filter((a,o,r)=>!!a&&a.trim()!==""&&r.indexOf(a)===o).join(" ").trim();var P=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(a,o,r)=>r?r.toUpperCase():o.toLowerCase());var A=e=>{let a=P(e);return a.charAt(0).toUpperCase()+a.slice(1)};var R=e=>Array.from(e.attributes).reduce((a,o)=>(a[o.name]=o.value,a),{}),B=e=>typeof e=="string"?e:!e||!e.class?"":e.class&&typeof e.class=="string"?e.class.split(" "):e.class&&Array.isArray(e.class)?e.class:"",m=(e,{nameAttr:a,icons:o,attrs:r})=>{let t=e.getAttribute(a);if(t==null)return;let s=A(t),f=o[s];if(!f)return console.warn(`${e.outerHTML} icon name was not found in the provided icons object.`);let l=R(e),M=w(l)?{}:{"aria-hidden":"true"},C={...u,"data-lucide":t,...M,...r,...l},F=B(l),D=B(r),h=k("lucide",`lucide-${t}`,...F,...D);h&&Object.assign(C,{class:h});let L=g(f,C);return e.parentNode?.replaceChild(L,e)};var d=[["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"19",cy:"12",r:"1"}],["circle",{cx:"5",cy:"12",r:"1"}]];var p=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]];var x=[["path",{d:"M12 19v3"}],["path",{d:"M19 10v2a7 7 0 0 1-14 0v-2"}],["rect",{x:"9",y:"2",width:"6",height:"13",rx:"3"}]];var i=[["path",{d:"m14.622 17.897-10.68-2.913"}],["path",{d:"M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"}],["path",{d:"M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"}]];var n=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}]];var c=({icons:e={},nameAttr:a="data-lucide",attrs:o={},root:r=document,inTemplates:t}={})=>{if(!Object.values(e).length)throw new Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(typeof r>"u")throw new Error("`createIcons()` only works in a browser environment.");if(Array.from(r.querySelectorAll(`[${a}]`)).forEach(f=>m(f,{nameAttr:a,icons:e,attrs:o})),t&&Array.from(r.querySelectorAll("template")).forEach(l=>c({icons:e,nameAttr:a,attrs:o,root:l.content,inTemplates:t})),a==="data-lucide"){let f=r.querySelectorAll("[icon-name]");f.length>0&&(console.warn("[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide"),Array.from(f).forEach(l=>m(l,{nameAttr:"icon-name",icons:e,attrs:o})))}};var y={Ellipsis:d,House:p,Mic:x,Paintbrush:i,RotateCcw:n};function te(e=document){c({icons:y,root:e,attrs:{width:24,height:24,"stroke-width":2.75}})}export{te as mountProductIcons};
/*! Bundled license information:

lucide/dist/esm/defaultAttributes.mjs:
lucide/dist/esm/createElement.mjs:
lucide/dist/esm/shared/src/utils/hasA11yProp.mjs:
lucide/dist/esm/shared/src/utils/mergeClasses.mjs:
lucide/dist/esm/shared/src/utils/toCamelCase.mjs:
lucide/dist/esm/shared/src/utils/toPascalCase.mjs:
lucide/dist/esm/replaceElement.mjs:
lucide/dist/esm/icons/ellipsis.mjs:
lucide/dist/esm/icons/house.mjs:
lucide/dist/esm/icons/mic.mjs:
lucide/dist/esm/icons/paintbrush.mjs:
lucide/dist/esm/icons/rotate-ccw.mjs:
lucide/dist/esm/lucide.mjs:
  (**
   * @license lucide v1.34.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
