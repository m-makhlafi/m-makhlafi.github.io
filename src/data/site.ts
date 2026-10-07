// Everything personal on the site lives here.
// The About section and the changelog are written from Mohammed's own story.

export const site = {
  name: "محمد المخلافي",
  firstName: "محمد",
  handle: "mohammed",
  title: "محمد المخلافي | برمجيات وبنية تحتية",
  description: "مهندس برمجيات ومدير أنظمة: خبرة ميدانية في الشبكات والسيرفرات وأنظمة المراقبة، وهندسة برمجيات وتصميم أنظمة قابلة للتوسع.",
  heroIp: "10.0.0.12",
  // Hero lines are taken from his story (About paragraph 3 and the Sama Taxi chapter).
  hero: {
    lead: "أفكر كمهندس برمجيات يصمم معماريات قابلة للتوسع، وكمدير أنظمة يضمن استقرار السيرفرات وأمن الشبكة.",
    note: "آخر عمل: سما تاكسي · حتى سبتمبر 2026 · متاح لفرص جديدة",
  },
  email: "mohammed.r.almekhafi@gmail.com",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/mohammed-al-mekhlafi-it" },
    { label: "GitHub", href: "https://github.com/m-makhlafi" },
  ],
  // "What I offer": one card per track. Lines come from his story; items are the skill units in portfolio.ts (racks).
  offer: [
    {
      label: "البنية التحتية", color: "blue", port: "srv",
      line: "سيرفرات Windows والافتراضية والنسخ الاحتياطي، وأنظمة المراقبة والدخول من التركيب في الميدان إلى الإدارة اليومية.",
      units: ["Windows Server", "الافتراضية والنسخ الاحتياطي", "أنظمة المراقبة والدخول"],
      proof: { label: "غرفة السيرفرات في رحلتي", href: "journey/#f-servers" },
    },
    {
      label: "الشبكات والأمن", color: "green", port: "net",
      line: "تقسيم الشبكات، وحل تداخل العناوين واختناقها، وتأمين تدفق البيانات.",
      units: ["الشبكات", "الأمن"],
      proof: { label: "جرّبها في المختبر التفاعلي", href: "#netlab" },
    },
    {
      label: "هندسة البرمجيات", color: "accent", port: "dev",
      line: "تطبيقات ومواقع Full-Stack، من العمل الحر إلى فريق هندسة البرمجيات في سما تاكسي.",
      units: ["JavaScript و Node.js و React", "Python", "قواعد البيانات", "CI/CD و DevOps"],
      proof: { label: "شاهد المشاريع", href: "#projects" },
    },
    {
      label: "تصميم الأنظمة", color: "brown", port: "arch",
      line: "معماريات قابلة للتوسع: موازنة الأحمال، والطوابير، وتوزيع قواعد البيانات.",
      units: ["تصميم الأنظمة"],
      proof: { label: "طابق تصميم الأنظمة في رحلتي", href: "journey/#f-design" },
    },
  ],
  tracks: [
    { label: "البنية التحتية", color: "blue" },
    { label: "الشبكات والأمن", color: "green" },
    { label: "هندسة البرمجيات", color: "accent" },
    { label: "تصميم الأنظمة", color: "brown" },
  ],
  about: {
    paragraphs: [
      "بدأت دراسة تقنية المعلومات عام 2020 وأنا مقتنع أن <strong>الجامعة تمنحك المفتاح، لكن الميدان هو من يفتح الأبواب</strong>. فدرست بالتوازي محتوى أقوى شهادات البنية التحتية: CCNA و Network+ و Security+ و MCSA/MCSE و ITIL.",
      "في الميدان بدأت متدرباً في <strong>شركة جسيم</strong>، وعُيّنت خلال ستة أشهر أخصائي تقنية معلومات: سيرفرات، وشبكات، وكاميرات مراقبة، وأنظمة دخول. ثم تعلمت البرمجة بشكل ذاتي مكثف، وعملت <strong>مطور Full-Stack مستقلاً</strong>، وتعمقت في تصميم الأنظمة.",
      "في <strong>سما تاكسي</strong> بالسعودية التقى الطريقان: عضو في فريق هندسة البرمجيات، ومدير أنظمة الشركة في الوقت نفسه، حتى نهاية سبتمبر 2026. أفكر كمهندس برمجيات يصمم معماريات قابلة للتوسع، وكمدير أنظمة يضمن استقرار السيرفرات وأمن الشبكة.",
    ],
    specs: [
      { k: "الدور", v: "مهندس برمجيات · مدير أنظمة" },
      { k: "آخر عمل", v: "سما تاكسي · حتى سبتمبر 2026" },
      { k: "الخبرة الميدانية", v: "شركة جسيم · IT Specialist" },
      { k: "المؤهل", v: "بكالوريوس تقنية المعلومات" },
      { k: "الموقع", v: "المملكة العربية السعودية" },
      { k: "الحالة", v: "متاح لفرص جديدة", open: true },
    ],
  },
};
