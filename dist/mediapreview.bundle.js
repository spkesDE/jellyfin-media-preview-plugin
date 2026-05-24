"use strict";var JellyfinMediaPreviewBundle=(()=>{var Be=Object.defineProperty;var dr=Object.getOwnPropertyDescriptor;var ur=Object.getOwnPropertyNames;var cr=Object.prototype.hasOwnProperty;var pr=(e,t)=>{for(var r in t)Be(e,r,{get:t[r],enumerable:!0})},mr=(e,t,r,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of ur(t))!cr.call(e,o)&&o!==r&&Be(e,o,{get:()=>t[o],enumerable:!(n=dr(t,o))||n.enumerable});return e};var fr=e=>mr(Be({},"__esModule",{value:!0}),e);var Qr={};pr(Qr,{default:()=>Zr,destroy:()=>ar,rebind:()=>lr,start:()=>Fe});var V="data-media-preview-bound",Ve="jellyfin-media-preview-style",bt="JellyfinMediaPreview",T="trickplay",y="trailer",z="prefer-trickplay",J="prefer-trailer",gt="No Trailer Found",yt="No Trickplay Found",We="No Trailer/Trickplay Found",je="scrub",W="auto",$e="step",X="sweep",U="ping-pong",Ke="custom",qe="snappy",j="balanced",Ye="cinematic",Ge="cover",S="contain",Z="stretch";var ze="vignette",Q="dim-vignette",Je="blur",D="dim-blur";var Xe="light",$="medium",Ze="strong",hr="top-left",me="top-right",vr="bottom-left",br="bottom-right",Qe="MediaPreviewConfigPage",ee=`#/configurationpage?name=${Qe}`,te="data-media-preview-admin-link",fe=3e4,Et=240,he=new Set([T,y,z,J]),Tt=new Set([je,W]),Mt=new Set([$e,X,U]),ve=new Set([Ke,qe,j,Ye]),et=new Set([Ge,S,Z]),be=new Set(["off","dim",ze,Q,Je,D]),ge=new Set(["off",Xe,$,Ze]),tt=new Set([hr,me,vr,br]),R=new Set(["Movie","Episode","Series","Video"]);function E(e,t,r){return Math.max(t,Math.min(r,e))}var m={enabled:!0,previewSource:T,showNoPreviewMessage:!1,trailerAudioEnabled:!1,trailerVolumePercent:35,hoverDelayMs:300,hoverCountdownEnabled:!1,hoverCountdownPosition:"top-right",trickplayWidth:320,restoreOnLeave:!0,showProgressIndicator:!0,debug:!1,hoverMode:"scrub",autoScrubMode:"step",autoScrubPreset:"balanced",autoScrubStartPercent:0,autoScrubIntervalMs:220,autoScrubDurationMs:4e3,autoScrubMinDelayMs:40,autoScrubMaxDelayMs:1e3,portraitCardPreviewMode:"contain",backdropCardPreviewMode:"cover",previewBackdropMode:"dim-blur",previewBackdropIntensityPercent:35,youTubeCropStrength:"medium",trailerExpandButtonEnabled:!0,trailerExpandButtonPosition:"top-right"},f=window.JellyfinMediaPreviewPluginConfig,a={enabled:f?.enabled??m.enabled,previewSource:f?.previewSource??m.previewSource,showNoPreviewMessage:f?.showNoPreviewMessage??m.showNoPreviewMessage,trailerAudioEnabled:f?.trailerAudioEnabled??m.trailerAudioEnabled,trailerVolumePercent:f?.trailerVolumePercent??m.trailerVolumePercent,hoverDelayMs:f?.hoverDelayMs??m.hoverDelayMs,hoverCountdownEnabled:f?.hoverCountdownEnabled??m.hoverCountdownEnabled,hoverCountdownPosition:f?.hoverCountdownPosition??m.hoverCountdownPosition,trickplayWidth:f?.trickplayWidth??m.trickplayWidth,restoreOnLeave:f?.restoreOnLeave??m.restoreOnLeave,showProgressIndicator:f?.showProgressIndicator??m.showProgressIndicator,debug:f?.debug??m.debug,hoverMode:f?.hoverMode??m.hoverMode,autoScrubMode:f?.autoScrubMode??m.autoScrubMode,autoScrubPreset:f?.autoScrubPreset??m.autoScrubPreset,autoScrubStartPercent:f?.autoScrubStartPercent??m.autoScrubStartPercent,autoScrubIntervalMs:f?.autoScrubIntervalMs??m.autoScrubIntervalMs,autoScrubDurationMs:f?.autoScrubDurationMs??m.autoScrubDurationMs,autoScrubMinDelayMs:f?.autoScrubMinDelayMs??m.autoScrubMinDelayMs,autoScrubMaxDelayMs:f?.autoScrubMaxDelayMs??m.autoScrubMaxDelayMs,portraitCardPreviewMode:f?.portraitCardPreviewMode??m.portraitCardPreviewMode,backdropCardPreviewMode:f?.backdropCardPreviewMode??m.backdropCardPreviewMode,previewBackdropMode:f?.previewBackdropMode??m.previewBackdropMode,previewBackdropIntensityPercent:f?.previewBackdropIntensityPercent??m.previewBackdropIntensityPercent,youTubeCropStrength:f?.youTubeCropStrength??m.youTubeCropStrength,trailerExpandButtonEnabled:f?.trailerExpandButtonEnabled??m.trailerExpandButtonEnabled,trailerExpandButtonPosition:f?.trailerExpandButtonPosition??m.trailerExpandButtonPosition};function wt(){let e=String(a.autoScrubMode);e==="smooth"?a.autoScrubMode=X:e==="smooth-pingpong"&&(a.autoScrubMode=U),he.has(a.previewSource)||(a.previewSource=T),Tt.has(a.hoverMode)||(a.hoverMode=je),Mt.has(a.autoScrubMode)||(a.autoScrubMode=$e),ve.has(a.autoScrubPreset)||(a.autoScrubPreset=j),et.has(a.portraitCardPreviewMode)||(a.portraitCardPreviewMode=S),et.has(a.backdropCardPreviewMode)||(a.backdropCardPreviewMode=Ge),be.has(a.previewBackdropMode)||(a.previewBackdropMode=D),ge.has(a.youTubeCropStrength)||(a.youTubeCropStrength=$),tt.has(a.trailerExpandButtonPosition)||(a.trailerExpandButtonPosition=me),tt.has(a.hoverCountdownPosition)||(a.hoverCountdownPosition=me),a.hoverDelayMs=Math.max(0,Number(a.hoverDelayMs)||300),a.trickplayWidth=Math.max(1,Number(a.trickplayWidth)||320),a.trailerVolumePercent=E(Number.isFinite(Number(a.trailerVolumePercent))?Number(a.trailerVolumePercent):35,0,100),a.previewBackdropIntensityPercent=E(Number.isFinite(Number(a.previewBackdropIntensityPercent))?Number(a.previewBackdropIntensityPercent):35,0,100),a.autoScrubStartPercent=E(Number(a.autoScrubStartPercent)||0,0,100),a.autoScrubIntervalMs=Math.max(50,Number(a.autoScrubIntervalMs)||220),a.autoScrubDurationMs=Math.max(500,Number(a.autoScrubDurationMs)||4e3),a.autoScrubMinDelayMs=Math.max(16,Number(a.autoScrubMinDelayMs)||40),a.autoScrubMaxDelayMs=Math.max(a.autoScrubMinDelayMs,Number(a.autoScrubMaxDelayMs)||1e3),a.showNoPreviewMessage=a.showNoPreviewMessage===!0,a.hoverCountdownEnabled=a.hoverCountdownEnabled===!0,a.trailerExpandButtonEnabled=a.trailerExpandButtonEnabled!==!1}function Tr(e){return e&&(e.classList.contains("overflowPortraitCard")||e.querySelector(".cardPadder-overflowPortrait")||e.querySelector(".coveredImage"))?"portrait":"backdrop"}function re(e){return Tr(e)==="portrait"?a.portraitCardPreviewMode:a.backdropCardPreviewMode}function Mr(){return be.has(a.previewBackdropMode)?a.previewBackdropMode:D}function xt(){switch(ge.has(a.youTubeCropStrength)?a.youTubeCropStrength:$){case"off":return 1;case Xe:return 1.1;case Ze:return 1.32;case $:default:return 1.2}}function St(){let e=Mr(),t=E(Number(a.previewBackdropIntensityPercent)||35,0,100)/100,r={background:"transparent",backdropFilter:"none",webkitBackdropFilter:"none"};if(e==="off")return r;if(e==="dim"||e===D||e===Q){let n=Math.max(0,Math.min(.8,t*.75));r.background=`rgba(0, 0, 0, ${n.toFixed(3)})`}if(e===ze||e===Q){let n=Math.max(0,Math.min(.45,t*.18)),o=Math.max(.16,Math.min(.92,.22+t*.62)),i=`radial-gradient(circle at center, rgba(0, 0, 0, ${n.toFixed(3)}) 22%, rgba(0, 0, 0, ${o.toFixed(3)}) 100%)`;r.background=e===Q&&r.background!=="transparent"?`${r.background}, ${i}`:i}if(e===Je||e===D){let n=Math.max(1,Math.round(4+t*12));r.backdropFilter=`blur(${n}px)`,r.webkitBackdropFilter=r.backdropFilter}return r}function ye(e){let t=e&&"nodeType"in e&&e.nodeType===1?e:document,r=new Set,n=[".card[data-id]"];return"matches"in t&&typeof t.matches=="function"&&n.forEach(o=>{if(t.matches(o)){let i=rt(t);i&&r.add(i)}}),n.forEach(o=>{t.querySelectorAll(o).forEach(i=>{let l=rt(i);l&&r.add(l)})}),Array.from(r).filter(o=>!!M(o)&&R.has(Ct(o)||""))}function rt(e){return e?e.closest(".card[data-id]")||e:null}function Ct(e){return e&&(e.getAttribute("data-type")||e instanceof HTMLElement&&(e.dataset.type||e.dataset.itemtype))||null}function Pt(e){if(!e)return null;try{let t=new URL(e,window.location.origin),r=t.searchParams.get("id");if(r)return r;let n=t.pathname.match(/\/details(?:\.html)?\/([^/?#]+)/i)||t.pathname.match(/\/itemdetails(?:\.html)?\/([^/?#]+)/i)||t.hash.match(/[?&]id=([^&]+)/i);return n?n[1]:null}catch{let t=e.match(/[?&]id=([^&]+)/i);return t?decodeURIComponent(t[1]):null}}function M(e){if(!e)return null;let t=["id","itemId","itemid","parentid","itemPrimaryImageId"],r=e instanceof HTMLElement?e:null;for(let i=0;i<t.length;i+=1){let l=t[i],s=r?.dataset?.[l];if(s)return s;let d=e.getAttribute(`data-${l.replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`)}`);if(d)return d}let n=e.querySelectorAll("[data-id],[data-item-id],[data-itemid],a[href],button[data-id]");for(let i=0;i<n.length;i+=1){let l=n[i],s=l.dataset?.id||l.dataset?.itemId||l.dataset?.itemid;if(s)return s;let d=l.getAttribute("href"),c=Pt(d);if(c)return c}let o=Pt(e.getAttribute("href"));return o||null}function nt(e){if(!e)return null;let t=[".cardImageContainer",".cardPadder",".cardImage","img",".lazy",".itemImage"];for(let r=0;r<t.length;r+=1){let n=e.querySelector(t[r]);if(n){if(n.classList.contains("cardImageContainer"))return n;let o=n.closest(".cardImageContainer");return o||n}}return null}function N(e){let t=nt(e);if(!t)return null;if(t.classList.contains("cardImageContainer")||t.classList.contains("cardPadder"))return t;let r=t.closest(".cardPadder");return r||t.parentElement||t}function w(e){if(!(e instanceof Element)||typeof e.closest!="function")return null;let t=rt(e.closest(".card[data-id]"));if(!t||!R.has(Ct(t)||""))return null;let r=N(t);return!r||!(e===r||r.contains(e))?null:t}var At=new WeakMap;function b(e){let t=At.get(e);return t||(t={hoverTimer:null,hoverCountdownFrame:null,hoverCountdownStartedAt:null,hoverCountdownDurationMs:0,leaveHoldTimer:null,pointerInside:!1,previewActive:!1,previewBackdrop:null,previewFrame:null,hoverCountdown:null,hoverCountdownLabel:null,unavailableMessage:null,trailerLayer:null,trailerActions:null,trailerExpandButton:null,trailerMedia:null,trailerMediaKind:null,currentTrailer:null,trailerPlaybackStartedAt:0,progress:null,progressBar:null,lastPreviewKey:null,activePreviewSource:null,lastMoveAt:0,queuedPercent:null,queuedMoveTimer:null,queuedMoveFrame:null,latestRequestToken:0,rootHost:null,autoScrubTimer:null,autoScrubPercent:null,autoScrubDirection:1,autoScrubAnimationFrame:null,autoScrubStartedAt:null,currentTrickplayInfo:null,lastRequestedTrickplayFrameIndex:null,lastRenderedTrickplayFrameIndex:null,lastTrickplayRenderAt:0},At.set(e,t)),t}function v(...e){a.debug&&console.debug("[MediaPreview]",...e)}function Ee(...e){console.log("[MediaPreview]",...e)}function K(e,t,r){!a.debug||!e||v(t,{itemId:M(e),type:e.getAttribute("data-type"),classes:e.className,imageHost:N(e)?.className||null,extra:r||null})}var u={observer:null,routeEventsBound:!1,delegatedHoverEventsBound:!1,userActivationEventsBound:!1,scanScheduled:!1,adminNavRefreshScheduled:!1,historyPatched:!1,pageHasUserActivation:!1,expandedTrailerSession:null,expandedTrailerDom:null};function ne(e,t,r,n,o,i,l){let s=r.width/o,d=r.height/i,h=t.tagName==="IFRAME"?xt():1;if(e.style.left="0",e.style.top="0",e.style.width=`${r.width}px`,e.style.height=`${r.height}px`,e.style.borderRadius=l,n===S){let C=Math.min(s,d),O=o*C,A=i*C,pe=O*h,vt=A*h;t.style.left=`${(r.width-pe)/2}px`,t.style.top=`${(r.height-vt)/2}px`,t.style.width=`${pe}px`,t.style.height=`${vt}px`;return}if(n===Z){let C=r.width*h,O=r.height*h;t.style.left=`${(r.width-C)/2}px`,t.style.top=`${(r.height-O)/2}px`,t.style.width=`${C}px`,t.style.height=`${O}px`;return}let p=Math.max(s,d),g=o*p*h,x=i*p*h;t.style.left=`${(r.width-g)/2}px`,t.style.top=`${(r.height-x)/2}px`,t.style.width=`${g}px`,t.style.height=`${x}px`}function Rt(e){if(!e)return null;try{let t=new URL(e,window.location.origin),r=t.hostname.replace(/^www\./i,"").toLowerCase();if(r==="youtu.be")return t.pathname.replace(/^\/+/,"").split("/")[0]||null;if(r==="youtube.com"||r==="m.youtube.com"||r==="music.youtube.com"||r==="youtube-nocookie.com"){if(t.searchParams.get("v"))return t.searchParams.get("v");let n=t.pathname.split("/").filter(Boolean),o=n.indexOf("embed");if(o!==-1&&n[o+1])return n[o+1]}}catch{let t=String(e).match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/i);return t?t[1]:null}return null}function Te(e,t,r){if(!e)return null;let n=r||{},o=!!n.controls,i=Math.max(0,Math.floor(Number(n.startSeconds)||0));return`https://www.youtube-nocookie.com/embed/${encodeURIComponent(e)}?autoplay=1&mute=${t?"1":"0"}&controls=${o?"1":"0"}&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`+(i>0?`&start=${encodeURIComponent(i)}`:"")+`&loop=1&playlist=${encodeURIComponent(e)}`}function wr(){if(u.expandedTrailerDom)return u.expandedTrailerDom;let e=document.createElement("div");e.className="jmp-expanded-trailer-overlay",e.setAttribute("aria-hidden","true");let t=document.createElement("div");t.className="jmp-expanded-trailer-backdrop";let r=document.createElement("div");r.className="jmp-expanded-trailer-shell";let n=document.createElement("div");n.className="jmp-expanded-trailer-viewport";let o=document.createElement("div");o.className="jmp-expanded-trailer-media-host",n.appendChild(o);let i=document.createElement("div");i.className="jmp-expanded-trailer-ui";let l=document.createElement("div");l.className="jmp-expanded-trailer-title",l.textContent="";let s=document.createElement("button");return s.className="jmp-expanded-trailer-close",s.type="button",s.title="Close expanded trailer",s.setAttribute("aria-label","Close expanded trailer"),s.innerHTML='<span class="material-icons" aria-hidden="true">close</span>',i.appendChild(l),i.appendChild(s),r.appendChild(n),r.appendChild(i),e.appendChild(t),e.appendChild(r),document.body.appendChild(e),t.addEventListener("click",()=>{_()}),n.addEventListener("click",d=>{d.stopPropagation()}),o.addEventListener("click",d=>{d.stopPropagation()}),s.addEventListener("click",()=>{_()}),window.addEventListener("keydown",d=>{d.key==="Escape"&&u.expandedTrailerSession&&_()}),window.addEventListener("resize",()=>{if(!u.expandedTrailerSession)return;let d=ot(u.expandedTrailerSession);Me(n,d),It(u.expandedTrailerSession)}),u.expandedTrailerDom={overlay:e,viewport:n,mediaHost:o,title:l},u.expandedTrailerDom}function ot(e){let t=e?.trailer||{},r=Math.max(1,t.aspectRatio?.width||16),n=Math.max(1,t.aspectRatio?.height||9),o=window.innerWidth||document.documentElement.clientWidth||1280,i=window.innerHeight||document.documentElement.clientHeight||720,l=Math.max(320,o-80),s=Math.max(240,i-80),d=Math.min(l/r,s/n),c=Math.round(r*d),h=Math.round(n*d);return{left:Math.round((o-c)/2),top:Math.round((i-h)/2),width:c,height:h}}function Me(e,t){!e||!t||(e.style.left=`${t.left}px`,e.style.top=`${t.top}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`)}function It(e){if(!e||!u.expandedTrailerDom)return;let t=e.trailer||{},r=re(e.card),n=ot(e),o=e.expandedMedia||e.state.trailerMedia;o&&ne(u.expandedTrailerDom.mediaHost,o,n,r,Math.max(1,t.aspectRatio?.width||16),Math.max(1,t.aspectRatio?.height||9),"22px")}function xr(e){return e?.trailerPlaybackStartedAt?Math.max(0,Math.floor((Date.now()-e.trailerPlaybackStartedAt)/1e3)):0}function _t(e){let t=b(e);if(!t.trailerMedia||!t.currentTrailer||!t.trailerLayer||t.trailerLayer.style.display==="none"||u.expandedTrailerSession&&u.expandedTrailerSession.card===e)return;_({immediate:!0});let r=wr(),n=t.trailerLayer.getBoundingClientRect();if(!(!n.width||!n.height)){if(u.expandedTrailerSession={card:e,state:t,trailer:t.currentTrailer,expandedMedia:null,expandedPlaybackStartedAt:0,collapsedMedia:t.trailerMedia,sourceRect:{left:n.left,top:n.top,width:n.width,height:n.height}},t.pointerInside=!0,r.title.textContent=t.currentTrailer.title||"Trailer",r.overlay.style.display="block",r.overlay.setAttribute("aria-hidden","false"),Me(r.viewport,u.expandedTrailerSession.sourceRect),oe(t,!1),t.trailerLayer.style.visibility="hidden",t.trailerMediaKind==="iframe"&&t.currentTrailer.youtubeId){let o=document.createElement("iframe"),i=xr(t);o.className="jmp-trailer-media jmp-interactive",o.setAttribute("aria-hidden","true"),o.setAttribute("allow","autoplay; encrypted-media; picture-in-picture"),o.setAttribute("referrerpolicy","strict-origin-when-cross-origin"),o.setAttribute("tabindex","-1"),o.src=Te(t.currentTrailer.youtubeId,!we(),{controls:!0,startSeconds:i})||"about:blank",u.expandedTrailerSession.expandedMedia=o,u.expandedTrailerSession.expandedPlaybackStartedAt=Date.now()-i*1e3,r.mediaHost.appendChild(o),t.trailerMedia instanceof HTMLIFrameElement&&(t.trailerMedia.src="about:blank")}else r.mediaHost.appendChild(t.trailerMedia),t.trailerMedia.classList.add("jmp-interactive"),t.trailerMedia instanceof HTMLVideoElement&&(t.trailerMedia.controls=!0);window.requestAnimationFrame(()=>{if(!u.expandedTrailerSession||u.expandedTrailerSession.card!==e)return;r.overlay.classList.add("is-open");let o=ot(u.expandedTrailerSession);Me(r.viewport,o),It(u.expandedTrailerSession)})}}function _(e){if(!u.expandedTrailerSession||!u.expandedTrailerDom)return;let t=u.expandedTrailerSession,r=t.state,n=u.expandedTrailerDom,o=!!e?.immediate,i=r.trailerLayer?r.trailerLayer.getBoundingClientRect():t.sourceRect;function l(){if(u.expandedTrailerSession=null,n.overlay.classList.remove("is-open"),n.overlay.style.display="none",n.overlay.setAttribute("aria-hidden","true"),n.title.textContent="",r.trailerLayer&&(t.expandedMedia?(t.collapsedMedia&&t.collapsedMedia!==t.expandedMedia&&t.collapsedMedia.parentNode&&t.collapsedMedia.parentNode.removeChild(t.collapsedMedia),r.trailerMedia=t.expandedMedia,r.trailerMediaKind="iframe",r.trailerPlaybackStartedAt=t.expandedPlaybackStartedAt||Date.now(),r.trailerMedia.classList.remove("jmp-interactive"),r.trailerLayer.appendChild(r.trailerMedia)):r.trailerMedia&&(r.trailerMediaKind==="video"&&r.trailerMedia instanceof HTMLVideoElement&&(r.trailerMedia.controls=!1,r.trailerMedia.classList.remove("jmp-interactive")),r.trailerLayer.appendChild(r.trailerMedia)),r.trailerLayer.style.visibility="visible"),r.currentTrailer&&r.rootHost&&r.trailerLayer&&r.trailerMedia){let s=r.rootHost.getBoundingClientRect();ne(r.trailerLayer,r.trailerMedia,s,re(t.card),Math.max(1,r.currentTrailer.aspectRatio?.width||16),Math.max(1,r.currentTrailer.aspectRatio?.height||9),window.getComputedStyle(r.rootHost).borderRadius)}r.pointerInside=!1,P(t.card)}if(o){l();return}n.overlay.classList.remove("is-open"),i&&i.width&&i.height&&Me(n.viewport,{left:i.left,top:i.top,width:i.width,height:i.height}),window.setTimeout(l,Et)}function it(e){if(!(e instanceof HTMLVideoElement))return;let t=we();e.volume=Math.max(0,Math.min(1,(Number(a.trailerVolumePercent)||0)/100)),e.muted=!t,e.defaultMuted=!t}function we(){let e=window.navigator.userActivation?.hasBeenActive;return!!a.trailerAudioEnabled&&(u.pageHasUserActivation||!!e)}function Sr(e,t){if(!e.trailerLayer)return null;if(e.trailerMedia&&e.trailerMediaKind===t)return e.trailerMedia;e.trailerMedia?.parentNode&&e.trailerMedia.parentNode.removeChild(e.trailerMedia);let r=document.createElement(t==="iframe"?"iframe":"video");if(r.className="jmp-trailer-media",r.setAttribute("aria-hidden","true"),t==="iframe")r.setAttribute("allow","autoplay; encrypted-media; picture-in-picture"),r.setAttribute("referrerpolicy","strict-origin-when-cross-origin"),r.setAttribute("tabindex","-1");else{let n=r;n.autoplay=!0,n.loop=!0,n.playsInline=!0,n.preload="metadata",n.controls=!1,it(n)}return e.trailerLayer.appendChild(r),e.trailerMedia=r,e.trailerMediaKind=t,r}function xe(e){if(!e||(u.expandedTrailerSession&&u.expandedTrailerSession.state===e&&_({immediate:!0}),at(e,!1),oe(e,!1),q(e),e.currentTrailer=null,!e.trailerMedia))return;if(e.trailerMediaKind==="iframe"){e.trailerMedia.src="about:blank";return}let t=e.trailerMedia;t.pause(),t.removeAttribute("src"),t.load()}function kt(e,t){let r=b(e);if(!H(e,r)||!t?.trailer)return;let n=r.rootHost;if(!n||!r.trailerLayer)return;let o=n.getBoundingClientRect();if(!o.width||!o.height)return;let i=t.trailer,l=Math.max(1,i.aspectRatio?.width||16),s=Math.max(1,i.aspectRatio?.height||9),d=re(e),c=window.getComputedStyle(n).borderRadius,h=[i.kind,i.src||i.embedUrl,d,Math.round(o.width),Math.round(o.height)].join("|");if(r.lastPreviewKey===h&&r.trailerLayer.style.display!=="none")return;r.lastPreviewKey=h,r.previewActive=!0,r.activePreviewSource=y,lt(r),q(r),Lt(r);let p=Sr(r,i.kind);if(p){if(r.currentTrailer=i,ne(r.trailerLayer,p,o,d,l,s,c),at(r,!0),oe(r,!0),r.trailerLayer.style.background="transparent",p.style.background="transparent",r.trailerLayer.classList.toggle("jmp-debug-visible",!!a.debug),v("Applying trailer preview.",{title:i.title||null,kind:i.kind,mode:d,cropStrength:a.youTubeCropStrength,hostWidth:Math.round(o.width),hostHeight:Math.round(o.height),hostOffsetLeft:0,hostOffsetTop:0,layerWidth:r.trailerLayer.style.width,layerHeight:r.trailerLayer.style.height,layerLeft:r.trailerLayer.style.left,layerTop:r.trailerLayer.style.top}),i.kind==="iframe"){let g=i.youtubeId?Te(i.youtubeId,!we(),{controls:!1}):i.embedUrl;g&&p instanceof HTMLIFrameElement&&p.src!==g&&(p.src=g,r.trailerPlaybackStartedAt=Date.now())}else if(p instanceof HTMLVideoElement){it(p),p.onerror=()=>{if(i.fallbackSrc&&p.dataset.jmpFallbackApplied!=="true"){v("Local trailer direct playback failed. Falling back to transcoded MP4.",i.title||i.src),p.dataset.jmpFallbackApplied="true",p.src=i.fallbackSrc,p.load(),it(p);let x=p.play();x&&typeof x.catch=="function"&&x.catch(C=>{v("Transcoded trailer autoplay failed.",i.title||i.fallbackSrc,C)})}},i.src&&p.src!==i.src&&(p.dataset.jmpFallbackApplied="false",p.src=i.src,p.load(),r.trailerPlaybackStartedAt=Date.now());let g=p.play();g&&typeof g.catch=="function"&&g.catch(x=>{v("Trailer autoplay failed.",i.title||i.src,x)})}ie(r)}}function F(){return window.ApiClient||window.apiClient||null}function Se(e){if(!e)return null;if(typeof e.getCurrentUserId=="function")return e.getCurrentUserId()||null;if(typeof e.getCurrentUser=="function"){let t=e.getCurrentUser();if(t?.Id)return t.Id}return e._serverInfo?.UserId?e._serverInfo.UserId:null}function I(e,t){let r=F();if(!r)return null;let n=r&&(typeof r.accessToken=="function"?r.accessToken():r._serverInfo?.AccessToken);if(typeof r.getUrl=="function"){let s=r.getUrl(e,t);if(!s)return s;let d=new URL(s,window.location.origin);return n&&!d.searchParams.has("api_key")&&!d.searchParams.has("X-Emby-Token")&&d.searchParams.set("api_key",n),d.toString()}let o=typeof r.serverAddress=="function"?r.serverAddress():r._serverAddress||r._serverInfo?.ManualAddress||"";if(!o)return null;let i=o.replace(/\/+$/,"")+"/"+e.replace(/^\/+/,""),l=new URL(i,window.location.origin);return t&&Object.keys(t).forEach(s=>{let d=t[s];d!=null&&d!==""&&l.searchParams.set(s,String(d))}),n&&!l.searchParams.has("api_key")&&!l.searchParams.has("X-Emby-Token")&&l.searchParams.set("api_key",n),l.toString()}function Ot(e){let t={},r=e?._serverInfo?.AccessToken;return r&&(t["X-Emby-Token"]=r),t}var Pe=new Map,Ce=new Map,st=new Set;function ae(e,t){let r=F(),n=I(e,t);return!r||!n?Promise.reject(new Error("ApiClient is not available.")):typeof r.ajax=="function"?Promise.resolve(r.ajax({type:"GET",url:n,dataType:"json"})):fetch(n,{method:"GET",credentials:"same-origin",headers:Ot(r)}).then(o=>{if(!o.ok)throw new Error(`Request failed with status ${o.status}`);return o.json()})}function Ae(e,t){if(!e||!e.thumbnailCount)return 0;let r=Math.max(0,Math.min(1,Number(t)||0));return Math.min(e.thumbnailCount-1,Math.max(0,Math.round(r*Math.max(0,e.thumbnailCount-1))))}function dt(e){let t=Math.max(1,Number(e?.thumbnailCount)||0),r=Math.max(0,Number(e?.intervalMs)||0);return t<=2||r>=15e3?240:t<=6||r>=1e4?180:t<=12||r>=5e3?130:t<=40||r>=2500?80:32}function Ut(){switch(ve.has(a.autoScrubPreset)?a.autoScrubPreset:j){case qe:return{minDelayMs:24,maxDelayMs:120,plannedDurationMs:1800};case Ye:return{minDelayMs:180,maxDelayMs:1400,plannedDurationMs:14e3};case Ke:return{minDelayMs:Math.max(16,Number(a.autoScrubMinDelayMs)||40),maxDelayMs:Math.max(Math.max(16,Number(a.autoScrubMinDelayMs)||40),Number(a.autoScrubMaxDelayMs)||1e3),plannedDurationMs:Math.max(500,Number(a.autoScrubDurationMs)||4e3)};case j:default:return{minDelayMs:60,maxDelayMs:520,plannedDurationMs:6500}}}function ut(e){let t=Ut(),r=t.minDelayMs,n=Math.max(r,t.maxDelayMs),o=Math.max(0,Number(e)||0);return o>n?n:o<r?r:o}function Pr(){let e=Ut();return Math.max(500,e.plannedDurationMs)}function le(e){return e?.thumbnailCount?Math.max(2,Number(e.thumbnailCount)):20}function Cr(e){let t=le(e),r=Math.round(Pr()/Math.max(1,t-1));return ut(r)}function ct(e){let t=le(e);return Math.max(500,Cr(e)*Math.max(1,t-1))}function Ar(e){if(!e?.Trickplay)return null;let t=Object.keys(e.Trickplay).filter(c=>!!e.Trickplay?.[c]);if(!t.length)return null;let r=t.sort((c,h)=>Math.abs(Number(c)-a.trickplayWidth)-Math.abs(Number(h)-a.trickplayWidth))[0],n=e.Trickplay[r],o=Array.isArray(e.MediaSources)?e.MediaSources:[],i=o.map(c=>c?.Id).filter(Boolean),l=Object.keys(n||{}),s=i.find(c=>Object.prototype.hasOwnProperty.call(n,c))||l[0],d=n?.[s];return!d?.Width||!d.TileWidth||!d.TileHeight||!d.ThumbnailCount?null:{itemId:e.Id||"",mediaSourceId:i.includes(s)?s:o[0]?.Id||null,width:Number(r)||d.Width,manifestKey:s,frameWidth:d.Width,frameHeight:d.Height||Math.round(d.Width*9/16),tilesPerRow:d.TileWidth,tilesPerColumn:d.TileHeight,thumbnailCount:d.ThumbnailCount,intervalMs:d.Interval||0,totalFramesPerTile:d.TileWidth*d.TileHeight,type:e.Type}}function Y(e){if(!e)return Promise.resolve(null);if(Pe.has(e))return Pe.get(e);let t=F(),r=Se(t);if(!t||!r)return v("Skipping trickplay fetch because ApiClient or user id is missing.",e),Promise.resolve(null);let n=ae(`Users/${encodeURIComponent(r)}/Items/${encodeURIComponent(e)}`,{Fields:"Trickplay,MediaSources"}).then(o=>{if(!o||!R.has(o.Type||""))return v("Item is unsupported or missing.",{itemId:e,type:o?.Type}),null;let i=Ar(o);return i?(v("Resolved trickplay info.",i),i):(v("No usable trickplay manifest found for item.",{itemId:e,type:o.Type,trickplayKeys:o.Trickplay?Object.keys(o.Trickplay):[]}),null)}).catch(o=>(v("Failed to load trickplay metadata for item.",e,o),null));return Pe.set(e,n),n}function Re(e,t){return Y(e).then(r=>{if(!r)return null;let n=E(Number(t)||0,0,1),o=Ae(r,n),i=Math.floor(o/r.totalFramesPerTile),l=o%r.totalFramesPerTile,s=l%r.tilesPerRow,d=Math.floor(l/r.tilesPerRow),c=I(`Videos/${encodeURIComponent(e)}/Trickplay/${encodeURIComponent(r.width)}/${encodeURIComponent(i)}.jpg`,r.mediaSourceId?{mediaSourceId:r.mediaSourceId}:void 0);return{source:T,info:r,percent:n,frameIndex:o,tileIndex:i,tileUrl:c,frameColumn:s,frameRow:d}})}function Dt(e){if(!e?.info)return;[e.tileIndex-1,e.tileIndex,e.tileIndex+1].filter(r=>{let n=Math.ceil(e.info.thumbnailCount/e.info.totalFramesPerTile)-1;return r>=0&&r<=n}).forEach(r=>{let n=I(`Videos/${encodeURIComponent(e.info.itemId)}/Trickplay/${encodeURIComponent(e.info.width)}/${encodeURIComponent(r)}.jpg`,e.info.mediaSourceId?{mediaSourceId:e.info.mediaSourceId}:void 0);if(!n||st.has(n))return;st.add(n);let o=new Image;o.src=n})}function Nt(e,t,r){let n=b(e);if(!H(e,n)||!t?.tileUrl||!t.info)return;let o=n.rootHost;if(!o||!n.previewFrame)return;let i=o.getBoundingClientRect();if(!i.width||!i.height)return;let l=S,s=i.width/t.info.frameWidth,d=i.height/t.info.frameHeight,c,h;if(l===S){let A=Math.min(s,d);s=A,d=A}else if(l===Z)s=i.width/t.info.frameWidth,d=i.height/t.info.frameHeight;else{let A=Math.max(s,d);s=A,d=A}let p=t.info.frameWidth*s,g=t.info.frameHeight*d,x=p*t.info.tilesPerRow,C=g*t.info.tilesPerColumn;if(l===S)c=-(t.frameColumn*p),h=-(t.frameRow*g);else{let A=(p-i.width)/2,pe=(g-i.height)/2;c=-(t.frameColumn*p+A),h=-(t.frameRow*g+pe)}let O=[t.tileUrl,t.frameColumn,t.frameRow,Math.round(p),Math.round(g),l].join("|");if(n.lastPreviewKey===O){n.progressBar&&(n.progressBar.style.width=`${Math.round((r||0)*100)}%`);return}n.lastPreviewKey=O,n.previewActive=!0,n.activePreviewSource=T,n.currentTrailer=null,n.currentTrickplayInfo=t.info,n.lastRenderedTrickplayFrameIndex=t.frameIndex,n.lastRequestedTrickplayFrameIndex=t.frameIndex,n.lastTrickplayRenderAt=Date.now(),xe(n),n.previewFrame.style.display="",n.previewFrame.style.backgroundImage=`url("${t.tileUrl.replace(/"/g,'\\"')}")`,n.previewFrame.style.backgroundSize=`${x}px ${C}px`,n.previewFrame.style.backgroundPosition=`${c}px ${h}px`,n.previewFrame.style.borderRadius=window.getComputedStyle(o).borderRadius,n.previewFrame.style.left="0",n.previewFrame.style.top="0",n.previewFrame.style.width=`${i.width}px`,n.previewFrame.style.height=`${i.height}px`,n.previewFrame.classList.remove("jmp-contain"),n.previewFrame.style.removeProperty("--jmp-fade-size"),n.previewFrame.style.removeProperty("--jmp-fade-color"),n.previewFrame.style.filter="none",q(n),l===S&&(n.previewFrame.style.left=`${(i.width-p)/2}px`,n.previewFrame.style.top=`${(i.height-g)/2}px`,n.previewFrame.style.width=`${p}px`,n.previewFrame.style.height=`${g}px`,n.previewFrame.style.borderRadius="0",n.previewFrame.classList.add("jmp-contain")),a.showProgressIndicator?Ht(n,r):ie(n),Dt(t)}function se(e,t,r){if(t){if(t.source===y){kt(e,t);return}Nt(e,t,r)}}function Rr(e){return Array.isArray(e)?e:e&&typeof e=="object"&&"Items"in e&&Array.isArray(e.Items)?e.Items:[]}function Ir(e){return e?.Container&&String(e.Container).split(",")[0].trim().toLowerCase()||null}function Vt(e){return new Set(["mp4","m4v","webm","ogg","ogv","mov"]).has(e||"")}function Ft(e){let r=(Array.isArray(e?.MediaStreams)?e.MediaStreams:[]).find(n=>!!n&&(n.Type==="Video"||n.Type===1)&&n.Width&&n.Height);return r?.Width&&r.Height?{width:Number(r.Width),height:Number(r.Height)}:{width:16,height:9}}function _r(e){let t=Math.max(320,Math.min(960,a.trickplayWidth*2)),r=e?.width&&e?.height?e:{width:16,height:9};return{width:t,height:Math.max(180,Math.round(t*r.height/r.width))}}function kr(e,t){let r=Ir(t);return!r||!Vt(r)?null:I(`Videos/${encodeURIComponent(e)}/stream.${encodeURIComponent(r)}`,{Static:"true",mediaSourceId:t?.Id})}function Bt(e,t,r){let n=_r(r);return I(`Videos/${encodeURIComponent(e)}/stream.mp4`,{mediaSourceId:t?.Id,VideoCodec:"h264",AudioCodec:"aac",Width:n.width,Height:n.height})}function Lr(e){if(!e?.Url)return null;let t=Rt(e.Url);if(t)return{provider:"youtube",kind:"iframe",title:e.Name||"Remote Trailer",youtubeId:t,aspectRatio:{width:16,height:9}};try{let r=new URL(e.Url,window.location.origin),n=r.pathname.split(".").pop()?.toLowerCase()||"";if(Vt(n))return{provider:"remote-video",kind:"video",title:e.Name||"Remote Trailer",src:r.toString(),aspectRatio:{width:16,height:9}}}catch(r){v("Failed to parse remote trailer URL.",e.Url,r)}return null}function Or(e){if(!e?.Id)return null;let r=(Array.isArray(e.MediaSources)?e.MediaSources:[]).find(l=>!!Bt(e.Id,l,Ft(l)));if(!r)return null;let n=Ft(r),o=kr(e.Id,r),i=Bt(e.Id,r,n);return{provider:"local-trailer",kind:"video",title:e.Name||"Local Trailer",src:o||i||void 0,fallbackSrc:o&&i&&o!==i?i:null,aspectRatio:n}}function Ur(e){if(!e)return Promise.resolve(null);if(Ce.has(e))return Ce.get(e);let t=F(),r=Se(t);if(!t||!r)return v("Skipping trailer fetch because ApiClient or user id is missing.",e),Promise.resolve(null);let n=ae(`Users/${encodeURIComponent(r)}/Items/${encodeURIComponent(e)}`,{Fields:"LocalTrailerCount,RemoteTrailers"}).then(o=>!o||!R.has(o.Type||"")?null:(Number(o.LocalTrailerCount)>0?ae(`Items/${encodeURIComponent(e)}/LocalTrailers`).then(l=>Rr(l).map(Or).filter(Boolean)).catch(l=>(v("Failed to load local trailers.",e,l),[])):Promise.resolve([])).then(l=>{let s=Array.isArray(o.RemoteTrailers)?o.RemoteTrailers.map(Lr).filter(Boolean):[],d=l.concat(s);if(!d.length)return v("No usable trailer candidates found.",{itemId:e,localTrailerCount:o.LocalTrailerCount||0,remoteTrailerCount:Array.isArray(o.RemoteTrailers)?o.RemoteTrailers.length:0}),null;let c={itemId:e,candidates:d};return v("Resolved trailer candidates.",c),c})).catch(o=>(v("Failed to resolve trailer info for item.",e,o),null));return Ce.set(e,n),n}function Ie(e){return Ur(e).then(t=>{if(!t?.candidates?.length)return null;let r=t.candidates[0];return{source:y,trailer:r,info:{frameWidth:r.aspectRatio.width,frameHeight:r.aspectRatio.height}}})}function Dr(){return he.has(a.previewSource)?a.previewSource:T}function de(e,t){let r=Dr();return r===T?Re(e,t):r===y?Ie(e):r===z?Re(e,t).then(n=>n||Ie(e)):r===J?Ie(e).then(n=>n||Re(e,t)):Promise.resolve(null)}function jt(e,t){let r=e.getBoundingClientRect();return r.width?Math.max(0,Math.min(1,(t.clientX-r.left)/r.width)):0}function Nr(){return a.previewSource===y?gt:a.previewSource===T?yt:a.previewSource===z||a.previewSource===J?We:We}function Hr(e){if(k(e),!a.hoverCountdownEnabled||a.hoverDelayMs<=0)return;let t=window.performance.now();e.hoverCountdownStartedAt=t,e.hoverCountdownDurationMs=a.hoverDelayMs;let r=n=>{if(!e.pointerInside||e.hoverCountdownStartedAt===null){k(e);return}let o=Math.max(0,n-t),i=Math.max(0,a.hoverDelayMs-o);if(_e(e,i,a.hoverDelayMs),i<=0){e.hoverCountdownFrame=null;return}e.hoverCountdownFrame=window.requestAnimationFrame(r)};_e(e,a.hoverDelayMs,a.hoverDelayMs),e.hoverCountdownFrame=window.requestAnimationFrame(r)}function Fr(e,t){let r=M(e);if(!r)return;let n=b(e);n.latestRequestToken+=1;let o=n.latestRequestToken;de(r,t).then(i=>{i&&(!n.previewActive||o!==n.latestRequestToken||se(e,i,t))}).catch(i=>{v("Preview update failed.",r,i)})}function L(e,t){let r=b(e);r.queuedPercent=t;let n=()=>{r.queuedMoveFrame||(r.queuedMoveFrame=window.requestAnimationFrame(()=>{r.queuedMoveFrame=null,r.queuedMoveTimer=null;let s=r.queuedPercent||0;if(r.lastMoveAt=Date.now(),r.currentTrickplayInfo){let d=Ae(r.currentTrickplayInfo,s);if(d===r.lastRequestedTrickplayFrameIndex)return;r.lastRequestedTrickplayFrameIndex=d}Fr(e,s)}))};if(!r.currentTrickplayInfo){n();return}if(Ae(r.currentTrickplayInfo,t)===r.lastRequestedTrickplayFrameIndex)return;let i=a.hoverMode===W?ut(dt(r.currentTrickplayInfo)):dt(r.currentTrickplayInfo),l=Date.now()-(r.lastTrickplayRenderAt||0);if(l>=i){n();return}r.queuedMoveTimer||(r.queuedMoveTimer=window.setTimeout(()=>{n()},Math.max(0,i-l)))}function Le(e,t){if(!a.enabled||t.pointerType!=="mouse"||u.expandedTrailerSession)return;let r=b(e);H(e,r),!r.pointerInside&&(ue(r),r.pointerInside=!0,P(e),ke(r),K(e,"Pointer entered card."),r.hoverTimer=window.setTimeout(()=>{r.hoverTimer=null,r.previewActive=!0,r.hoverCountdownFrame&&(window.cancelAnimationFrame(r.hoverCountdownFrame),r.hoverCountdownFrame=null),_e(r,0,a.hoverDelayMs);let n=M(e);if(!n){k(r);return}let o=a.hoverMode===W?E((Number(a.autoScrubStartPercent)||0)/100,0,1):jt(e,t);de(n,o).then(i=>{if(!r.previewActive||!i){k(r),K(e,"Hover activation found no preview source.",{itemId:n,previewSource:a.previewSource}),r.previewActive&&a.showNoPreviewMessage&&r.pointerInside&&Kt(r,Nr());return}k(r),ke(r),se(e,i,o),i.source!==y&&a.hoverMode===W&&$t(e)}).catch(i=>{k(r),v("Hover activation failed.",n,i)})},a.hoverDelayMs),Hr(r))}function Oe(e,t){if(u.expandedTrailerSession||t.pointerType&&t.pointerType!=="mouse")return;let r=b(e);!r.previewActive||r.activePreviewSource===y||a.hoverMode===W||L(e,jt(e,t))}function Ue(e,t){if(u.expandedTrailerSession||t.pointerType&&t.pointerType!=="mouse")return;let r=b(e);if(r.pointerInside=!1,a.debug){ue(r),r.leaveHoldTimer=window.setTimeout(()=>{r.leaveHoldTimer=null,r.pointerInside||P(e)},fe);return}P(e)}function Wt(e,t){let r=b(e);r.pointerInside=!1,ue(r),K(e,"Reset pointer tracking.",{reason:t||"unknown"}),!(u.expandedTrailerSession&&u.expandedTrailerSession.card===e)&&P(e)}function pt(e,t){u.expandedTrailerSession||b(e).pointerInside||Le(e,{pointerType:"mouse",clientX:t.clientX})}function mt(e,t){u.expandedTrailerSession||Oe(e,{pointerType:"mouse",clientX:t.clientX})}function ft(e){if(u.expandedTrailerSession)return;let t=b(e);!t.pointerInside&&!t.previewActive&&!t.hoverTimer||Ue(e,{pointerType:"mouse"})}function ht(e){if(!e||!M(e)||!R.has(e.getAttribute("data-type")||e.dataset.type||e.dataset.itemtype||""))return;let t=N(e);if(!t){K(e,"Skipping bind because no image host was found.");return}let r=b(e);if(H(e,r),e.getAttribute(V)==="true")return;let n=t;n.addEventListener("pointerenter",o=>{Le(e,o)},{passive:!0}),n.addEventListener("pointermove",o=>{Oe(e,o)},{passive:!0}),n.addEventListener("pointerleave",o=>{Ue(e,o)},{passive:!0}),n.addEventListener("mouseenter",o=>{pt(e,o)},{passive:!0}),n.addEventListener("mousemove",o=>{mt(e,o)},{passive:!0}),n.addEventListener("mouseleave",()=>{ft(e)},{passive:!0}),n.addEventListener("pointercancel",()=>{Wt(e,"pointercancel")},{passive:!0}),n.addEventListener("contextmenu",()=>{Wt(e,"contextmenu")},{passive:!0}),e.setAttribute(V,"true"),K(e,"Bound card.")}function De(e){a.enabled&&ye(e||document).forEach(ht)}function B(e){e?.autoScrubTimer&&(window.clearInterval(e.autoScrubTimer),e.autoScrubTimer=null),e?.autoScrubAnimationFrame&&(window.cancelAnimationFrame(e.autoScrubAnimationFrame),e.autoScrubAnimationFrame=null)}function $t(e){let t=b(e);B(t);let r=M(e);if(r){if(a.autoScrubMode===X||a.autoScrubMode===U){t.autoScrubPercent=E(a.autoScrubStartPercent/100,0,1),t.autoScrubDirection=1,t.autoScrubStartedAt=null,L(e,t.autoScrubPercent),Y(r).then(n=>{if(!t.previewActive||t.activePreviewSource===y)return;let o=ct(n),i=t.autoScrubPercent||0,l=a.autoScrubMode===U;function s(d){if(!t.previewActive){B(t);return}t.autoScrubStartedAt===null&&(t.autoScrubStartedAt=d-i*o);let c=(d-t.autoScrubStartedAt)/o;if(l){let h=c%2;t.autoScrubPercent=h<=1?h:2-h}else t.autoScrubPercent=c%1;L(e,E(t.autoScrubPercent,0,1)),t.autoScrubAnimationFrame=window.requestAnimationFrame(s)}t.autoScrubAnimationFrame=window.requestAnimationFrame(s)}).catch(()=>{let n=ct(null),o=t.autoScrubPercent||0,i=a.autoScrubMode===U;function l(s){if(!t.previewActive){B(t);return}t.autoScrubStartedAt===null&&(t.autoScrubStartedAt=s-o*n);let d=(s-t.autoScrubStartedAt)/n;if(i){let c=d%2;t.autoScrubPercent=c<=1?c:2-c}else t.autoScrubPercent=d%1;L(e,E(t.autoScrubPercent,0,1)),t.autoScrubAnimationFrame=window.requestAnimationFrame(l)}t.autoScrubAnimationFrame=window.requestAnimationFrame(l)});return}t.autoScrubPercent=E((Number(a.autoScrubStartPercent)||0)/100,0,1),L(e,t.autoScrubPercent),Y(r).then(n=>{if(!t.previewActive||t.activePreviewSource===y)return;let o=le(n),i=1/Math.max(1,o-1),l=Math.max(16,Number(a.autoScrubIntervalMs)||220);t.autoScrubTimer=window.setInterval(()=>{if(!t.previewActive){B(t);return}t.autoScrubPercent=(t.autoScrubPercent||0)+i,(t.autoScrubPercent||0)>1&&(t.autoScrubPercent=0),L(e,t.autoScrubPercent||0)},l)}).catch(()=>{let n=le(null),o=1/Math.max(1,n-1),i=Math.max(16,Number(a.autoScrubIntervalMs)||220);t.autoScrubTimer=window.setInterval(()=>{if(!t.previewActive){B(t);return}t.autoScrubPercent=(t.autoScrubPercent||0)+o,(t.autoScrubPercent||0)>1&&(t.autoScrubPercent=0),L(e,t.autoScrubPercent||0)},i)})}}var qt=`.jmp-preview-backdrop {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: none;
  pointer-events: none;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: inherit;
}

.jmp-preview-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  opacity: 1;
  overflow: hidden;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: 0 0;
  border-radius: inherit;
}

.jmp-progress {
  position: absolute;
  right: 8px;
  bottom: 8px;
  left: 8px;
  z-index: 90;
  height: 3px;
  overflow: hidden;
  pointer-events: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.jmp-progress-bar {
  width: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.88);
  transform-origin: left center;
}
`;var Yt=`.jmp-hover-countdown {
  position: absolute;
  z-index: 24;
  display: none;
  width: 34px;
  height: 34px;
  overflow: hidden;
  pointer-events: none;
  border: 0;
  border-radius: 999px;
  background: conic-gradient(
    rgba(255, 255, 255, 0.42) calc(var(--progress, 1) * 1turn),
    rgba(255, 255, 255, 0.08) 0
  );
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}

.jmp-hover-countdown.pos-top-left {
  top: 10px;
  left: 10px;
}

.jmp-hover-countdown.pos-top-right {
  top: 10px;
  right: 10px;
}

.jmp-hover-countdown.pos-bottom-left {
  bottom: 10px;
  left: 10px;
}

.jmp-hover-countdown.pos-bottom-right {
  right: 10px;
  bottom: 10px;
}

.jmp-hover-countdown-label {
  position: absolute;
  inset: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(10, 14, 20, 0.76);
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.jmp-unavailable-message {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 26;
  display: none;
  max-width: calc(100% - 28px);
  padding: 9px 14px;
  pointer-events: none;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  background: rgba(10, 14, 20, 0.76);
  color: rgba(232, 236, 242, 0.84);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  letter-spacing: 0.01em;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
`;var Gt=`.jmp-trailer-layer {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: none;
  overflow: hidden;
  pointer-events: none;
  background: transparent;
  border-radius: inherit;
}

.jmp-trailer-actions {
  position: absolute;
  z-index: 45;
  display: none;
  pointer-events: none;
}

.jmp-trailer-actions.pos-top-left {
  top: 10px;
  left: 10px;
}

.jmp-trailer-actions.pos-top-right {
  top: 10px;
  right: 10px;
}

.jmp-trailer-actions.pos-bottom-left {
  bottom: 10px;
  left: 10px;
}

.jmp-trailer-actions.pos-bottom-right {
  right: 10px;
  bottom: 10px;
}

.jmp-trailer-expand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  cursor: pointer;
  pointer-events: auto;
  border: 0;
  border-radius: 999px;
  background: rgba(10, 14, 20, 0.76);
  color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: transform 0.18s ease, background 0.18s ease, opacity 0.18s ease;
}

.jmp-trailer-expand:hover {
  transform: scale(1.06);
  background: rgba(22, 28, 38, 0.9);
}

.jmp-trailer-expand .material-icons {
  font-size: 19px;
  line-height: 1;
}

.jmp-trailer-layer.jmp-debug-visible {
  outline: 2px solid rgba(0, 255, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6) inset;
}

.jmp-trailer-media {
  position: absolute;
  z-index: 1;
  display: block;
  visibility: visible;
  pointer-events: none;
  border: 0;
  opacity: 1;
  background: transparent;
}

.jmp-trailer-media.jmp-interactive {
  pointer-events: auto;
}
`;var zt=`.jmp-expanded-trailer-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.24s ease;
}

.jmp-expanded-trailer-overlay.is-open {
  opacity: 1;
  pointer-events: auto;
}

.jmp-expanded-trailer-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(5, 8, 14, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.jmp-expanded-trailer-viewport {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: auto;
  border-radius: 22px;
  background: #000;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  transition:
    left 0.24s ease,
    top 0.24s ease,
    width 0.24s ease,
    height 0.24s ease,
    border-radius 0.24s ease;
}

.jmp-expanded-trailer-media-host {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: auto;
  border-radius: inherit;
}

.jmp-expanded-trailer-shell {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.jmp-expanded-trailer-ui {
  position: absolute;
  top: 20px;
  right: 20px;
  left: 20px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  pointer-events: none;
}

.jmp-expanded-trailer-title {
  display: none;
}

.jmp-expanded-trailer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  cursor: pointer;
  pointer-events: auto;
  border: 0;
  border-radius: 999px;
  background: rgba(10, 14, 20, 0.76);
  color: #fff;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
  transition: transform 0.18s ease, background 0.18s ease;
}

.jmp-expanded-trailer-close:hover {
  transform: scale(1.06);
  background: rgba(22, 28, 38, 0.92);
}

.jmp-expanded-trailer-close .material-icons {
  font-size: 22px;
  line-height: 1;
}
`;var $r=[qt,Yt,Gt,zt].join(`
`);function Jt(){if(document.getElementById(Ve))return;let e=document.createElement("style");e.id=Ve,e.textContent=$r,document.head.appendChild(e)}function H(e,t){let r=N(e);if(!r)return null;let n=r;if(window.getComputedStyle(n).position==="static"&&(n.style.position="relative"),window.getComputedStyle(n).overflow!=="hidden"&&(n.style.overflow="hidden"),t.rootHost=n,!t.previewBackdrop){let o=document.createElement("div");o.className="jmp-preview-backdrop",o.setAttribute("aria-hidden","true"),n.appendChild(o),t.previewBackdrop=o}if(!t.previewFrame){let o=document.createElement("div");o.className="jmp-preview-layer",o.setAttribute("aria-hidden","true"),o.style.display="none",n.appendChild(o),t.previewFrame=o}if(!t.hoverCountdown){let o=document.createElement("div");o.className="jmp-hover-countdown",o.setAttribute("aria-hidden","true"),o.style.display="none",o.style.setProperty("--progress","1");let i=document.createElement("span");i.className="jmp-hover-countdown-label",i.textContent="1",o.appendChild(i),n.appendChild(o),t.hoverCountdown=o,t.hoverCountdownLabel=i}if(!t.unavailableMessage){let o=document.createElement("div");o.className="jmp-unavailable-message",o.setAttribute("aria-hidden","true"),o.style.display="none",n.appendChild(o),t.unavailableMessage=o}if(!t.trailerLayer){let o=document.createElement("div");o.className="jmp-trailer-layer",o.setAttribute("aria-hidden","true"),n.appendChild(o),t.trailerLayer=o}if(!t.trailerActions){let o=document.createElement("div");o.className="jmp-trailer-actions",o.setAttribute("aria-hidden","true"),o.style.display="none";let i=document.createElement("button");i.className="jmp-trailer-expand",i.type="button",i.title="Expand trailer",i.setAttribute("aria-label","Expand trailer"),i.innerHTML='<span class="material-icons" aria-hidden="true">open_in_full</span>',i.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),_t(e)}),i.addEventListener("pointerdown",l=>{l.stopPropagation()}),o.appendChild(i),n.appendChild(o),t.trailerActions=o,t.trailerExpandButton=i}if(Zt(t),Xt(t),!t.progress){let o=document.createElement("div");o.className="jmp-progress",o.setAttribute("aria-hidden","true"),o.style.display="none";let i=document.createElement("div");i.className="jmp-progress-bar",o.appendChild(i),n.appendChild(o),t.progress=o,t.progressBar=i}return t}function q(e){if(!e?.previewBackdrop)return;let t=e.previewBackdrop.style;e.previewBackdrop.style.display="none",e.previewBackdrop.style.background="transparent",t.backdropFilter="none",t.webkitBackdropFilter="none"}function Xt(e){e?.hoverCountdown&&(e.hoverCountdown.classList.remove("pos-top-left","pos-top-right","pos-bottom-left","pos-bottom-right"),e.hoverCountdown.classList.add(`pos-${a.hoverCountdownPosition}`))}function _e(e,t,r){if(!e?.hoverCountdown||!e.hoverCountdownLabel)return;Xt(e);let n=Math.max(1,r),o=Math.max(0,t),i=Math.max(0,Math.min(1,o/n)),l=Math.max(0,Math.ceil(o/1e3));e.hoverCountdown.style.display="block",e.hoverCountdown.style.setProperty("--progress",i.toFixed(4)),e.hoverCountdownLabel.textContent=String(l)}function k(e){e?.hoverCountdownFrame&&(window.cancelAnimationFrame(e.hoverCountdownFrame),e.hoverCountdownFrame=null),!(!e?.hoverCountdown||!e.hoverCountdownLabel)&&(e.hoverCountdownStartedAt=null,e.hoverCountdownDurationMs=0,e.hoverCountdown.style.display="none",e.hoverCountdown.style.setProperty("--progress","1"),e.hoverCountdownLabel.textContent="1")}function Kt(e,t){e?.unavailableMessage&&(e.unavailableMessage.textContent=t,e.unavailableMessage.style.display="block")}function ke(e){e?.unavailableMessage&&(e.unavailableMessage.style.display="none",e.unavailableMessage.textContent="")}function oe(e,t){e?.trailerActions&&(Zt(e),e.trailerActions.style.display=t&&a.trailerExpandButtonEnabled?"block":"none")}function Zt(e){e?.trailerActions&&(e.trailerActions.classList.remove("pos-top-left","pos-top-right","pos-bottom-left","pos-bottom-right"),e.trailerActions.classList.add(`pos-${a.trailerExpandButtonPosition}`))}function Lt(e){if(!e?.previewBackdrop)return;let t=St(),r=!(t.background==="transparent"&&t.backdropFilter==="none"),n=e.previewBackdrop.style;n.display=r?"block":"none",n.background=t.background,n.backdropFilter=t.backdropFilter,n.webkitBackdropFilter=t.webkitBackdropFilter}function at(e,t){e?.trailerLayer&&(e.trailerLayer.style.display=t?"block":"none",e.trailerLayer.style.visibility=t?"visible":"hidden",e.trailerLayer.style.opacity=t?"1":"0")}function lt(e){e?.previewFrame&&(e.previewFrame.style.display="none",e.previewFrame.style.backgroundImage="")}function Ht(e,t){!e?.progress||!e.progressBar||(e.progress.style.display="",e.progressBar.style.width=`${Math.round((t||0)*100)}%`)}function ie(e){e?.progress&&(e.progress.style.display="none")}function Kr(e){e?.queuedMoveTimer&&(window.clearTimeout(e.queuedMoveTimer),e.queuedMoveTimer=null),e?.queuedMoveFrame&&(window.cancelAnimationFrame(e.queuedMoveFrame),e.queuedMoveFrame=null)}function ue(e){e?.leaveHoldTimer&&(window.clearTimeout(e.leaveHoldTimer),e.leaveHoldTimer=null)}function P(e){let t=b(e);t&&(u.expandedTrailerSession&&u.expandedTrailerSession.card===e||(t.hoverTimer&&(window.clearTimeout(t.hoverTimer),t.hoverTimer=null),ue(t),Kr(t),B(t),t.previewActive=!1,t.lastPreviewKey=null,t.activePreviewSource=null,t.queuedPercent=null,t.autoScrubPercent=null,t.currentTrickplayInfo=null,t.lastRequestedTrickplayFrameIndex=null,t.lastRenderedTrickplayFrameIndex=null,t.lastTrickplayRenderAt=0,k(t),ke(t),a.restoreOnLeave&&lt(t),xe(t),q(t),ie(t)))}function Qt(){document.querySelectorAll(`[${te}="true"]`).forEach(e=>{e.remove()}),document.querySelectorAll(`[${V}="true"]`).forEach(e=>{e instanceof HTMLElement&&(P(e),e.removeAttribute(V))})}function er(){if(u.userActivationEventsBound)return;let e=()=>{u.pageHasUserActivation=!0};window.addEventListener("pointerdown",e,{passive:!0,once:!0}),window.addEventListener("keydown",e,{passive:!0,once:!0}),window.addEventListener("click",e,{passive:!0,once:!0}),u.userActivationEventsBound=!0}function Ne(e){return!!(e&&e.tagName==="A"&&typeof e.getAttribute=="function"&&(e.getAttribute("href")||"").includes("#/configurationpage?name="))}function qr(){let e=Array.from(document.querySelectorAll('a[href*="#/configurationpage?name="]')).filter(r=>Ne(r)&&(r.getAttribute("href")||"")!==ee),t=new Set;return e.forEach(r=>{let n=r.parentElement;if(!n)return;Array.from(n.children).filter(i=>Ne(i)).length>=2&&t.add(n)}),Array.from(t)}function Yr(){let e=window.location.hash||"";if(!e)return!1;try{let t=e.charAt(0)==="#"?e.slice(1):e,r=new URL(t,window.location.origin);return r.pathname==="/configurationpage"&&r.searchParams.get("name")===Qe}catch{return e.includes(ee)}}function Gr(){let e=window.location.hash||"";return e==="#/dashboard/plugins"||e.indexOf("#/dashboard/plugins?")===0}function zr(e,t){let r=Array.from(e.children).find(n=>!(n instanceof HTMLElement)||n===t?!1:n.classList.contains("Mui-selected"));return r?Array.from(r.classList).filter(n=>n==="Mui-selected"):[]}function tr(e,t,r){e instanceof HTMLElement&&(t?(e.setAttribute("aria-current","page"),["Mui-selected"].concat(r||[]).forEach(n=>{e.classList.add(n)})):(e.removeAttribute("aria-current"),["Mui-selected"].forEach(n=>{e.classList.remove(n)})))}function Jr(e){Array.from(document.querySelectorAll('a[href="#/plugins"], a[href$="/#/plugins"], a[href="#/dashboard/plugins"], a[href$="/#/dashboard/plugins"]')).forEach(r=>{!(r instanceof HTMLElement)||r.getAttribute(te)==="true"||(e?(r.removeAttribute("aria-current"),["Mui-selected"].forEach(n=>{r.classList.remove(n)})):Gr()&&(r.setAttribute("aria-current","page"),r.classList.add("Mui-selected")))})}function rr(e){e.setAttribute(te,"true"),e.setAttribute("href",ee),e.setAttribute("title","Media Preview"),e.removeAttribute("id");let t=[".navMenuOptionText",".listItemBodyText",".drawerLinkText",".sectionTitleText",".button-text"],r=null;for(let n=0;n<t.length&&(r=e.querySelector(t[n]),!r);n+=1);if(!r){let n=e.querySelectorAll("span");r=n.length?n[n.length-1]:null}r?r.textContent="Media Preview":e.textContent="Media Preview"}function Xr(){let e=Yr(),t=qr();t.length&&t.forEach(r=>{let n=zr(r,null);Jr(e);let o=Array.from(r.children).find(s=>Ne(s)&&(s.getAttribute("href")||"")===ee);if(o){rr(o),tr(o,e,n);return}let i=Array.from(r.children).find(s=>Ne(s));if(!i)return;let l=i.cloneNode(!0);rr(l),tr(l,e,n),r.appendChild(l)})}function G(){u.adminNavRefreshScheduled||(u.adminNavRefreshScheduled=!0,window.requestAnimationFrame(()=>{u.adminNavRefreshScheduled=!1,Xr()}))}function ce(e){u.scanScheduled||(u.scanScheduled=!0,window.requestAnimationFrame(()=>{u.scanScheduled=!1,De(e||document)}))}function He(){u.observer||!document.body||(u.observer=new MutationObserver(e=>{e.forEach(t=>{t.addedNodes.forEach(r=>{r.nodeType===1&&(ce(r),G())})})}),u.observer.observe(document.body,{childList:!0,subtree:!0}))}function nr(){if(u.routeEventsBound)return;let e=()=>{ce(document),G()};window.addEventListener("hashchange",e,{passive:!0}),window.addEventListener("popstate",e,{passive:!0}),document.addEventListener("viewshow",e,{passive:!0}),document.addEventListener("pageshow",e,{passive:!0}),u.routeEventsBound=!0,!u.historyPatched&&window.history&&typeof window.history.pushState=="function"&&(u.historyPatched=!0,["pushState","replaceState"].forEach(t=>{let r=window.history[t];window.history[t]=function(...o){let i=r.apply(this,o);return window.setTimeout(e,0),i}}))}function or(){if(u.delegatedHoverEventsBound)return;let e=l=>{if(l.pointerType&&l.pointerType!=="mouse")return;let s=w(l.target);!s||w(l.relatedTarget)===s||Le(s,l)},t=l=>{if(l.pointerType&&l.pointerType!=="mouse")return;let s=w(l.target);s&&Oe(s,l)},r=l=>{if(l.pointerType&&l.pointerType!=="mouse")return;let s=w(l.target);!s||w(l.relatedTarget)===s||Ue(s,l)},n=l=>{let s=w(l.target);!s||w(l.relatedTarget)===s||pt(s,l)},o=l=>{let s=w(l.target);s&&mt(s,l)},i=l=>{let s=w(l.target);!s||w(l.relatedTarget)===s||ft(s)};document.addEventListener("pointerover",e,!0),document.addEventListener("pointermove",t,!0),document.addEventListener("pointerout",r,!0),document.addEventListener("mouseover",n,!0),document.addEventListener("mousemove",o,!0),document.addEventListener("mouseout",i,!0),u.delegatedHoverEventsBound=!0}function ir(e,t,r){return{config:a,start:e,destroy:t,rebind:r,debugHoldMs:fe,findCandidateCards:ye,getItemIdFromCard:M,getCardImageElement:nt,getTrickplayInfo:Y,getPreviewUrl:de,applyPreview:se,restoreCard:P,bindCard:ht,observePageChanges:He}}function ar(){u.expandedTrailerSession&&_({immediate:!0}),u.observer&&(u.observer.disconnect(),u.observer=null),Qt()}function Fe(){if(wt(),!a.enabled){Ee("Media Preview is disabled by config.");return}if(window.matchMedia&&!window.matchMedia("(hover: hover) and (pointer: fine)").matches){Ee("Skipping media preview because the current device does not advertise precise hover.");return}Jt(),er(),nr(),or(),De(document),G(),He(),Ee("Media Preview initialized.")}function lr(){ce(document)}var sr=ir(Fe,ar,lr);window[bt]=sr;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Fe,{once:!0}):Fe();var Zr=sr;return fr(Qr);})();
//# sourceMappingURL=mediapreview.bundle.js.map
