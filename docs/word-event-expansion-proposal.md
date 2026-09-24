# 动词与形容词扩展提案

状态：首批已实现：push / pull、throw、kick、hide，以及 cold、hungry、thirsty、dirty。其余条目仍为待确认提案。

## 内容已扩充

| 年龄 | 新增练习 | 示例 |
| --- | --- | --- |
| 3–5 岁 | 海底、露营、冰雪各 6 句，共 18 句 | A green turtle. / A red tent. / A little penguin. |
| 6–7 岁 | 同三主题各 6 句，共 18 句 | Make a green turtle swim. / Put an acorn in the box. |
| 8–10 岁 | 同三主题各 6 句，共 18 句 | Make two little green turtles swim. / Give the little walrus a yellow cape. |

当前各小节已改为单名词、另一个名词、数量、颜色、大小加颜色、最后完整句；前两轮中文提问，第三轮中文介绍彩虹换词。旧的丰富例句库保留供后续使用。推荐保持单卡，不增加章节选择步骤。第一次沿用年龄默认主题，同一会话重新开始时轮换其余主题；刷新后重新开始轮换。

新增 12 款独立模型：turtle、octopus、jellyfish、starfish、tent、acorn、pinecone、hedgehog、penguin、seal、walrus、igloo。它们是新创作扩展，不是原 R 线词表的新增来源记录。海豹、海象、企鹅只在想象中的冰雪乐园相遇，不暗示三者生活在同一自然栖息地。

## 动词：建议先做前四项

| 词 | 适龄起点 | 英文例句 | 互动方案 | 实现评估 |
| --- | --- | --- | --- | --- |
| push / pull 推／拉 | 6+ | Push the ball. / Pull the box. | 指定物体沿地面前移或后移；说出角色时角色跟随，保持接触距离 | 中：需要方向与对象配对；辨识度高 |
| throw 扔 | 6+ | Make the penguin throw a ball. | 球从角色身旁沿抛物线飞出、落地回弹；缺球自动补球 | 中：可复用现有接取事件组成传球 |
| kick 踢 | 6+ | Make the robot kick the ball. | 脚边轻点、球滚出；无腿物件以轻倾身体碰球表达 | 中：不依赖每种角色的骨骼 |
| hide 躲藏 | 3+ | Hide the turtle. | 自动出现遮挡盒，物件缩身移到后面；保留一小段探头反馈 | 低至中：主要是位移、遮挡与镜头协调 |
| wake up 醒来 | 3+ | Wake up, penguin! | 清掉睡眠 Z，轻轻抬身、睁眼与小太阳符号 | 低：能和已有 sleep 构成鲜明对照 |
| hug 拥抱 | 3+ | Make the penguin hug the robot. | 两个对象靠近、轻倾、爱心环；缺伙伴补一个熟悉角色 | 中：不强制手臂绑定，避免穿模 |
| pour 倒 | 6+ | Pour water on the flower. | 自动补水壶，倾斜倒水，目标变湿；完成后辅助道具收起 | 中：需水流方向与目标定位 |
| melt 融化 | 8+ | Melt the ice. | 先支持明确冰块道具，压低并变成水洼；原对象可恢复 | 中至高：先限定材质对象，避免所有模型直接塌成一团 |

throw 与现有 get 的接取效果可以组合；无需再做一个重复的 catch 系统。动词缺少必需道具时自动补齐，结束后清理辅助物，保留用户创建的对象。

## 形容词：优先做符号和表面状态

| 词 | 适龄起点 | 英文例句 | 互动方案 | 实现评估 |
| --- | --- | --- | --- | --- |
| cold 冷的 | 3+ | A cold penguin. | 小雪花、轻颤、淡蓝气息，与已有 hot 热气形成对照 | 低；适合首批 |
| hungry 饿的 | 3+ | A hungry hedgehog. | 肚子旁出现食物想象泡泡；已有食物时可触发现有进食 | 低至中；符号先行 |
| thirsty 渴的 | 3+ | A thirsty turtle. | 水滴气泡和轻抿嘴提示；说 sip 时接现有喝水流程 | 低；不自动打断孩子的表达 |
| dirty 脏的 | 3+ | A dirty tent. | 模型表面贴泥点；clean 清除 | 低至中；注意贴面，不能悬空 |
| surprised 惊讶的 | 6+ | A surprised octopus. | 放大眼睛、小圆嘴、短促感叹号 | 低；与现有表情复用 |
| scared 害怕的 | 6+ | A scared penguin. | 小幅缩身、轻颤、汗滴；避免惊吓音和突然冲脸 | 低；儿童语气保持轻松 |
| heavy / light 重的／轻的 | 6+ | A heavy ball. / A light box. | 下落、起跳和移动速度形成对照；轻物有缓慢漂降 | 中；需要与现有 fast/slow/high 的优先级规则 |
| soft / hard 软的／硬的 | 8+ | A soft ball. / A hard box. | 接触时轻压回弹／保持形状，用实际反馈表达 | 中至高；先支持球和盒子，避免复杂动物扭曲 |

首批建议：push/pull、throw、kick、hide，加 cold、hungry、thirsty、dirty。若更偏低龄，也可先把 wake up 与表情类提前。首批已增加识别规则、运行器与“元素之间的行为事件”表；其余项目未接入。
