const SCENERY_BASE_URL = new URL('../assets/generated/scenery/simple/', import.meta.url);

const art = (asset, options) => ({ asset, ...options });

export const STORY_SCENERY = {
  'paper-harbor': {
    narration: '远山在小溪那边，正等着把声音送回来。',
    props: [
      art('far-mountain-range', {
        layer: 'far', x: 52, bottom: 30, width: 'min(54vw, 760px)', opacity: .72,
        mobileWidth: '88vw', mobileBottom: 32,
      }),
      art('story-tree', {
        layer: 'far', x: 12, bottom: 30, width: 'min(11vw, 150px)', opacity: .82,
        mobileX: 11, mobileBottom: 32, mobileWidth: '20vw',
      }),
    ],
  },
  'whisper-slope': {
    narration: '大风吹过草地，一个小小的回声藏在远处。',
    props: [
      art('far-mountain-range', {
        layer: 'far', x: 48, bottom: 30, width: 'min(48vw, 680px)', opacity: .62,
        mobileWidth: '82vw', mobileBottom: 32,
      }),
      art('tree-grove', {
        layer: 'far', x: 83, bottom: 29, width: 'min(20vw, 280px)', opacity: .82,
        mobileX: 82, mobileBottom: 31, mobileWidth: '34vw',
      }),
    ],
  },
  'backward-market': {
    narration: '远处的小屋很安静，木箱里的小信正等着被发现。',
    props: [
      art('moss-cottage', {
        layer: 'far', x: 18, bottom: 29, width: 'min(15vw, 210px)', opacity: .86,
        mobileX: 17, mobileBottom: 31, mobileWidth: '27vw',
      }),
      art('tree-grove', {
        layer: 'far', x: 82, bottom: 29, width: 'min(19vw, 270px)', opacity: .72,
        mobileX: 82, mobileBottom: 31, mobileWidth: '33vw',
      }),
    ],
  },
  'moon-post': {
    narration: '屋顶在地平线后面，月亮把去灯塔的路照亮了。',
    props: [
      art('tiny-village', {
        layer: 'far', x: 48, bottom: 28, width: 'min(35vw, 500px)', opacity: .76,
        mobileWidth: '68vw', mobileBottom: 30,
      }),
      art('crater-moon', {
        layer: 'sky', x: 82, top: 18, width: 'min(9vw, 128px)', opacity: .9,
        mobileX: 83, mobileTop: 22, mobileWidth: '17vw',
      }),
    ],
  },
  'silent-lighthouse': {
    narration: '黑黑的灯塔在远处，窗边站着等我们的月牙小猫。',
    props: [
      art('moss-cottage', {
        layer: 'far', x: 50, bottom: 29, width: 'min(18vw, 255px)', opacity: .78,
        mobileWidth: '33vw', mobileBottom: 31,
      }),
      art('ringed-planet', {
        layer: 'sky', x: 81, top: 18, width: 'min(12vw, 170px)', opacity: .78,
        mobileX: 84, mobileTop: 23, mobileWidth: '22vw',
      }),
    ],
  },
  'page-sea': {
    narration: '灯塔和远山都准备好了，只等大家说出最后一句话。',
    props: [
      art('far-mountain-range', {
        layer: 'far', x: 31, bottom: 29, width: 'min(40vw, 570px)', opacity: .58,
        mobileX: 32, mobileWidth: '70vw', mobileBottom: 31,
      }),
      art('moss-cottage', {
        layer: 'far', x: 83, bottom: 29, width: 'min(16vw, 230px)', opacity: .88,
        mobileX: 84, mobileBottom: 31, mobileWidth: '29vw',
      }),
      art('cloud-bank', {
        layer: 'sky', x: 65, top: 18, width: 'min(22vw, 315px)', opacity: .7,
        mobileX: 62, mobileTop: 23, mobileWidth: '38vw',
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
