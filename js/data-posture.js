/* 体态矫正训练数据 — 直角肩/圆肩驼背/假胯宽/骨盆前倾 */
window.POSTURE_PLANS = [
  {
    id: 'shoulder', name: '直角肩', icon: '💪',
    desc: '改善溜肩、打造平直肩线',
    days: [
      { day: 'Day 1', moves: [
        { name: '靠墙站立', sets: 3, rep: '30秒', note: '后脑勺/肩胛骨/臀部/脚跟贴墙' },
        { name: '肩胛骨后缩', sets: 3, rep: '15次', note: '夹肩胛骨保持3秒' },
        { name: '弹力带面拉', sets: 3, rep: '12次', note: '拉到耳朵两侧' }
      ]},
      { day: 'Day 2', moves: [
        { name: '肩部环绕', sets: 3, rep: '前后各15圈', note: '大圈慢速' },
        { name: '猫牛式', sets: 3, rep: '10次', note: '配合呼吸' },
        { name: '墙壁天使', sets: 3, rep: '12次', note: '手臂贴墙上下滑动' }
      ]},
      { day: 'Day 3', moves: [
        { name: '哑铃侧平举', sets: 3, rep: '12次', note: '轻重量，控制下落' },
        { name: '俯身飞鸟', sets: 3, rep: '12次', note: '肩胛骨后缩' },
        { name: '拉伸斜方肌', sets: 2, rep: '30秒/侧', note: '手压头侧轻拉' }
      ]},
      { day: 'Day 4', moves: [
        { name: '靠墙静蹲', sets: 3, rep: '30秒', note: '肩膀下沉放松' },
        { name: '肩胛骨前伸', sets: 3, rep: '15次', note: '推墙远离' },
        { name: '胸肌拉伸', sets: 2, rep: '30秒/侧', note: '门框辅助' }
      ]},
      { day: 'Day 5', moves: [
        { name: '弹力带外旋', sets: 3, rep: '15次', note: '肘贴身体' },
        { name: 'YTWL训练', sets: 2, rep: '每个8次', note: '俯卧完成' },
        { name: '颈部拉伸', sets: 2, rep: '30秒/侧', note: '四方向' }
      ]},
      { day: 'Day 6', moves: [
        { name: '综合复习', sets: 1, rep: '选3个动作各2组', note: '自由组合' }
      ]},
      { day: 'Day 7', moves: [] }
    ]
  },
  {
    id: 'round_shoulder', name: '圆肩驼背', icon: '🧍',
    desc: '打开胸腔、改善驼背',
    days: [
      { day: 'Day 1', moves: [
        { name: '胸肌拉伸', sets: 3, rep: '30秒/侧', note: '门框辅助，重心前移' },
        { name: '背部反扣拉伸', sets: 3, rep: '30秒/侧', note: '双手背后交扣' },
        { name: 'YTWL训练', sets: 2, rep: '每个10次', note: '俯卧或站姿' }
      ]},
      { day: 'Day 2', moves: [
        { name: '泡沫轴胸椎', sets: 3, rep: '30秒', note: '放在肩胛骨下方' },
        { name: '墙壁天使', sets: 3, rep: '12次', note: '手背贴墙' },
        { name: '猫牛式', sets: 3, rep: '10次', note: '呼吸配合' }
      ]},
      { day: 'Day 3', moves: [
        { name: '弹力带面拉', sets: 3, rep: '15次', note: '肩胛骨后缩' },
        { name: '俯身划船', sets: 3, rep: '12次', note: '背部发力' },
        { name: '扩胸运动', sets: 3, rep: '15次', note: '用力后展' }
      ]},
      { day: 'Day 4', moves: [
        { name: '眼镜蛇式', sets: 3, rep: '10次', note: '手轻推，背部发力' },
        { name: '肩胛骨后缩', sets: 3, rep: '15次', note: '保持3秒' },
        { name: '胸椎旋转', sets: 2, rep: '10次/侧', note: '四足跪姿' }
      ]},
      { day: 'Day 5', moves: [
        { name: '综合复习', sets: 1, rep: '选3个动作各2组', note: '自由组合' }
      ]},
      { day: 'Day 6', moves: [] },
      { day: 'Day 7', moves: [] }
    ]
  },
  {
    id: 'hip', name: '假胯宽', icon: '🦵',
    desc: '收紧臀部、改善胯宽视觉',
    days: [
      { day: 'Day 1', moves: [
        { name: '蚌式开合', sets: 3, rep: '20次/侧', note: '侧卧，膝盖打开' },
        { name: '侧卧抬腿', sets: 3, rep: '15次/侧', note: '脚尖微微内扣' },
        { name: '臀桥', sets: 3, rep: '20次', note: '顶峰保持3秒' }
      ]},
      { day: 'Day 2', moves: [
        { name: '单腿臀桥', sets: 3, rep: '12次/侧', note: '一条腿伸直' },
        { name: '蚌式行走', sets: 3, rep: '15步/侧', note: '弹力带套膝' },
        { name: '跪姿后抬腿', sets: 3, rep: '15次/侧', note: '脚掌朝天' }
      ]},
      { day: 'Day 3', moves: [
        { name: '宽距深蹲', sets: 3, rep: '15次', note: '脚尖外45度' },
        { name: '侧弓步', sets: 3, rep: '12次/侧', note: '臀部后坐' },
        { name: '泡沫轴放松', sets: 2, rep: '60秒/侧', note: '大腿外侧' }
      ]},
      { day: 'Day 4', moves: [
        { name: '综合复习', sets: 1, rep: '选3个动作各2组', note: '自由组合' }
      ]},
      { day: 'Day 5', moves: [] },
      { day: 'Day 6', moves: [] },
      { day: 'Day 7', moves: [] }
    ]
  },
  {
    id: 'pelvic', name: '骨盆前倾', icon: '🧘',
    desc: '改善小腹突出、腰痛',
    days: [
      { day: 'Day 1', moves: [
        { name: '死虫式', sets: 3, rep: '12次/侧', note: '腰部始终贴地' },
        { name: '骨盆后倾练习', sets: 3, rep: '15次', note: '仰卧，腰部压地' },
        { name: '臀桥+骨盆后倾', sets: 3, rep: '15次', note: '顶峰夹臀卷骨盆' }
      ]},
      { day: 'Day 2', moves: [
        { name: '仰卧交替抬腿', sets: 3, rep: '20次/侧', note: '腰部贴地' },
        { name: '平板支撑', sets: 3, rep: '30秒', note: '骨盆后倾位' },
        { name: '髂腰肌拉伸', sets: 3, rep: '30秒/侧', note: '弓步，后腿跪地' }
      ]},
      { day: 'Day 3', moves: [
        { name: '猫牛式', sets: 3, rep: '10次', note: '重点在骨盆前后倾' },
        { name: '臀桥', sets: 3, rep: '20次', note: '顶峰保持3秒' },
        { name: '腹部拉伸', sets: 2, rep: '30秒', note: '俯卧撑起' }
      ]},
      { day: 'Day 4', moves: [
        { name: '综合复习', sets: 1, rep: '选3个动作各2组', note: '自由组合' }
      ]},
      { day: 'Day 5', moves: [] },
      { day: 'Day 6', moves: [] },
      { day: 'Day 7', moves: [] }
    ]
  }
];
