(function () {
  const data = window.KG_DATA;
  if (!data) return;

  data.metadata.version = "2.0";
  data.metadata.updated = "2026-06-01";
  data.metadata.description = "扩展版大气污染防治法律法规与标准知识图谱，覆盖法规、标准、污染物、行业、工艺环节、监测方法、区域和监管措施。";

  const existingTypes = new Set(data.types.map((type) => type.id));
  [
    { id: "policy", label: "政策/指南", color: "#b466d9" },
    { id: "method", label: "监测方法", color: "#1f9aa5" },
    { id: "process", label: "排放环节", color: "#8a6a42" },
    { id: "region", label: "区域", color: "#e07a5f" }
  ].forEach((type) => {
    if (!existingTypes.has(type.id)) data.types.push(type);
  });

  const nodes = new Map(data.nodes.map((node) => [node.id, node]));
  const linkKeys = new Set(data.links.map((link) => `${link.source}|${link.relation}|${link.target}`));

  function addNode(node) {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
      data.nodes.push(node);
    }
  }

  function addLink(source, target, relation) {
    if (!nodes.has(source) || !nodes.has(target)) return;
    const key = `${source}|${relation}|${target}`;
    if (!linkKeys.has(key)) {
      linkKeys.add(key);
      data.links.push({ source, target, relation });
    }
  }

  const official = "https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/dqhjbh/";

  [
    { id: "agency-ndrc", label: "国家发展改革委", type: "agency", summary: "宏观经济、产业政策和能源结构调整相关主管部门。" },
    { id: "agency-miit", label: "工业和信息化部", type: "agency", summary: "工业行业管理、绿色制造和重点行业升级改造相关主管部门。" },
    { id: "agency-local-eco", label: "地方生态环境部门", type: "agency", summary: "地方生态环境监管、执法、许可和标准实施部门。" }
  ].forEach(addNode);

  const policies = [
    ["policy-blue-sky", "打赢蓝天保卫战三年行动计划", "2018", "国务院", "提出产业、能源、交通和用地结构调整以及重点区域大气污染综合治理任务。"],
    ["policy-air-action", "大气污染防治行动计划", "2013", "国务院", "提出空气质量改善目标和重点行业治理任务，是大气治理政策体系的重要文件。"],
    ["policy-vocs", "重点行业挥发性有机物综合治理方案", "2019", "生态环境部", "围绕石化、化工、工业涂装、包装印刷、油品储运销等行业部署 VOCs 综合治理。"],
    ["policy-ultra", "重点行业超低排放改造政策", "2014-2025", "生态环境部等", "推动火电、钢铁、水泥等行业开展深度治理和全过程减排。"],
    ["policy-permit-list", "固定污染源排污许可分类管理名录", "2019/2024", "生态环境部", "按照行业和污染物排放特征划分重点管理、简化管理和登记管理。"],
    ["policy-monitor", "排污单位自行监测技术指南体系", "2017-2026", "生态环境部", "规定排污单位自行监测点位、指标、频次和信息记录要求。"],
    ["policy-ozone", "臭氧污染防治攻坚行动方案", "2022", "生态环境部等", "聚焦 VOCs 与 NOx 协同减排，强化夏季臭氧污染防控。"],
    ["policy-heavy-weather", "重污染天气重点行业应急减排措施技术指南", "2019/2020", "生态环境部", "为重点行业绩效分级和应急减排清单编制提供技术依据。"],
    ["policy-carbon-synergy", "减污降碳协同增效实施方案", "2022", "生态环境部等", "强调污染物减排与温室气体控制协同推进。"],
    ["policy-nonroad", "移动源污染防治相关政策", "2018-2026", "生态环境部", "涵盖机动车、非道路移动机械和油品质量监管。"]
  ];
  policies.forEach(([id, label, year, issuer, summary]) => {
    addNode({ id, label, type: "policy", year, issuer, sourceUrl: "https://www.mee.gov.cn/", summary });
    addLink("topic-air", id, "政策支撑");
    addLink("agency-mee", id, "牵头/参与");
  });

  [
    ["law-eia", "环境影响评价法", "2018修正", "全国人民代表大会常务委员会", "规定规划和建设项目环境影响评价制度，是源头预防大气污染的重要法律依据。"],
    ["law-clean", "清洁生产促进法", "2012修正", "全国人民代表大会常务委员会", "推动减少资源消耗和污染物产生，支撑源头减排。"],
    ["law-energy", "节约能源法", "2018修正", "全国人民代表大会常务委员会", "通过节能和能源结构优化间接支撑大气污染物减排。"],
    ["reg-eia-project", "建设项目环境保护管理条例", "2017修订", "国务院", "规定建设项目环境保护设施、验收和监督管理要求。"],
    ["reg-ozone-layer", "消耗臭氧层物质管理条例", "2010", "国务院", "规定消耗臭氧层物质生产、销售、使用和进出口管理。"],
    ["rule-auto-monitor", "污染源自动监控管理办法", "2005", "原国家环境保护总局", "规定污染源自动监控设施建设、运行和监管要求。"],
    ["rule-daily-penalty", "环境保护主管部门实施按日连续处罚办法", "2014", "原环境保护部", "规定按日连续处罚程序，强化环境执法约束。"],
    ["rule-emergency", "突发环境事件应急管理办法", "2015", "原环境保护部", "规定突发环境事件风险控制、应急准备和处置要求。"]
  ].forEach(([id, label, year, issuer, summary]) => {
    addNode({ id, label, type: id.startsWith("law") ? "law" : "regulation", year, issuer, sourceUrl: "https://www.mee.gov.cn/", summary });
    addLink("topic-air", id, id.startsWith("law") ? "相关法律" : "配套制度");
  });

  const pollutants = [
    ["pollutant-tsp", "总悬浮颗粒物", "环境空气与无组织排放监测中常见的颗粒物指标。"],
    ["pollutant-smoke", "烟尘", "燃烧过程和工业炉窑排放控制中的颗粒物形态。"],
    ["pollutant-dust", "粉尘", "物料破碎、输送、装卸和生产过程产生的颗粒物。"],
    ["pollutant-fluoride", "氟化物", "铝工业、玻璃工业和部分无机化工过程关注污染物。"],
    ["pollutant-chlorine", "氯气", "无机化工、氯碱和部分工业过程中的有毒有害气体。"],
    ["pollutant-hcl", "氯化氢", "焚烧、化工和金属表面处理过程常见酸性气体。"],
    ["pollutant-hf", "氟化氢", "玻璃、铝工业和部分含氟工艺排放污染物。"],
    ["pollutant-methanol", "甲醇", "化工、制药和涂料生产中常见 VOCs 组分。"],
    ["pollutant-formaldehyde", "甲醛", "树脂、涂料、胶粘剂和部分工业过程关注污染物。"],
    ["pollutant-toluene", "甲苯", "苯系物组分，常见于涂装、印刷和化工行业。"],
    ["pollutant-xylene", "二甲苯", "苯系物组分，常见于涂装和溶剂使用过程。"],
    ["pollutant-phenol", "酚类", "焦化、化工和制药过程可能涉及的污染物。"],
    ["pollutant-cyanide", "氰化氢", "部分化工和金属处理过程中的高风险污染物。"],
    ["pollutant-as", "砷及其化合物", "有色金属冶炼和燃烧过程关注重金属污染物。"],
    ["pollutant-pb", "铅及其化合物", "有色金属、蓄电池和部分工业炉窑排放控制指标。"],
    ["pollutant-cd", "镉及其化合物", "重金属类污染物，涉及有色金属和废物处置过程。"],
    ["pollutant-cr", "铬及其化合物", "电镀、金属表面处理和部分工业过程关注污染物。"],
    ["pollutant-dioxin", "二噁英类", "焚烧和高温热处理过程重点控制的持久性污染物。"],
    ["pollutant-vapor", "油气", "油品储运销和装卸过程中的挥发性排放。"],
    ["pollutant-trs", "总还原硫", "恶臭污染控制中常见的含硫综合指标。"],
    ["pollutant-black-carbon", "黑碳", "燃烧源颗粒物中的重要组分，与大气环境和气候影响相关。"],
    ["pollutant-co2", "二氧化碳", "减污降碳协同场景下的温室气体关联指标。"],
    ["pollutant-ch4", "甲烷", "油气开采、垃圾填埋和污水处理等场景相关温室气体。"],
    ["pollutant-voc-halogen", "卤代烃", "部分化工、清洗和制冷剂相关行业关注的 VOCs 组分。"],
    ["pollutant-acetone", "丙酮", "涂料、制药和化工过程中常见有机溶剂。"],
    ["pollutant-ethylbenzene", "乙苯", "苯系物组分，常与甲苯、二甲苯协同监测。"],
    ["pollutant-styrene", "苯乙烯", "合成树脂、橡胶和化工过程关注 VOCs 组分。"],
    ["pollutant-aerosol", "二次气溶胶", "由 SO2、NOx、VOCs、NH3 等前体物转化形成的颗粒物。"]
  ];
  pollutants.forEach(([id, label, summary]) => addNode({ id, label, type: "pollutant", summary }));

  const measures = [
    ["measure-ldar", "泄漏检测与修复", "对设备与管线组件开展泄漏检测、记录和修复，是 VOCs 无组织排放控制重要措施。"],
    ["measure-cems", "在线连续监测", "通过 CEMS 对固定源烟气污染物浓度和排放参数进行连续监测。"],
    ["measure-source-list", "污染源清单", "识别排放源、排放环节和污染物种类，为监管和治理提供基础。"],
    ["measure-clean-energy", "清洁能源替代", "以清洁能源或低污染燃料替代高污染燃料，减少 SO2、NOx 和颗粒物排放。"],
    ["measure-end-treatment", "末端治理设施", "通过除尘、脱硫、脱硝、吸附、燃烧等设施降低污染物排放。"],
    ["measure-process-control", "过程控制", "从原辅材料、设备密闭、工艺参数和操作管理等环节减少污染物产生。"],
    ["measure-performance", "绩效分级", "对重点行业企业按治理水平和排放绩效分级，支撑差异化管控。"],
    ["measure-mobile", "移动源监管", "针对机动车和非道路移动机械开展排放检验、编码登记和执法监管。"],
    ["measure-stack", "排气筒规范化", "规范排气筒高度、采样孔、采样平台和排放口标识。"],
    ["measure-ledger", "环境管理台账", "记录排污单位生产、治理、监测和异常情况，支撑许可证执行。"],
    ["measure-hazard-warning", "风险预警", "对有毒有害气体、恶臭和重污染过程开展预警和应急响应。"],
    ["measure-material-substitution", "低 VOCs 原辅材料替代", "推广水性、粉末、高固体分和无溶剂产品，降低源头 VOCs。"],
    ["measure-enclosure", "密闭收集", "对储存、输送、投料、反应和干燥等环节进行密闭并收集废气。"],
    ["measure-activated-carbon", "活性炭吸附", "VOCs 末端治理常见技术，需关注更换频次和运行管理。"],
    ["measure-scr", "选择性催化还原脱硝", "燃煤锅炉和火电机组常用 NOx 治理技术。"],
    ["measure-desulfurization", "烟气脱硫", "燃煤和工业炉窑 SO2 控制的典型末端治理技术。"],
    ["measure-bag-filter", "袋式除尘", "颗粒物末端治理常用技术。"],
    ["measure-oil-gas-recovery", "油气回收", "油品储运销和装卸环节 VOCs 控制技术。"]
  ];
  measures.forEach(([id, label, summary]) => addNode({ id, label, type: "measure", summary }));

  const limits = [
    ["limit-hour", "小时平均浓度限值", "环境空气质量评价中的短时浓度限值。"],
    ["limit-day", "日均浓度限值", "环境空气质量评价中的日平均浓度限值。"],
    ["limit-year", "年均浓度限值", "环境空气质量评价中的年平均浓度限值。"],
    ["limit-fugitive-point", "厂区内监控点浓度", "VOCs 无组织排放控制中常用厂区内监控点指标。"],
    ["limit-stack", "排气筒排放浓度", "固定污染源有组织排放控制常用指标。"],
    ["limit-smoke-blackness", "烟气黑度", "锅炉和炉窑烟气可见污染控制指标。"],
    ["limit-total-amount", "许可排放量", "排污许可证中可载明的污染物排放总量指标。"],
    ["limit-removal", "处理效率", "治理设施去除污染物的效率要求。"],
    ["limit-leak", "泄漏认定浓度", "LDAR 管理中用于判断设备泄漏的浓度阈值。"]
  ];
  limits.forEach(([id, label, summary]) => addNode({ id, label, type: "limit", summary }));

  const processes = [
    ["process-combustion", "燃烧排放", "锅炉、火电和工业炉窑燃烧过程产生的废气排放。"],
    ["process-material", "物料储存", "粉状、液态或含 VOCs 物料储罐、仓库和堆场排放。"],
    ["process-transfer", "物料转移输送", "装卸、输送、泵送和转运过程产生的逸散排放。"],
    ["process-reaction", "生产反应过程", "化工、制药和合成树脂等行业反应过程废气。"],
    ["process-coating", "涂装/涂布", "涂料、油墨、胶粘剂和工业涂装过程 VOCs 排放。"],
    ["process-drying", "干燥固化", "烘干、固化和热处理过程产生的 VOCs 或烟气。"],
    ["process-crushing", "破碎筛分", "矿物、建材和冶金行业颗粒物产生环节。"],
    ["process-sintering", "烧结球团", "钢铁行业烧结、球团过程废气排放环节。"],
    ["process-coking", "焦炉烟气", "炼焦化学工业焦炉和化产回收过程排放。"],
    ["process-furnace", "工业炉窑", "冶金、建材、玻璃等行业高温炉窑排放。"],
    ["process-waste-incineration", "焚烧处置", "生活垃圾、危险废物和固废焚烧过程排放。"],
    ["process-oil-storage", "油品储运销", "油库、加油站和装车过程油气挥发排放。"],
    ["process-catering", "餐饮烹饪", "餐饮单位烹饪过程油烟排放。"],
    ["process-leak", "设备与管线泄漏", "阀门、法兰、泵、压缩机等组件泄漏排放。"],
    ["process-stack-discharge", "有组织排放口", "经排气筒集中排放的废气出口。"],
    ["process-fugitive", "无组织逸散", "未通过排气筒排放的逸散、泄漏和开放面排放。"],
    ["process-transport", "移动源排放", "机动车、非道路移动机械和运输环节排放。"]
  ];
  processes.forEach(([id, label, summary]) => addNode({ id, label, type: "process", summary }));

  const industries = [
    ["industry-steel", "钢铁工业", "烧结、球团、炼铁、炼钢和轧钢等过程废气排放量大。"],
    ["industry-cement", "水泥工业", "熟料煅烧和粉磨转运过程涉及颗粒物、NOx 和 SO2。"],
    ["industry-coking", "炼焦化学工业", "焦炉烟气、化产回收和装煤推焦过程污染物复杂。"],
    ["industry-petro-refining", "石油炼制工业", "涉及加热炉烟气、储罐、装卸和 VOCs 排放。"],
    ["industry-petrochemical", "石油化学工业", "反应、分离、储运和设备泄漏环节 VOCs 排放突出。"],
    ["industry-resin", "合成树脂工业", "聚合、干燥和储运环节涉及 VOCs 与颗粒物。"],
    ["industry-pesticide", "农药制造工业", "反应、干燥、溶剂使用和恶臭排放控制要求高。"],
    ["industry-printing", "包装印刷工业", "油墨、稀释剂和清洗剂使用导致 VOCs 排放。"],
    ["industry-auto-coating", "汽车制造涂装", "涂装、烘干和调漆过程 VOCs 排放集中。"],
    ["industry-furniture", "家具制造", "涂装、胶粘和干燥环节涉及 VOCs 排放。"],
    ["industry-electronics", "电子工业", "清洗、涂覆和焊接过程可能涉及 VOCs 和酸性气体。"],
    ["industry-glass", "平板玻璃工业", "玻璃熔窑烟气涉及颗粒物、SO2、NOx 和氟化物。"],
    ["industry-ceramic", "陶瓷工业", "喷雾干燥、烧成和粉料处理过程排放颗粒物和酸性气体。"],
    ["industry-brick", "砖瓦工业", "焙烧窑炉和原料破碎过程产生烟气和颗粒物。"],
    ["industry-nonferrous", "有色金属冶炼", "涉及颗粒物、SO2、重金属和酸性气体排放。"],
    ["industry-aluminum", "铝工业", "电解铝和氧化铝过程涉及氟化物、颗粒物和 SO2。"],
    ["industry-copper", "铜镍钴工业", "冶炼烟气中 SO2、颗粒物和重金属控制要求高。"],
    ["industry-lead-zinc", "铅锌工业", "铅、锌冶炼过程涉及颗粒物和重金属污染物。"],
    ["industry-battery", "电池工业", "铅蓄电池等生产过程关注铅及其化合物和酸雾。"],
    ["industry-electroplating", "电镀工业", "酸雾、铬酸雾和重金属污染物控制要求突出。"],
    ["industry-rubber", "橡胶制品工业", "炼胶、硫化和压延过程涉及 VOCs、恶臭和颗粒物。"],
    ["industry-synthetic-leather", "合成革与人造革", "涂布、干燥和溶剂回收过程涉及 VOCs。"],
    ["industry-mineral-wool", "矿物棉工业", "熔化、成纤、固化和切割过程涉及颗粒物和 VOCs。"],
    ["industry-foundry", "铸造工业", "熔炼、浇注、造型和清理过程产生颗粒物和 VOCs。"],
    ["industry-waste-incineration", "垃圾焚烧", "焚烧烟气涉及颗粒物、酸性气体、NOx、重金属和二噁英。"],
    ["industry-hazard-waste", "危险废物焚烧", "污染物种类复杂，对烟气净化和在线监测要求高。"],
    ["industry-gas-station", "加油站", "油气回收和储油、卸油、加油环节 VOCs 控制场景。"],
    ["industry-oil-gas", "陆上石油天然气开采", "集输、储运和处理过程可能涉及 VOCs 与甲烷排放。"],
    ["industry-ship", "船舶与港口机械", "移动源和港口作业排放治理场景。"],
    ["industry-nonroad", "非道路移动机械", "工程机械、农业机械等移动源排放场景。"],
    ["industry-dry-cleaning", "干洗行业", "溶剂使用和回收过程涉及 VOCs。"],
    ["industry-lab", "实验室废气", "高校和科研实验室酸雾、VOCs 和有毒有害气体控制场景。"]
  ];
  industries.forEach(([id, label, summary]) => addNode({ id, label, type: "industry", summary }));

  const methods = [
    ["method-hj75", "HJ 75 固定污染源烟气 CEMS 技术规范", "用于固定污染源烟气连续监测系统安装、调试、联网和验收。"],
    ["method-hj76", "HJ 76 烟气 CEMS 技术要求及检测方法", "规定烟气连续监测系统的性能指标和检测方法。"],
    ["method-hj397", "HJ/T 397 固定源废气监测技术规范", "指导固定污染源废气采样、监测和质量控制。"],
    ["method-hj819", "HJ 819 排污单位自行监测技术指南 总则", "规定排污单位自行监测方案、点位、指标、频次和信息公开要求。"],
    ["method-hj942", "排污许可证申请与核发技术规范 总则", "用于排污许可证申请、核发和许可排放量核算的通用技术规范。"],
    ["method-vocs-sampling", "VOCs 采样与分析方法", "用于挥发性有机物采样、保存和实验室分析。"],
    ["method-nmhc", "非甲烷总烃监测方法", "用于固定源和环境空气中非甲烷总烃测定。"],
    ["method-odor", "恶臭污染物监测方法", "用于臭气浓度和典型恶臭污染物测定。"],
    ["method-pm", "颗粒物采样测定方法", "用于固定源烟气颗粒物采样和浓度测定。"],
    ["method-so2", "二氧化硫监测方法", "用于固定源和环境空气中 SO2 测定。"],
    ["method-nox", "氮氧化物监测方法", "用于固定源和环境空气中 NOx/NO2 测定。"],
    ["method-o3", "臭氧监测方法", "用于环境空气臭氧浓度监测。"],
    ["method-heavy-metal", "重金属监测方法", "用于汞、铅、镉、铬、砷等重金属污染物测定。"],
    ["method-dioxin", "二噁英类监测方法", "用于焚烧和热处理过程二噁英类污染物测定。"],
    ["method-ldar", "LDAR 检测技术方法", "用于阀门、法兰、泵、压缩机等组件泄漏检测。"],
    ["method-air-quality", "环境空气自动监测方法", "用于 PM2.5、PM10、SO2、NO2、O3、CO 等环境空气指标监测。"]
  ];
  methods.forEach(([id, label, summary]) => addNode({ id, label, type: "method", summary }));

  const standards = [
    ["std-gb4915", "GB 4915-2013 水泥工业大气污染物排放标准", "GB 4915-2013", "2013", "industry-cement", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-fluoride"], ["process-combustion", "process-crushing", "process-stack-discharge"]],
    ["std-gb28662", "GB 28662-2012 钢铁烧结、球团工业大气污染物排放标准", "GB 28662-2012", "2012", "industry-steel", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-dioxin"], ["process-sintering", "process-stack-discharge"]],
    ["std-gb28663", "GB 28663-2012 炼铁工业大气污染物排放标准", "GB 28663-2012", "2012", "industry-steel", ["pollutant-pm", "pollutant-so2", "pollutant-nox"], ["process-furnace", "process-stack-discharge"]],
    ["std-gb28664", "GB 28664-2012 炼钢工业大气污染物排放标准", "GB 28664-2012", "2012", "industry-steel", ["pollutant-pm", "pollutant-fluoride"], ["process-furnace", "process-stack-discharge"]],
    ["std-gb28665", "GB 28665-2012 轧钢工业大气污染物排放标准", "GB 28665-2012", "2012", "industry-steel", ["pollutant-pm", "pollutant-so2", "pollutant-nox"], ["process-furnace", "process-stack-discharge"]],
    ["std-gb16171", "GB 16171-2012 炼焦化学工业污染物排放标准", "GB 16171-2012", "2012", "industry-coking", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-benzene", "pollutant-phenol", "pollutant-cyanide"], ["process-coking", "process-fugitive"]],
    ["std-gb31570", "GB 31570-2015 石油炼制工业污染物排放标准", "GB 31570-2015", "2015", "industry-petro-refining", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-vocs", "pollutant-benzene"], ["process-combustion", "process-material", "process-leak"]],
    ["std-gb31571", "GB 31571-2015 石油化学工业污染物排放标准", "GB 31571-2015", "2015", "industry-petrochemical", ["pollutant-vocs", "pollutant-nmhc", "pollutant-benzene", "pollutant-toluene", "pollutant-xylene"], ["process-reaction", "process-material", "process-leak"]],
    ["std-gb31572", "GB 31572-2015 合成树脂工业污染物排放标准", "GB 31572-2015", "2015", "industry-resin", ["pollutant-vocs", "pollutant-nmhc", "pollutant-styrene", "pollutant-pm"], ["process-reaction", "process-drying", "process-transfer"]],
    ["std-gb39727", "GB 39727-2020 农药制造工业大气污染物排放标准", "GB 39727-2020", "2020", "industry-pesticide", ["pollutant-vocs", "pollutant-nmhc", "pollutant-hcl", "pollutant-odor"], ["process-reaction", "process-drying", "process-fugitive"]],
    ["std-gb39728", "GB 39728-2020 陆上石油天然气开采工业大气污染物排放标准", "GB 39728-2020", "2020", "industry-oil-gas", ["pollutant-vocs", "pollutant-vapor", "pollutant-ch4"], ["process-oil-storage", "process-leak"]],
    ["std-gb39726", "GB 39726-2020 铸造工业大气污染物排放标准", "GB 39726-2020", "2020", "industry-foundry", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-vocs"], ["process-furnace", "process-crushing", "process-coating"]],
    ["std-gb41616", "GB 41616-2022 印刷工业大气污染物排放标准", "GB 41616-2022", "2022", "industry-printing", ["pollutant-vocs", "pollutant-nmhc", "pollutant-benzene", "pollutant-toluene", "pollutant-xylene"], ["process-coating", "process-drying", "process-fugitive"]],
    ["std-gb41617", "GB 41617-2022 矿物棉工业大气污染物排放标准", "GB 41617-2022", "2022", "industry-mineral-wool", ["pollutant-pm", "pollutant-vocs", "pollutant-formaldehyde"], ["process-furnace", "process-drying"]],
    ["std-gb26453", "GB 26453 平板玻璃工业大气污染物排放标准", "GB 26453", "2011/2022", "industry-glass", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-fluoride"], ["process-furnace", "process-stack-discharge"]],
    ["std-gb25464", "GB 25464 陶瓷工业污染物排放标准", "GB 25464", "2010", "industry-ceramic", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-fluoride"], ["process-furnace", "process-crushing"]],
    ["std-gb29620", "GB 29620 砖瓦工业大气污染物排放标准", "GB 29620", "2013", "industry-brick", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-fluoride"], ["process-furnace", "process-crushing"]],
    ["std-gb9078", "GB 9078-1996 工业炉窑大气污染物排放标准", "GB 9078-1996", "1996", "industry-general", ["pollutant-smoke", "pollutant-pm", "pollutant-so2", "pollutant-smoke-blackness"], ["process-furnace", "process-stack-discharge"]],
    ["std-gb25465", "GB 25465 铝工业污染物排放标准", "GB 25465", "2010", "industry-aluminum", ["pollutant-pm", "pollutant-so2", "pollutant-fluoride", "pollutant-hf"], ["process-furnace", "process-stack-discharge"]],
    ["std-gb25466", "GB 25466 铅、锌工业污染物排放标准", "GB 25466", "2010", "industry-lead-zinc", ["pollutant-pm", "pollutant-so2", "pollutant-pb", "pollutant-cd", "pollutant-as"], ["process-furnace", "process-stack-discharge"]],
    ["std-gb25467", "GB 25467 铜、镍、钴工业污染物排放标准", "GB 25467", "2010", "industry-copper", ["pollutant-pm", "pollutant-so2", "pollutant-as", "pollutant-pb"], ["process-furnace", "process-stack-discharge"]],
    ["std-gb30484", "GB 30484 电池工业污染物排放标准", "GB 30484", "2013", "industry-battery", ["pollutant-pm", "pollutant-pb", "pollutant-cd"], ["process-reaction", "process-stack-discharge"]],
    ["std-gb21900", "GB 21900 电镀污染物排放标准", "GB 21900", "2008", "industry-electroplating", ["pollutant-chlorine", "pollutant-hcl", "pollutant-cr", "pollutant-cyanide"], ["process-reaction", "process-fugitive"]],
    ["std-gb27632", "GB 27632 橡胶制品工业污染物排放标准", "GB 27632", "2011", "industry-rubber", ["pollutant-vocs", "pollutant-nmhc", "pollutant-odor", "pollutant-pm"], ["process-reaction", "process-drying"]],
    ["std-gb21902", "GB 21902 合成革与人造革工业污染物排放标准", "GB 21902", "2008", "industry-synthetic-leather", ["pollutant-vocs", "pollutant-nmhc", "pollutant-dmf"], ["process-coating", "process-drying"]],
    ["std-gb18485", "GB 18485 生活垃圾焚烧污染控制标准", "GB 18485", "2014", "industry-waste-incineration", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-hcl", "pollutant-hg", "pollutant-dioxin"], ["process-waste-incineration", "process-stack-discharge"]],
    ["std-gb18484", "GB 18484 危险废物焚烧污染控制标准", "GB 18484", "2020", "industry-hazard-waste", ["pollutant-pm", "pollutant-so2", "pollutant-nox", "pollutant-hcl", "pollutant-hg", "pollutant-dioxin"], ["process-waste-incineration", "process-stack-discharge"]],
    ["std-gb20952", "GB 20952 加油站大气污染物排放标准", "GB 20952", "2020", "industry-gas-station", ["pollutant-vocs", "pollutant-vapor", "pollutant-nmhc"], ["process-oil-storage", "process-transfer"]],
    ["std-gb20950", "GB 20950 储油库大气污染物排放标准", "GB 20950", "2020", "industry-petro-refining", ["pollutant-vocs", "pollutant-vapor", "pollutant-nmhc"], ["process-oil-storage", "process-transfer"]],
    ["std-gb20951", "GB 20951 油品运输大气污染物排放标准", "GB 20951", "2020", "industry-oil-gas", ["pollutant-vocs", "pollutant-vapor"], ["process-oil-storage", "process-transfer"]],
    ["std-gb17691", "GB 17691 重型柴油车污染物排放限值及测量方法", "GB 17691", "2018", "industry-ship", ["pollutant-pm", "pollutant-nox", "pollutant-co", "pollutant-black-carbon"], ["process-transport"]],
    ["std-gb20891", "GB 20891 非道路移动机械排放标准", "GB 20891", "2014/2020", "industry-nonroad", ["pollutant-pm", "pollutant-nox", "pollutant-co"], ["process-transport"]],
    ["std-hj1093", "HJ 1093 蓄热燃烧法工业有机废气治理工程技术规范", "HJ 1093", "2020", "industry-general", ["pollutant-vocs", "pollutant-nmhc"], ["process-stack-discharge"]],
    ["std-hj2026", "HJ 2026 吸附法工业有机废气治理工程技术规范", "HJ 2026", "2013", "industry-general", ["pollutant-vocs", "pollutant-nmhc"], ["process-stack-discharge"]],
    ["std-hj2027", "HJ 2027 催化燃烧法工业有机废气治理工程技术规范", "HJ 2027", "2013", "industry-general", ["pollutant-vocs", "pollutant-nmhc"], ["process-stack-discharge"]]
  ];

  standards.forEach(([id, label, code, year, industryId, pollutantIds, processIds]) => {
    addNode({
      id,
      label,
      type: "standard",
      code,
      year,
      issuer: "生态环境部、国家市场监督管理总局等",
      sourceUrl: official,
      summary: `${label}用于对应行业或工艺环节的大气污染物排放控制，关联适用范围、污染物项目、排放限值和监测管理要求。`
    });
    addLink("rule-standard", id, "管理");
    addLink("agency-mee", id, "组织制定");
    addLink(id, industryId, "适用于");
    addLink(id, "limit-concentration", "规定");
    addLink(id, "limit-stack", "规定");
    pollutantIds.forEach((pollutantId) => addLink(id, pollutantId, "控制"));
    processIds.forEach((processId) => addLink(id, processId, "覆盖环节"));
    addLink(industryId, "measure-end-treatment", "治理需求");
    addLink(industryId, "measure-monitor", "监管");
  });

  addNode({ id: "pollutant-dmf", label: "二甲基甲酰胺", type: "pollutant", summary: "合成革、人造革和部分化工过程常见溶剂类 VOCs 组分。" });
  addLink("std-gb21902", "pollutant-dmf", "控制");
  addLink("std-gb9078", "limit-smoke-blackness", "规定");

  [
    ["std-gb37822", ["measure-ldar", "measure-enclosure", "measure-activated-carbon", "measure-material-substitution"], ["process-leak", "process-material", "process-transfer", "process-fugitive"]],
    ["std-gb13223", ["measure-scr", "measure-desulfurization", "measure-bag-filter", "measure-cems"], ["process-combustion", "process-stack-discharge"]],
    ["std-gb13271", ["measure-scr", "measure-desulfurization", "measure-bag-filter", "measure-cems"], ["process-combustion", "process-stack-discharge"]],
    ["std-gb18483", ["measure-end-treatment", "measure-monitor"], ["process-catering"]],
    ["std-gb14554", ["measure-hazard-warning", "measure-monitor"], ["process-fugitive"]]
  ].forEach(([stdId, measureIds, processIds]) => {
    measureIds.forEach((measureId) => addLink(stdId, measureId, "治理支撑"));
    processIds.forEach((processId) => addLink(stdId, processId, "覆盖环节"));
  });

  [
    ["method-hj75", "measure-cems"], ["method-hj76", "measure-cems"], ["method-hj397", "measure-monitor"], ["method-hj819", "measure-monitor"],
    ["method-hj942", "measure-permit"], ["method-vocs-sampling", "pollutant-vocs"], ["method-nmhc", "pollutant-nmhc"], ["method-odor", "pollutant-odor"],
    ["method-pm", "pollutant-pm"], ["method-so2", "pollutant-so2"], ["method-nox", "pollutant-nox"], ["method-o3", "pollutant-o3"],
    ["method-heavy-metal", "pollutant-hg"], ["method-dioxin", "pollutant-dioxin"], ["method-ldar", "measure-ldar"], ["method-air-quality", "std-gb3095"]
  ].forEach(([methodId, targetId]) => addLink(methodId, targetId, "监测支撑"));

  [
    ["policy-vocs", "measure-ldar"], ["policy-vocs", "measure-material-substitution"], ["policy-vocs", "measure-enclosure"],
    ["policy-ultra", "measure-ultra"], ["policy-ultra", "measure-scr"], ["policy-ultra", "measure-desulfurization"], ["policy-ultra", "measure-bag-filter"],
    ["policy-monitor", "method-hj819"], ["policy-permit-list", "measure-permit"], ["policy-heavy-weather", "measure-performance"],
    ["policy-ozone", "pollutant-vocs"], ["policy-ozone", "pollutant-nox"], ["policy-ozone", "pollutant-o3"], ["policy-carbon-synergy", "pollutant-co2"]
  ].forEach(([source, target]) => addLink(source, target, "提出/关联"));

  [
    ["pollutant-so2", "pollutant-aerosol"], ["pollutant-nox", "pollutant-aerosol"], ["pollutant-vocs", "pollutant-aerosol"],
    ["pollutant-nh3", "pollutant-aerosol"], ["pollutant-pm25", "pollutant-aerosol"], ["pollutant-vocs", "pollutant-o3"],
    ["pollutant-nox", "pollutant-o3"], ["pollutant-vocs", "pollutant-nmhc"], ["pollutant-benzene", "pollutant-vocs"],
    ["pollutant-toluene", "pollutant-vocs"], ["pollutant-xylene", "pollutant-vocs"], ["pollutant-ethylbenzene", "pollutant-vocs"]
  ].forEach(([source, target]) => addLink(source, target, "关联转化"));

  const regions = "北京 天津 河北 山西 内蒙古 辽宁 吉林 黑龙江 上海 江苏 浙江 安徽 福建 江西 山东 河南 湖北 湖南 广东 广西 海南 重庆 四川 贵州 云南 西藏 陕西 甘肃 青海 宁夏 新疆".split(" ");
  regions.forEach((name, index) => {
    const id = `region-${index + 1}`;
    addNode({ id, label: name, type: "region", summary: `${name}是大气污染防治区域治理、地方标准或联防联控中的空间对象。` });
    addLink("measure-joint", id, "联防联控区域");
    addLink("agency-local-eco", id, "属地监管");
  });

  data.routes = {
    ...data.routes,
    steel: ["topic-air", "policy-ultra", "industry-steel", "std-gb28662", "pollutant-pm", "pollutant-so2", "pollutant-nox", "measure-performance"],
    ozone: ["topic-air", "policy-ozone", "pollutant-vocs", "pollutant-nox", "pollutant-o3", "pollutant-aerosol", "measure-material-substitution"],
    cems: ["topic-air", "measure-cems", "method-hj75", "method-hj76", "std-gb13223", "pollutant-so2", "pollutant-nox", "pollutant-pm"],
    incineration: ["topic-air", "industry-waste-incineration", "std-gb18485", "pollutant-dioxin", "pollutant-hcl", "pollutant-hg", "measure-cems"]
  };

  data.metadata.stats = {
    nodes: data.nodes.length,
    links: data.links.length
  };
})();
