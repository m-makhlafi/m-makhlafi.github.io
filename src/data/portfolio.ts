// Skills, projects, shorts and changelog.
import shortsData from "./shorts.json";
import { floors } from "./journey";
// Colors are token names: accent | blue | green | brown

export type Color = "accent" | "blue" | "green" | "brown";

export const racks: { title: string; id: string; units: { name: string; note: string; level: number; color: Color }[] }[] = [
  {
    title: "رف البنية التحتية",
    id: "RACK-A",
    units: [
      { name: "Windows Server", note: "Active Directory، DHCP، DNS، Group Policy", level: 85, color: "blue" },
      { name: "الشبكات", note: "VLANs، Subnetting، Cisco، UniFi، MikroTik", level: 85, color: "blue" },
      { name: "الافتراضية والنسخ الاحتياطي", note: "VMware ESXi، Proxmox، Backup", level: 78, color: "green" },
      { name: "أنظمة المراقبة والدخول", note: "Hikvision، Dahua، Axis، ZKTeco", level: 85, color: "brown" },
      { name: "الأمن", note: "Firewalls، حماية تدفق البيانات", level: 78, color: "accent" },
    ],
  },
  {
    title: "رف هندسة البرمجيات",
    id: "RACK-B",
    units: [
      { name: "JavaScript و Node.js و React", note: "تطبيقات ومواقع Full-Stack", level: 82, color: "accent" },
      { name: "Python", note: "ضمن مشاريع العمل الحر", level: 75, color: "accent" },
      { name: "قواعد البيانات", note: "MySQL، MongoDB، Redis، Indexing", level: 80, color: "blue" },
      { name: "تصميم الأنظمة", note: "Scaling، Microservices، Queues", level: 78, color: "brown" },
      { name: "CI/CD و DevOps", note: "Git، Nginx، Zero-Downtime", level: 76, color: "green" },
    ],
  },
];

// status: "production" = showcase repo, product source is private
//         "building"   = building in public, the repo holds the plan so far
export const projects: {
  path: string; title: string; text: string; tags: string[]; color: Color;
  status: "production" | "building"; href: string; footL: string;
}[] = [
  {
    path: "m-makhlafi/easy-pay", title: "Easy Pay: محفظة رقمية ومدفوعات", color: "green", status: "production",
    text: "أرصدة المستخدمين، ومعاملات تُسجل كلها داخل قاعدة البيانات مع سجل تدقيق، وطبقة موحدة تربط عدة بوابات دفع، وصلاحيات للعملاء والتجار والإدارة.",
    tags: ["Laravel", "PHP", "MySQL", "Queues", "RBAC"], footL: "Laravel API", href: "https://github.com/m-makhlafi/easy-pay",
  },
  {
    path: "m-makhlafi/qurani", title: "Qurani: تطبيق قرآن وأذكار", color: "accent", status: "production",
    text: "تطبيق مصمم ليعمل بسلاسة على الأجهزة الضعيفة، بعدة لغات وبواجهة من اليمين لليسار.",
    tags: ["Flutter", "Dart", "Firebase", "i18n"], footL: "Android", href: "https://github.com/m-makhlafi/qurani",
  },
  {
    path: "m-makhlafi/major-match", title: "Major Match: اختيار التخصص الجامعي", color: "blue", status: "production",
    text: "توصيات بالتخصص الجامعي المناسب بمساعدة الذكاء الاصطناعي: واجهة برمجية بـLaravel، وخدمات ذكاء اصطناعي، وتطبيق Flutter بلغتين.",
    tags: ["Laravel", "Flutter", "AI", "SaaS"], footL: "API + mobile", href: "https://github.com/m-makhlafi/major-match",
  },
  {
    path: "m-makhlafi/migration-alchemy", title: "Migration Alchemy", color: "brown", status: "production",
    text: "أداة تعمل من المتصفح لإدارة ملفات الـmigration في Laravel: تكشف التعارضات، وتعرض خطاً زمنياً للتغييرات، وتصدّر النتائج.",
    tags: ["Laravel", "React", "TypeScript"], footL: "developer tool", href: "https://github.com/m-makhlafi/migration-alchemy",
  },
  {
    path: "m-makhlafi/knowledge-rag-platform", title: "منصة بحث ذكي في المستندات", color: "blue", status: "building",
    text: "بحث في مستندات الشركات بالعربية والإنجليزية يجمع البحث بالكلمات والبحث بالمعنى، ويعطي إجابات مع ذكر مصدرها. منشور حالياً كخطة وتصميم، والكود يُرفع تباعاً.",
    tags: ["RAG", "FastAPI", "pgvector", "Elasticsearch"], footL: "Arabic + English", href: "https://github.com/m-makhlafi/knowledge-rag-platform",
  },
  {
    path: "m-makhlafi/document-vision-intelligence", title: "قراءة المستندات بالذكاء الاصطناعي", color: "accent", status: "building",
    text: "استخراج بيانات منظمة من المستندات العربية والإنجليزية: تعرّف ضوئي على النص، وتحليل لتخطيط الصفحة. منشور حالياً كخطة وتصميم، والكود يُرفع تباعاً.",
    tags: ["OCR", "OpenCV", "PyTorch", "Transformers"], footL: "Arabic + English", href: "https://github.com/m-makhlafi/document-vision-intelligence",
  },
];

export const series = [
  { id: "net", label: "الشبكات والكاميرات", color: "blue" as Color },
  { id: "design", label: "تصميم الأنظمة", color: "accent" as Color },
  { id: "servers", label: "السيرفرات", color: "green" as Color },
  { id: "devops", label: "DevOps", color: "brown" as Color },
];

// A short's video can come from one of two places:
//   { type: "file", src: "videos/x.mp4", poster: "videos/x.jpg" }  → file inside public/videos
//   { type: "youtube", id: "VIDEO_ID" }                           → the ID from youtube.com/shorts/VIDEO_ID
// Without `video` the card shows "قريباً".
// `links` are the published copies on each platform; `lab` links the short to its lab page.
export type Short = {
  id: string; s: string; glyph: string; title: string; dur: string;
  desc: string; points: string[];
  video?: { type: "file"; src: string; poster?: string; thumb?: string } | { type: "youtube"; id: string };
  lab?: { id: string; label: string };
  links?: { youtube?: string; instagram?: string; tiktok?: string };
};

// The list of shorts is generated by Desktop/shorts-studio (node sync.mjs) into shorts.json.
// Platform links are added here once a short is published, keyed by its id, e.g.
//   api: { youtube: "https://youtube.com/shorts/...", tiktok: "https://tiktok.com/@.../video/..." },
const publishedLinks: Record<string, Short["links"]> = {};

export const shorts: Short[] = (shortsData as Short[]).map((v) => ({ ...v, links: publishedLinks[v.id] }));

export const platforms = ["YouTube Shorts", "Instagram Reels", "TikTok"];

// Built from the journey floors (src/data/journey.ts), newest first
export const changelog: { ver: string; title: string; text: string; color: Color }[] = [...floors]
  .map((f, i) => ({ ver: `v${i + 1}.0${f.stamp ? " · " + f.stamp : ""}`, title: f.title, text: `${f.stamp ? "" : f.when + ": "}${f.story}`, color: f.color }))
  .reverse();
