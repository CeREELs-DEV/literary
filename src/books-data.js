// src/books-data.js
//
// Matter of Perspective - three sample books, one structure:
// povs x beats -> cells. A cell with {video, poster} plays a real
// pre-produced film from public/curated/; a cell with
// {svg} renders an ink storyboard mockup (ported from the reference
// design) until its films are produced.
// NOTE: never put generation prompts here - this file ships to students.
import {
  frame, person, seated, tableSide, speechArcs, fpvHand, newsSheet,
  villainGhost, eyesBig, grasshopper, spider, ladybug, centipede,
  boyCower, laughArcs, pine, mantisShip, comet, marchLine,
  INK, PAPER, NEON,
} from './storyboard.js'

const PUBLIC_BASE = import.meta.env?.BASE_URL || './public/'
const asset = (path) => `${PUBLIC_BASE.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`
const pollThumbs = (book, count, ext = 'png') =>
  Array.from({ length: count }, (_, index) => asset(`poll/${book}-${index}.${ext}`))

const BOOK_DEFINITIONS = {
snicker:{
  passage:'The Beedle', book:'A Snicker of Magic', author:'Natalie Lloyd', chap:'Chapter 5',
  setup:'On her first day at a new school, Felicity gets a note from the town\'s secret gift-giver, "the Beedle," asking to meet at a picnic table on the playground.',
  povInfo:'This story is written in <b>first person</b>. Felicity tells it herself, using "I," so the reader sees everything through her thoughts and feelings.',
  think:'How does point of view help us understand characters and themes?',
  poll:{q:'When you meet someone new, what do you notice first?',options:['Face','Hair','Clothes','Body','Vibe'],votes:[34,22,18,9,41],thumbs:pollThumbs('snicker',5),thumbBg:['#FCF5E8','#F6E1BA','#FBE8C0','#F4E4C3','#C19A6A'],thumbFit:['contain','contain','contain','contain','cover']},
  comments:[
    {n:'Maya',t:'the vibe for sure. you just get a feeling before you even really look'},
    {n:'Deon',t:'Felicity noticed his messy blond hair first! it reminded her of a crown'},
    {n:'Priya',t:'i always clock the face first, especially the eyes'},
    {n:'Sam',t:'be honest everyone judges the clothes a little bit 👀'}
  ],
  povs:[{key:'world',label:'Bystander',icon:'frame'},{key:'felicity',label:'Felicity',icon:'eye'},{key:'jonah',label:'The Beedle',icon:'eye'}],
  beats:[{key:'table',n:'Beat 1',label:'The clean table'},{key:'glance',n:'Beat 2',label:'The green glance'}],
  excerpt:`
   <div class="beatblock b1" data-beat="0"><span class="btag">Beat 1 &middot; The clean table</span>
    <p>"Uh &hellip; the Beedle?" I asked. And then I immediately felt stupid for asking, because nothing about this kid looked like a Beedle. I hoped a character called the Beedle would at least have a cape and a mask and a mustache that twirled into curlicues at the edges. I expected a dastardly villain of some sort.</p>
    <p>But the boy sitting at the bird-poopless table looked &hellip; <i>normal</i>. He was reading the newspaper and twirling a red pen in his fingers. He had narrow shoulders and a head full of messy-spiky blond hair that reminded me of a crown. He didn't look at me.</p></div>
   <div class="beatblock b2" data-beat="1"><span class="btag">Beat 2 &middot; The green glance</span>
    <p>"Pumpernickel?" I whispered.</p>
    <p>The boy glanced up then. His eyes were the greenest green I'd ever seen, like somebody had taken a neon marker and colored them in just before I walked up to him and called him a Beedle.</p>
    <p>He sighed. "I can't believe I'm about to do this."</p>
    <p>I glanced around nervously. "Do what?"</p>
    <p>He folded his newspaper and smiled at me. My heart kicked <i>YES!</i> as strong as a mule kick. My heart had never said yes over a smile before.</p>
    <p>He lowered his voice to a whisper. "But I'm the Beedle, too, sometimes, to those who need me. You definitely need the Beedle, Flea. You got time to talk?"</p></div>`,
  cells:{
   'world|table':{video:asset('curated/table-world.mp4'),poster:asset('curated/table-world.jpg'),notes:'The world keeps one table clean, and waits.'},
   'felicity|table':{video:asset('curated/table-felicity.mp4'),poster:asset('curated/table-felicity.jpg'),notes:"He looks so normal - so why can't I stop noticing him?"},
   'jonah|table':{video:asset('curated/table-jonah.mp4'),poster:asset('curated/table-jonah.jpg'),notes:"Don't look up. She's coming closer."},
   'world|glance':{video:asset('curated/glance-world.mp4'),poster:asset('curated/glance-world.jpg'),notes:'When he looks up, the world repaints its greens.'},
   'felicity|glance':{video:asset('curated/glance-felicity.mp4'),poster:asset('curated/glance-felicity.jpg'),notes:"His eyes are the greenest green I've ever seen."},
   'jonah|glance':{video:asset('curated/glance-jonah.mp4'),poster:asset('curated/glance-jonah.jpg'),notes:'She said the word. Now she gets the real me.'}
  }
},
james:{
  passage:'Aren\u2019t you hungry?', book:'James and the Giant Peach', author:'Roald Dahl', chap:'Chapter 11',
  setup:'After climbing inside a giant, magical peach, James comes face to face with the enormous insects who live there.',
  povInfo:'This story is written in <b>third person omniscient</b>. A narrator outside the story tells it using "he" and "James," and can share what different characters are thinking and feeling.',
  think:'How can a different point of view change the meaning of a story?',
  poll:{q:'Which giant insect would scare you the most?',options:['Spider','Grasshopper','Ladybug','Centipede'],votes:[54,15,10,21],thumbs:pollThumbs('james',4),thumbBg:['#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF']},
  comments:[
    {n:'Aisha',t:'the Spider, easy. she LICKED HER LIPS looking at him 😭'},
    {n:'Marcus',t:'a grasshopper as big as a dog?? imagine that thing jumping at you'},
    {n:'Lena',t:'honestly the ladybug seems sweet, i’d sit next to her'},
    {n:'Theo',t:'the centipede just wanted help with his boots lol not scary at all'}
  ],
  povs:[{key:'wide',label:'Bystander',icon:'frame'},{key:'james',label:"James",icon:'eye'},{key:'bugs',label:"The insects",icon:'eye'}],
  beats:[{key:'b1',n:'Beat 1',label:'\u201cI\u2019m hungry!\u201d'},{key:'b2',n:'Beat 2',label:'One of us'}],
  excerpt:`
   <div class="beatblock b1" data-beat="0"><span class="btag">Beat 1 &middot; "I'm hungry!"</span>
    <p>Every one of these "creatures" was at least as big as James himself, and in the strange greenish light that shone down from somewhere in the ceiling, they were absolutely terrifying to behold.</p>
    <p><span class="huntable" data-correct="1">"I'm hungry!" the Spider announced suddenly, staring hard at James</span>.</p>
    <p><span class="huntable" data-correct="1">"<i>I'm</i> famished!" the Old-Green-Grasshopper said.</span> <span class="huntable" data-correct="1">"So am <i>I</i>!" the Ladybug cried.</span> The Centipede sat up a little straighter on the sofa. <span class="huntable" data-correct="1">"<i>Everyone's</i> famished!" he said. "We need food!"</span></p>
    <p><span class="huntable" data-correct="1">Four pairs of round black glassy eyes were all fixed upon James</span>. There was a long pause &mdash; and a long silence.</p>
    <p>The Spider opened her mouth and <span class="huntable" data-correct="1">ran a long black tongue delicately over her lips</span>. "Aren't <i>you</i> hungry?" she asked suddenly, leaning forward and addressing herself to James.</p>
    <p>Poor James was backed up against the far wall, shivering with fright and much too terrified to answer.</p></div>
   <div class="beatblock b2" data-beat="1"><span class="btag">Beat 2 &middot; One of us</span>
    <p>"What's the matter with you?" the Old-Green-Grasshopper asked. "You look positively ill!"</p>
    <p>"He looks as though he's going to faint any second," the Centipede said.</p>
    <p>"Oh, my goodness, the poor thing!" the Ladybug cried. "I do believe he thinks it's <i>him</i> that we are wanting to eat!"</p>
    <p>There was a roar of laughter from all sides. "Oh dear, oh dear!" they said. "What an awful thought!"</p>
    <p>"You mustn't be frightened," the Ladybug said kindly. "We wouldn't <i>dream</i> of hurting you. You are one of <i>us</i> now, didn't you know that? You are one of the crew. We're all in the same boat."</p></div>`,
  cells:{
   'james|b1':{video:asset('curated/james-b1-james.mp4'),poster:asset('curated/james-b1-james.jpg'),notes:"First-person, James. One continuous shot: the room in sickly greenish light \u2014 grasshopper, ladybug, centipede, every one as big as him \u2014 then the Spider leans in, the long black tongue crosses her lips, and \u201chungry\u201d lands like a verdict. Wall at his back.",
    svg:()=>frame(grasshopper(80,150,1)+ladybug(408,150,1.1)+centipede(388,238,.9)+spider(230,160,2.2)+'<path d="M218 184 q12 11 26 1" stroke="#C24438" stroke-width="4.5" fill="none" stroke-linecap="round"/>'+speechArcs(316,124,false),'fpv','#3FA96A')},
   'bugs|b1':{video:asset('curated/james-b1-bugs.mp4'),poster:asset('curated/james-b1-bugs.jpg'),notes:"First-person, the insects. Honest hospitality: everyone's famished and the guest is invited. But the small boy just shivers against the far wall \u2014 why does he look ill?",
    svg:()=>frame(boyCower(240,232,100)+'<text x="196" y="86" font-family="Literata,serif" font-style="italic" font-size="20" fill="'+INK+'" opacity=".85">Aren\u2019t you hungry?</text>'+speechArcs(180,92,true),'fpv','#3FA96A')},
   'wide|b1':{video:asset('curated/james-b1-wide.mp4'),poster:asset('curated/james-b1-wide.jpg'),notes:"Wide shot \u2014 the only view where the joke is visible. The huge creatures lean hungrily from the right; James is flattened against the left wall. One sentence, two opposite meanings, one frame.",
    svg:()=>frame(boyCower(66,228,92)+spider(340,170,1.6)+grasshopper(440,200,.95)+'<path d="M284 150 L120 160" stroke="'+INK+'" stroke-width="2.4" stroke-dasharray="3 7" opacity=".6"/>','wide','#3FA96A')},
   'james|b2':{video:asset('curated/james-b2-james.mp4'),poster:asset('curated/james-b2-james.jpg'),notes:"First-person, James. The room erupts \u2014 but the laughter is warm. The Ladybug comes close and kind: \u201cyou are one of us now.\u201d Fear drains out of the frame; the light warms.",
    svg:()=>frame(ladybug(240,190,2.4)+laughArcs(96,90)+laughArcs(380,100)+laughArcs(330,200),'fpv','#EE9E22')},
   'bugs|b2':{video:asset('curated/james-b2-bugs.mp4'),poster:asset('curated/james-b2-bugs.jpg'),notes:"First-person, the insects. Fond disbelief \u2014 \u201cwhat an awful thought!\u201d The boy unclenches before their eyes: shoulders drop, chin lifts, the first small smile.",
    svg:()=>frame(person(240,236,110)+laughArcs(140,110)+laughArcs(340,110),'fpv','#EE9E22')},
   'wide|b2':{video:asset('curated/james-b2-wide.mp4'),poster:asset('curated/james-b2-wide.jpg'),notes:"Wide shot. The whole room loosens with laughter, and the gap between James and the creatures finally closes \u2014 he steps toward them as the Ladybug's line lands: one of the crew, all in the same boat.",
    svg:()=>frame(person(140,226,88)+'<path d="M162 190 l30 -4" stroke="'+INK+'" stroke-width="2.4" stroke-dasharray="2 5" opacity=".6"/>'+centipede(250,222,1.2)+ladybug(330,206,1.3)+laughArcs(300,110)+laughArcs(180,120)+grasshopper(420,180,.9),'wide','#EE9E22')}
  }
},
cuentista:{
  passage:'Leaving Earth', book:'The Last Cuentista', author:'Donna Barba Higuera', chap:'Chapter 2',
  setup:'A comet is about to destroy Earth. Petra\u2019s family is among the few chosen to leave on a spaceship, and they hike through the forest to reach it with her little brother, Javier.',
  povInfo:'This story is written in <b>first person</b>. Petra tells it herself, using "I," so the reader sees everything through her thoughts and feelings.',
  think:'Why is it important to see a story through different points of view?',
  poll:{q:'The last ships are leaving a dying Earth — but you’d have to leave everyone you love behind. What do you do?',options:['Get on the ship and survive','Stay behind with the people you love','Sabotage the ships so nobody can leave 😈'],votes:[38,44,18],thumbs:pollThumbs('cuentista',3,'jpg')},
  comments:[
    {n:'Camila',t:'i could never leave my family. i’d stay, no question'},
    {n:'Ben',t:'staying just means you die too though. someone has to live and remember them'},
    {n:'Yuki',t:'not gonna lie the sabotage option is kind of iconic 😈 if we go we all go'},
    {n:'Andre',t:'get on the ship. the people who love you would WANT you to live'}
  ],
  povs:[{key:'wide',label:'Bystander',icon:'frame'},{key:'petra',label:"Petra",icon:'eye'},{key:'javier',label:"Javier",icon:'eye'}],
  beats:[{key:'b1',n:'Beat 1',label:'The ship'},{key:'b2',n:'Beat 2',label:'The memory'},{key:'b3',n:'Beat 3',label:'The march'}],
  excerpt:`
   <div class="beatblock b1" data-beat="0"><span class="btag">Beat 1 &middot; The ship</span>
    <p>My little brother, Javier, skids to a stop when we emerge from the camouflage of the cedar canopy to an open field of green. A monstrous ship resembling a stainless-steel-and-crystal praying mantis comes into view.</p>
    <p>"Petra &hellip;?" He clenches my wrist.</p>
    <p>At the opposite end of the field sits an exact replica of our ship. So far away, it looks half the size of the behemoth in front of us. With only two ships left, I know one is already gone. Dad said they lost contact when the final ping came as they approached Alpha Centauri.</p>
    <p>"It's okay." I urge Javier on, even though I want to run back into the forest too.</p></div>
   <div class="beatblock b2" data-beat="1"><span class="btag">Beat 2 &middot; The memory</span>
    <p>I think of Lita and my teachers and my classmates, and I wonder what they're doing right now. I don't want to imagine them being so afraid they'd try to hide from something they can't hide from.</p>
    <p>Instead, I picture Lita and T&iacute;a Berta lying under the red-and-black fringed blanket, drinking coffee with "secret sauce" as they watch the nagual snake come home.</p>
    <p>They'll clink their clay mugs, take a long drink, and lean back shoulder to shoulder against T&iacute;a Berta's one-hundred-year-old pecan tree.</p>
    <p>This is the story my mind will keep of them.</p></div>
   <div class="beatblock b3" data-beat="2"><span class="btag">Beat 3 &middot; The march</span>
    <p>I'm supposed to feel happy my parents were chosen to go to the new planet, Sagan. But I feel like I've been given the last glass of water on Earth and I'm just gulping it down while everyone watches.</p>
    <p>I look up at the comet and wince. I <i>hate you</i>.</p>
    <p>Like ants on an orderly march to our hole, my family and I walk quietly across the grass field with several scientists and one other family with a blond teenager. As we get closer, instead of the cement commercial launch pad I expect, there's just freshly cut grass.</p></div>`,
  cells:{
   'petra|b1':{video:asset('curated/cuentista-p1.mp4'),poster:asset('curated/cuentista-p1.jpg'),notes:"First-person, Petra. The canopy opens and the mantis-ship devours the skyline; its far-off twin looks toy-sized. Javier's small hand clenches her wrist at the frame's edge. Her body says run; her voice says it's okay.",
    svg:()=>frame(mantisShip(280,170,1.5)+mantisShip(440,120,.4)+'<path d="M0 120 Q60 40 150 30 L0 0 Z" fill="'+INK+'" opacity=".8"/>'+fpvHand(60,270,false),'fpv','#6A4CE0')},
   'javier|b1':{video:asset('curated/cuentista-j1.mp4'),poster:asset('curated/cuentista-j1.jpg'),notes:"First-person, Javier. Camera skids to a stop, tilts up at his sister: her face is calm against the blurred monster behind her. If Petra is calm, it must be okay. \u201cPetra\u2026?\u201d",
    svg:()=>frame(mantisShip(240,90,1.1)+'<rect width="480" height="270" fill="'+PAPER+'" opacity=".45"/>'+person(240,270,190,'')+'<text x="70" y="90" font-family="Literata,serif" font-style="italic" font-size="19" fill="'+INK+'" opacity=".85">Petra&hellip;?</text>','fpv','#6A4CE0')},
   'wide|b1':{video:asset('curated/cuentista-1a.mp4'),poster:asset('curated/cuentista-1a.jpg'),notes:"Wide shot. Two small figures frozen at the treeline, dwarfed by the crystal mantis across the field. The scale gap is the whole shot.",
    svg:()=>frame(pine(50,140,.9)+pine(110,150,.7)+person(96,238,54)+person(122,238,38)+mantisShip(340,190,1.3),'wide','#6A4CE0')},
   'petra|b2':{video:asset('curated/cuentista-p2.mp4'),poster:asset('curated/cuentista-p2.jpg'),notes:"First-person, Petra \u2014 but her eyes are somewhere else entirely. The memory she chooses to keep plays warm and whole: Lita and T\u00eda Berta under the red-and-black fringed blanket, clay mugs clinking, shoulder to shoulder against the hundred-year-old pecan tree.",
    svg:()=>frame('<g opacity=".95"><rect x="96" y="40" width="288" height="176" rx="18" fill="#FFFDF4" stroke="'+INK+'" stroke-width="3"/><path d="M120 178 q80 -26 240 0 l0 12 q-160 -22 -240 0 z" fill="#C24438" opacity=".8"/><path d="M126 182 l6 12 M156 178 l4 12 M330 178 l6 12" stroke="'+INK+'" stroke-width="2" opacity=".6"/><circle cx="196" cy="140" r="15" fill="'+INK+'" opacity=".85"/><circle cx="262" cy="140" r="15" fill="'+INK+'" opacity=".85"/><path d="M226 152 l12 -9 M238 143 l-9 -7" stroke="'+INK+'" stroke-width="3.2"/>'+pine(346,58,.65)+'</g>','fpv','#EE9E22')},
   'javier|b2':{video:asset('curated/cuentista-j2.mp4'),poster:asset('curated/cuentista-j2.jpg'),notes:"First-person, Javier. The outside of that same moment: his sister walking beside him gone completely quiet, eyes far away, half a step behind the family. He watches her and keeps hold of her hand.",
    svg:()=>frame('<rect y="220" width="480" height="50" fill="'+INK+'" opacity=".12"/>'+person(140,232,90)+person(178,230,100)+person(300,238,120,'')+'<path d="M282 122 q-8 -4 -8 -12" stroke="'+INK+'" stroke-width="2.4" fill="none" opacity="0"/>'+'<g stroke="'+INK+'" stroke-width="2.6" fill="none" opacity=".55"><circle cx="352" cy="120" r="3"/><circle cx="366" cy="106" r="4.5"/><circle cx="384" cy="88" r="6"/></g>'+fpvHand(410,270,true),'fpv','#EE9E22')},
   'wide|b2':{video:asset('curated/cuentista-2.mp4'),poster:asset('curated/cuentista-2.jpg'),notes:"Wide shot. The family keeps moving across the field, but one figure lags half a step \u2014 and above Petra, faint as breath, the memory floats: two old women, a blanket, a tree. Inner life made visible from outside.",
    svg:()=>frame('<rect y="210" width="480" height="60" fill="'+INK+'" opacity=".08"/>'+marchLine(80,244,300,232,4)+person(348,238,60)+'<g opacity=".55"><circle cx="356" cy="168" r="2.5" fill="'+INK+'"/><circle cx="366" cy="152" r="4" fill="'+INK+'"/><rect x="330" y="70" width="120" height="66" rx="14" fill="#FFFDF4" stroke="'+INK+'" stroke-width="2.4"/><path d="M342 122 q36 -12 96 0 l0 6 q-60 -10 -96 0 z" fill="#C24438" opacity=".8"/><circle cx="372" cy="106" r="7" fill="'+INK+'"/><circle cx="398" cy="106" r="7" fill="'+INK+'"/>'+pine(432,84,.3)+'</g>','wide','#6A4CE0')},
   'petra|b3':{video:asset('curated/cuentista-p3.mp4'),poster:asset('curated/cuentista-p3.jpg'),notes:"First-person, Petra. She looks up: the comet owns the sky, dragging its tail over the treeline. A wince \u2014 the closest the excerpt comes to a scream. I hate you.",
    svg:()=>frame('<g transform="scale(1.6) translate(60 10)">'+comet(240,60)+'</g>'+pine(60,210,.6)+pine(130,220,.45)+mantisShip(380,236,.55)+'<text x="180" y="196" font-family="Literata,serif" font-style="italic" font-size="20" fill="'+INK+'" opacity=".85">I hate you.</text>','fpv','#6A4CE0')},
   'javier|b3':{video:asset('curated/cuentista-j3.mp4'),poster:asset('curated/cuentista-j3.jpg'),notes:"First-person, Javier. Holding tight to his sister's hand (her sleeve at frame edge). Fresh-cut grass underfoot, the other family ahead \u2014 that blond teenager \u2014 and the ramp where a launch pad should be.",
    svg:()=>frame('<rect y="220" width="480" height="50" fill="'+INK+'" opacity=".14"/>'+fpvHand(400,270,true)+person(200,232,84)+person(238,230,96)+person(270,228,64)+mantisShip(150,140,.8),'fpv','#EE9E22')},
   'wide|b3':{video:asset('curated/cuentista-3.mp4'),poster:asset('curated/cuentista-3.jpg'),notes:"Wide shot, high angle \u2014 the text's own image: like ants on an orderly march to their hole, a thin line of figures crossing the freshly cut grass toward the ship, comet overhead.",
    svg:()=>frame('<rect y="150" width="480" height="120" fill="'+INK+'" opacity=".07"/>'+marchLine(40,250,340,200,9)+mantisShip(400,180,1)+comet(90,44),'wide','#6A4CE0')}
  }
},
};

export const BOOKS = {
  snicker: BOOK_DEFINITIONS.snicker,
  cuentista: BOOK_DEFINITIONS.cuentista,
  james: BOOK_DEFINITIONS.james,
};
