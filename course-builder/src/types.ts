/** Types for the course builder application */

export type Language = "ar" | "en" | "fr" | "de";

export type LocalizedText = Record<Language, string>;

export type BlockType =
  | "text"
  | "video"
  | "quiz"
  | "image"
  | "assignment"
  | "divider";

export interface QuizQuestion {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
}

/** Per-block-type metadata shapes */
export interface TextMetadata {}
export interface VideoMetadata { url: string }
export interface QuizMetadata { questions: QuizQuestion[] }
export interface ImageMetadata { src: string; caption: string; alt: string }
export interface AssignmentMetadata { maxScore: number }
export interface DividerMetadata {}

/** Discriminated union — narrow by .type to get correct metadata shape */
export type ContentBlock =
  | { id: string; type: "text"; title: LocalizedText; content: LocalizedText; duration?: number; metadata: TextMetadata }
  | { id: string; type: "video"; title: LocalizedText; content: LocalizedText; duration?: number; metadata: VideoMetadata }
  | { id: string; type: "quiz"; title: LocalizedText; content: LocalizedText; duration?: number; metadata: QuizMetadata }
  | { id: string; type: "image"; title: LocalizedText; content: LocalizedText; duration?: number; metadata: ImageMetadata }
  | { id: string; type: "assignment"; title: LocalizedText; content: LocalizedText; duration?: number; metadata: AssignmentMetadata }
  | { id: string; type: "divider"; title: LocalizedText; content: LocalizedText; duration?: number; metadata: DividerMetadata };

export interface Lesson {
  id: string;
  title: LocalizedText;
  blocks: ContentBlock[];
  collapsed: boolean;
}

export interface CourseModule {
  id: string;
  title: LocalizedText;
  lessons: Lesson[];
  collapsed: boolean;
}

export interface Course {
  title: LocalizedText;
  description: LocalizedText;
  /** Each language has its own completely independent version */
  versions: Record<Language, CourseVersion>;
}

/** A single language version of a course — fully independent structure */
export interface CourseVersion {
  modules: CourseModule[];
}

export interface CourseConfig {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  /** Each language has its own completely independent version */
  versions: Record<Language, CourseVersion>;
  languages: Language[];
  defaultLanguage: Language;
  certificateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateConfig {
  id: string;
  templateId: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  backgroundColor: string;
  borderColor: string;
  accentColor: string;
  showDate: boolean;
  showInstructor: boolean;
  instructorName: string;
  studentName: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  defaultConfig: Partial<CertificateConfig>;
}

/** Discriminated union for drag-and-drop data */
export type DragDataType = "module" | "lesson" | "block" | "palette-block";

export interface DragData {
  type: DragDataType;
  id: string;
  blockType?: BlockType;
  moduleId?: string;
  lessonId?: string;
}


