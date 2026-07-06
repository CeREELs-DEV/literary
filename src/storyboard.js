// src/storyboard.js
// Ink-sketch storyboard mock scenes, ported verbatim from
// docs/reference/matter-of-perspective-v1.html (mock cells only).
export const INK='#4A4238', PAPER='#F6F1E4', NEON='#39F06B';

/* ============ storyboard frame helpers ============ */
function frame(inner,mode,accentGlow){
  let fx='';
  if(mode==='fpv') fx='<rect width="480" height="270" fill="url(#vg)"/>';
  if(mode==='wide') fx='<rect x="0" y="0" width="480" height="26" fill="#241f2e"/><rect x="0" y="244" width="480" height="26" fill="#241f2e"/>';
  const glow=accentGlow?'<ellipse cx="240" cy="30" rx="260" ry="80" fill="'+accentGlow+'" opacity=".16"/>':'';
  return '<svg viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'
   +'<defs><radialGradient id="vg" cx="0.5" cy="0.5" r="0.72"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#12101a" stop-opacity="0.62"/></radialGradient></defs>'
   +'<rect width="480" height="270" fill="'+PAPER+'"/>'+glow+inner+fx+'</svg>';
}
/* simple ink silhouette person: standing */
function person(x,y,h,extra){ // y = ground line, h = height
  const r=h*0.14, cy=y-h+r;
  return '<g fill="'+INK+'" opacity=".88"><circle cx="'+x+'" cy="'+cy+'" r="'+r+'"/>'
   +'<path d="M'+(x-r*1.1)+' '+y+' Q'+(x-r*1.25)+' '+(cy+r*1.2)+' '+x+' '+(cy+r*1.1)+' Q'+(x+r*1.25)+' '+(cy+r*1.2)+' '+(x+r*1.1)+' '+y+' Z"/>'+(extra||'')+'</g>';
}
/* seated-behind-table torso */
function seated(x,y,h){const r=h*.17,cy=y-h+r;
  return '<g fill="'+INK+'" opacity=".88"><circle cx="'+x+'" cy="'+cy+'" r="'+r+'"/><path d="M'+(x-r*1.5)+' '+y+' Q'+x+' '+(cy+r*.9)+' '+(x+r*1.5)+' '+y+' Z"/></g>';}
function tableSide(x,y,w){return '<g stroke="'+INK+'" stroke-width="5" stroke-linecap="round" fill="none" opacity=".85"><path d="M'+x+' '+y+' h'+w+'"/><path d="M'+(x+14)+' '+y+' l-12 34 M'+(x+w-14)+' '+y+' l12 34"/></g>';}
function speechArcs(x,y,flip){const s=flip?-1:1;return '<g stroke="'+INK+'" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"><path d="M'+x+' '+y+' q'+(8*s)+' -4 '+(6*s)+' -12"/><path d="M'+(x+6*s)+' '+(y+4)+' q'+(12*s)+' -6 '+(10*s)+' -18"/></g>';}
function fpvHand(x,y,flip){const s=flip?-1:1;return '<path d="M'+x+' 270 q'+(-6*s)+' -26 '+(10*s)+' -34 q'+(20*s)+' -8 '+(30*s)+' 6 q'+(8*s)+' 12 '+(2*s)+' 28 z" fill="'+INK+'" opacity=".9"/>';}

/* Snicker bits */
function newsSheet(x,y,w,h,rot){return '<g transform="rotate('+(rot||0)+' '+(x+w/2)+' '+(y+h/2)+')"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="#FFFDF4" stroke="'+INK+'" stroke-width="3"/><path d="M'+(x+w/2)+' '+(y+4)+' v'+(h-8)+'" stroke="'+INK+'" stroke-width="1.6" opacity=".6"/><g stroke="'+INK+'" stroke-width="2" opacity=".55">'+[0,1,2,3].map(i=>'<path d="M'+(x+8)+' '+(y+12+i*10)+' h'+(w/2-16)+' M'+(x+w/2+8)+' '+(y+12+i*10)+' h'+(w/2-16)+'"/>').join('')+'</g></g>';}
function villainGhost(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')" fill="none" stroke="'+INK+'" stroke-width="2.6" stroke-dasharray="6 5" opacity=".55"><path d="M0 -34 q-30 10 -36 78 q36 12 72 0 q-6 -68 -36 -78"/><circle cx="0" cy="-44" r="17"/><path d="M-14 -48 h28"/><path d="M-10 -34 q10 6 20 0 M-10 -34 q-8 1 -11 -4 M10 -34 q8 1 11 -4"/></g>';}
function eyesBig(cx,cy,gap,r,col){return '<g><ellipse cx="'+(cx-gap)+'" cy="'+cy+'" rx="'+(r*1.5)+'" ry="'+r+'" fill="#fff" stroke="'+INK+'" stroke-width="3.5"/><ellipse cx="'+(cx+gap)+'" cy="'+cy+'" rx="'+(r*1.5)+'" ry="'+r+'" fill="#fff" stroke="'+INK+'" stroke-width="3.5"/><circle cx="'+(cx-gap)+'" cy="'+cy+'" r="'+(r*.62)+'" fill="'+col+'"/><circle cx="'+(cx+gap)+'" cy="'+cy+'" r="'+(r*.62)+'" fill="'+col+'"/><circle cx="'+(cx-gap)+'" cy="'+cy+'" r="'+(r*.28)+'" fill="#221"/><circle cx="'+(cx+gap)+'" cy="'+cy+'" r="'+(r*.28)+'" fill="#221"/></g>';}

/* James bits */
function grasshopper(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')" fill="'+INK+'" opacity=".88"><ellipse cx="0" cy="0" rx="34" ry="16"/><circle cx="30" cy="-12" r="10"/><path d="M-6 8 l-16 26 l10 2 M12 8 l-4 30 M-20 -8 q-22 -12 -30 -2" stroke="'+INK+'" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M34 -18 q10 -10 18 -8" stroke="'+INK+'" stroke-width="2.5" fill="none"/></g>';}
function spider(x,y,s){let legs='';for(let i=0;i<4;i++){const a=18+i*16;legs+='<path d="M-10 0 q-26 '+(-14+i*9)+' -44 '+(-26+i*14)+'" /><path d="M10 0 q26 '+(-14+i*9)+' 44 '+(-26+i*14)+'"/>';}
  return '<g transform="translate('+x+' '+y+') scale('+s+')"><g stroke="'+INK+'" stroke-width="4" fill="none" stroke-linecap="round" opacity=".88">'+legs+'</g><ellipse cx="0" cy="4" rx="20" ry="17" fill="'+INK+'" opacity=".92"/><circle cx="0" cy="-16" r="10" fill="'+INK+'" opacity=".92"/></g>';}
function ladybug(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')"><path d="M-26 0 a26 22 0 0 1 52 0 z" fill="#C24438" stroke="'+INK+'" stroke-width="3"/><path d="M0 -22 v22" stroke="'+INK+'" stroke-width="2.5"/><circle cx="-12" cy="-8" r="3.4" fill="'+INK+'"/><circle cx="12" cy="-8" r="3.4" fill="'+INK+'"/><circle cx="-6" cy="-15" r="3" fill="'+INK+'"/><circle cx="7" cy="-16" r="3" fill="'+INK+'"/><circle cx="0" cy="-27" r="7" fill="'+INK+'"/></g>';}
function centipede(x,y,s){let seg='';for(let i=0;i<6;i++){seg+='<circle cx="'+(i*16)+'" cy="'+(i%2?-4:0)+'" r="9"/>';}
  return '<g transform="translate('+x+' '+y+') scale('+s+')" fill="'+INK+'" opacity=".85">'+seg+'<circle cx="-14" cy="0" r="11"/><g stroke="'+INK+'" stroke-width="2.4"><path d="M0 8 l-3 10 M16 6 l-2 10 M32 8 l-3 10 M48 6 l-2 10 M64 8 l-3 10" fill="none"/></g></g>';}
function boyCower(x,y,h){const r=h*.15,cy=y-h+r;return '<g fill="'+INK+'" opacity=".9"><circle cx="'+x+'" cy="'+cy+'" r="'+r+'"/><path d="M'+(x-r*1.3)+' '+y+' Q'+(x-r*.6)+' '+(cy+r)+' '+(x+r*.4)+' '+(cy+r*.8)+' Q'+(x+r*1.4)+' '+(cy+r*1.6)+' '+(x+r*1.1)+' '+y+' Z"/></g>'
  +'<g stroke="'+INK+'" stroke-width="2" fill="none" opacity=".55"><path d="M'+(x-r*2.4)+' '+(cy)+' q-4 5 0 10 M'+(x-r*3)+' '+(cy+6)+' q-4 5 0 10"/></g>';}
function laughArcs(x,y){return '<g stroke="'+INK+'" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"><path d="M'+x+' '+y+' q6 -8 14 -6 M'+(x+4)+' '+(y+10)+' q8 -8 18 -5 M'+(x-2)+' '+(y-10)+' q5 -7 12 -6"/></g>';}
function boot(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')"><path d="M0 0 v-26 h12 v18 h16 q6 4 0 8 z" fill="'+INK+'" opacity=".9"/></g>';}

/* Cuentista bits */
function pine(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')" fill="'+INK+'" opacity=".82"><path d="M0 0 L-20 44 L20 44 Z"/><path d="M0 24 L-26 74 L26 74 Z"/><rect x="-4" y="74" width="8" height="14"/></g>';}
function trunk(x,h){return '<rect x="'+x+'" y="0" width="'+(h||16)+'" height="270" fill="'+INK+'" opacity=".8" rx="4"/>';}
function lightShaft(x,w,col){return '<path d="M'+x+' 0 L'+(x+w)+' 0 L'+(x+w+70)+' 270 L'+(x+70)+' 270 Z" fill="'+col+'" opacity=".2"/>';}
function mantisShip(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')"><ellipse cx="0" cy="0" rx="70" ry="20" fill="'+INK+'" opacity=".9"/><circle cx="62" cy="-16" r="14" fill="'+INK+'" opacity=".9"/><path d="M-30 -8 q-30 -34 -14 -58 M6 -12 q-6 -40 18 -56" stroke="'+INK+'" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/><path d="M-40 16 l-16 34 M-6 20 l-4 36 M30 16 l14 34" stroke="'+INK+'" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/><path d="M56 -28 q6 -10 2 -18 M70 -26 q8 -8 6 -18" stroke="'+INK+'" stroke-width="3" fill="none" opacity=".8"/></g>';}
function comet(x,y){return '<g opacity=".85"><circle cx="'+x+'" cy="'+y+'" r="7" fill="#D6483A"/><path d="M'+x+' '+y+' q-40 -12 -78 -8" stroke="#D6483A" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/><path d="M'+x+' '+(y+4)+' q-30 -4 -56 2" stroke="#EE9E22" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/></g>';}
function nest(x,y,s){return '<g transform="translate('+x+' '+y+') scale('+s+')"><path d="M-22 0 q22 14 44 0 l-4 10 q-18 10 -36 0 z" fill="'+INK+'" opacity=".85"/><circle cx="-8" cy="-5" r="4.5" fill="'+INK+'"/><circle cx="2" cy="-6" r="4.5" fill="'+INK+'"/><circle cx="12" cy="-4" r="4.5" fill="'+INK+'"/><path d="M-10 -9 l2 -4 M0 -10 l2 -4" stroke="'+INK+'" stroke-width="1.6"/></g>';}
function marchLine(x0,y0,x1,y1,n){let out='';for(let i=0;i<n;i++){const t=i/(n-1),x=x0+(x1-x0)*t,y=y0+(y1-y0)*t,h=10+t*16;out+=person(x,y,h);}return out;}

export {frame, person, seated, tableSide, speechArcs, fpvHand, newsSheet, villainGhost, eyesBig, grasshopper, spider, ladybug, centipede, boyCower, laughArcs, boot, pine, trunk, lightShaft, mantisShip, comet, nest, marchLine};
