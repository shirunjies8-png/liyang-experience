export const languages={'zh-CN':'简体中文',en:'English',ja:'日本語',ko:'한국어'};
export const planned=['zh-TW','fr','de','es','ru','it','ar','th','vi','id','pt'];
export const preference='liyang.locale.v1';
export const supported=lang=>Object.hasOwn(languages,lang);
export const direction=lang=>/^ar(?:-|$)/i.test(lang)?'rtl':'ltr';
export const fallbackLanguage='zh-CN';
const lookupTerms={
  lake:['tianmu lake','天目湖','톈무호'],
  bamboo:['bamboo','竹海','죽해','대나무'],
  tea:['white tea','白茶','백차'],
  road:['highway','公路','도로'],
  history:['nuo','儺文化','傩文化','나희'],
  village:['village','農村','乡村','농촌'],
};
export function findVisitorGuide(query,places){
  const normalized=query.normalize('NFKC').trim().toLowerCase();
  if(normalized.length<2||!places)return [];
  return Object.entries(places).filter(([id,[title]])=>title.toLowerCase().includes(normalized)||lookupTerms[id]?.some(term=>normalized.includes(term)));
}
export const matchVoice=(voices,lang)=>voices.find(v=>v.localService&&v.lang.toLowerCase().split(/[-_]/)[0]===lang.toLowerCase().split('-')[0]);
const zh=['语言','首页','地图','探索','导游','我的','国际游客','听这一段','停止朗读','本机没有此语言音色，请阅读下方文字。','景点导览','资料来源','翻译草稿，尚未人工校订。原始资料为中文。','其他页面暂以简体中文显示。','旅行短句','你好，我是小溧。欢迎来到溧阳！','返回首页','全屏','声音设置','暂时无法加载，请重试。','重试','朗读全文'];
export const keys=['language','home','map','explore','guide','passport','visitor','listen','stop','noVoice','guideTitle','source','draft','fallback','phrases','welcome','back','fullscreen','sound','error','retry','listenAll'];
export async function loadLocale(lang){
  if(!supported(lang)||lang===fallbackLanguage)return {ui:Object.fromEntries(keys.map((key,i)=>[key,zh[i]])),places:null};
  const [{ui,places,lakeSections},{homeText},{extraGuides},{cultureCopy}]=await Promise.all([
    import('./visitor-translations.mjs'),import('./visitor-home-copy.mjs'),import('./visitor-guide-copy.mjs'),import('./visitor-culture-copy.mjs')
  ]);
  const headings=lakeSections[lang].map(([heading])=>heading);
  const fullGuide={lake:lakeSections[lang],...Object.fromEntries(Object.entries(extraGuides[lang]).map(([id,lines])=>[id,lines.map((line,i)=>[headings[i],line])]))};
  return {ui:Object.fromEntries(keys.map((key,i)=>[key,ui[lang][i]??zh[i]])),places:places[lang],fullGuide,culture:cultureCopy[lang],text:value=>homeText(lang,value)};
}

export const phrases=[
  ['请问洗手间在哪里？','Where is the restroom?','お手洗いはどこですか。','화장실이 어디예요?'],
  ['请问可以用文字沟通吗？','Could we communicate in writing?','筆談でお願いできますか。','글로 대화할 수 있을까요?'],
  ['请问无台阶入口在哪里？','Where is the step-free entrance?','段差のない入口はどこですか。','계단이 없는 입구는 어디예요?'],
  ['请把地址写给我。','Could you write down the address?','住所を書いていただけますか。','주소를 적어 주시겠어요?'],
  ['请问在哪里办理入住？','Where can I check in?','チェックインはどこでできますか。','어디에서 체크인할 수 있나요?'],
  ['请问这是去车站的方向吗？','Is this the way to the station?','駅はこちらの方向ですか。','이쪽으로 가면 역이 나오나요?'],
  ['请给我看一下菜单。','May I see the menu?','メニューを見せていただけますか。','메뉴를 보여 주시겠어요?'],
];
