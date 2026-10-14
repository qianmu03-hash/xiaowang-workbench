/* 舞蹈学习 · 现在学爵士 — 数据池（每日日期种子轮换，抖音实时热门）
 * DATA_DANCE_BASICS: 爵士基本功（每日轮换 4 个）
 * DATA_DANCE_STYLES: 按风格分类的跟练视频（百老汇/现代/力量/抒情/商业）
 */
window.DATA_DANCE_BASICS = [
  { t: 'Isolation 隔离', d: '头/肩/胸/胯独立运动，爵士基本功核心', kw: '爵士舞 isolation 隔离训练' },
  { t: 'Groove 律动', d: '身体随节奏上下弹动，找跳舞的感觉', kw: '爵士舞 groove 律动练习' },
  { t: 'Bounce 弹动', d: '膝盖韧性弹动，保持轻盈', kw: '爵士舞 bounce 弹动教学' },
  { t: 'Roll 转动', d: '头/胸/胯的连贯圆转', kw: '爵士舞 roll 转动练习' },
  { t: 'Body Wave 波浪', d: '从颈到胯的波浪传导', kw: '爵士舞 body wave 身体波浪' },
  { t: 'Chest Pop 胸震', d: '胸部的爆发式震动', kw: '爵士舞 chest pop 胸震' },
  { t: 'Pas de Bourrée 追步', d: '爵士基础连接步法', kw: '爵士舞 pas de bourree 追步' },
  { t: 'Jazz Square 方块步', d: '前后交叉的四步组合', kw: '爵士舞 jazz square 教学' },
  { t: 'Contract & Release', d: '躯干收缩与释放，力量来源', kw: '爵士舞 contract release' },
  { t: 'Spotting 留头甩头', d: '转圈时固定视线防晕', kw: '爵士舞 spotting 留头甩头' },
  { t: 'Pirouette 平转', d: '单脚支撑连续旋转', kw: '爵士舞 pirouette 平转' },
  { t: 'Leap 大跳', d: '力量与延伸的大跳动作', kw: '爵士舞 leap 大跳' }
];

window.DATA_DANCE_STYLES = {
  broadway: {
    icon: '🎭', name: '百老汇爵士',
    list: [
      { t: '双腿外开站位与手势', d: '经典百老汇体态', kw: '百老汇爵士舞 基本站位' },
      { t: 'Kick Line 踢腿组合', d: '整齐划一的踢腿', kw: '百老汇爵士 kick line' },
      { t: 'Hands 手部造型', d: '夸张的手指与手腕', kw: '百老汇爵士 hand styling' },
      { t: '恰恰步融入', d: '拉丁律动的百老汇感', kw: '百老汇爵士 恰恰步' },
      { t: '《芝加哥》经典片段', d: '名作跟练', kw: '芝加哥 百老汇爵士 舞蹈' },
      { t: '转身接造型 Pose', d: '旋转后定格', kw: '百老汇爵士 转身 pose' }
    ]
  },
  modern: {
    icon: '🌊', name: '现代爵士',
    list: [
      { t: 'Floorwork 地面流动', d: '与地面的接触流动', kw: '现代爵士 floorwork' },
      { t: 'Spine Wave 脊椎波浪', d: '脊柱的连续弯曲', kw: '现代爵士 脊椎波浪' },
      { t: '呼吸带动动作', d: '用呼吸引导肢体', kw: '现代爵士 呼吸练习' },
      { t: 'Fall & Recovery 倒下与恢复', d: '失衡与找回平衡', kw: '现代爵士 fall recovery' },
      { t: 'Modern Improv 即兴', d: '自由表达的身体', kw: '现代爵士 即兴' },
      { t: 'Adagio 慢板组合', d: '舒缓延展的组合', kw: '现代爵士 adagio 组合' }
    ]
  },
  power: {
    icon: '🔥', name: '力量爵士',
    list: [
      { t: 'Hit 爆发力定点', d: '节奏重音上的停顿', kw: '力量爵士 hit 定点' },
      { t: 'Chest Wave 加速', d: '快速胸浪', kw: '力量爵士 chest wave' },
      { t: '快速脚步切换', d: '脚下 clean 的变换', kw: '力量爵士 脚步组合' },
      { t: '手臂力量线条', d: '延伸有力的手臂', kw: '力量爵士 手臂线条' },
      { t: '上镜卡点编舞', d: '热门卡点舞', kw: '力量爵士 卡点编舞' },
      { t: '核心 Isolation', d: '核心收紧的隔离', kw: '力量爵士 核心 isolation' }
    ]
  },
  lyrical: {
    icon: '💝', name: '抒情爵士',
    list: [
      { t: 'Emotion 情感表达', d: '用动作讲故事', kw: '抒情爵士 情感表达' },
      { t: '极致延伸', d: '极致延伸的手脚', kw: '抒情爵士 延伸' },
      { t: 'Glide 滑步', d: '地面流畅滑行', kw: '抒情爵士 glide 滑步' },
      { t: '慢板托举感', d: '被托起的流动', kw: '抒情爵士 慢板组合' },
      { t: '歌词同步编舞', d: '贴合歌词的舞步', kw: '抒情爵士 歌词编舞' },
      { t: '柔美转圈 Turns', d: '轻盈的旋转', kw: '抒情爵士 转圈' }
    ]
  },
  commercial: {
    icon: '✨', name: '商业爵士',
    list: [
      { t: 'K-pop 融合编舞', d: '韩舞感的商业爵士', kw: '商业爵士 kpop 编舞' },
      { t: '镜头感表演', d: '对着镜头的自信', kw: '商业爵士 镜头感' },
      { t: '流行歌编舞 Cover', d: '热门单曲跟跳', kw: '商业爵士 流行歌编舞' },
      { t: 'Sexy Line 性感线条', d: '身体线条的塑造', kw: '商业爵士 sexy line' },
      { t: '快节奏片段', d: '高密度动作', kw: '商业爵士 快节奏' },
      { t: '齐舞齐拍 Unison', d: '整齐的群舞感', kw: '商业爵士 齐舞' }
    ]
  }
};
