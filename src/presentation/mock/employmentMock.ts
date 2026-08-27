// Datos mockeados para prototipar la UI del módulo de empleabilidad.
// Nada aquí toca dominio/infraestructura real — es solo para maquetar y
// refinar el flujo visualmente antes de construir el backend.

export interface MockIkigai {
  whatYouLove: string;
  whatYouAreGoodAt: string;
  whatWorldNeeds: string;
  whatYouCanBePaidFor: string;
  synthesis: string;
  updatedAt: string;
}

export type ProfileItemOrigin = "ikigai" | "exploration" | "manual";

export interface MockExperience {
  id: string;
  organization: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  contextDescription: string;
  origin: ProfileItemOrigin;
}

export type SkillCategory = "hard" | "soft" | "tool" | "language";

export interface MockSkill {
  id: string;
  name: string;
  category: SkillCategory;
  origin: ProfileItemOrigin;
}

export interface MockEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

export interface MockExplorationMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
}

export type InsightCategory = "value" | "interest" | "strength" | "work_preference" | "constraint" | "goal";
export type InsightStatus = "pending_review" | "accepted" | "dismissed";

export interface MockInsight {
  id: string;
  category: InsightCategory;
  content: string;
  status: InsightStatus;
  sourceExcerpt: string;
}

export type JobSource = "linkedin" | "indeed" | "occ" | "otro";

export interface MockKeyword {
  keyword: string;
  relevance: "high" | "medium" | "low";
  matchedInProfile: boolean;
}

export interface MockJobTarget {
  id: string;
  sourceSite: JobSource;
  companyName: string;
  roleTitle: string;
  rawText: string;
  createdAt: string;
  keywords: MockKeyword[];
}

export interface MockEvidence {
  id: string;
  claim: string;
  metricValue: string | null;
  metricConfirmedByUser: boolean;
}

export interface MockCvBullet {
  id: string;
  text: string;
  evidenceId: string | null;
  approved: boolean;
}

export interface MockCvExperienceBlock {
  experienceEntryId: string;
  organization: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string | null;
  bullets: MockCvBullet[];
}

export type CvStatus = "draft" | "quality_review" | "approved" | "sent";

export interface MockCvVersion {
  id: string;
  jobTargetId: string;
  title: string;
  status: CvStatus;
  contact: { fullName: string; email: string; phone: string; location: string; linkedinUrl: string | null };
  summary: string;
  experience: MockCvExperienceBlock[];
  education: MockEducation[];
  skills: string[];
  qualityCheck: {
    spellingOk: boolean;
    lengthOk: boolean;
    noUnconfirmedNumbers: boolean;
    coherenceNotes: string[];
  } | null;
  createdAt: string;
}

export type ApplicationStatus = "applied" | "response" | "interview" | "offer" | "rejected";
export type ApplicationType = "proactive" | "reactive";

export interface MockRecruiterResearch {
  recruiterName: string;
  recruiterRole: string;
  companyTenureNote: string;
  recentCompanyFact: string;
  commonGroundNote: string;
  outreachMessage: string;
  completedAt: string | null;
}

export interface MockApplication {
  id: string;
  jobTargetId: string;
  cvVersionId: string;
  source: JobSource;
  applicationType: ApplicationType;
  companyName: string;
  roleTitle: string;
  status: ApplicationStatus;
  appliedAt: string;
  statusUpdatedAt: string;
  recruiterResearch: MockRecruiterResearch | null;
}

export const mockIkigai: MockIkigai = {
  whatYouLove: "Resolver problemas de datos desordenados y explicarle a otros cómo leerlos.",
  whatYouAreGoodAt: "Organizar información, hacer hojas de cálculo complejas, detectar errores.",
  whatWorldNeeds: "Negocios pequeños que necesitan entender sus propios números.",
  whatYouCanBePaidFor: "Análisis de datos, reportes y automatización de procesos con Excel/Sheets.",
  synthesis:
    "Un perfil de análisis de datos orientado a negocio: te motiva traducir números desordenados en decisiones claras para equipos que no tienen esa capacidad interna.",
  updatedAt: "2026-08-20",
};

export const mockExperience: MockExperience[] = [
  {
    id: "exp-1",
    organization: "Papelería El Roble",
    role: "Auxiliar administrativo",
    location: "CDMX",
    startDate: "2024-02",
    endDate: "2025-06",
    isCurrent: false,
    contextDescription:
      "Llevaba el control de inventario y cuentas por cobrar en hojas de cálculo, y apoyaba en la atención a proveedores.",
    origin: "manual",
  },
  {
    id: "exp-2",
    organization: "Proyecto personal — tienda en línea de la familia",
    role: "Encargado de operaciones",
    location: "Remoto",
    startDate: "2025-07",
    endDate: null,
    isCurrent: true,
    contextDescription:
      "Organicé el catálogo de productos y armé reportes de ventas para decidir qué reabastecer primero.",
    origin: "ikigai",
  },
];

export const mockSkills: MockSkill[] = [
  { id: "sk-1", name: "Excel avanzado", category: "tool", origin: "manual" },
  { id: "sk-2", name: "Análisis de datos", category: "hard", origin: "ikigai" },
  { id: "sk-3", name: "Comunicación con proveedores", category: "soft", origin: "manual" },
  { id: "sk-4", name: "Atención al detalle", category: "soft", origin: "exploration" },
  { id: "sk-5", name: "Google Sheets", category: "tool", origin: "ikigai" },
];

export const mockEducation: MockEducation[] = [
  {
    id: "edu-1",
    institution: "CONALEP Iztapalapa",
    degree: "Técnico en Administración",
    fieldOfStudy: "Administración",
    startDate: "2021-08",
    endDate: "2024-06",
    isCurrent: false,
  },
];

export const mockExplorationMessages: MockExplorationMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    content: "Hola, soy tu asistente de Descúbrete. Cuéntame: ¿qué actividad haces en la que se te olvida ver el reloj?",
    createdAt: "2026-08-18T10:00:00Z",
  },
  {
    id: "msg-2",
    role: "user",
    content: "Cuando organizo información en tablas o listas, como acomodar el inventario de la papelería.",
    createdAt: "2026-08-18T10:01:00Z",
  },
  {
    id: "msg-3",
    role: "assistant",
    content: "Interesante. Cuando algo sale mal en el trabajo o en un proyecto, ¿qué sueles hacer primero?",
    createdAt: "2026-08-18T10:02:00Z",
  },
  {
    id: "msg-4",
    role: "user",
    content: "Reviso los números otra vez, casi siempre el problema está en algo que no cuadra en una hoja de cálculo.",
    createdAt: "2026-08-18T10:03:00Z",
  },
];

export const mockInsights: MockInsight[] = [
  {
    id: "ins-1",
    category: "strength",
    content: "Detecta inconsistencias en datos numéricos de forma metódica antes de escalar un problema.",
    status: "pending_review",
    sourceExcerpt: "Reviso los números otra vez, casi siempre el problema está en algo que no cuadra en una hoja de cálculo.",
  },
  {
    id: "ins-2",
    category: "interest",
    content: "Disfruta organizar información en tablas y estructuras claras.",
    status: "pending_review",
    sourceExcerpt: "Cuando organizo información en tablas o listas...",
  },
  {
    id: "ins-3",
    category: "work_preference",
    content: "Prefiere resolver primero por sí mismo antes de pedir ayuda.",
    status: "accepted",
    sourceExcerpt: "Reviso los números otra vez...",
  },
];

export const mockJobTargets: MockJobTarget[] = [
  {
    id: "job-1",
    sourceSite: "linkedin",
    companyName: "Datalight Analytics",
    roleTitle: "Analista de Datos Jr.",
    rawText:
      "Buscamos Analista de Datos Jr. con manejo de Excel avanzado, Google Sheets y gusto por la organización de información. Deseable experiencia en control de inventarios o reportes de ventas. Trabajo remoto, horario flexible.",
    createdAt: "2026-08-19",
    keywords: [
      { keyword: "Excel avanzado", relevance: "high", matchedInProfile: true },
      { keyword: "Google Sheets", relevance: "high", matchedInProfile: true },
      { keyword: "control de inventarios", relevance: "medium", matchedInProfile: true },
      { keyword: "reportes de ventas", relevance: "medium", matchedInProfile: true },
      { keyword: "trabajo remoto", relevance: "low", matchedInProfile: false },
    ],
  },
  {
    id: "job-2",
    sourceSite: "occ",
    companyName: "Grupo Ferretero del Valle",
    roleTitle: "Auxiliar Administrativo",
    rawText:
      "Se solicita auxiliar administrativo con experiencia en cuentas por cobrar, atención a proveedores y manejo de paquetería office. Ofrecemos prestaciones de ley.",
    createdAt: "2026-08-22",
    keywords: [
      { keyword: "cuentas por cobrar", relevance: "high", matchedInProfile: true },
      { keyword: "atención a proveedores", relevance: "high", matchedInProfile: true },
      { keyword: "paquetería office", relevance: "medium", matchedInProfile: true },
    ],
  },
];

export const mockEvidence: MockEvidence[] = [
  {
    id: "ev-1",
    claim: "Mejoré el control de inventario en la papelería",
    metricValue: "Reduje errores de conteo mensual de ~15 a 2 productos",
    metricConfirmedByUser: true,
  },
  {
    id: "ev-2",
    claim: "Organicé el catálogo de la tienda en línea",
    metricValue: null,
    metricConfirmedByUser: false,
  },
];

export const mockCvVersions: MockCvVersion[] = [
  {
    id: "cv-1",
    jobTargetId: "job-1",
    title: "CV — Analista de Datos Jr. @ Datalight Analytics",
    status: "quality_review",
    contact: {
      fullName: "Jazmín Torres Medina",
      email: "jazmin.torres@example.com",
      phone: "55 1234 5678",
      location: "CDMX, México",
      linkedinUrl: "linkedin.com/in/jazmintorres",
    },
    summary:
      "Auxiliar administrativo con experiencia organizando inventario y reportes en hojas de cálculo, en transición hacia análisis de datos orientado a negocio.",
    experience: [
      {
        experienceEntryId: "exp-2",
        organization: "Proyecto personal — tienda en línea de la familia",
        role: "Encargado de operaciones",
        location: "Remoto",
        startDate: "2025-07",
        endDate: null,
        bullets: [
          {
            id: "b-1",
            text: "Organicé el catálogo de productos para facilitar la toma de decisiones de reabastecimiento.",
            evidenceId: "ev-2",
            approved: true,
          },
        ],
      },
      {
        experienceEntryId: "exp-1",
        organization: "Papelería El Roble",
        role: "Auxiliar administrativo",
        location: "CDMX",
        startDate: "2024-02",
        endDate: "2025-06",
        bullets: [
          {
            id: "b-2",
            text: "Reduje los errores de conteo mensual de inventario de 15 a 2 productos mediante un control más riguroso en hoja de cálculo.",
            evidenceId: "ev-1",
            approved: true,
          },
        ],
      },
    ],
    education: mockEducation,
    skills: ["Excel avanzado", "Análisis de datos", "Google Sheets", "Atención al detalle"],
    qualityCheck: {
      spellingOk: true,
      lengthOk: true,
      noUnconfirmedNumbers: true,
      coherenceNotes: [],
    },
    createdAt: "2026-08-20",
  },
];

export const mockApplications: MockApplication[] = [
  {
    id: "app-1",
    jobTargetId: "job-1",
    cvVersionId: "cv-1",
    source: "linkedin",
    applicationType: "proactive",
    companyName: "Datalight Analytics",
    roleTitle: "Analista de Datos Jr.",
    status: "response",
    appliedAt: "2026-08-20",
    statusUpdatedAt: "2026-08-23",
    recruiterResearch: {
      recruiterName: "Carla Núñez",
      recruiterRole: "Talent Acquisition Lead",
      companyTenureNote: "En Datalight desde hace 3 años",
      recentCompanyFact: "La empresa acaba de anunciar una ronda de inversión Serie A",
      commonGroundNote: "Ambas estudiamos en CONALEP",
      outreachMessage:
        "Hola Carla, vi que Datalight acaba de anunciar su ronda Serie A, ¡felicidades! Me interesa mucho la vacante de Analista de Datos Jr. y me encantaría conversar sobre cómo puedo aportar desde mi experiencia organizando reportes e inventarios.",
      completedAt: "2026-08-19",
    },
  },
  {
    id: "app-2",
    jobTargetId: "job-2",
    cvVersionId: "cv-1",
    source: "occ",
    applicationType: "reactive",
    companyName: "Grupo Ferretero del Valle",
    roleTitle: "Auxiliar Administrativo",
    status: "applied",
    appliedAt: "2026-08-15",
    statusUpdatedAt: "2026-08-15",
    recruiterResearch: null,
  },
];
