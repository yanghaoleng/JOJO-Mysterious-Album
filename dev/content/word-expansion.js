// Expansion adventures reuse existing events; proposed new verbs are not enabled here.
export function createExpansionCurriculum(row) {
  return {
    ocean: {
      early: [
        row("A green turtle.", "green turtle", "先说颜色，再说海龟，请它来到海底。", "a + 颜色 + 动物。"),
        row("A pink octopus.", "pink octopus", "补上章鱼的英文，再读完整句子。", "octopus 是章鱼；触腕帮你记住它。"),
        row("Two blue jellyfish.", "two blue jellyfish", "把数量、颜色和水母连起来。", "jellyfish 的常用复数仍是 jellyfish。"),
        row("A little starfish.", "little starfish", "海星可以是什么颜色、多大？", "用大小描述海洋朋友。", ["A red starfish.", "A big turtle."]),
        row("Turtle, swim!", "turtle swim", "请一个海洋朋友游一游。", "叫出动物，再给它一个动作。", ["Octopus, swim!", "Jellyfish, swim!"]),
        row("A happy octopus.", "happy octopus", "给海底朋友一个心情。", "心情词放在动物前面。", ["A sleepy turtle.", "A funny starfish."]),
      ],
      middle: [
        row("Make a green turtle swim.", "green turtle swim", "用一句话请海龟开始游泳。", "颜色 + 动物 + 动作。"),
        row("Make the pink octopus spin.", "pink octopus spin", "补上旋转，让章鱼表演。", "Make the … + 动作。"),
        row("Make two little jellyfish.", "two little jellyfish", "补齐大小和水母，邀请两位朋友。", "two 后的 jellyfish 不必加 s。"),
        row("Put a starfish beside the shell.", "starfish shell", "把海星放在贝壳旁边，也可以换别的朋友。", "beside 表示在旁边。", ["Put a turtle beside the shell.", "Put a shell beside the octopus."]),
        row("Make the happy turtle dance.", "happy turtle dance", "为海洋朋友选个心情和动作。", "心情与动作可以一起描述。", ["Make the sleepy octopus swim.", "Make the funny starfish spin."]),
        row("Make a giant jellyfish grow.", "giant jellyfish grow", "导演海底的最后一场魔法。", "大小与变化可以自由组合。", ["Make a tiny turtle fly.", "Make a blue octopus dance."]),
      ],
      older: [
        row("Make two little green turtles swim.", "two little green turtles swim", "说清数量、大小、颜色与动作。", "数量 + 大小 + 颜色 + 复数名词。"),
        row("Make the purple octopus dance.", "purple octopus dance", "给章鱼换一个动作。", "用 the 指出故事里的对象。"),
        row("Put a blue starfish beside the shell.", "blue starfish shell", "补上两位海底邻居。", "beside 连接两个对象。"),
        row("Make three pink jellyfish spin.", "three pink jellyfish spin", "安排一组海洋朋友表演。", "jellyfish 单复数可以同形。", ["Make two green turtles swim.", "Make three little starfish dance."]),
        row("Make the sleepy turtle grow and dance.", "sleepy turtle grow dance", "让海底朋友发生两种变化。", "and 连接动作。", ["Make the happy octopus swim and spin.", "Make the tiny starfish grow and dance."]),
        row("Make a giant octopus with a tiny starfish.", "giant octopus tiny starfish", "用两种大小设计你自己的海底故事。", "with 增加另一个对象。", ["Make a blue turtle with a red shell.", "Make a pink jellyfish with a green octopus."]),
      ],
    },
    camp: {
      early: [
        row("A red tent.", "red tent", "一词一词搭起第一顶帐篷。", "a + 颜色 + 物品。"),
        row("A little hedgehog.", "little hedgehog", "补上刺猬，请它来做客。", "little 表示小小的。"),
        row("Two brown acorns.", "two brown acorns", "说出数量、颜色和橡子。", "two acorns：两颗橡子。"),
        row("A big pinecone.", "big pinecone", "松果可以大一点、小一点，也可以换颜色。", "用大小或颜色描述物品。", ["A little pinecone.", "A green tent."]),
        row("Hedgehog, walk!", "hedgehog walk", "带露营的小客人动起来。", "动物名 + 动作。", ["Hedgehog, jump!", "Hedgehog, dance!"]),
        row("A happy hedgehog.", "happy hedgehog", "想想你的露营朋友是什么心情。", "用心情词描述角色。", ["A sleepy hedgehog.", "A funny tree."]),
      ],
      middle: [
        row("Put an acorn in the box.", "acorn box", "把第一颗橡子收进盒子。", "acorn 以元音音素开头，前面用 an。"),
        row("Make the little hedgehog walk.", "little hedgehog walk", "请刺猬去露营，补上动作。", "Make the … walk：让它走。"),
        row("Put a pinecone beside the tent.", "pinecone tent", "补上松果与帐篷，布置营地。", "beside 表示在旁边。"),
        row("Make a big yellow tent.", "big yellow tent", "设计你自己的帐篷。", "大小放在颜色前。", ["Make a little blue tent.", "Make a giant red pinecone."]),
        row("Make two brown acorns spin.", "two brown acorns spin", "让收集到的橡子表演。", "数量 + 颜色 + 复数名词。", ["Make three green pinecones spin.", "Make two happy hedgehogs dance."]),
        row("Make the sleepy hedgehog sleep.", "sleepy hedgehog sleep", "营地安静下来了，你想让谁做什么？", "sleepy 描述状态，sleep 表示动作。", ["Make the happy hedgehog jump.", "Make the tiny tent grow."]),
      ],
      older: [
        row("Put two brown acorns in the box.", "two brown acorns box", "描述数量、颜色和位置，收好露营发现。", "数量 + 颜色 + 名词，再加 in。"),
        row("Make the little hedgehog walk slowly.", "little hedgehog walk slowly", "补上慢慢走，带朋友参观。", "slowly 表示慢慢地。"),
        row("Put a red tent beside the tree.", "red tent tree", "补齐颜色与营地的大树。", "用 beside 描述营地布局。"),
        row("Make three little pinecones spin.", "three little pinecones spin", "用数量和大小安排森林小表演。", "three pinecones 使用复数。", ["Make two big acorns spin.", "Make three happy hedgehogs dance."]),
        row("Give the sleepy hedgehog a blue hat.", "sleepy hedgehog blue hat", "给露营朋友挑一件配饰。", "Give … a …；角色和配饰分别描述。", ["Give the happy hedgehog a red cape.", "Give the little robot a green hat."]),
        row("Make a giant tent with a tiny hedgehog.", "giant tent tiny hedgehog", "用大小对比，设计自己的营地故事。", "with 连接场景里的两个对象。", ["Make a blue tent with a red pinecone.", "Make a little tree with a giant acorn."]),
      ],
    },
    polar: {
      early: [
        row("A little penguin.", "little penguin", "先说大小，再说企鹅，来到冰雪乐园。", "a + 大小 + 动物。"),
        row("A blue igloo.", "blue igloo", "补上冰屋的英文，给朋友一个家。", "igloo 是冰屋。"),
        row("Two happy seals.", "two happy seals", "一起说出两只开心的海豹。", "two 后用 seals。"),
        row("A big walrus.", "big walrus", "长牙的朋友来了，决定它有多大。", "walrus 是海象，seal 是海豹。", ["A little walrus.", "A pink seal."]),
        row("Penguin, jump!", "penguin jump", "请冰雪朋友表演一个动作。", "名字与动作组合成指令。", ["Seal, swim!", "Walrus, dance!"]),
        row("A sleepy penguin.", "sleepy penguin", "给冰雪朋友一种有趣的心情。", "sleepy 表示困困的。", ["A happy walrus.", "A funny seal."]),
      ],
      middle: [
        row("Make the little penguin jump.", "little penguin jump", "用完整句子请企鹅来表演。", "Make the … + 动作。"),
        row("Make the happy seal swim.", "happy seal swim", "补上游泳，让海豹入水。", "swim 是游泳。"),
        row("Put a walrus beside the igloo.", "walrus igloo", "补上两处名词，安排新邻居。", "beside 表示在旁边。"),
        row("Make two blue penguins dance.", "two blue penguins dance", "自己决定舞台上的朋友、数量和颜色。", "two penguins 使用复数。", ["Make three happy seals spin.", "Make two little walruses dance."]),
        row("Give the penguin a red hat.", "penguin red hat", "给冰雪朋友挑一件配饰。", "Give … a … 表示给谁一件物品。", ["Give the seal a blue hat.", "Give the walrus a green cape."]),
        row("Make a giant igloo grow.", "giant igloo grow", "变出一座想象中的冰屋。", "大小与变化组合，物品也能做动作。", ["Make a pink igloo spin.", "Make a tiny penguin fly."]),
      ],
      older: [
        row("Make two little penguins jump high.", "two little penguins jump high", "描述数量、大小与动作方式。", "high 描述跳得高。"),
        row("Make the sleepy walrus walk slowly.", "sleepy walrus walk slowly", "补上慢慢走，照顾困困的朋友。", "形容词描述角色，slowly 描述动作。"),
        row("Put a blue seal beside the igloo.", "blue seal igloo", "补全冰屋旁边的朋友。", "用 beside 描述两个对象的位置。"),
        row("Make three happy penguins dance.", "three happy penguins dance", "导演你自己的冰雪舞会。", "数量与心情可以一起描述角色。", ["Make two little seals swim.", "Make three blue walruses spin."]),
        row("Give the little walrus a yellow cape.", "little walrus yellow cape", "为冰雪乐园设计一位超级英雄。", "分别说明角色和配饰的特征。", ["Give the happy penguin a rainbow hat.", "Give the blue seal a red cape."]),
        row("Make a giant igloo with three tiny penguins.", "giant igloo three tiny penguins", "组合大小、数量和对象，完成自己的冰雪故事。", "with 连接冰屋和一组朋友。", ["Make a pink igloo with a happy walrus.", "Make a little igloo with three blue seals."]),
      ],
    },
  };
}

export const WORD_EXPANSION_CHAPTERS = [
{
  "id": "ocean",
  "world": "reef",
  "title": "海底朋友",
  "subtitle": "认识海洋朋友，导演水下小表演",
  "emoji": "🐙",
  "words": "turtle octopus jellyfish starfish shell green swim little",
  "knowledge": [
    "海洋动物与单复数",
    "数量、大小和颜色",
    "动作与相邻位置"
  ],
  "preview": "rword-turtle"
},
{
  "id": "camp",
  "world": "meadow",
  "title": "森林露营",
  "subtitle": "搭一顶帐篷，请森林朋友来做客",
  "emoji": "⛺",
  "words": "tent acorn pinecone hedgehog tree box brown walk",
  "knowledge": [
    "森林发现与露营物品",
    "a / an 与数量",
    "in / beside 与配饰"
  ],
  "preview": "rword-tent"
},
{
  "id": "polar",
  "world": "word-snowfield",
  "title": "冰雪乐园",
  "subtitle": "和企鹅、海豹一起开一场冰雪派对",
  "emoji": "🐧",
  "words": "penguin seal walrus igloo white blue jump swim",
  "knowledge": [
    "区分企鹅、海豹与海象",
    "大小、心情和动作方式",
    "数量、配饰与场景组合"
  ],
  "preview": "rword-penguin",
  "weather": "snow"
}
];
