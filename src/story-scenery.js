const SCENERY_BASE_URL = new URL('../assets/generated/scenery/runtime/', import.meta.url);

const art = (asset, options) => ({ asset, ...options });

export const STORY_SCENERY = {
  'paper-harbor': {
    narration: '树叶挡住风，远山只留下小溪的轻响。',
    props: [
      art('far-mountain-range', {
        layer: 'far', x: 51, bottom: 30, width: 'min(67vw, 980px)', opacity: .45,
        mobileWidth: '94vw', mobileBottom: 31,
      }),
      art('cloud-bank', {
        layer: 'sky', x: 73, top: 20, width: 'min(28vw, 420px)', opacity: .48, motion: 'drift',
        mobileX: 72, mobileTop: 24, mobileWidth: '42vw',
      }),
      art('story-tree', {
        layer: 'mid', x: 9.5, bottom: 14, width: 'min(17vw, 230px)', opacity: .76, flip: -1, motion: 'sway',
        mobileX: 14, mobileBottom: 20, mobileWidth: '28vw',
        ariaLabel: '触摸溪边的树', line: '树替我们挡住风了。',
      }),
    ],
  },
  'whisper-slope': {
    narration: '云团越过树梢，草地上的风正把一句话吹远。',
    props: [
      art('far-mountain-range', {
        layer: 'far', x: 50, bottom: 31, width: 'min(68vw, 980px)', opacity: .4,
        mobileWidth: '96vw', mobileBottom: 32,
      }),
      art('cloud-bank', {
        layer: 'sky', x: 24, top: 18, width: 'min(26vw, 390px)', opacity: .42, motion: 'drift',
        mobileX: 20, mobileTop: 25, mobileWidth: '38vw',
      }),
      art('tree-grove', {
        layer: 'mid', x: 84, bottom: 14, width: 'min(31vw, 430px)', opacity: .72, motion: 'sway',
        mobileX: 78, mobileBottom: 21, mobileWidth: '44vw',
        ariaLabel: '触摸草地边的树丛', line: '树梢把风分开了。',
      }),
    ],
  },
  'backward-market': {
    narration: '旧玩具屋的窗亮着，像在等一封迟到的问候。',
    props: [
      art('moss-cottage', {
        layer: 'focus', x: 15, bottom: 17, width: 'min(13vw, 185px)', opacity: .76, motion: 'glow',
        mobileX: 14, mobileBottom: 22, mobileWidth: '25vw',
        ariaLabel: '触摸阁楼里的旧玩具屋', line: '门边有一片小羽毛。',
      }),
    ],
  },
  'moon-post': {
    narration: '月亮照亮小镇屋脊，小鸮还在最高处等那封信。',
    props: [
      art('tiny-village', {
        layer: 'far', x: 50, bottom: 19, width: 'min(42vw, 620px)', opacity: .46,
        mobileWidth: '84vw', mobileBottom: 23,
      }),
      art('cloud-bank', {
        layer: 'sky', x: 21, top: 23, width: 'min(23vw, 340px)', opacity: .26, motion: 'drift',
        mobileX: 18, mobileTop: 28, mobileWidth: '35vw',
      }),
      art('crater-moon', {
        layer: 'sky', x: 79, top: 18, width: 'min(12vw, 170px)', opacity: .78, motion: 'float',
        mobileX: 83, mobileTop: 25, mobileWidth: '21vw',
        ariaLabel: '触摸屋顶上方的月亮', line: '月光落在最高的屋顶。',
      }),
    ],
  },
  'silent-lighthouse': {
    narration: '远处的星球悬在窗外，城堡里却没有一盏灯。',
    props: [
      art('far-mountain-range', {
        layer: 'far', x: 47, bottom: 30, width: 'min(64vw, 940px)', opacity: .34,
        mobileWidth: '94vw', mobileBottom: 32,
      }),
      art('cloud-bank', {
        layer: 'sky', x: 26, top: 22, width: 'min(23vw, 350px)', opacity: .25, motion: 'drift',
        mobileX: 20, mobileTop: 27, mobileWidth: '35vw',
      }),
      art('ringed-planet', {
        layer: 'sky', x: 77, top: 18, width: 'min(15vw, 220px)', opacity: .78, motion: 'float',
        mobileX: 81, mobileTop: 25, mobileWidth: '26vw',
        ariaLabel: '触摸窗外的环形星球', line: '它也在等小猫说完。',
      }),
    ],
  },
  'page-sea': {
    narration: '海边小屋先亮起窗，远山和云都在等灯塔转起来。',
    props: [
      art('far-mountain-range', {
        layer: 'far', x: 34, bottom: 29, width: 'min(49vw, 720px)', opacity: .32,
        mobileX: 35, mobileWidth: '72vw', mobileBottom: 31,
      }),
      art('tiny-village', {
        layer: 'far', x: 14, bottom: 17, width: 'min(27vw, 390px)', opacity: .34,
        mobileX: 10, mobileBottom: 22, mobileWidth: '40vw',
      }),
      art('cloud-bank', {
        layer: 'sky', x: 70, top: 19, width: 'min(30vw, 450px)', opacity: .38, motion: 'drift',
        mobileX: 68, mobileTop: 25, mobileWidth: '46vw',
      }),
      art('moss-cottage', {
        layer: 'focus', x: 84, bottom: 16, width: 'min(14vw, 205px)', opacity: .78, motion: 'glow',
        mobileX: 86, mobileBottom: 22, mobileWidth: '26vw',
        ariaLabel: '触摸灯塔旁亮着窗的小屋', line: '这盏窗灯给回声留着门。',
      }),
    ],
  },
};

const EMPTY_SCENERY = Object.freeze({ narration: '', props: [] });

export function sceneryForScene(scene) {
  return STORY_SCENERY[scene?.id] || EMPTY_SCENERY;
}

export function sceneryAssetUrl(asset) {
  return new URL(`${asset}.webp`, SCENERY_BASE_URL).href;
}

export function preloadSceneScenery(scene) {
  for (const prop of sceneryForScene(scene).props) {
    const image = new Image();
    image.decoding = 'async';
    image.src = sceneryAssetUrl(prop.asset);
  }
}
